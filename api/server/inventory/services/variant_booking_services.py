import logging

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from inventory.django_validation import raise_drf_from_model_validation
from inventory.models import Product, ProductVariant, VariantBooking

logger = logging.getLogger(__name__)

VALID_BOOKING_TYPES = {choice.value for choice in VariantBooking.BookingType}
VALID_STATUS = {choice.value for choice in VariantBooking.Status}

_ACTIVE_OVERLAP_STATUSES = (
    VariantBooking.Status.PENDING,
    VariantBooking.Status.CONFIRMED,
    VariantBooking.Status.ACTIVE,
)


def _get_variant(*, variant_id, user):
    try:
        variant = ProductVariant.objects.exclude(
            status=ProductVariant.Status.INACTIVE
        ).get(id=variant_id)
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
        status__in=_ACTIVE_OVERLAP_STATUSES,
    ).filter(start_at__lt=end_at, end_at__gt=start_at)

    if exclude_id:
        overlapping = overlapping.exclude(id=exclude_id)

    if overlapping.exists():
        logger.warning(
            "Booking overlap rejected for variant %s",
            variant.pk,
        )
        raise ValidationError({"messages": ["BookingOverlap"]})


def _booking_has_pending_dependencies(*, booking):
    """Reserved for payments / linked entities. When True, blocks soft-delete."""
    return False


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


def list_bookings(*, variant_id, user, filters=None):
    variant = _get_variant(variant_id=variant_id, user=user)

    queryset = variant.bookings.exclude(
        status=VariantBooking.Status.CANCELLED
    ).order_by("start_at")

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

    if _booking_has_pending_dependencies(booking=booking):
        logger.warning(
            "Booking delete blocked: booking %s has pending dependencies",
            booking_id,
        )
        raise ValidationError({"messages": ["BookingHasCriticalDependencies"]})

    booking.delete(deleted_by=user)
    logger.info("VariantBooking soft-deleted: %s by user %s", booking_id, user.pk)
    return booking
