import logging
from datetime import timedelta

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound
from inventory.models import Product, ProductVariant, VariantBooking
from marketplace.models import Listing, ProductTransaction
from marketplace.services.listing_services import (
    _check_date_overlap,
    _compute_available_from,
    _get_listing_or_404,
)

logger = logging.getLogger(__name__)

_DATE_REQUIRED_TYPES = (
    ProductTransaction.TransactionType.RENT,
    ProductTransaction.TransactionType.LEND,
)

_BOOKING_TYPE_MAP = {
    ProductTransaction.TransactionType.RENT: VariantBooking.BookingType.RENT,
    ProductTransaction.TransactionType.SELL: VariantBooking.BookingType.SALE,
    ProductTransaction.TransactionType.LEND: VariantBooking.BookingType.LOAN,
    ProductTransaction.TransactionType.DONATE: VariantBooking.BookingType.DONATION,
}

_VARIANT_TERMINAL_STATUS_MAP = {
    ProductTransaction.TransactionType.SELL: ProductVariant.Status.SOLD,
    ProductTransaction.TransactionType.DONATE: ProductVariant.Status.DONATED,
}

# ---------------------------------------------------------------------------
# State machine — single source of truth
# ---------------------------------------------------------------------------

VALID_TRANSITIONS = {
    ProductTransaction.TransactionStatus.PENDING: [
        ProductTransaction.TransactionStatus.ACCEPTED,
        ProductTransaction.TransactionStatus.REJECTED,
        ProductTransaction.TransactionStatus.CANCELLED,
    ],
    ProductTransaction.TransactionStatus.ACCEPTED: [
        ProductTransaction.TransactionStatus.COMPLETED,
        ProductTransaction.TransactionStatus.CANCELLED,
        ProductTransaction.TransactionStatus.BLOCKED,
    ],
    ProductTransaction.TransactionStatus.BLOCKED: [
        ProductTransaction.TransactionStatus.ACCEPTED,
    ],
}


def _validate_transition(txn, target_status):
    allowed = VALID_TRANSITIONS.get(txn.status, [])
    if target_status not in allowed:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})


def _get_transaction_or_404(transaction_id):
    try:
        return ProductTransaction.objects.select_related(
            "listing", "variant__product", "requester", "owner"
        ).get(id=transaction_id)
    except ProductTransaction.DoesNotExist:
        raise AppNotFound("TransactionNotFound")


def _get_transaction_for_update(transaction_id):
    """Fetch with row-level lock for state transitions (prevents race conditions)."""
    try:
        return ProductTransaction.objects.select_for_update().get(id=transaction_id)
    except ProductTransaction.DoesNotExist:
        raise AppNotFound("TransactionNotFound")


def _assert_can_accept(*, user, txn):
    """Accept/reject permission: school items → staff; member items → item owner."""
    product = txn.variant.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("marketplace.manage_school_listings"):
            raise PermissionDenied()
    else:
        if txn.owner_id != user.id:
            raise PermissionDenied()


def _assert_can_cancel(*, user, txn):
    """Cancel: requester, owner (member items), or staff (school items)."""
    if user.id == txn.requester_id:
        return
    if txn.owner_id and user.id == txn.owner_id:
        return
    if not user.has_perm("marketplace.manage_school_listings"):
        raise PermissionDenied()


def list_transactions(*, filters=None):
    qs = ProductTransaction.objects.select_related(
        "listing", "variant__product", "requester", "owner"
    ).order_by("-created_at")

    if filters:
        if filters.get("status"):
            qs = qs.filter(status=filters["status"])
        if filters.get("transaction_type"):
            qs = qs.filter(transaction_type=filters["transaction_type"])
    return qs


def list_my_transactions(*, user):
    from django.db.models import Q

    return (
        ProductTransaction.objects.filter(Q(requester=user) | Q(owner=user))
        .select_related("listing", "variant__product", "requester", "owner")
        .order_by("-created_at")
    )


def get_transaction(*, transaction_id):
    return _get_transaction_or_404(transaction_id)


def get_my_transaction(*, transaction_id, user):
    """Retrieve a transaction scoped to the requesting user (requester or owner)."""
    txn = _get_transaction_or_404(transaction_id)
    if txn.requester_id != user.id and txn.owner_id != user.id:
        raise PermissionDenied()
    return txn


@transaction.atomic
def request_transaction(*, user, **data):
    listing_id = data.get("listing_id")
    listing = _get_listing_or_404(listing_id)

    if listing.status != Listing.ListingStatus.ACTIVE:
        raise ValidationError({"messages": ["ListingNotActive"]})

    variant = listing.variant
    transaction_type = listing.listing_type  # mirrors listing type

    start_at = data.get("start_at")
    end_at = data.get("end_at")

    # Lock the variant row to serialise concurrent overlap checks (race condition guard).
    ProductVariant.objects.select_for_update().get(id=variant.id)

    if transaction_type in _DATE_REQUIRED_TYPES:
        if not start_at or not end_at:
            raise ValidationError({"messages": ["DatesRequiredForRentOrLend"]})
        if start_at >= end_at:
            raise ValidationError({"messages": ["InvalidDateRange"]})
        _check_date_overlap(variant=variant, start_at=start_at, end_at=end_at)
    else:
        # SELL / DONATE — compute start_at as next available slot
        start_at = _compute_available_from(variant)
        end_at = start_at + timedelta(days=1)

    owner = variant.product.owner  # None for school items — staff acts via permission

    txn = ProductTransaction(
        listing=listing,
        variant=variant,
        transaction_type=transaction_type,
        status=ProductTransaction.TransactionStatus.PENDING,
        requester=user,
        owner=owner,
        start_at=start_at,
        end_at=end_at,
        notes=data.get("notes", ""),
        created_by=user,
    )
    txn.full_clean()
    txn.save()

    # Create a PENDING booking to lock the variant window immediately
    booking_type = _BOOKING_TYPE_MAP[transaction_type]
    booking = VariantBooking(
        variant=variant,
        listing=listing,
        transaction=txn,
        booking_type=booking_type,
        status=VariantBooking.Status.PENDING,
        start_at=start_at,
        end_at=end_at,
        title=f"Transaction {txn.pk}",
        created_by=user,
    )
    booking.full_clean()
    booking.save()

    logger.info(
        "Transaction %s created (type=%s) by user %s, booking %s created",
        txn.pk,
        transaction_type,
        user.pk,
        booking.pk,
    )
    return txn


@transaction.atomic
def accept_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_accept(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.ACCEPTED)

    txn.status = ProductTransaction.TransactionStatus.ACCEPTED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status=VariantBooking.Status.PENDING,
    ).update(status=VariantBooking.Status.CONFIRMED)

    logger.info("Transaction %s accepted by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def reject_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_accept(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.REJECTED)

    txn.status = ProductTransaction.TransactionStatus.REJECTED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status=VariantBooking.Status.PENDING,
    ).update(status=VariantBooking.Status.CANCELLED)

    logger.info("Transaction %s rejected by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def complete_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_accept(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.COMPLETED)

    txn.status = ProductTransaction.TransactionStatus.COMPLETED
    txn.recorded_by = user
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status=VariantBooking.Status.CONFIRMED,
    ).update(status=VariantBooking.Status.COMPLETED)

    # Update variant status for terminal types
    terminal_status = _VARIANT_TERMINAL_STATUS_MAP.get(txn.transaction_type)
    if terminal_status:
        variant = ProductVariant.objects.select_for_update().get(id=txn.variant_id)
        variant.status = terminal_status
        variant.updated_by = user
        variant.save()

        if txn.listing_id:
            listing = Listing.objects.select_for_update().get(id=txn.listing_id)
            listing.status = Listing.ListingStatus.CLOSED
            listing.is_public = False
            listing.updated_by = user
            listing.save()

    # Create billing entry for any priced transaction
    from billing.services import create_billing_entry_for_transaction

    create_billing_entry_for_transaction(transaction=txn, user=user)

    logger.info("Transaction %s completed by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def cancel_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_cancel(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.CANCELLED)

    txn.status = ProductTransaction.TransactionStatus.CANCELLED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status__in=[VariantBooking.Status.PENDING, VariantBooking.Status.CONFIRMED],
    ).update(status=VariantBooking.Status.CANCELLED)

    logger.info("Transaction %s cancelled by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def block_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_accept(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.BLOCKED)

    txn.status = ProductTransaction.TransactionStatus.BLOCKED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status=VariantBooking.Status.CONFIRMED,
    ).update(status=VariantBooking.Status.BLOCKED)

    logger.info("Transaction %s blocked by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def unblock_transaction(*, transaction_id, user):
    txn = _get_transaction_for_update(transaction_id)
    _assert_can_accept(user=user, txn=txn)
    _validate_transition(txn, ProductTransaction.TransactionStatus.ACCEPTED)

    txn.status = ProductTransaction.TransactionStatus.ACCEPTED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        transaction=txn,
        status=VariantBooking.Status.BLOCKED,
    ).update(status=VariantBooking.Status.CONFIRMED)

    logger.info("Transaction %s unblocked by user %s", transaction_id, user.pk)
    return txn
