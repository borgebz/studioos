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

# Booking statuses that represent an active hold on the variant
_ACTIVE_BOOKING_STATUSES = VariantBooking.ACTIVE_HOLD_STATUSES


def _get_listing_or_404(listing_id):
    try:
        return Listing.objects.get(id=listing_id)
    except Listing.DoesNotExist:
        raise AppNotFound("ListingNotFound")


def _assert_can_manage(*, user, listing):
    """Owner check: member listings → only owner; school listings → manage_school_listings perm."""
    product = listing.variant.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("marketplace.manage_school_listings"):
            raise PermissionDenied()
    else:
        if listing.created_by_id != user.id:
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


def list_listings(*, user, filters=None):
    qs = (
        Listing.objects.filter(
            status=Listing.ListingStatus.ACTIVE,
            is_public=True,
        )
        .exclude(variant__status__in=_NON_LISTABLE_STATUSES)
        .exclude(variant__deleted_at__isnull=False)
        .exclude(variant__product__deleted_at__isnull=False)
        .select_related("variant__product__category", "variant__size")
        .prefetch_related("variant__product__media")
        .order_by("-created_at")
    )

    if filters:
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

    return qs


def get_listing(*, listing_id):
    return _get_listing_or_404(listing_id)


def list_my_listings(*, user):
    return Listing.objects.filter(created_by=user).order_by("-created_at")


def list_favorited_listings(*, user):
    return Listing.objects.filter(
        favorites__user=user,
        favorites__deleted_at__isnull=True,
    ).order_by("-created_at")


@transaction.atomic
def create_listing(*, user, **data):
    variant_id = data.get("variant_id")
    nested_product = data.get("product")

    if not variant_id and not nested_product:
        raise ValidationError({"messages": ["VariantIdOrProductRequired"]})

    if variant_id:
        try:
            variant = ProductVariant.objects.get(id=variant_id)
        except ProductVariant.DoesNotExist:
            raise AppNotFound("VariantNotFound")

        if variant.status in _NON_LISTABLE_STATUSES:
            raise ValidationError({"messages": ["VariantNotListable"]})
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
    listing.save()

    logger.info("Listing created: %s by user %s", listing.pk, user.pk)
    return listing


@transaction.atomic
def update_listing(*, listing_id, user, **data):
    from inventory import services as inventory_services

    listing = _get_listing_or_404(listing_id)
    _assert_can_manage(user=user, listing=listing)

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
    if ListingFavorite.objects.filter(
        listing=listing, user=user, deleted_at__isnull=True
    ).exists():
        raise ValidationError({"messages": ["AlreadyFavorited"]})

    fav = ListingFavorite(listing=listing, user=user, created_by=user)
    fav.save()
    return fav


def remove_favorite(*, listing_id, user):
    try:
        fav = ListingFavorite.objects.get(
            listing_id=listing_id, user=user, deleted_at__isnull=True
        )
    except ListingFavorite.DoesNotExist:
        raise AppNotFound("FavoriteNotFound")
    fav.delete(deleted_by=user)


def get_availability(*, listing_id):
    listing = _get_listing_or_404(listing_id)
    bookings = VariantBooking.objects.filter(
        variant=listing.variant,
        status__in=_ACTIVE_BOOKING_STATUSES,
    ).values("start_at", "end_at", "status")
    return list(bookings)
