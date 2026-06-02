import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound
from inventory.models import Product, ProductVariant, VariantBooking
from marketplace.models import Listing, ListingFavorite

logger = logging.getLogger(__name__)

# Variant statuses that cannot be listed / offered to buyers.
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

# Booking statuses that represent an active hold on a variant
_ACTIVE_BOOKING_STATUSES = VariantBooking.ACTIVE_HOLD_STATUSES

# Shared eager-loading paths — a listing now fans out to its product's variants,
# so we prefetch the whole product → variants → (size, colors, media, bookings)
# tree to avoid N+1 in list/detail endpoints.
_LISTING_SELECT_RELATED = ("product__category", "product__owner")
_LISTING_PREFETCH = (
    "product__media",
    "product__variants__size",
    "product__variants__colors__color",
    "product__variants__media_links__product_media",
    "product__variants__bookings",
)


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
    """Owner check: member listings → product owner; school listings → manage perm."""
    product = listing.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("marketplace.manage_school_listings"):
            raise PermissionDenied()
    else:
        if product.owner_id != user.id:
            raise PermissionDenied()


def _product_has_listable_variant(product):
    return any(
        v.deleted_at is None and v.status not in _NON_LISTABLE_STATUSES
        for v in product.variants.all()
    )


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
    """Exclude listings whose product has been soft-deleted.

    Django FK joins do NOT apply the related model's SoftDeleteManager,
    so we must guard explicitly.
    """
    return qs.exclude(product__deleted_at__isnull=False)


def _apply_listing_filters(qs, filters, *, public=False):
    """Shared filter application for the listing list endpoints."""
    ordering = "-created_at"
    if not filters:
        return qs.order_by(ordering)

    if filters.get("search"):
        term = filters["search"]
        qs = qs.filter(
            Q(title__icontains=term)
            | Q(description__icontains=term)
            | Q(product__name__icontains=term)
        )
    if filters.get("listing_type"):
        qs = qs.filter(listing_type=filters["listing_type"])
    if not public and filters.get("status"):
        qs = qs.filter(status=filters["status"])
    if filters.get("category_id"):
        qs = qs.filter(product__category_id=filters["category_id"])
    # Variant-scoped filters mean "the product has a variant matching X".
    if filters.get("size_id"):
        qs = qs.filter(product__variants__size_id=filters["size_id"])
    if filters.get("color_id"):
        qs = qs.filter(product__variants__colors__color_id=filters["color_id"])
    if filters.get("condition"):
        qs = qs.filter(product__variants__condition=filters["condition"])
    if filters.get("ordering") and filters["ordering"] in _LISTING_ALLOWED_ORDERING:
        ordering = filters["ordering"]

    return qs.distinct().order_by(ordering)


def list_listings(*, user, filters=None):
    qs = (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(
                status=Listing.ListingStatus.ACTIVE,
                is_public=True,
            )
        )
        # Only surface listings whose product still has a listable variant.
        .filter(
            product__variants__status=ProductVariant.Status.AVAILABLE,
            product__variants__deleted_at__isnull=True,
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )
    return _apply_listing_filters(qs, filters, public=True)


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

    product = listing.product
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
                product__owner=user,
                product__owner_type=Product.OwnerType.MEMBER,
            )
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )
    return _apply_listing_filters(qs, filters)


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


def list_school_listings(*, user, filters=None):
    qs = (
        _exclude_soft_deleted_relations(
            Listing.objects.filter(product__owner_type=Product.OwnerType.SCHOOL)
        )
        .select_related(*_LISTING_SELECT_RELATED)
        .prefetch_related(*_LISTING_PREFETCH)
    )
    return _apply_listing_filters(qs, filters)


@transaction.atomic
def create_listing(*, user, school_only=False, **data):
    """Create a listing for a product (and all its variants).

    Either reference an existing inventory product via ``product_id`` or create
    the product + its variants inline via the nested ``product`` dict (which the
    inventory services already understand, including ``variants`` and ``media``).
    """
    from inventory import services as inventory_services

    product_id = data.get("product_id")
    nested_product = data.get("product")

    if not product_id and not nested_product:
        raise ValidationError({"messages": ["ProductIdOrProductRequired"]})

    if product_id:
        if school_only:
            product = inventory_services.get_school_product(pk=product_id, user=user)
        else:
            product = inventory_services.get_product(pk=product_id, user=user)
    elif school_only:
        product = inventory_services.create_school_product(user=user, **nested_product)
    else:
        product = inventory_services.create_product(user=user, **nested_product)

    if school_only and product.owner_type != Product.OwnerType.SCHOOL:
        raise ValidationError({"messages": ["ProductMustBeSchoolOwned"]})

    # OneToOne — a product can only carry a single listing.
    if Listing.objects.filter(product=product).exists():
        raise ValidationError({"messages": ["ProductAlreadyListed"]})

    listing = Listing(
        product=product,
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

    product = listing.product
    is_school = product.owner_type == Product.OwnerType.SCHOOL

    # Inline product field updates + media + variants. Variants ride inside the
    # product payload so the inventory layer resolves variant ``media_keys``
    # against the same media map it builds while syncing product media.
    product_data = data.get("product")
    variants = data.get("variants")
    if product_data is not None or variants is not None:
        product_payload = dict(product_data or {})
        if variants is not None:
            product_payload["variants"] = variants
        if is_school:
            inventory_services.update_school_product(
                pk=product.id, user=user, **product_payload
            )
        else:
            inventory_services.update_product(
                pk=product.id, user=user, **product_payload
            )

    listing.save()
    return listing


@transaction.atomic
def publish_listing(*, listing_id, user):
    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)

    if listing.status == Listing.ListingStatus.ACTIVE:
        raise ValidationError({"messages": ["ListingAlreadyPublished"]})

    if not _product_has_listable_variant(listing.product):
        raise ValidationError({"messages": ["NoListableVariant"]})

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


def get_availability(*, listing_id):
    """Active booking windows for every variant of the listing's product."""
    listing = _get_listing_or_404(listing_id)
    bookings = VariantBooking.objects.filter(
        variant__product=listing.product,
        status__in=_ACTIVE_BOOKING_STATUSES,
    ).values("variant_id", "start_at", "end_at", "status")
    return list(bookings)
