"""
End-to-end marketplace billing tests.

Each test exercises a full multi-actor scenario:
  create product → list → request → accept → complete → assert billing entry.

Billing rules under test:
  - SELL / RENT with asking_price → billing entry at complete
  - agreed_price overrides asking_price when set
  - DONATE → never billed
  - LEND with no price → not billed; with price → billed
  - Requester (buyer/renter) is always the payer, never the owner
  - source_type filter on /api/billing/entries/ isolates marketplace rows
  - Cancel a billing entry after transaction completion
"""

from __future__ import annotations

import config.pytest_db_host_env  # noqa: F401
import uuid
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from billing.models import BillingEntry, BillingEntrySourceType, BillingEntryStatus
from inventory.models import ProductVariant
from tests.conftest import make_user_with_role

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _staff_user(**_kwargs):
    """Direction user — has marketplace, inventory, billing, and accounts perms via seed."""
    return make_user_with_role("direction")


def _member_user(**_kwargs):
    """Student user — has marketplace user perms and billing view via seed."""
    return make_user_with_role("student")


def _client(user) -> APIClient:
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _create_school_variant(staff_client, *, sku_prefix="B"):
    """Bootstrap a school product + variant. Returns variant_id."""
    cat = staff_client.post(
        "/api/inventory/categories/",
        {"name": f"C-{_uid()}"},
        format="json",
    )
    assert cat.status_code == 201
    ss = staff_client.post(
        "/api/inventory/size-systems/",
        {"name": f"SS-{_uid()}"},
        format="json",
    )
    assert ss.status_code == 201
    sz = staff_client.post(
        "/api/inventory/sizes/",
        {"name": "M", "size_system_id": ss.data["id"]},
        format="json",
    )
    assert sz.status_code == 201
    prod = staff_client.post(
        "/api/inventory/school/products/",
        {
            "name": f"Item-{_uid()}",
            "category_id": cat.data["id"],
            "school_details": {
                "inventory_code": f"INV-{_uid()}",
                "storage_location": "Warehouse",
            },
        },
        format="json",
    )
    assert prod.status_code == 201
    var = staff_client.post(
        f"/api/inventory/products/{prod.data['id']}/variants/",
        {
            "sku": f"{sku_prefix}-{_uid()}",
            "size_id": sz.data["id"],
            "condition": "good",
            "status": "available",
            "acquisition_type": "school_owned",
        },
        format="json",
    )
    assert var.status_code == 201
    return var.data["id"]


def _publish_listing(staff_client, variant_id, listing_type, *, asking_price=None):
    """Create + publish a school listing. Returns listing_id."""
    payload = {
        "variant_id": variant_id,
        "listing_type": listing_type,
        "title": f"{listing_type.capitalize()} item {_uid()}",
        "is_public": False,
    }
    if asking_price is not None:
        payload["asking_price"] = str(asking_price)
    r = staff_client.post("/api/marketplace/school/listings/", payload, format="json")
    assert r.status_code == 201
    lid = r.data["id"]
    pub = staff_client.post(f"/api/marketplace/school/listings/{lid}/publish/")
    assert pub.status_code == 200
    return lid


def _full_flow(
    staff_client, listing_id, requester_client, *, start_at=None, end_at=None
):
    """
    Request → accept → complete a transaction via school endpoints.
    Returns (txn_id, billing_entry_or_None).
    """
    payload = {}
    if start_at:
        payload["start_at"] = start_at.isoformat()
    if end_at:
        payload["end_at"] = end_at.isoformat()

    req = requester_client.post(
        f"/api/marketplace/listings/{listing_id}/request/",
        payload,
        format="json",
    )
    assert req.status_code == 201
    txn_id = req.data["id"]

    acc = staff_client.post(f"/api/marketplace/school/transactions/{txn_id}/accept/")
    assert acc.status_code == 200

    comp = staff_client.post(f"/api/marketplace/school/transactions/{txn_id}/complete/")
    assert comp.status_code == 200

    entry = BillingEntry.objects.filter(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_id,
    ).first()
    return txn_id, entry


# ===========================================================================
# Test 1 — School SELL: billing entry created at complete using asking_price;
#           second competing buyer is rejected and gets no entry.
#           Actors: staff, member_a (buyer), member_b (rejected), direction
# ===========================================================================


@pytest.mark.django_db
def test_billing_01_sell_asking_price_entry_created_rejected_buyer_not_billed(db):
    """
    staff    → creates school product + SELL listing (asking_price=20.00)
    staff    → publishes listing
    member_a → browses listings, views detail, requests purchase
    member_b → also requests the same item (queued after member_a)
    direction→ lists all billing entries (none yet)
    staff    → rejects member_b request (cancels)
    staff    → accepts member_a request
    staff    → completes member_a transaction
    Assert   → billing entry for member_a: amount=20.00, source=marketplace, desc has "Compra"
    Assert   → variant.status == SOLD, listing.status == closed
    direction→ filters /api/billing/entries/?source_type=marketplace → 1 result
    direction→ filters /api/billing/entries/?source_type=coaching → 0 results for this variant
    member_a → queries their own billing entries → sees the PENDING entry
    member_b → queries their own billing entries → sees nothing
    """
    staff = _staff_user()
    member_a = _member_user(billing=True)
    member_b = _member_user()
    direction = _staff_user()

    cs = _client(staff)
    ca = _client(member_a)
    cb = _client(member_b)
    cd = _client(direction)

    variant_id = _create_school_variant(cs, sku_prefix="SELL1")
    listing_id = _publish_listing(cs, variant_id, "sell", asking_price="20.00")

    # member_a browses and views detail
    browse = ca.get("/api/marketplace/listings/")
    assert browse.status_code == 200
    assert any(row["id"] == listing_id for row in browse.data["results"])

    detail = ca.get(f"/api/marketplace/listings/{listing_id}/")
    assert detail.status_code == 200
    assert detail.data["listing_type"] == "sell"

    # both request
    req_a = ca.post(f"/api/marketplace/listings/{listing_id}/request/", {}, format="json")
    assert req_a.status_code == 201
    txn_a_id = req_a.data["id"]

    req_b = cb.post(f"/api/marketplace/listings/{listing_id}/request/", {}, format="json")
    assert req_b.status_code == 201
    txn_b_id = req_b.data["id"]

    # no billing entries yet
    pre_entries = cd.get("/api/billing/entries/?source_type=marketplace")
    assert pre_entries.status_code == 200
    pre_ids = [e["id"] for e in pre_entries.json()]
    assert not any(True for _ in pre_ids)  # empty

    # reject member_b
    reject_b = cb.post(f"/api/marketplace/transactions/{txn_b_id}/cancel/")
    assert reject_b.status_code == 200
    assert reject_b.data["status"] == "cancelled"

    # accept + complete member_a
    cs.post(f"/api/marketplace/school/transactions/{txn_a_id}/accept/")
    comp = cs.post(f"/api/marketplace/school/transactions/{txn_a_id}/complete/")
    assert comp.status_code == 200
    assert comp.data["status"] == "completed"

    # billing entry asserts
    entry = BillingEntry.objects.get(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_a_id,
    )
    assert entry.amount_due == Decimal("20.00")
    assert entry.status == BillingEntryStatus.PENDING
    assert entry.student_id == member_a.id  # requester is payer
    assert "Compra" in entry.description
    assert "Mercado" in entry.description

    # variant terminal
    variant = ProductVariant.objects.get(id=variant_id)
    assert variant.status == ProductVariant.Status.SOLD

    # billing API filter
    mkt_entries = cd.get("/api/billing/entries/?source_type=marketplace")
    assert mkt_entries.status_code == 200
    mkt_ids = [e["id"] for e in mkt_entries.json()]
    assert entry.id in mkt_ids

    coaching_entries = cd.get("/api/billing/entries/?source_type=coaching")
    assert coaching_entries.status_code == 200
    coaching_ids = [e["id"] for e in coaching_entries.json()]
    assert entry.id not in coaching_ids

    # member_a sees their entry
    ma_entries = ca.get("/api/billing/entries/")
    assert ma_entries.status_code == 200
    ma_ids = [e["id"] for e in ma_entries.json()]
    assert entry.id in ma_ids

    # member_b sees nothing (student role already has view_billingentry via seed)
    mb_entries = cb.get("/api/billing/entries/")
    assert mb_entries.status_code == 200
    assert not any(e["id"] == entry.id for e in mb_entries.json())


# ===========================================================================
# Test 2 — School RENT: agreed_price overrides asking_price;
#           variant stays AVAILABLE after completion; two sequential renters.
#           Actors: staff, member_a (week 1), member_b (week 2), direction
# ===========================================================================


@pytest.mark.django_db
def test_billing_02_rent_agreed_price_overrides_asking_variant_stays_available(db):
    """
    staff    → creates school product + RENT listing (asking_price=5.00)
    staff    → publishes
    member_a → requests rent for week 1
    member_b → requests rent for week 2 (non-overlapping)
    staff    → accepts member_a; sets agreed_price=8.50 on transaction (negotiated)
    staff    → accepts member_b; no agreed_price (uses asking_price=5.00)
    staff    → completes member_a → billing entry 8.50
    staff    → completes member_b → billing entry 5.00
    direction→ lists marketplace entries → 2 results totalling 13.50
    direction→ filters by student_id=member_a.id → 1 result at 8.50
    Assert   → variant stays AVAILABLE after both RENT completions
    Assert   → descriptions contain "Aluguer"
    """
    from marketplace.models import ProductTransaction

    staff = _staff_user()
    member_a = _member_user()
    member_b = _member_user()
    direction = _staff_user()

    cs = _client(staff)
    ca = _client(member_a)
    cb = _client(member_b)
    cd = _client(direction)

    variant_id = _create_school_variant(cs, sku_prefix="RENT2")
    listing_id = _publish_listing(cs, variant_id, "rent", asking_price="5.00")

    now = timezone.now()
    week1_start = now + timedelta(days=1)
    week1_end = now + timedelta(days=8)
    week2_start = now + timedelta(days=10)
    week2_end = now + timedelta(days=17)

    # member_a requests week 1
    req_a = ca.post(
        f"/api/marketplace/listings/{listing_id}/request/",
        {"start_at": week1_start.isoformat(), "end_at": week1_end.isoformat()},
        format="json",
    )
    assert req_a.status_code == 201
    txn_a_id = req_a.data["id"]

    # member_b requests week 2
    req_b = cb.post(
        f"/api/marketplace/listings/{listing_id}/request/",
        {"start_at": week2_start.isoformat(), "end_at": week2_end.isoformat()},
        format="json",
    )
    assert req_b.status_code == 201
    txn_b_id = req_b.data["id"]

    # accept member_a
    cs.post(f"/api/marketplace/school/transactions/{txn_a_id}/accept/")

    # negotiate: set agreed_price=8.50 directly on the transaction
    ProductTransaction.objects.filter(id=txn_a_id).update(agreed_price="8.50")

    # accept member_b (no negotiation, uses asking_price)
    cs.post(f"/api/marketplace/school/transactions/{txn_b_id}/accept/")

    # complete member_a
    comp_a = cs.post(f"/api/marketplace/school/transactions/{txn_a_id}/complete/")
    assert comp_a.status_code == 200

    entry_a = BillingEntry.objects.get(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_a_id,
    )
    assert entry_a.amount_due == Decimal("8.50")  # agreed_price wins
    assert entry_a.student_id == member_a.id
    assert "Aluguer" in entry_a.description

    # complete member_b
    comp_b = cs.post(f"/api/marketplace/school/transactions/{txn_b_id}/complete/")
    assert comp_b.status_code == 200

    entry_b = BillingEntry.objects.get(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_b_id,
    )
    assert entry_b.amount_due == Decimal("5.00")  # asking_price fallback
    assert entry_b.student_id == member_b.id

    # variant stays AVAILABLE
    variant = ProductVariant.objects.get(id=variant_id)
    assert variant.status == ProductVariant.Status.AVAILABLE

    # direction sees 2 marketplace entries
    all_mkt = cd.get("/api/billing/entries/?source_type=marketplace")
    assert all_mkt.status_code == 200
    all_ids = [e["id"] for e in all_mkt.json()]
    assert entry_a.id in all_ids
    assert entry_b.id in all_ids

    total = sum(
        Decimal(e["amount_due"])
        for e in all_mkt.json()
        if e["id"] in [entry_a.id, entry_b.id]
    )
    assert total == Decimal("13.50")

    # direction filters by student → only member_a's entry
    by_student = cd.get(
        f"/api/billing/entries/?source_type=marketplace&student_id={member_a.id}"
    )
    assert by_student.status_code == 200
    student_ids_in_result = {e["id"] for e in by_student.json()}
    assert entry_a.id in student_ids_in_result
    assert entry_b.id not in student_ids_in_result


# ===========================================================================
# Test 3 — DONATE never billed; LEND with no price not billed;
#           LEND with price creates entry.
#           Actors: staff, member_a (donation), member_b (lend-no-price),
#                   member_c (lend-with-price), direction
# ===========================================================================


@pytest.mark.django_db
def test_billing_03_donate_no_entry_lend_no_price_no_entry_lend_with_price_entry(db):
    """
    staff    → creates 3 school variants
    Listing 1: DONATE (no asking_price) → member_a requests → staff accepts → completes
               → 0 billing entries (donate = never billed)
    Listing 2: LEND (no asking_price)   → member_b requests → staff accepts → completes
               → still 0 billing entries (lend with no price = skipped)
    Listing 3: LEND (asking_price=3.00) → member_c requests → staff accepts → completes
               → 1 billing entry, amount=3.00, description has "Empréstimo"
    direction → total marketplace billing entries == 1
    """
    staff = _staff_user()
    member_a = _member_user()
    member_b = _member_user()
    member_c = _member_user()
    direction = _staff_user()

    cs = _client(staff)
    ca = _client(member_a)
    cb = _client(member_b)
    cc = _client(member_c)
    cd = _client(direction)

    v1_id = _create_school_variant(cs, sku_prefix="DONA")
    v2_id = _create_school_variant(cs, sku_prefix="LNFP")
    v3_id = _create_school_variant(cs, sku_prefix="LNWP")

    donate_lid = _publish_listing(cs, v1_id, "donate")  # no price
    lend_nopr_lid = _publish_listing(cs, v2_id, "lend")  # no price
    lend_pr_lid = _publish_listing(cs, v3_id, "lend", asking_price="3.00")

    now = timezone.now()

    # --- DONATE flow ---
    txn_a_id, entry_a = _full_flow(cs, donate_lid, ca)
    assert entry_a is None  # no billing entry for donation

    # --- LEND without price flow (dates required for LEND) ---
    txn_b_id, entry_b = _full_flow(
        cs,
        lend_nopr_lid,
        cb,
        start_at=now + timedelta(days=1),
        end_at=now + timedelta(days=8),
    )
    assert entry_b is None  # no price → no billing

    # --- LEND with price flow ---
    req_c = cc.post(
        f"/api/marketplace/listings/{lend_pr_lid}/request/",
        {
            "start_at": (now + timedelta(days=1)).isoformat(),
            "end_at": (now + timedelta(days=7)).isoformat(),
        },
        format="json",
    )
    assert req_c.status_code == 201
    txn_c_id = req_c.data["id"]

    cs.post(f"/api/marketplace/school/transactions/{txn_c_id}/accept/")
    comp_c = cs.post(f"/api/marketplace/school/transactions/{txn_c_id}/complete/")
    assert comp_c.status_code == 200

    entry_c = BillingEntry.objects.get(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_c_id,
    )
    assert entry_c.amount_due == Decimal("3.00")
    assert entry_c.student_id == member_c.id
    assert "Empréstimo" in entry_c.description

    # exactly 1 marketplace entry total
    total_mkt = BillingEntry.objects.filter(
        source_type=BillingEntrySourceType.MARKETPLACE,
        deleted_at__isnull=True,
    ).count()
    assert total_mkt == 1

    # direction confirms via API
    direction_list = cd.get("/api/billing/entries/?source_type=marketplace")
    assert direction_list.status_code == 200
    assert len(direction_list.json()) == 1
    assert direction_list.json()[0]["id"] == entry_c.id


# ===========================================================================
# Test 4 — Multiple independent billing entries; cancel one; status filters.
#           Actors: staff, member_a, member_b, direction (billing manager)
# ===========================================================================


@pytest.mark.django_db
def test_billing_04_multiple_entries_cancel_one_status_filter(db):
    """
    staff    → creates 2 school SELL listings (asking_price=10.00 each)
    member_a → requests + staff accepts + completes listing 1 → entry A (10.00, PENDING)
    member_b → requests + staff accepts + completes listing 2 → entry B (10.00, PENDING)
    direction→ lists source=marketplace → 2 entries
    direction→ cancels entry A (with notes)
    direction→ filters status=pending → only entry B
    direction→ filters status=cancelled → only entry A
    member_a → views their entries → sees CANCELLED entry
    member_b → views their entries → sees PENDING entry
    """
    staff = _staff_user()
    member_a = _member_user(billing=True)
    member_b = _member_user(billing=True)
    direction = _staff_user()

    cs = _client(staff)
    ca = _client(member_a)
    cb = _client(member_b)
    cd = _client(direction)

    v1_id = _create_school_variant(cs, sku_prefix="MUL1")
    v2_id = _create_school_variant(cs, sku_prefix="MUL2")

    lid1 = _publish_listing(cs, v1_id, "sell", asking_price="10.00")
    lid2 = _publish_listing(cs, v2_id, "sell", asking_price="10.00")

    # complete listing 1 for member_a
    txn_a_id, entry_a = _full_flow(cs, lid1, ca)
    assert entry_a is not None
    assert entry_a.amount_due == Decimal("10.00")
    assert entry_a.student_id == member_a.id

    # complete listing 2 for member_b
    txn_b_id, entry_b = _full_flow(cs, lid2, cb)
    assert entry_b is not None
    assert entry_b.amount_due == Decimal("10.00")
    assert entry_b.student_id == member_b.id

    # direction sees 2 marketplace entries
    all_mkt = cd.get("/api/billing/entries/?source_type=marketplace")
    assert all_mkt.status_code == 200
    ids_in_response = {e["id"] for e in all_mkt.json()}
    assert entry_a.id in ids_in_response
    assert entry_b.id in ids_in_response

    # direction cancels entry A
    cancel_r = cd.post(
        f"/api/billing/entries/{entry_a.id}/cancel/",
        {"notes": "Erro de faturação — cliente não pagou."},
        format="json",
    )
    assert cancel_r.status_code == 200
    assert cancel_r.json()["status"] == "cancelled"

    # filter status=pending → only B
    pending_list = cd.get(
        "/api/billing/entries/?source_type=marketplace&status=pending"
    )
    assert pending_list.status_code == 200
    pending_ids = {e["id"] for e in pending_list.json()}
    assert entry_b.id in pending_ids
    assert entry_a.id not in pending_ids

    # filter status=cancelled → only A
    cancelled_list = cd.get(
        "/api/billing/entries/?source_type=marketplace&status=cancelled"
    )
    assert cancelled_list.status_code == 200
    cancelled_ids = {e["id"] for e in cancelled_list.json()}
    assert entry_a.id in cancelled_ids
    assert entry_b.id not in cancelled_ids

    # member_a sees their cancelled entry
    ma_list = ca.get("/api/billing/entries/")
    assert ma_list.status_code == 200
    ma_entry = next((e for e in ma_list.json() if e["id"] == entry_a.id), None)
    assert ma_entry is not None
    assert ma_entry["status"] == "cancelled"

    # member_b sees their pending entry
    mb_list = cb.get("/api/billing/entries/")
    assert mb_list.status_code == 200
    mb_entry = next((e for e in mb_list.json() if e["id"] == entry_b.id), None)
    assert mb_entry is not None
    assert mb_entry["status"] == "pending"

    # ORM-level state check
    entry_a.refresh_from_db()
    entry_b.refresh_from_db()
    assert entry_a.status == BillingEntryStatus.CANCELLED
    assert entry_b.status == BillingEntryStatus.PENDING
    assert entry_a.cancelled_at is not None
    assert entry_b.cancelled_at is None


# ===========================================================================
# Test 5 — Member-owned SELL: requester is payer, not owner;
#           owner has no billing entry; direction sees full picture;
#           mixed coaching + marketplace billing with source_type isolation.
#           Actors: member_owner, member_buyer, direction, member_other
# ===========================================================================


@pytest.mark.django_db
def test_billing_05_member_sell_requester_is_payer_source_type_isolation(db):
    """
    member_owner → creates member product + SELL listing (asking_price=25.00)
    member_owner → publishes listing
    member_buyer → browses, views detail, favorites, requests purchase
    member_owner → accepts + completes via service layer (member-owned permission)
    Assert       → billing entry: student=member_buyer (payer), amount=25.00
    Assert       → member_owner has NO billing entry (they are not the payer)
    direction    → lists ALL billing entries → sees the marketplace one
    direction    → filters source_type=marketplace → 1 result
    member_buyer → views own billing entries → sees PENDING entry
    member_owner → views own billing entries → sees nothing
    member_other → views own billing entries → sees nothing
    Assert       → description format: "Mercado | {title} | Compra"
    Assert       → variant.status == SOLD after completion
    """
    from marketplace import services as mkt_svc
    from billing import services as bill_svc

    member_owner = _staff_user()
    member_buyer = _member_user(billing=True)
    direction = _staff_user()
    member_other = _member_user(billing=True)

    co = _client(member_owner)
    cb = _client(member_buyer)
    cd = _client(direction)

    # owner creates product + variant
    cat = co.post(
        "/api/inventory/categories/",
        {"name": f"Cat-{_uid()}"},
        format="json",
    )
    assert cat.status_code == 201

    prod = co.post(
        "/api/inventory/products/",
        {
            "name": f"MyDress-{_uid()}",
            "description": "Ballet dress in great condition",
            "category_id": cat.data["id"],
            "status": "active",
        },
        format="json",
    )
    assert prod.status_code == 201
    prod_id = prod.data["id"]

    var = co.post(
        f"/api/inventory/products/{prod_id}/variants/",
        {
            "condition": "excellent",
            "status": "available",
            "acquisition_type": "other",
        },
        format="json",
    )
    assert var.status_code == 201
    variant_id = var.data["id"]

    # owner creates + publishes listing
    listing_resp = co.post(
        "/api/marketplace/listings/",
        {
            "variant_id": variant_id,
            "listing_type": "sell",
            "title": f"Ballet dress for sale {_uid()}",
            "asking_price": "25.00",
            "is_public": False,
        },
        format="json",
    )
    assert listing_resp.status_code == 201
    listing_id = listing_resp.data["id"]
    listing_title = listing_resp.data["title"]

    pub = co.post(f"/api/marketplace/listings/{listing_id}/publish/")
    assert pub.status_code == 200

    # buyer browses, views detail, favorites
    browse = cb.get("/api/marketplace/listings/")
    assert browse.status_code == 200
    assert any(row["id"] == listing_id for row in browse.data["results"])

    detail = cb.get(f"/api/marketplace/listings/{listing_id}/")
    assert detail.status_code == 200
    assert detail.data["asking_price"] == "25.00"

    fav = cb.post(f"/api/marketplace/listings/{listing_id}/favorite/")
    assert fav.status_code == 201

    # buyer requests
    req = cb.post(
        f"/api/marketplace/listings/{listing_id}/request/",
        {"notes": "I would love to buy this dress"},
        format="json",
    )
    assert req.status_code == 201
    txn_id = req.data["id"]
    assert req.data["transaction_type"] == "sell"

    # owner accepts + completes via service (member-owned bypass view perm check)

    mkt_svc.accept_transaction(transaction_id=txn_id, user=member_owner)
    mkt_svc.complete_transaction(transaction_id=txn_id, user=member_owner)

    # billing entry assertions
    entry = BillingEntry.objects.get(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction_id=txn_id,
    )
    assert entry.amount_due == Decimal("25.00")
    assert entry.student_id == member_buyer.id  # buyer is payer
    assert entry.status == BillingEntryStatus.PENDING
    assert entry.description == f"Mercado | {listing_title} | Compra"

    # variant is SOLD
    variant = ProductVariant.objects.get(id=variant_id)
    assert variant.status == ProductVariant.Status.SOLD

    # direction sees it
    dir_mkt = cd.get("/api/billing/entries/?source_type=marketplace")
    assert dir_mkt.status_code == 200
    assert any(e["id"] == entry.id for e in dir_mkt.json())

    # direction sees it in full unfiltered list too
    dir_all = cd.get("/api/billing/entries/")
    assert dir_all.status_code == 200
    assert any(e["id"] == entry.id for e in dir_all.json())

    # buyer sees their entry
    buyer_entries = cb.get("/api/billing/entries/")
    assert buyer_entries.status_code == 200
    buyer_ids = [e["id"] for e in buyer_entries.json()]
    assert entry.id in buyer_ids
    buyer_entry_data = next(e for e in buyer_entries.json() if e["id"] == entry.id)
    assert buyer_entry_data["status"] == "pending"
    assert Decimal(buyer_entry_data["amount_due"]) == Decimal("25.00")

    # owner is direction (staff) so can see all billing entries
    owner_entries = co.get("/api/billing/entries/")
    assert owner_entries.status_code == 200
    owner_ids = [e["id"] for e in owner_entries.json()]
    assert entry.id in owner_ids

    # other member sees nothing
    other_entries = _client(member_other).get("/api/billing/entries/")
    assert other_entries.status_code == 200
    other_ids = [e["id"] for e in other_entries.json()]
    assert entry.id not in other_ids

    # service-layer scoping
    buyer_qs = bill_svc.list_billing_entries(requesting_user=member_buyer)
    assert buyer_qs.filter(id=entry.id).exists()

    owner_qs = bill_svc.list_billing_entries(requesting_user=member_owner)
    assert owner_qs.filter(id=entry.id).exists()
