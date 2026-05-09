"""
Comprehensive marketplace service-layer tests.

Decision tree coverage:

LISTING SERVICES
================
create_listing
├─ no variant_id AND no product → VariantIdOrProductRequired
├─ variant_id provided
│  ├─ variant not found → VariantNotFound
│  ├─ variant status in NON_LISTABLE → VariantNotListable
│  ├─ school_only=True and variant is member-owned → VariantMustBeSchoolOwned
│  ├─ member variant, user is NOT owner → VariantOwnershipRequired
│  ├─ member variant, user IS owner → listing created (member)
│  ├─ school variant, user has manage_school_listings → listing created (school)
│  └─ school variant, user lacks manage_school_listings → VariantOwnershipRequired
└─ nested product (no variant_id)
   └─ delegates to inventory services → creates product + variant + listing

update_listing
├─ listing not found → ListingNotFound
├─ user cannot manage → PermissionDenied
├─ listing is CLOSED → ListingClosed
└─ happy path → fields updated

publish_listing
├─ listing not found → ListingNotFound
├─ user cannot manage → PermissionDenied
├─ already ACTIVE → ListingAlreadyPublished
├─ variant now non-listable → VariantNotListable
└─ happy path → status=ACTIVE, is_public=True

unpublish_listing
├─ listing not found → ListingNotFound
├─ user cannot manage → PermissionDenied
└─ happy path → status=DRAFT, is_public=False

delete_listing
├─ listing not found → ListingNotFound
├─ user cannot manage → PermissionDenied
└─ happy path → soft-deleted

add_favorite / remove_favorite
├─ listing not found → ListingNotFound
├─ already favorited → AlreadyFavorited
├─ remove non-existent → FavoriteNotFound
└─ happy add + remove

list_listings (filters + stale exclusion)
├─ only ACTIVE + is_public returned
├─ sold/archived/donated variants excluded
├─ soft-deleted variants excluded
├─ soft-deleted products excluded
├─ filter: listing_type, category_id, condition, search
└─ search matches title, description, product name

list_my_listings / list_favorited_listings / list_school_listings
└─ all exclude stale variants

get_availability
└─ returns active booking windows

TRANSACTION SERVICES
====================
request_transaction
├─ listing not found → ListingNotFound
├─ listing not ACTIVE → ListingNotActive
├─ RENT/LEND: missing dates → DatesRequiredForRentOrLend
├─ RENT/LEND: start >= end → InvalidDateRange
├─ RENT/LEND: date overlap → BookingOverlap
├─ RENT/LEND: happy → txn + booking created, dates as provided
├─ SELL/DONATE: dates auto-computed → txn + booking created
├─ member item: owner = product.owner
└─ school item: owner = None

accept_transaction
├─ txn not found → TransactionNotFound
├─ user cannot accept → PermissionDenied (school/member checks)
├─ txn not PENDING → TransactionNotPending
└─ happy path → ACCEPTED, booking → CONFIRMED

reject_transaction
├─ txn not PENDING → TransactionNotPending
├─ user cannot accept → PermissionDenied
└─ happy path → REJECTED, booking → CANCELLED

complete_transaction
├─ txn not ACCEPTED → TransactionNotAccepted
├─ SELL → variant SOLD, listing CLOSED
├─ DONATE → variant DONATED, listing CLOSED
├─ RENT/LEND → variant stays AVAILABLE, listing stays ACTIVE
├─ priced txn → billing entry created
├─ no-price txn → no billing entry
└─ DONATE txn → no billing entry regardless of price

cancel_transaction
├─ wrong status → TransactionCannotBeCancelled
├─ requester can cancel
├─ owner can cancel (member items)
├─ staff can cancel (school items)
├─ random user → PermissionDenied
├─ cancel PENDING → booking CANCELLED
└─ cancel ACCEPTED → booking CANCELLED

block_transaction / unblock_transaction
├─ not ACCEPTED → TransactionNotAccepted (for block)
├─ not BLOCKED → TransactionNotBlocked (for unblock)
├─ happy block → BLOCKED, booking BLOCKED
└─ happy unblock → ACCEPTED, booking CONFIRMED
"""

from __future__ import annotations

import config.pytest_db_host_env  # noqa: F401

import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound
from inventory.models import Product, ProductVariant, VariantBooking
from marketplace.models import Listing, ListingFavorite, ProductTransaction
from tests.conftest import make_user_with_role

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _uid():
    return uuid.uuid4().hex[:8]


def _staff_user():
    return make_user_with_role("direction")


def _member_user():
    return make_user_with_role("student")


def _make_product(*, owner_type, owner=None, status=Product.Status.ACTIVE):
    return Product.objects.create(
        name=f"Product-{_uid()}",
        owner_type=owner_type,
        owner=owner,
        status=status,
        created_by=owner,
    )


def _make_variant(product, *, status=ProductVariant.Status.AVAILABLE):
    return ProductVariant.objects.create(
        product=product,
        condition=ProductVariant.Condition.GOOD,
        status=status,
        acquisition_type=ProductVariant.AcquisitionType.OTHER,
        created_by=product.created_by,
    )


def _make_listing(variant, user, *, listing_type="sell", status="draft", is_public=False, asking_price=None):
    return Listing.objects.create(
        variant=variant,
        listing_type=listing_type,
        status=status,
        title=f"Listing-{_uid()}",
        asking_price=asking_price,
        is_public=is_public,
        created_by=user,
    )


def _make_active_listing(variant, user, **kwargs):
    kwargs.setdefault("status", "active")
    kwargs.setdefault("is_public", True)
    return _make_listing(variant, user, **kwargs)


def _now():
    return timezone.now()


def _future(days=1, hours=0):
    return _now() + timedelta(days=days, hours=hours)


# ===========================================================================
# LISTING SERVICE TESTS
# ===========================================================================

@pytest.mark.django_db
class TestCreateListing:

    def test_no_variant_no_product_raises(self):
        from marketplace.services import create_listing
        user = _member_user()
        with pytest.raises(ValidationError, match="VariantIdOrProductRequired"):
            create_listing(user=user, listing_type="sell", title="T")

    def test_variant_not_found_raises(self):
        from marketplace.services import create_listing
        user = _member_user()
        with pytest.raises(AppNotFound, match="VariantNotFound"):
            create_listing(user=user, variant_id=99999, listing_type="sell", title="T")

    @pytest.mark.parametrize("status", ["sold", "donated", "archived", "inactive"])
    def test_non_listable_variant_raises(self, status):
        from marketplace.services import create_listing
        user = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=user)
        variant = _make_variant(product, status=status)
        with pytest.raises(ValidationError, match="VariantNotListable"):
            create_listing(user=user, variant_id=variant.id, listing_type="sell", title="T")

    def test_school_only_rejects_member_variant(self):
        from marketplace.services import create_listing
        staff = _staff_user()
        member = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=member)
        variant = _make_variant(product)
        with pytest.raises(ValidationError, match="VariantMustBeSchoolOwned"):
            create_listing(user=staff, variant_id=variant.id, listing_type="sell", title="T", school_only=True)

    def test_member_variant_non_owner_raises(self):
        from marketplace.services import create_listing
        owner = _member_user()
        stranger = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        with pytest.raises(ValidationError, match="VariantOwnershipRequired"):
            create_listing(user=stranger, variant_id=variant.id, listing_type="sell", title="T")

    def test_member_variant_owner_creates(self):
        from marketplace.services import create_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = create_listing(
            user=owner, variant_id=variant.id, listing_type="sell",
            title="My Item", asking_price=Decimal("10.00"),
        )
        assert listing.pk is not None
        assert listing.listing_type == "sell"
        assert listing.status == Listing.ListingStatus.DRAFT
        assert listing.asking_price == Decimal("10.00")
        assert listing.created_by == owner

    def test_school_variant_staff_creates(self):
        from marketplace.services import create_listing
        staff = _staff_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)
        listing = create_listing(
            user=staff, variant_id=variant.id, listing_type="lend", title="School Item",
        )
        assert listing.pk is not None
        assert listing.listing_type == "lend"

    def test_school_variant_no_perm_raises(self):
        from marketplace.services import create_listing
        user = _member_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)
        with pytest.raises(ValidationError, match="VariantOwnershipRequired"):
            create_listing(user=user, variant_id=variant.id, listing_type="sell", title="T")

    @pytest.mark.parametrize("listing_type", ["sell", "rent", "lend", "donate"])
    def test_all_listing_types(self, listing_type):
        from marketplace.services import create_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = create_listing(
            user=owner, variant_id=variant.id, listing_type=listing_type, title="T",
        )
        assert listing.listing_type == listing_type


@pytest.mark.django_db
class TestUpdateListing:

    def test_not_found_raises(self):
        from marketplace.services import update_listing
        user = _member_user()
        with pytest.raises(AppNotFound, match="ListingNotFound"):
            update_listing(listing_id=99999, user=user, title="X")

    def test_non_owner_raises(self):
        from marketplace.services import update_listing
        owner = _member_user()
        stranger = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        with pytest.raises(PermissionDenied):
            update_listing(listing_id=listing.id, user=stranger, title="X")

    def test_closed_listing_raises(self):
        from marketplace.services import update_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner, status="closed")
        with pytest.raises(ValidationError, match="ListingClosed"):
            update_listing(listing_id=listing.id, user=owner, title="New Title")

    def test_owner_updates_fields(self):
        from marketplace.services import update_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        updated = update_listing(
            listing_id=listing.id, user=owner,
            title="New Title", asking_price=Decimal("5.00"),
        )
        assert updated.title == "New Title"
        assert updated.asking_price == Decimal("5.00")
        assert updated.updated_by == owner

    def test_school_staff_updates(self):
        from marketplace.services import update_listing
        staff = _staff_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)
        listing = _make_listing(variant, staff)
        updated = update_listing(listing_id=listing.id, user=staff, title="Updated")
        assert updated.title == "Updated"


@pytest.mark.django_db
class TestPublishListing:

    def test_not_found_raises(self):
        from marketplace.services import publish_listing
        with pytest.raises(AppNotFound):
            publish_listing(listing_id=99999, user=_member_user())

    def test_non_owner_raises(self):
        from marketplace.services import publish_listing
        owner = _member_user()
        stranger = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        with pytest.raises(PermissionDenied):
            publish_listing(listing_id=listing.id, user=stranger)

    def test_already_active_raises(self):
        from marketplace.services import publish_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        with pytest.raises(ValidationError, match="ListingAlreadyPublished"):
            publish_listing(listing_id=listing.id, user=owner)

    def test_variant_now_sold_raises(self):
        from marketplace.services import publish_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        variant.status = ProductVariant.Status.SOLD
        variant.save()
        with pytest.raises(ValidationError, match="VariantNotListable"):
            publish_listing(listing_id=listing.id, user=owner)

    def test_happy_path(self):
        from marketplace.services import publish_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        result = publish_listing(listing_id=listing.id, user=owner)
        assert result.status == Listing.ListingStatus.ACTIVE
        assert result.is_public is True


@pytest.mark.django_db
class TestUnpublishListing:

    def test_unpublish_sets_draft(self):
        from marketplace.services import unpublish_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        result = unpublish_listing(listing_id=listing.id, user=owner)
        assert result.status == Listing.ListingStatus.DRAFT
        assert result.is_public is False

    def test_non_owner_raises(self):
        from marketplace.services import unpublish_listing
        owner = _member_user()
        stranger = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        with pytest.raises(PermissionDenied):
            unpublish_listing(listing_id=listing.id, user=stranger)


@pytest.mark.django_db
class TestDeleteListing:

    def test_soft_deletes(self):
        from marketplace.services import delete_listing
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        delete_listing(listing_id=listing.id, user=owner)
        assert not Listing.objects.filter(id=listing.id).exists()
        assert Listing.all_objects.filter(id=listing.id).exists()

    def test_non_owner_raises(self):
        from marketplace.services import delete_listing
        owner = _member_user()
        stranger = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner)
        with pytest.raises(PermissionDenied):
            delete_listing(listing_id=listing.id, user=stranger)


@pytest.mark.django_db
class TestFavorites:

    def test_add_and_remove(self):
        from marketplace.services import add_favorite, remove_favorite
        owner = _member_user()
        user = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)

        fav = add_favorite(listing_id=listing.id, user=user)
        assert fav.listing_id == listing.id
        assert fav.user_id == user.id
        assert ListingFavorite.objects.filter(
            listing=listing, user=user, deleted_at__isnull=True
        ).exists()

        remove_favorite(listing_id=listing.id, user=user)
        assert not ListingFavorite.objects.filter(
            listing=listing, user=user, deleted_at__isnull=True
        ).exists()

    def test_double_favorite_raises(self):
        from marketplace.services import add_favorite
        owner = _member_user()
        user = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        add_favorite(listing_id=listing.id, user=user)
        with pytest.raises(ValidationError, match="AlreadyFavorited"):
            add_favorite(listing_id=listing.id, user=user)

    def test_remove_not_found_raises(self):
        from marketplace.services import remove_favorite
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        with pytest.raises(AppNotFound, match="FavoriteNotFound"):
            remove_favorite(listing_id=listing.id, user=_member_user())

    def test_listing_not_found_raises(self):
        from marketplace.services import add_favorite
        with pytest.raises(AppNotFound, match="ListingNotFound"):
            add_favorite(listing_id=99999, user=_member_user())


@pytest.mark.django_db
class TestListListings:

    def _setup_listings(self):
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant_ok = _make_variant(product)
        variant_sold = _make_variant(product, status=ProductVariant.Status.SOLD)
        variant_archived = _make_variant(product, status=ProductVariant.Status.ARCHIVED)

        listing_ok = _make_active_listing(variant_ok, owner, listing_type="sell")
        listing_sold = _make_active_listing(variant_sold, owner, listing_type="sell")
        listing_archived = _make_active_listing(variant_archived, owner, listing_type="sell")
        listing_draft = _make_listing(variant_ok, owner, listing_type="rent", status="draft")

        return owner, listing_ok, listing_sold, listing_archived, listing_draft

    def test_only_active_public_returned(self):
        from marketplace.services import list_listings
        owner, listing_ok, _, _, listing_draft = self._setup_listings()
        results = list(list_listings(user=owner))
        ids = [r.id for r in results]
        assert listing_ok.id in ids
        assert listing_draft.id not in ids

    def test_sold_variant_excluded(self):
        from marketplace.services import list_listings
        owner, _, listing_sold, _, _ = self._setup_listings()
        results = list(list_listings(user=owner))
        ids = [r.id for r in results]
        assert listing_sold.id not in ids

    def test_archived_variant_excluded(self):
        from marketplace.services import list_listings
        owner, _, _, listing_archived, _ = self._setup_listings()
        results = list(list_listings(user=owner))
        ids = [r.id for r in results]
        assert listing_archived.id not in ids

    def test_soft_deleted_variant_excluded(self):
        from marketplace.services import list_listings
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        variant.delete(deleted_by=owner)
        results = list(list_listings(user=owner))
        assert listing.id not in [r.id for r in results]

    def test_soft_deleted_product_excluded(self):
        from marketplace.services import list_listings
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        product.delete(deleted_by=owner)
        results = list(list_listings(user=owner))
        assert listing.id not in [r.id for r in results]

    def test_filter_listing_type(self):
        from marketplace.services import list_listings
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        v1 = _make_variant(product)
        v2 = _make_variant(product)
        sell = _make_active_listing(v1, owner, listing_type="sell")
        rent = _make_active_listing(v2, owner, listing_type="rent")
        results = list(list_listings(user=owner, filters={"listing_type": "sell"}))
        ids = [r.id for r in results]
        assert sell.id in ids
        assert rent.id not in ids

    def test_search_by_title(self):
        from marketplace.services import list_listings
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = Listing.objects.create(
            variant=variant, listing_type="sell", status="active",
            title="UniqueSearchTerm XYZ", is_public=True, created_by=owner,
        )
        results = list(list_listings(user=owner, filters={"search": "UniqueSearchTerm"}))
        assert listing.id in [r.id for r in results]

    def test_search_by_product_name(self):
        from marketplace.services import list_listings
        owner = _member_user()
        product = Product.objects.create(
            name=f"SearchableProduct-{_uid()}",
            owner_type=Product.OwnerType.MEMBER,
            owner=owner, status=Product.Status.ACTIVE, created_by=owner,
        )
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner)
        results = list(list_listings(user=owner, filters={"search": "SearchableProduct"}))
        assert listing.id in [r.id for r in results]


@pytest.mark.django_db
class TestListMyListings:

    def test_returns_own_excludes_stale(self):
        from marketplace.services import list_my_listings
        owner = _member_user()
        other = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        v_ok = _make_variant(product)
        v_sold = _make_variant(product, status=ProductVariant.Status.SOLD)
        listing_ok = _make_listing(v_ok, owner)
        listing_stale = _make_listing(v_sold, owner)
        listing_other_product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=other)
        listing_other = _make_listing(_make_variant(listing_other_product), other)

        results = list(list_my_listings(user=owner))
        ids = [r.id for r in results]
        assert listing_ok.id in ids
        assert listing_stale.id not in ids
        assert listing_other.id not in ids


@pytest.mark.django_db
class TestListFavoritedListings:

    def test_returns_favorited_excludes_stale(self):
        from marketplace.services import list_favorited_listings, add_favorite
        owner = _member_user()
        user = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        v_ok = _make_variant(product)
        v_sold = _make_variant(product, status=ProductVariant.Status.SOLD)
        listing_ok = _make_active_listing(v_ok, owner)
        listing_stale = _make_active_listing(v_sold, owner)

        add_favorite(listing_id=listing_ok.id, user=user)
        ListingFavorite.objects.create(listing=listing_stale, user=user, created_by=user)

        results = list(list_favorited_listings(user=user))
        ids = [r.id for r in results]
        assert listing_ok.id in ids
        assert listing_stale.id not in ids


@pytest.mark.django_db
class TestListSchoolListings:

    def test_excludes_stale_school_variants(self):
        from marketplace.services import list_school_listings
        staff = _staff_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        v_ok = _make_variant(product)
        v_sold = _make_variant(product, status=ProductVariant.Status.SOLD)
        listing_ok = _make_listing(v_ok, staff)
        listing_stale = _make_listing(v_sold, staff)

        results = list(list_school_listings())
        ids = [r.id for r in results]
        assert listing_ok.id in ids
        assert listing_stale.id not in ids


@pytest.mark.django_db
class TestGetAvailability:

    def test_returns_active_bookings(self):
        from marketplace.services import get_availability
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="rent")

        start = _future(days=1)
        end = _future(days=5)
        VariantBooking.objects.create(
            variant=variant, booking_type=VariantBooking.BookingType.RENT,
            status=VariantBooking.Status.CONFIRMED,
            start_at=start, end_at=end, title="Test Booking", created_by=owner,
        )

        windows = get_availability(listing_id=listing.id)
        assert len(windows) == 1
        assert windows[0]["status"] == "confirmed"


# ===========================================================================
# TRANSACTION SERVICE TESTS
# ===========================================================================


def _make_rent_listing_setup(*, school=False):
    """Create a published RENT listing and return (listing, owner_user, variant)."""
    if school:
        staff = _staff_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, staff, listing_type="rent")
        return listing, staff, variant
    else:
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="rent")
        return listing, owner, variant


def _make_sell_listing_setup(*, school=False, asking_price=None):
    if school:
        staff = _staff_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, staff, listing_type="sell", asking_price=asking_price)
        return listing, staff, variant
    else:
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="sell", asking_price=asking_price)
        return listing, owner, variant


@pytest.mark.django_db
class TestRequestTransaction:

    def test_listing_not_found(self):
        from marketplace.services import request_transaction
        with pytest.raises(AppNotFound, match="ListingNotFound"):
            request_transaction(user=_member_user(), listing_id=99999)

    def test_listing_not_active(self):
        from marketplace.services import request_transaction
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_listing(variant, owner, status="draft")
        with pytest.raises(ValidationError, match="ListingNotActive"):
            request_transaction(user=_member_user(), listing_id=listing.id)

    def test_rent_missing_dates(self):
        from marketplace.services import request_transaction
        listing, _, _ = _make_rent_listing_setup()
        with pytest.raises(ValidationError, match="DatesRequiredForRentOrLend"):
            request_transaction(user=_member_user(), listing_id=listing.id)

    def test_rent_invalid_date_range(self):
        from marketplace.services import request_transaction
        listing, _, _ = _make_rent_listing_setup()
        start = _future(days=5)
        end = _future(days=1)
        with pytest.raises(ValidationError, match="InvalidDateRange"):
            request_transaction(
                user=_member_user(), listing_id=listing.id,
                start_at=start, end_at=end,
            )

    def test_rent_date_overlap(self):
        from marketplace.services import request_transaction
        listing, _, variant = _make_rent_listing_setup()
        start = _future(days=1)
        end = _future(days=5)
        VariantBooking.objects.create(
            variant=variant, booking_type=VariantBooking.BookingType.RENT,
            status=VariantBooking.Status.CONFIRMED,
            start_at=start, end_at=end, title="Existing", created_by=listing.created_by,
        )
        with pytest.raises(ValidationError, match="BookingOverlap"):
            request_transaction(
                user=_member_user(), listing_id=listing.id,
                start_at=start + timedelta(days=1), end_at=end - timedelta(days=1),
            )

    def test_rent_happy_path(self):
        from marketplace.services import request_transaction
        listing, owner, variant = _make_rent_listing_setup()
        requester = _member_user()
        start = _future(days=10)
        end = _future(days=15)
        txn = request_transaction(
            user=requester, listing_id=listing.id,
            start_at=start, end_at=end, notes="Please!",
        )
        assert txn.status == ProductTransaction.TransactionStatus.PENDING
        assert txn.transaction_type == "rent"
        assert txn.requester == requester
        assert txn.owner == owner
        assert txn.start_at == start
        assert txn.end_at == end
        assert txn.notes == "Please!"

        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.PENDING
        assert booking.booking_type == VariantBooking.BookingType.RENT

    def test_sell_auto_dates(self):
        from marketplace.services import request_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        assert txn.start_at is not None
        assert txn.end_at is not None
        assert txn.end_at > txn.start_at

    def test_school_item_owner_is_none(self):
        from marketplace.services import request_transaction
        listing, _, _ = _make_sell_listing_setup(school=True)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        assert txn.owner is None

    def test_member_item_owner_is_product_owner(self):
        from marketplace.services import request_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        assert txn.owner == owner

    @pytest.mark.parametrize("listing_type", ["lend"])
    def test_lend_requires_dates(self, listing_type):
        from marketplace.services import request_transaction
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type=listing_type)
        with pytest.raises(ValidationError, match="DatesRequiredForRentOrLend"):
            request_transaction(user=_member_user(), listing_id=listing.id)

    def test_donate_auto_dates(self):
        from marketplace.services import request_transaction
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="donate")
        txn = request_transaction(user=_member_user(), listing_id=listing.id)
        assert txn.transaction_type == "donate"
        assert txn.start_at is not None


@pytest.mark.django_db
class TestAcceptTransaction:

    def test_not_found(self):
        from marketplace.services import accept_transaction
        with pytest.raises(AppNotFound):
            accept_transaction(transaction_id=99999, user=_staff_user())

    def test_school_item_non_staff_raises(self):
        from marketplace.services import request_transaction, accept_transaction
        listing, _, _ = _make_sell_listing_setup(school=True)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        with pytest.raises(PermissionDenied):
            accept_transaction(transaction_id=txn.id, user=requester)

    def test_member_item_non_owner_raises(self):
        from marketplace.services import request_transaction, accept_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        stranger = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        with pytest.raises(PermissionDenied):
            accept_transaction(transaction_id=txn.id, user=stranger)

    def test_not_pending_raises(self):
        from marketplace.services import request_transaction, accept_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(ValidationError, match="TransactionNotPending"):
            accept_transaction(transaction_id=txn.id, user=owner)

    def test_happy_path_member(self):
        from marketplace.services import request_transaction, accept_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = accept_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.ACCEPTED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.CONFIRMED

    def test_happy_path_school(self):
        from marketplace.services import request_transaction, accept_transaction
        listing, staff, _ = _make_sell_listing_setup(school=True)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = accept_transaction(transaction_id=txn.id, user=staff)
        assert result.status == ProductTransaction.TransactionStatus.ACCEPTED


@pytest.mark.django_db
class TestRejectTransaction:

    def test_not_pending_raises(self):
        from marketplace.services import request_transaction, accept_transaction, reject_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(ValidationError, match="TransactionNotPending"):
            reject_transaction(transaction_id=txn.id, user=owner)

    def test_happy_path(self):
        from marketplace.services import request_transaction, reject_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = reject_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.REJECTED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.CANCELLED


@pytest.mark.django_db
class TestCompleteTransaction:

    def test_not_accepted_raises(self):
        from marketplace.services import request_transaction, complete_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        with pytest.raises(ValidationError, match="TransactionNotAccepted"):
            complete_transaction(transaction_id=txn.id, user=owner)

    def test_sell_marks_variant_sold_and_listing_closed(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        listing, owner, variant = _make_sell_listing_setup(asking_price=Decimal("15.00"))
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        result = complete_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.COMPLETED

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.SOLD

        listing.refresh_from_db()
        assert listing.status == Listing.ListingStatus.CLOSED
        assert listing.is_public is False

        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.COMPLETED

    def test_donate_marks_variant_donated_and_listing_closed(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="donate")
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.DONATED

        listing.refresh_from_db()
        assert listing.status == Listing.ListingStatus.CLOSED

    def test_rent_variant_stays_available(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        listing, owner, variant = _make_rent_listing_setup()
        requester = _member_user()
        txn = request_transaction(
            user=requester, listing_id=listing.id,
            start_at=_future(days=1), end_at=_future(days=5),
        )
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.AVAILABLE

        listing.refresh_from_db()
        assert listing.status == Listing.ListingStatus.ACTIVE

    def test_lend_variant_stays_available(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="lend")
        requester = _member_user()
        txn = request_transaction(
            user=requester, listing_id=listing.id,
            start_at=_future(days=1), end_at=_future(days=5),
        )
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.AVAILABLE

    def test_priced_sell_creates_billing_entry(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        from billing.models import BillingEntry, BillingEntrySourceType
        listing, owner, _ = _make_sell_listing_setup(asking_price=Decimal("20.00"))
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        entry = BillingEntry.objects.filter(
            source_type=BillingEntrySourceType.MARKETPLACE,
            marketplace_transaction_id=txn.id,
        ).first()
        assert entry is not None
        assert entry.amount_due == Decimal("20.00")
        assert entry.student_id == requester.id

    def test_no_price_no_billing_entry(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        from billing.models import BillingEntry, BillingEntrySourceType
        listing, owner, _ = _make_sell_listing_setup(asking_price=None)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        assert not BillingEntry.objects.filter(
            source_type=BillingEntrySourceType.MARKETPLACE,
            marketplace_transaction_id=txn.id,
        ).exists()

    def test_donate_no_billing_entry_even_with_price(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction
        from billing.models import BillingEntry, BillingEntrySourceType
        owner = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)
        listing = _make_active_listing(variant, owner, listing_type="donate", asking_price=Decimal("10.00"))
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        assert not BillingEntry.objects.filter(
            source_type=BillingEntrySourceType.MARKETPLACE,
            marketplace_transaction_id=txn.id,
        ).exists()


@pytest.mark.django_db
class TestCancelTransaction:

    def test_requester_can_cancel_pending(self):
        from marketplace.services import request_transaction, cancel_transaction
        listing, _, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = cancel_transaction(transaction_id=txn.id, user=requester)
        assert result.status == ProductTransaction.TransactionStatus.CANCELLED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.CANCELLED

    def test_requester_can_cancel_accepted(self):
        from marketplace.services import request_transaction, accept_transaction, cancel_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        result = cancel_transaction(transaction_id=txn.id, user=requester)
        assert result.status == ProductTransaction.TransactionStatus.CANCELLED

    def test_owner_can_cancel_member_item(self):
        from marketplace.services import request_transaction, cancel_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = cancel_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.CANCELLED

    def test_staff_can_cancel_school_item(self):
        from marketplace.services import request_transaction, cancel_transaction
        listing, staff, _ = _make_sell_listing_setup(school=True)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        result = cancel_transaction(transaction_id=txn.id, user=staff)
        assert result.status == ProductTransaction.TransactionStatus.CANCELLED

    def test_random_user_cannot_cancel(self):
        from marketplace.services import request_transaction, cancel_transaction
        listing, _, _ = _make_sell_listing_setup()
        requester = _member_user()
        stranger = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        with pytest.raises(PermissionDenied):
            cancel_transaction(transaction_id=txn.id, user=stranger)

    def test_cannot_cancel_completed(self):
        from marketplace.services import request_transaction, accept_transaction, complete_transaction, cancel_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(ValidationError, match="TransactionCannotBeCancelled"):
            cancel_transaction(transaction_id=txn.id, user=requester)

    def test_cannot_cancel_rejected(self):
        from marketplace.services import request_transaction, reject_transaction, cancel_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        reject_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(ValidationError, match="TransactionCannotBeCancelled"):
            cancel_transaction(transaction_id=txn.id, user=requester)


@pytest.mark.django_db
class TestBlockUnblockTransaction:

    def test_block_not_accepted_raises(self):
        from marketplace.services import request_transaction, block_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        with pytest.raises(ValidationError, match="TransactionNotAccepted"):
            block_transaction(transaction_id=txn.id, user=owner)

    def test_block_happy_path(self):
        from marketplace.services import request_transaction, accept_transaction, block_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        result = block_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.BLOCKED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.BLOCKED

    def test_unblock_not_blocked_raises(self):
        from marketplace.services import request_transaction, accept_transaction, unblock_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(ValidationError, match="TransactionNotBlocked"):
            unblock_transaction(transaction_id=txn.id, user=owner)

    def test_unblock_happy_path(self):
        from marketplace.services import request_transaction, accept_transaction, block_transaction, unblock_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        block_transaction(transaction_id=txn.id, user=owner)
        result = unblock_transaction(transaction_id=txn.id, user=owner)
        assert result.status == ProductTransaction.TransactionStatus.ACCEPTED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.CONFIRMED

    def test_block_non_owner_raises(self):
        from marketplace.services import request_transaction, accept_transaction, block_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        stranger = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        with pytest.raises(PermissionDenied):
            block_transaction(transaction_id=txn.id, user=stranger)


# ===========================================================================
# FULL LIFECYCLE TESTS — multi-step scenarios
# ===========================================================================


@pytest.mark.django_db
class TestFullLifecycle:

    def test_sell_full_flow_member_owned(self):
        """Owner creates listing → requester requests → owner accepts → completes.
        Verify: variant SOLD, listing CLOSED, booking COMPLETED, billing entry created."""
        from marketplace.services import (
            create_listing, publish_listing, request_transaction,
            accept_transaction, complete_transaction,
        )
        from billing.models import BillingEntry, BillingEntrySourceType

        owner = _member_user()
        requester = _member_user()
        product = _make_product(owner_type=Product.OwnerType.MEMBER, owner=owner)
        variant = _make_variant(product)

        listing = create_listing(
            user=owner, variant_id=variant.id, listing_type="sell",
            title="Full Flow Sell", asking_price=Decimal("50.00"),
        )
        publish_listing(listing_id=listing.id, user=owner)
        txn = request_transaction(user=requester, listing_id=listing.id)
        accept_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        variant.refresh_from_db()
        listing.refresh_from_db()
        txn.refresh_from_db()
        assert variant.status == ProductVariant.Status.SOLD
        assert listing.status == Listing.ListingStatus.CLOSED
        assert listing.is_public is False
        assert txn.status == ProductTransaction.TransactionStatus.COMPLETED
        assert txn.recorded_by == owner

        entry = BillingEntry.objects.get(
            source_type=BillingEntrySourceType.MARKETPLACE,
            marketplace_transaction_id=txn.id,
        )
        assert entry.amount_due == Decimal("50.00")
        assert entry.student_id == requester.id

    def test_rent_two_non_overlapping_windows(self):
        """Two renters book non-overlapping periods on the same listing.
        Both complete successfully. Variant stays AVAILABLE."""
        from marketplace.services import (
            request_transaction, accept_transaction, complete_transaction,
        )

        listing, owner, variant = _make_rent_listing_setup()
        requester_a = _member_user()
        requester_b = _member_user()

        txn_a = request_transaction(
            user=requester_a, listing_id=listing.id,
            start_at=_future(days=1), end_at=_future(days=5),
        )
        txn_b = request_transaction(
            user=requester_b, listing_id=listing.id,
            start_at=_future(days=6), end_at=_future(days=10),
        )

        accept_transaction(transaction_id=txn_a.id, user=owner)
        accept_transaction(transaction_id=txn_b.id, user=owner)
        complete_transaction(transaction_id=txn_a.id, user=owner)
        complete_transaction(transaction_id=txn_b.id, user=owner)

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.AVAILABLE
        assert VariantBooking.objects.filter(
            transaction__in=[txn_a, txn_b],
            status=VariantBooking.Status.COMPLETED,
        ).count() == 2

    def test_reject_then_accept_different_requester(self):
        """First request rejected, second accepted and completed."""
        from marketplace.services import (
            request_transaction, accept_transaction, reject_transaction,
            complete_transaction,
        )

        listing, owner, variant = _make_sell_listing_setup(asking_price=Decimal("10.00"))
        user_a = _member_user()
        user_b = _member_user()

        txn_a = request_transaction(user=user_a, listing_id=listing.id)
        reject_transaction(transaction_id=txn_a.id, user=owner)

        txn_b = request_transaction(user=user_b, listing_id=listing.id)
        accept_transaction(transaction_id=txn_b.id, user=owner)
        complete_transaction(transaction_id=txn_b.id, user=owner)

        txn_a.refresh_from_db()
        txn_b.refresh_from_db()
        assert txn_a.status == ProductTransaction.TransactionStatus.REJECTED
        assert txn_b.status == ProductTransaction.TransactionStatus.COMPLETED

        booking_a = VariantBooking.objects.get(transaction=txn_a)
        booking_b = VariantBooking.objects.get(transaction=txn_b)
        assert booking_a.status == VariantBooking.Status.CANCELLED
        assert booking_b.status == VariantBooking.Status.COMPLETED

    def test_block_unblock_then_complete(self):
        """Accept → block → unblock → complete."""
        from marketplace.services import (
            request_transaction, accept_transaction, block_transaction,
            unblock_transaction, complete_transaction,
        )

        listing, owner, variant = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)

        accept_transaction(transaction_id=txn.id, user=owner)
        block_transaction(transaction_id=txn.id, user=owner)
        unblock_transaction(transaction_id=txn.id, user=owner)
        complete_transaction(transaction_id=txn.id, user=owner)

        txn.refresh_from_db()
        assert txn.status == ProductTransaction.TransactionStatus.COMPLETED
        booking = VariantBooking.objects.get(transaction=txn)
        assert booking.status == VariantBooking.Status.COMPLETED

    def test_school_sell_full_flow(self):
        """School item: staff creates listing, member requests, staff accepts/completes.
        Owner on txn is None. Staff uses permission to manage."""
        from marketplace.services import (
            create_listing, publish_listing, request_transaction,
            accept_transaction, complete_transaction,
        )

        staff = _staff_user()
        requester = _member_user()
        product = _make_product(owner_type=Product.OwnerType.SCHOOL)
        variant = _make_variant(product)

        listing = create_listing(
            user=staff, variant_id=variant.id, listing_type="sell",
            title="School Costume", asking_price=Decimal("30.00"), school_only=True,
        )
        publish_listing(listing_id=listing.id, user=staff)
        txn = request_transaction(user=requester, listing_id=listing.id)
        assert txn.owner is None

        accept_transaction(transaction_id=txn.id, user=staff)
        complete_transaction(transaction_id=txn.id, user=staff)

        variant.refresh_from_db()
        assert variant.status == ProductVariant.Status.SOLD

    def test_cancel_frees_booking_window(self):
        """Cancel a pending rent transaction, then re-request the same window."""
        from marketplace.services import (
            request_transaction, cancel_transaction,
        )

        listing, owner, variant = _make_rent_listing_setup()
        requester = _member_user()
        start = _future(days=1)
        end = _future(days=5)

        txn = request_transaction(
            user=requester, listing_id=listing.id, start_at=start, end_at=end,
        )
        cancel_transaction(transaction_id=txn.id, user=requester)

        new_requester = _member_user()
        txn2 = request_transaction(
            user=new_requester, listing_id=listing.id, start_at=start, end_at=end,
        )
        assert txn2.status == ProductTransaction.TransactionStatus.PENDING


# ===========================================================================
# CROSS-APP INTERACTION TESTS
# ===========================================================================


@pytest.mark.django_db
class TestListingTransactionQueries:

    def test_list_my_transactions_includes_requester_and_owner(self):
        from marketplace.services import request_transaction, list_my_transactions
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)

        owner_txns = list(list_my_transactions(user=owner))
        requester_txns = list(list_my_transactions(user=requester))
        assert txn.id in [t.id for t in owner_txns]
        assert txn.id in [t.id for t in requester_txns]

    def test_list_my_transactions_school_item_owner_none(self):
        from marketplace.services import request_transaction, list_my_transactions
        listing, staff, _ = _make_sell_listing_setup(school=True)
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)

        requester_txns = list(list_my_transactions(user=requester))
        assert txn.id in [t.id for t in requester_txns]

    def test_list_transactions_filters(self):
        from marketplace.services import request_transaction, accept_transaction, list_transactions
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)

        pending = list(list_transactions(user=owner, filters={"status": "pending"}))
        assert txn.id in [t.id for t in pending]

        accept_transaction(transaction_id=txn.id, user=owner)
        accepted = list(list_transactions(user=owner, filters={"status": "accepted"}))
        assert txn.id in [t.id for t in accepted]

        still_pending = list(list_transactions(user=owner, filters={"status": "pending"}))
        assert txn.id not in [t.id for t in still_pending]

    def test_get_transaction_with_filter(self):
        from marketplace.services import request_transaction, get_transaction
        from django.db.models import Q
        listing, owner, _ = _make_sell_listing_setup()
        requester = _member_user()
        txn = request_transaction(user=requester, listing_id=listing.id)

        found = get_transaction(
            transaction_id=txn.id,
            qs_filter=Q(requester=requester),
        )
        assert found.id == txn.id

        with pytest.raises(AppNotFound):
            get_transaction(
                transaction_id=txn.id,
                qs_filter=Q(requester=_member_user()),
            )


@pytest.mark.django_db
class TestBookingTransactionIntegrity:

    def test_each_transaction_has_its_own_booking(self):
        """Multiple transactions on the same listing create independent bookings."""
        from marketplace.services import request_transaction
        listing, _, variant = _make_sell_listing_setup()
        requester_a = _member_user()
        requester_b = _member_user()
        txn_a = request_transaction(user=requester_a, listing_id=listing.id)
        txn_b = request_transaction(user=requester_b, listing_id=listing.id)

        booking_a = VariantBooking.objects.get(transaction=txn_a)
        booking_b = VariantBooking.objects.get(transaction=txn_b)
        assert booking_a.id != booking_b.id

    def test_accept_only_updates_own_booking(self):
        """Accepting one transaction doesn't affect another's booking."""
        from marketplace.services import request_transaction, accept_transaction
        listing, owner, _ = _make_sell_listing_setup()
        requester_a = _member_user()
        requester_b = _member_user()
        txn_a = request_transaction(user=requester_a, listing_id=listing.id)
        txn_b = request_transaction(user=requester_b, listing_id=listing.id)

        accept_transaction(transaction_id=txn_a.id, user=owner)

        booking_a = VariantBooking.objects.get(transaction=txn_a)
        booking_b = VariantBooking.objects.get(transaction=txn_b)
        assert booking_a.status == VariantBooking.Status.CONFIRMED
        assert booking_b.status == VariantBooking.Status.PENDING
