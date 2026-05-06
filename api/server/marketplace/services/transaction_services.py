import logging

from django.db import transaction
from django.utils import timezone
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


def _get_transaction_or_404(transaction_id):
    try:
        return ProductTransaction.objects.get(id=transaction_id)
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
    """Cancel: requester or owner."""
    if user.id not in (txn.requester_id, txn.owner_id):
        if not user.has_perm("marketplace.manage_school_listings"):
            raise PermissionDenied()


def list_transactions(*, user, filters=None):
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
        .select_related("listing", "variant__product")
        .order_by("-created_at")
    )


def get_transaction(*, transaction_id):
    return _get_transaction_or_404(transaction_id)


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

    if transaction_type in _DATE_REQUIRED_TYPES:
        if not start_at or not end_at:
            raise ValidationError({"messages": ["DatesRequiredForRentOrLend"]})
        if start_at >= end_at:
            raise ValidationError({"messages": ["InvalidDateRange"]})
        _check_date_overlap(variant=variant, start_at=start_at, end_at=end_at)
    else:
        # SELL / DONATE — compute start_at as next available slot
        start_at = _compute_available_from(variant)
        end_at = start_at  # point-in-time booking

    owner = (
        variant.product.owner or user
    )  # fallback for school items resolved at accept time

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
    txn.save()

    # Create a PENDING booking to lock the variant window immediately
    booking_type = _BOOKING_TYPE_MAP[transaction_type]
    booking = VariantBooking(
        variant=variant,
        listing=listing,
        booking_type=booking_type,
        status=VariantBooking.Status.PENDING,
        start_at=start_at,
        end_at=(
            end_at
            if end_at != start_at
            else timezone.now() + __import__("datetime").timedelta(minutes=1)
        ),
        title=f"Transaction {txn.pk}",
        created_by=user,
    )
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
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_accept(user=user, txn=txn)

    if txn.status != ProductTransaction.TransactionStatus.PENDING:
        raise ValidationError({"messages": ["TransactionNotPending"]})

    txn.status = ProductTransaction.TransactionStatus.ACCEPTED
    txn.updated_by = user
    txn.save()

    # Advance the linked booking to CONFIRMED
    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status=VariantBooking.Status.PENDING,
    ).update(status=VariantBooking.Status.CONFIRMED)

    logger.info("Transaction %s accepted by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def reject_transaction(*, transaction_id, user):
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_accept(user=user, txn=txn)

    if txn.status != ProductTransaction.TransactionStatus.PENDING:
        raise ValidationError({"messages": ["TransactionNotPending"]})

    txn.status = ProductTransaction.TransactionStatus.REJECTED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status=VariantBooking.Status.PENDING,
    ).update(status=VariantBooking.Status.CANCELLED)

    logger.info("Transaction %s rejected by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def complete_transaction(*, transaction_id, user):
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_accept(user=user, txn=txn)

    if txn.status != ProductTransaction.TransactionStatus.ACCEPTED:
        raise ValidationError({"messages": ["TransactionNotAccepted"]})

    txn.status = ProductTransaction.TransactionStatus.COMPLETED
    txn.recorded_by = user
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status=VariantBooking.Status.CONFIRMED,
    ).update(status=VariantBooking.Status.COMPLETED)

    # Update variant status for terminal types
    terminal_status = _VARIANT_TERMINAL_STATUS_MAP.get(txn.transaction_type)
    if terminal_status:
        txn.variant.status = terminal_status
        txn.variant.updated_by = user
        txn.variant.save()

        # Close associated listing
        Listing.objects.filter(id=txn.listing_id).update(
            status=Listing.ListingStatus.CLOSED
        )

    # Create billing entry for any priced transaction
    from billing.services import create_billing_entry_for_transaction

    create_billing_entry_for_transaction(transaction=txn, user=user)

    logger.info("Transaction %s completed by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def cancel_transaction(*, transaction_id, user):
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_cancel(user=user, txn=txn)

    if txn.status not in (
        ProductTransaction.TransactionStatus.PENDING,
        ProductTransaction.TransactionStatus.ACCEPTED,
    ):
        raise ValidationError({"messages": ["TransactionCannotBeCancelled"]})

    txn.status = ProductTransaction.TransactionStatus.CANCELLED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status__in=[VariantBooking.Status.PENDING, VariantBooking.Status.CONFIRMED],
    ).update(status=VariantBooking.Status.CANCELLED)

    logger.info("Transaction %s cancelled by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def block_transaction(*, transaction_id, user):
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_accept(user=user, txn=txn)

    if txn.status != ProductTransaction.TransactionStatus.ACCEPTED:
        raise ValidationError({"messages": ["TransactionNotAccepted"]})

    txn.status = ProductTransaction.TransactionStatus.BLOCKED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status=VariantBooking.Status.CONFIRMED,
    ).update(status=VariantBooking.Status.BLOCKED)

    logger.info("Transaction %s blocked by user %s", transaction_id, user.pk)
    return txn


@transaction.atomic
def unblock_transaction(*, transaction_id, user):
    txn = _get_transaction_or_404(transaction_id)
    _assert_can_accept(user=user, txn=txn)

    if txn.status != ProductTransaction.TransactionStatus.BLOCKED:
        raise ValidationError({"messages": ["TransactionNotBlocked"]})

    txn.status = ProductTransaction.TransactionStatus.ACCEPTED
    txn.updated_by = user
    txn.save()

    VariantBooking.objects.filter(
        listing=txn.listing,
        variant=txn.variant,
        status=VariantBooking.Status.BLOCKED,
    ).update(status=VariantBooking.Status.CONFIRMED)

    logger.info("Transaction %s unblocked by user %s", transaction_id, user.pk)
    return txn
