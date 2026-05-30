import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound
from inventory.models import Product, ProductVariant, VariantBooking
from marketplace.models import Listing, ListingOffer, ProductTransaction
from marketplace.services.listing_services import (
    _NON_LISTABLE_STATUSES,
    _check_date_overlap,
    _compute_available_from,
    _get_listing_or_404,
)
from marketplace.services.transaction_services import (
    _BOOKING_TYPE_MAP,
    _DATE_REQUIRED_TYPES,
    _VARIANT_TERMINAL_STATUS_MAP,
)
from messaging.services import create_listing_conversation, send_message, _emit_system_message

logger = logging.getLogger(__name__)

_ACTIVE_OFFER_STATUSES = (
    ListingOffer.Status.OPEN,
    ListingOffer.Status.NEGOTIATING,
)


def _get_offer_or_404(offer_id):
    try:
        return ListingOffer.objects.select_related(
            "listing__product",
            "variant__product",
            "variant__size",
            "buyer",
            "conversation",
            "transaction",
        ).get(id=offer_id)
    except ListingOffer.DoesNotExist:
        raise AppNotFound("ListingOfferNotFound")


def _get_offer_for_update(offer_id):
    """Lock row for update. Avoid nullable FK joins — PostgreSQL rejects
    FOR UPDATE on the nullable side of outer joins (e.g. variant)."""
    try:
        return ListingOffer.objects.select_for_update().get(id=offer_id)
    except ListingOffer.DoesNotExist:
        raise AppNotFound("ListingOfferNotFound")


def get_variant_photo_url(*, variant, request=None):
    """Primary image for a variant: variant media, then product primary."""
    if variant is None:
        return None

    link = (
        variant.media_links.filter(deleted_at__isnull=True)
        .select_related("product_media")
        .order_by("pk")
        .first()
    )
    if link and link.product_media.image:
        url = link.product_media.image.url
        return request.build_absolute_uri(url) if request else url

    product = variant.product
    pm = product.media.filter(
        deleted_at__isnull=True, is_primary=True
    ).first()
    if pm is None:
        pm = product.media.filter(deleted_at__isnull=True).order_by(
            "sort_order", "pk"
        ).first()
    if pm and pm.image:
        url = pm.image.url
        return request.build_absolute_uri(url) if request else url
    return None


def get_listing_conversation_photo_url(*, conversation, request=None):
    """Thumbnail for a listing thread — variant image, else product primary."""
    if conversation.variant_id and getattr(conversation, "variant", None):
        url = get_variant_photo_url(variant=conversation.variant, request=request)
        if url:
            return url
    listing = getattr(conversation, "listing", None)
    if listing is None:
        return None
    product = listing.product
    pm = product.media.filter(
        deleted_at__isnull=True, is_primary=True
    ).first()
    if pm is None:
        pm = product.media.filter(deleted_at__isnull=True).order_by(
            "sort_order", "pk"
        ).first()
    if pm and pm.image:
        url = pm.image.url
        return request.build_absolute_uri(url) if request else url
    return None


def _resolve_seller_user(*, listing):
    owner = listing.product.owner
    if owner is not None:
        return owner
    return listing.created_by


def _assert_not_own_listing(*, user, listing):
    product = listing.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if user.has_perm("marketplace.manage_school_listings"):
            raise ValidationError({"messages": ["CannotOfferOnOwnListing"]})
    elif product.owner_id == user.id:
        raise ValidationError({"messages": ["CannotOfferOnOwnListing"]})


def _assert_can_view_offer(*, user, offer):
    seller = _resolve_seller_user(listing=offer.listing)
    if user.id == offer.buyer_id:
        return
    if seller and user.id == seller.id:
        return
    product = offer.listing.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if user.has_perm("marketplace.manage_school_listings"):
            return
    raise PermissionDenied()


def _assert_can_manage_offer(*, user, offer):
    """Seller-side actions: accept/reject/complete."""
    seller = _resolve_seller_user(listing=offer.listing)
    if seller and user.id == seller.id:
        return
    product = offer.listing.product
    if product.owner_type == Product.OwnerType.SCHOOL:
        if user.has_perm("marketplace.manage_school_listings"):
            return
    raise PermissionDenied()


def _assert_can_update_offer(*, user, offer):
    if offer.status not in _ACTIVE_OFFER_STATUSES:
        raise ValidationError({"messages": ["OfferNotEditable"]})
    _assert_can_view_offer(user=user, offer=offer)


def _validate_variant_for_listing(*, listing, variant_id, required=True):
    if variant_id is None:
        if required:
            raise ValidationError({"messages": ["VariantRequired"]})
        return None
    try:
        variant = ProductVariant.objects.select_related("product").get(
            id=variant_id, product=listing.product
        )
    except ProductVariant.DoesNotExist:
        raise ValidationError({"messages": ["VariantNotInListing"]})
    if variant.status in _NON_LISTABLE_STATUSES:
        raise ValidationError({"messages": ["VariantNotAvailable"]})
    return variant


def _validate_offer_dates(*, listing, start_at, end_at):
    if listing.listing_type not in _DATE_REQUIRED_TYPES:
        return None, None
    if not start_at or not end_at:
        raise ValidationError({"messages": ["DatesRequiredForRentOrLend"]})
    if start_at >= end_at:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    return start_at, end_at


def _emit_offer_system_message(*, offer, event, actor, **fields):
    _emit_system_message(
        conversation=offer.conversation,
        actor=actor,
        event=event,
        offer_id=offer.pk,
        **fields,
    )


@transaction.atomic
def create_listing_offer(*, user, listing_id, **data):
    listing = _get_listing_or_404(listing_id)

    if listing.status != Listing.ListingStatus.ACTIVE:
        raise ValidationError({"messages": ["ListingNotActive"]})

    _assert_not_own_listing(user=user, listing=listing)

    is_inquiry = bool(data.get("is_inquiry", False))
    variant = _validate_variant_for_listing(
        listing=listing,
        variant_id=data.get("variant_id"),
        required=not is_inquiry,
    )

    start_at = data.get("start_at")
    end_at = data.get("end_at")
    if not is_inquiry and variant is not None:
        start_at, end_at = _validate_offer_dates(
            listing=listing, start_at=start_at, end_at=end_at
        )

    seller = _resolve_seller_user(listing=listing)
    if seller is None:
        raise ValidationError({"messages": ["ListingSellerUnavailable"]})

    conversation = create_listing_conversation(
        listing=listing,
        variant=variant,
        buyer=user,
        seller=seller,
        created_by=user,
    )

    message_text = (data.get("message") or "").strip()
    offer = ListingOffer(
        listing=listing,
        variant=variant,
        buyer=user,
        conversation=conversation,
        offered_price=data.get("offered_price"),
        start_at=start_at,
        end_at=end_at,
        message=message_text,
        status=ListingOffer.Status.OPEN,
        is_inquiry=is_inquiry,
        created_by=user,
    )
    offer.full_clean()
    offer.save()

    if message_text:
        send_message(
            conversation=conversation,
            sender=user,
            body=message_text,
        )

    _emit_offer_system_message(
        offer=offer,
        event="listing_offer_created",
        actor=user,
    )

    logger.info(
        "Listing offer %s created by user %s on listing %s (conversation %s)",
        offer.pk,
        user.pk,
        listing.pk,
        conversation.pk,
    )
    return offer


def get_listing_offer(*, offer_id, user):
    offer = _get_offer_or_404(offer_id)
    _assert_can_view_offer(user=user, offer=offer)
    return offer


@transaction.atomic
def update_listing_offer(*, offer_id, user, **data):
    offer = _get_offer_for_update(offer_id)
    _assert_can_update_offer(user=user, offer=offer)

    if "offered_price" in data:
        offer.offered_price = data["offered_price"]
    if "start_at" in data:
        offer.start_at = data["start_at"]
    if "end_at" in data:
        offer.end_at = data["end_at"]
    if "message" in data:
        offer.message = data["message"] or ""

    if offer.variant_id and not offer.is_inquiry:
        offer.start_at, offer.end_at = _validate_offer_dates(
            listing=offer.listing,
            start_at=offer.start_at,
            end_at=offer.end_at,
        )

    if offer.status == ListingOffer.Status.OPEN:
        offer.status = ListingOffer.Status.NEGOTIATING

    offer.updated_by = user
    offer.full_clean()
    offer.save()

    _emit_offer_system_message(
        offer=offer,
        event="listing_offer_updated",
        actor=user,
    )
    return offer


@transaction.atomic
def reject_listing_offer(*, offer_id, user):
    offer = _get_offer_for_update(offer_id)
    _assert_can_manage_offer(user=user, offer=offer)
    if offer.status not in _ACTIVE_OFFER_STATUSES:
        raise ValidationError({"messages": ["OfferNotRejectable"]})

    offer.status = ListingOffer.Status.REJECTED
    offer.updated_by = user
    offer.save()

    _emit_offer_system_message(
        offer=offer,
        event="listing_offer_rejected",
        actor=user,
    )
    return offer


@transaction.atomic
def cancel_listing_offer(*, offer_id, user):
    offer = _get_offer_for_update(offer_id)
    if offer.buyer_id != user.id:
        raise PermissionDenied()
    if offer.status not in _ACTIVE_OFFER_STATUSES:
        raise ValidationError({"messages": ["OfferNotCancellable"]})

    offer.status = ListingOffer.Status.CANCELLED
    offer.updated_by = user
    offer.save()

    _emit_offer_system_message(
        offer=offer,
        event="listing_offer_cancelled",
        actor=user,
    )
    return offer


@transaction.atomic
def complete_listing_offer(*, offer_id, user):
    offer = _get_offer_for_update(offer_id)
    _assert_can_manage_offer(user=user, offer=offer)

    if offer.status not in _ACTIVE_OFFER_STATUSES:
        raise ValidationError({"messages": ["OfferNotCompletable"]})

    if offer.is_inquiry or offer.variant_id is None:
        raise ValidationError({"messages": ["InquiryCannotComplete"]})

    listing = offer.listing
    variant = ProductVariant.objects.select_for_update().select_related(
        "product"
    ).get(id=offer.variant_id)

    if variant.status in _NON_LISTABLE_STATUSES:
        raise ValidationError({"messages": ["VariantNotAvailable"]})

    transaction_type = listing.listing_type
    start_at = offer.start_at
    end_at = offer.end_at

    if transaction_type in _DATE_REQUIRED_TYPES:
        if not start_at or not end_at:
            raise ValidationError({"messages": ["DatesRequiredForRentOrLend"]})
        _check_date_overlap(variant=variant, start_at=start_at, end_at=end_at)
    else:
        start_at = _compute_available_from(variant)
        end_at = start_at + timedelta(days=1)

    owner = variant.product.owner

    txn = ProductTransaction(
        listing=listing,
        variant=variant,
        transaction_type=transaction_type,
        status=ProductTransaction.TransactionStatus.ACCEPTED,
        requester=offer.buyer,
        owner=owner,
        agreed_price=offer.offered_price if offer.offered_price is not None else listing.asking_price,
        start_at=start_at,
        end_at=end_at,
        notes=offer.message,
        created_by=user,
        updated_by=user,
    )
    txn.full_clean()
    txn.save()

    booking_type = _BOOKING_TYPE_MAP[transaction_type]
    booking = VariantBooking(
        variant=variant,
        listing=listing,
        transaction=txn,
        booking_type=booking_type,
        status=VariantBooking.Status.CONFIRMED,
        start_at=start_at,
        end_at=end_at,
        title=f"Transaction {txn.pk}",
        approved_by_user=user,
        created_by=user,
    )
    booking.full_clean()
    booking.save()

    offer.status = ListingOffer.Status.COMPLETED
    offer.transaction = txn
    offer.start_at = start_at
    offer.end_at = end_at
    offer.updated_by = user
    offer.save()

    _emit_offer_system_message(
        offer=offer,
        event="listing_offer_completed",
        actor=user,
        transaction_id=txn.pk,
    )

    logger.info(
        "Listing offer %s completed → transaction %s, booking %s",
        offer.pk,
        txn.pk,
        booking.pk,
    )

    terminal_status = _VARIANT_TERMINAL_STATUS_MAP.get(transaction_type)
    if terminal_status:
        from marketplace.services.transaction_services import complete_transaction

        txn = complete_transaction(transaction_id=txn.pk, user=user)

    return offer
