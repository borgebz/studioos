import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound
from inventory.models import Product, ProductVariant, VariantBooking
from marketplace.models import Listing, ListingFavorite

logger = logging.getLogger(__name__)

# Variant statuses that cannot be listed
_NON_LISTABLE_STATUSES = (
    ProductVariant.Status.SOLD,
    ProductVariant.Status.DONATED,
    ProductVariant.Status.ARCHIVED,
    ProductVariant.Status.INACTIVE,
)

# Allowed ordering fields for listing list endpoints
_LISTING_ALLOWED_ORDERING = {
    "-created_at",
    "created_at",
    "asking_price",
    "-asking_price",
}

# Booking statuses that represent an active hold on the variant
_ACTIVE_BOOKING_STATUSES = VariantBooking.ACTIVE_HOLD_STATUSES

# Shared eager-loading paths — avoids N+1 in every list/detail endpoint
_LISTING_SELECT_RELATED = (
    "variant__product__category",
    "variant__size",
)
_LISTING_PREFETCH = ("variant__product__media",)


def _get_listing_or_404(listing_id):
    try:
        return (
            Listing.objects.select_related(*_LISTING_SELECT_RELATED)
            .prefetch_related(*_LISTING_PREFETCH)
            .get(id=listing_id)
        )
    except Listing.DoesNotExist:
        raise AppNotFound("ListingNotFound")


def _assert_can_manage(*, user, listing):
    """Owner check: member listings → product owner; school listings → manage_school_listings perm."""
    product = listing.variant.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("marketplace.manage_school_listings"):
            raise PermissionDenied()
    else:
        if product.owner_id != user.id:
            raise PermissionDenied()


def _compute_available_from(variant):
    """Return the earliest datetime the variant is free for a new SELL/DONATE booking."""
    last = (
        VariantBooking.objects.filter(
            variant=variant,
            status__in=_ACTIVE_BOOKING_STATUSES,
        )
        .order_by("-end_at")
        .values_list("end_at", flat=True)
        .first()
    )
    return last or timezone.now()


def _check_date_overlap(*, variant, start_at, end_at, exclude_booking_id=None):
    qs = VariantBooking.objects.filter(
        variant=variant,
        status__in=_ACTIVE_BOOKING_STATUSES,
        start_at__lt=end_at,
        end_at__gt=start_at,
    )
    if exclude_booking_id:
        qs = qs.exclude(id=exclude_booking_id)
    if qs.exists():
        raise ValidationError({"messages": ["BookingOverlap"]})


def _exclude_soft_deleted_relations(qs):
    """Exclude listings whose variant or product has been soft-deleted.

    Django FK joins do NOT apply the related model's SoftDeleteManager,
    so we must guard explicitly.
    """
    return qs.exclude(variant__deleted_at__isnull=False).exclude(
        variant__product__deleted_at__isnull=False
    )


def list_listings(*, user, filters=None):
    qs = (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(
                status=Listing.ListingStatus.ACTIVE,
                is_public=True,
            )
        )
        .exclude(variant__status__in=_NON_LISTABLE_STATUSES)
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )

    ordering = "-created_at"
    if filters:
        if filters.get("search"):
            term = filters["search"]
            from django.db.models import Q

            qs = qs.filter(
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(variant__product__name__icontains=term)
            )
        if filters.get("listing_type"):
            qs = qs.filter(listing_type=filters["listing_type"])
        if filters.get("category_id"):
            qs = qs.filter(variant__product__category_id=filters["category_id"])
        if filters.get("size_id"):
            qs = qs.filter(variant__size_id=filters["size_id"])
        if filters.get("color_id"):
            qs = qs.filter(variant__colors__color_id=filters["color_id"]).distinct()
        if filters.get("condition"):
            qs = qs.filter(variant__condition=filters["condition"])
        if filters.get("ordering") and filters["ordering"] in _LISTING_ALLOWED_ORDERING:
            ordering = filters["ordering"]

    return qs.order_by(ordering)


def get_listing(*, listing_id, user):
    """Retrieve a single listing with visibility rules.

    - Active + public → any authenticated user
    - Owner → always
    - Admin (view_productlisting) → always
    - School manager → school-owned listings only
    """
    listing = _get_listing_or_404(listing_id)

    if listing.status == Listing.ListingStatus.ACTIVE and listing.is_public:
        return listing
    if user.has_perm("marketplace.view_productlisting"):
        return listing

    product = listing.variant.product
    if product.owner_type == Product.OwnerType.MEMBER and product.owner_id == user.id:
        return listing
    if product.owner_type == Product.OwnerType.SCHOOL and user.has_perm(
        "marketplace.manage_school_listings"
    ):
        return listing

    raise PermissionDenied()


def list_my_listings(*, user, filters=None):
    qs = (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(
                variant__product__owner=user,
                variant__product__owner_type=Product.OwnerType.MEMBER,
            )
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )

    ordering = "-created_at"
    if filters:
        if filters.get("search"):
            term = filters["search"]
            from django.db.models import Q

            qs = qs.filter(
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(variant__product__name__icontains=term)
            )
        if filters.get("listing_type"):
            qs = qs.filter(listing_type=filters["listing_type"])
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])
        if filters.get("ordering") and filters["ordering"] in _LISTING_ALLOWED_ORDERING:
            ordering = filters["ordering"]

    return qs.order_by(ordering)


def list_favorited_listings(*, user):
    return (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(
                favorites__user=user,
                favorites__deleted_at__isnull=True,
            )
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
        .order_by("-created_at")
    )


@transaction.atomic
def create_listing(*, user, school_only=False, **data):
    variant_id = data.get("variant_id")
    nested_product = data.get("product")

    if not variant_id and not nested_product:
        raise ValidationError({"messages": ["VariantIdOrProductRequired"]})

    if variant_id:
        try:
            variant = ProductVariant.objects.select_related("product").get(
                id=variant_id
            )
        except ProductVariant.DoesNotExist:
            raise AppNotFound("VariantNotFound")

        if variant.status in _NON_LISTABLE_STATUSES:
            raise ValidationError({"messages": ["VariantNotListable"]})

        if school_only and variant.product.owner_type != Product.OwnerType.SCHOOL:
            raise ValidationError({"messages": ["VariantMustBeSchoolOwned"]})

        is_owner = (
            variant.product.owner_type == Product.OwnerType.MEMBER
            and variant.product.owner_id == user.id
        )
        is_school_manager = (
            variant.product.owner_type == Product.OwnerType.SCHOOL
            and user.has_perm("marketplace.manage_school_listings")
        )
        if not is_owner and not is_school_manager:
            raise ValidationError({"messages": ["VariantOwnershipRequired"]})
    else:
        # Inline product + variant creation delegated to inventory services
        from inventory import services as inventory_services

        product_data = nested_product
        variant_data = product_data.pop("variant", {})
        product = inventory_services.create_product(user=user, **product_data)
        variant = inventory_services.create_variant(
            product_id=product.id, user=user, **variant_data
        )

    listing = Listing(
        variant=variant,
        listing_type=data["listing_type"],
        title=data["title"],
        description=data.get("description", ""),
        asking_price=data.get("asking_price"),
        is_public=data.get("is_public", False),
        created_by=user,
    )
    listing.full_clean()
    listing.save()

    logger.info("Listing created: %s by user %s", listing.pk, user.pk)
    return listing


@transaction.atomic
def update_listing(*, listing_id, user, **data):
    from inventory import services as inventory_services

    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)

    if listing.status == Listing.ListingStatus.CLOSED:
        raise ValidationError({"messages": ["ListingClosed"]})

    for field in ["listing_type", "title", "description", "asking_price", "is_public"]:
        if field in data:
            setattr(listing, field, data[field])

    listing.updated_by = user

    # Inline product update
    if data.get("product"):
        inventory_services.update_product(
            pk=listing.variant.product_id, user=user, **data["product"]
        )

    # Inline variant update
    if data.get("variant"):
        inventory_services.update_variant(
            variant_id=listing.variant_id, user=user, **data["variant"]
        )

    listing.save()
    return listing


@transaction.atomic
def publish_listing(*, listing_id, user):
    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)

    if listing.status == Listing.ListingStatus.ACTIVE:
        raise ValidationError({"messages": ["ListingAlreadyPublished"]})

    if listing.variant.status in _NON_LISTABLE_STATUSES:
        raise ValidationError({"messages": ["VariantNotListable"]})

    listing.status = Listing.ListingStatus.ACTIVE
    listing.is_public = True
    listing.updated_by = user
    listing.save()
    return listing


@transaction.atomic
def unpublish_listing(*, listing_id, user):
    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)

    listing.status = Listing.ListingStatus.DRAFT
    listing.is_public = False
    listing.updated_by = user
    listing.save()
    return listing


@transaction.atomic
def delete_listing(*, listing_id, user):
    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)
    listing.delete(deleted_by=user)


def add_favorite(*, listing_id, user):
    listing = _get_listing_or_404(listing_id)
    fav, created = ListingFavorite.objects.get_or_create(
        listing=listing,
        user=user,
        defaults={"created_by": user},
    )
    if not created:
        raise ValidationError({"messages": ["AlreadyFavorited"]})
    return fav


def remove_favorite(*, listing_id, user):
    try:
        fav = ListingFavorite.objects.get(listing_id=listing_id, user=user)
    except ListingFavorite.DoesNotExist:
        raise AppNotFound("FavoriteNotFound")
    fav.delete(deleted_by=user)


def list_school_listings(*, user, filters=None):
    qs = (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(
                variant__product__owner_type=Product.OwnerType.SCHOOL
            )
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )

    ordering = "-created_at"
    if filters:
        if filters.get("search"):
            term = filters["search"]
            from django.db.models import Q

            qs = qs.filter(
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(variant__product__name__icontains=term)
            )
        if filters.get("listing_type"):
            qs = qs.filter(listing_type=filters["listing_type"])
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])
        if filters.get("ordering") and filters["ordering"] in _LISTING_ALLOWED_ORDERING:
            ordering = filters["ordering"]

    return qs.order_by(ordering)


def get_availability(*, listing_id):
    listing = _get_listing_or_404(listing_id)
    bookings = VariantBooking.objects.filter(
        variant=listing.variant,
        status__in=_ACTIVE_BOOKING_STATUSES,
    ).values("start_at", "end_at", "status")
    return list(bookings)
