import logging

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from core.exceptions import raise_drf_from_model_validation
from inventory.models import Product, ProductVariant, VariantBooking

logger = logging.getLogger(__name__)

VALID_BOOKING_TYPES = {choice.value for choice in VariantBooking.BookingType}
VALID_STATUS = {choice.value for choice in VariantBooking.Status}


def _get_variant(*, variant_id, user, include_terminal=False):
    # Terminal variants (sold/donated/archived/inactive) can't be *managed* —
    # but their bookings remain visible read-only for audit, so callers that
    # only read pass ``include_terminal=True``.
    qs = ProductVariant.objects.all()
    if not include_terminal:
        qs = qs.exclude(
            status__in=[
                ProductVariant.Status.INACTIVE,
                ProductVariant.Status.SOLD,
                ProductVariant.Status.DONATED,
                ProductVariant.Status.ARCHIVED,
            ]
        )
    try:
        variant = qs.get(id=variant_id)
    except ProductVariant.DoesNotExist:
        raise AppNotFound("VariantNotFound")

    product = variant.product

    if product.owner_type == Product.OwnerType.MEMBER:
        if product.owner_id != user.id:
            raise PermissionDenied()

    elif product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("inventory.manage_school_inventory"):
            raise PermissionDenied()

    return variant


def _validate_dates(*, start_at, end_at):
    if not start_at or not end_at:
        raise ValidationError({"messages": ["InvalidBookingDates"]})

    if start_at >= end_at:
        raise ValidationError({"messages": ["InvalidBookingDateRange"]})


def _check_overlap(*, variant, start_at, end_at, exclude_id=None):
    overlapping = VariantBooking.objects.filter(
        variant=variant,
        status__in=VariantBooking.ACTIVE_HOLD_STATUSES,
    ).filter(start_at__lt=end_at, end_at__gt=start_at)

    if exclude_id:
        overlapping = overlapping.exclude(id=exclude_id)

    if overlapping.exists():
        logger.warning(
            "Booking overlap rejected for variant %s",
            variant.pk,
        )
        raise ValidationError({"messages": ["BookingOverlap"]})


@transaction.atomic
def create_booking(*, variant_id, user, **data):
    from django.core.exceptions import ValidationError as DjangoValidationError

    variant = _get_variant(variant_id=variant_id, user=user)

    booking_type = data.get("booking_type")
    if not booking_type:
        raise ValidationError({"messages": ["InvalidBookingType"]})

    if booking_type not in VALID_BOOKING_TYPES:
        raise ValidationError({"messages": ["InvalidBookingType"]})

    if data.get("status") and data.get("status") not in VALID_STATUS:
        raise ValidationError({"messages": ["InvalidBookingStatus"]})

    start_at = data.get("start_at")
    end_at = data.get("end_at")

    _validate_dates(start_at=start_at, end_at=end_at)
    # Lock the variant row to serialise concurrent overlap checks (race condition guard).
    ProductVariant.objects.select_for_update().get(id=variant.id)
    _check_overlap(variant=variant, start_at=start_at, end_at=end_at)

    booking = VariantBooking(
        variant=variant,
        booking_type=booking_type,
        status=data.get("status") or VariantBooking.Status.PENDING,
        start_at=start_at,
        end_at=end_at,
        actual_start_at=data.get("actual_start_at"),
        actual_end_at=data.get("actual_end_at"),
        title=data.get("title") or "Booking",
        notes=data.get("notes", ""),
        created_by=user,
    )
    try:
        booking.full_clean()
    except DjangoValidationError as exc:
        raise_drf_from_model_validation(exc)
    booking.save()

    logger.info(
        "VariantBooking created: %s variant %s by user %s",
        booking.pk,
        variant_id,
        user.pk,
    )

    return booking


def list_bookings(*, variant_id, user, filters=None, include_cancelled=False):
    # Read-only: include terminal variants so a sold/donated unit still shows
    # its past booking timeline for audit.
    variant = _get_variant(variant_id=variant_id, user=user, include_terminal=True)

    queryset = variant.bookings.all()

    if not include_cancelled:
        queryset = queryset.exclude(status=VariantBooking.Status.CANCELLED)

    queryset = queryset.order_by("start_at")

    if filters:
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("booking_type"):
            queryset = queryset.filter(booking_type=filters["booking_type"])

        if filters.get("start_at"):
            queryset = queryset.filter(start_at__gte=filters["start_at"])

        if filters.get("end_at"):
            queryset = queryset.filter(end_at__lte=filters["end_at"])

    return queryset


def list_school_bookings(*, filters=None, include_cancelled=False):
    """
    School-wide bookings list: every booking whose variant belongs to a
    school-owned product. Used by the back-office bookings page that needs
    to render occupancy across the entire school catalogue in one shot.

    Permission gating is done at the view layer — this service trusts the
    caller has already been authorised.
    """
    queryset = VariantBooking.objects.filter(
        variant__product__owner_type=Product.OwnerType.SCHOOL,
    ).select_related(
        "variant",
        "variant__product",
        "created_by",
        "approved_by_user",
    )

    if not include_cancelled:
        queryset = queryset.exclude(status=VariantBooking.Status.CANCELLED)

    if filters:
        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("booking_type"):
            queryset = queryset.filter(booking_type=filters["booking_type"])

        if filters.get("start_at"):
            queryset = queryset.filter(end_at__gte=filters["start_at"])

        if filters.get("end_at"):
            queryset = queryset.filter(start_at__lte=filters["end_at"])

    return queryset.order_by("start_at")


def get_booking(*, booking_id, user):
    try:
        booking = VariantBooking.objects.get(id=booking_id)
    except VariantBooking.DoesNotExist:
        raise AppNotFound("BookingNotFound")

    _get_variant(variant_id=booking.variant_id, user=user)

    return booking


@transaction.atomic
def update_booking(*, booking_id, user, **data):
    from django.core.exceptions import ValidationError as DjangoValidationError

    booking = get_booking(booking_id=booking_id, user=user)

    if "variant" in data or "variant_id" in data:
        raise ValidationError({"messages": ["BookingVariantImmutable"]})

    if "booking_type" in data and data["booking_type"] not in VALID_BOOKING_TYPES:
        raise ValidationError({"messages": ["InvalidBookingType"]})

    if "status" in data and data["status"] not in VALID_STATUS:
        raise ValidationError({"messages": ["InvalidBookingStatus"]})

    start_at = data.get("start_at", booking.start_at)
    end_at = data.get("end_at", booking.end_at)

    _validate_dates(start_at=start_at, end_at=end_at)
    # Lock the variant row to serialise concurrent overlap checks (race condition guard).
    ProductVariant.objects.select_for_update().get(id=booking.variant_id)
    _check_overlap(
        variant=booking.variant,
        start_at=start_at,
        end_at=end_at,
        exclude_id=booking.id,
    )

    for field in [
        "booking_type",
        "status",
        "start_at",
        "end_at",
        "actual_start_at",
        "actual_end_at",
        "title",
        "notes",
    ]:
        if field in data:
            setattr(booking, field, data[field])

    booking.updated_by = user
    try:
        booking.full_clean()
    except DjangoValidationError as exc:
        raise_drf_from_model_validation(exc)
    booking.save()

    return booking


@transaction.atomic
def delete_booking(*, booking_id, user):
    booking = get_booking(booking_id=booking_id, user=user)

    if booking.deleted_at:
        return booking

    booking.delete(deleted_by=user)
    logger.info("VariantBooking soft-deleted: %s by user %s", booking_id, user.pk)
    return booking
