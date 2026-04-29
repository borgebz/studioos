from django.db import transaction
from core.exceptions import DomainError

from inventory.models import VariantBooking, ProductVariant


VALID_BOOKING_TYPES = [
    "reservation", "loan", "rent", "rental",
    "school_use", "maintenance", "blocked"
]

VALID_STATUS = [
    "pending", "confirmed", "active",
    "completed", "cancelled"
]


# ===============================
# HELPERS
# ===============================

def _get_variant(variant_id, user):
    try:
        variant = ProductVariant.objects.exclude(status="inactive").get(id=variant_id)
    except ProductVariant.DoesNotExist:
        raise DomainError("VariantNotFound", "Variante não encontrada.")

    product = variant.product

    # permissões
    if product.owner_type == "member":
        if product.owner_id != user.id:
            raise DomainError("PermissionDenied", "Sem acesso.")

    elif product.owner_type == "school":
        if not user.has_perm("inventory.manage_school_inventory"):
            raise DomainError("PermissionDenied", "Sem permissão.")

    return variant


def _validate_dates(start_at, end_at):
    if not start_at or not end_at:
        raise DomainError("InvalidBookingDates", "Datas obrigatórias.")

    if start_at >= end_at:
        raise DomainError("InvalidBookingDates", "start_at deve ser anterior a end_at.")


def _check_overlap(variant, start_at, end_at, exclude_id=None):
    overlapping = VariantBooking.objects.filter(
        variant=variant,
        status__in=["pending", "confirmed", "active"]
    ).filter(
        start_at__lt=end_at,
        end_at__gt=start_at
    )

    if exclude_id:
        overlapping = overlapping.exclude(id=exclude_id)


    if overlapping.exists():
        raise DomainError("BookingOverlap", "Já existe booking neste período.")


# ===========Create====================
@transaction.atomic
def create_booking(variant_id, user, **data):
    variant = _get_variant(variant_id, user)

    if not data.get("booking_type"):
        raise DomainError("InvalidBookingType", "booking_type é obrigatório.")

    if data.get("booking_type") not in VALID_BOOKING_TYPES:
        raise DomainError("InvalidBookingType", "booking_type inválido.")

    if data.get("status") and data.get("status") not in VALID_STATUS:
        raise DomainError("InvalidBookingStatus", "status inválido.")

    start_at = data.get("start_at")
    end_at = data.get("end_at")

    _validate_dates(start_at, end_at)
    _check_overlap(variant, start_at, end_at)

    booking = VariantBooking.objects.create(
        variant=variant,
        booking_type=data.get("booking_type"),
        status=data.get("status", "pending"),
        start_at=start_at,
        end_at=end_at,
        actual_start_at=data.get("actual_start_at"),
        actual_end_at=data.get("actual_end_at"),
        title=data.get("title") or "Booking",
        notes=data.get("notes", ""),
        created_by_user=user
    )

    return booking

#=================List====================
def list_bookings(variant_id, user, filters=None):
    variant = _get_variant(variant_id, user)

    queryset = variant.bookings.exclude(status="cancelled").order_by("start_at")

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


#=================Detail====================
def get_booking(booking_id, user):
    try:
        booking = VariantBooking.objects.get(id=booking_id)
    except VariantBooking.DoesNotExist:
        raise DomainError("BookingNotFound", "Booking não encontrado.")

    _get_variant(booking.variant.id, user)

    return booking

#=================Update====================
@transaction.atomic
def update_booking(booking_id, user, **data):
    booking = get_booking(booking_id, user)

    if "variant" in data or "variant_id" in data:
        raise DomainError(
            "BookingVariantImmutable",
            "Não é permitido alterar a variante do booking."
        )

    if "booking_type" in data and data["booking_type"] not in VALID_BOOKING_TYPES:
        raise DomainError("InvalidBookingType", "booking_type inválido.")

    if "status" in data and data["status"] not in VALID_STATUS:
        raise DomainError("InvalidBookingStatus", "status inválido.")

    start_at = data.get("start_at", booking.start_at)
    end_at = data.get("end_at", booking.end_at)

    _validate_dates(start_at, end_at)
    _check_overlap(booking.variant, start_at, end_at, exclude_id=booking.id)

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

    booking.save()

    return booking


#=================Delete(Soft)====================
@transaction.atomic
def delete_booking(booking_id, user):
    booking = get_booking(booking_id, user)

    if booking.status in ["cancelled", "completed"]:
        return booking

    has_dependencies = False

    if has_dependencies:
        raise DomainError(
            "BookingHasCriticalDependencies",
            "Booking não pode ser removido por dependências críticas."
        )

    booking.status = "cancelled"
    booking.save()
    return booking