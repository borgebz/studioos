from __future__ import annotations

import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone


def _uid() -> str:
    return uuid.uuid4().hex[:10]


@pytest.fixture
def inv_user(db):
    """
    End-to-end API tests need broad inventory permissions so we can cover:
    size systems, sizes, categories, colors, products, variants, and bookings.
    """
    User = get_user_model()
    user = User.objects.create_user(
        email=f"e2e_inv_{_uid()}@test.local",
        password="test-pass-123",
        first_name="Inventory",
        last_name="E2E",
        is_active=True,
    )
    perms = Permission.objects.filter(content_type__app_label="inventory")
    user.user_permissions.add(*perms)
    user.refresh_from_db()
    return user


@pytest.fixture
def inv_client(api_client, inv_user):
    api_client.force_authenticate(user=inv_user)
    return api_client


@pytest.mark.django_db
def test_e2e_01_size_systems_and_sizes_full_lifecycle(inv_client):
    """
    Exercise all size-system and size endpoints in one consistent lifecycle:
    create -> list -> update -> deactivate -> activate -> delete,
    and sizes filtered by size_system_id.
    """
    # Size System: create
    ss_create = inv_client.post(
        "/inventory/size-systems/",
        {"name": f"EU-{_uid()}"},
        format="json",
    )
    assert ss_create.status_code == 201
    size_system_id = ss_create.data["id"]
    assert ss_create.data["name"].startswith("EU-")

    # Size System: list contains it
    ss_list = inv_client.get("/inventory/size-systems/")
    assert ss_list.status_code == 200
    assert any(x["id"] == size_system_id for x in ss_list.data)

    # Size System: update (PATCH)
    ss_patch = inv_client.patch(
        f"/inventory/size-systems/{size_system_id}/",
        {"name": f"EU-UPDATED-{_uid()}"},
        format="json",
    )
    assert ss_patch.status_code == 200
    assert ss_patch.data["id"] == size_system_id
    assert ss_patch.data["name"].startswith("EU-UPDATED-")

    # Size System: deactivate / activate
    ss_deactivate = inv_client.post(
        f"/inventory/size-systems/{size_system_id}/deactivate/",
        {},
        format="json",
    )
    assert ss_deactivate.status_code == 200
    assert ss_deactivate.data["is_active"] is False

    ss_activate = inv_client.post(
        f"/inventory/size-systems/{size_system_id}/activate/",
        {},
        format="json",
    )
    assert ss_activate.status_code == 200
    assert ss_activate.data["is_active"] is True

    # Size: create two sizes under this size system
    s1 = inv_client.post(
        "/inventory/sizes/",
        {"name": "M", "size_system_id": size_system_id},
        format="json",
    )
    assert s1.status_code == 201
    size1_id = s1.data["id"]

    s2 = inv_client.post(
        "/inventory/sizes/",
        {"name": "L", "size_system_id": size_system_id},
        format="json",
    )
    assert s2.status_code == 201
    size2_id = s2.data["id"]

    # Sizes: list and list filtered by size_system_id
    all_sizes = inv_client.get("/inventory/sizes/")
    assert all_sizes.status_code == 200
    assert any(x["id"] == size1_id for x in all_sizes.data)
    assert any(x["id"] == size2_id for x in all_sizes.data)

    ss_sizes = inv_client.get(f"/inventory/sizes/?size_system_id={size_system_id}")
    assert ss_sizes.status_code == 200
    assert {x["id"] for x in ss_sizes.data} >= {size1_id, size2_id}

    # Size: deactivate one, ensure filter works
    s1_deactivate = inv_client.post(
        f"/inventory/sizes/{size1_id}/deactivate/",
        {},
        format="json",
    )
    assert s1_deactivate.status_code == 200
    assert s1_deactivate.data["is_active"] is False

    active_sizes = inv_client.get(
        f"/inventory/categories/?size_system_id={size_system_id}"
    )
    assert active_sizes.status_code == 200

    # Size: activate again
    s1_activate = inv_client.post(
        f"/inventory/sizes/{size1_id}/activate/",
        {},
        format="json",
    )
    assert s1_activate.status_code == 200
    assert s1_activate.data["is_active"] is True

    # Size: delete both
    s1_delete = inv_client.delete(f"/inventory/sizes/{size1_id}/")
    assert s1_delete.status_code == 204
    s2_delete = inv_client.delete(f"/inventory/sizes/{size2_id}/")
    assert s2_delete.status_code == 204

    # Size System: delete
    ss_delete = inv_client.delete(f"/inventory/size-systems/{size_system_id}/")
    assert ss_delete.status_code == 204


@pytest.mark.django_db
def test_e2e_02_categories_hierarchy_filters_and_activation(inv_client):
    """
    Full category lifecycle including parent/child, filters, activate/deactivate,
    and delete (soft-delete).
    """
    parent_resp = inv_client.post(
        "/inventory/categories/",
        {"name": f"Parent-{_uid()}"},
        format="json",
    )
    assert parent_resp.status_code == 201
    parent_id = parent_resp.data["id"]
    assert parent_resp.data["parent"] is None

    child_resp = inv_client.post(
        "/inventory/categories/",
        {"name": f"Child-{_uid()}", "parent_category_id": parent_id},
        format="json",
    )
    assert child_resp.status_code == 201
    child_id = child_resp.data["id"]
    assert child_resp.data["parent"] == parent_id

    all_categories = inv_client.get("/inventory/categories/")
    assert all_categories.status_code == 200
    ids = {c["id"] for c in all_categories.data}
    assert parent_id in ids
    # The default list returns root categories only; children come nested.
    parent_payload = next(c for c in all_categories.data if c["id"] == parent_id)
    assert any(sc["id"] == child_id for sc in parent_payload["subcategories"])

    children_only = inv_client.get(
        f"/inventory/categories/?parent_category_id={parent_id}"
    )
    assert children_only.status_code == 200
    assert {c["id"] for c in children_only.data} == {child_id}

    child_patch = inv_client.patch(
        f"/inventory/categories/{child_id}/",
        {"name": f"Child-Renamed-{_uid()}"},
        format="json",
    )
    assert child_patch.status_code == 200
    assert child_patch.data["id"] == child_id
    assert child_patch.data["name"].startswith("Child-Renamed-")

    child_deactivate = inv_client.post(
        f"/inventory/categories/{child_id}/deactivate/",
        {},
        format="json",
    )
    assert child_deactivate.status_code == 200
    assert child_deactivate.data["is_active"] is False

    # Inactive filtering still respects hierarchical listing (roots by default),
    # so we query children scope explicitly.
    inactive_only = inv_client.get(
        f"/inventory/categories/?parent_category_id={parent_id}&is_active=false"
    )
    assert inactive_only.status_code == 200
    assert any(c["id"] == child_id for c in inactive_only.data)

    child_activate = inv_client.post(
        f"/inventory/categories/{child_id}/activate/",
        {},
        format="json",
    )
    assert child_activate.status_code == 200
    assert child_activate.data["is_active"] is True

    # delete child then verify it's not returned by default list
    child_delete = inv_client.delete(f"/inventory/categories/{child_id}/")
    assert child_delete.status_code == 204

    categories_after = inv_client.get("/inventory/categories/")
    assert categories_after.status_code == 200
    assert all(c["id"] != child_id for c in categories_after.data)


@pytest.mark.django_db
def test_e2e_03_colors_endpoints_validation_activation_and_filtering(inv_client):
    """
    Full color lifecycle:
    create -> list -> validate duplicate and invalid hex -> deactivate/activate -> filter -> delete.
    """
    c1 = inv_client.post(
        "/inventory/colors/",
        {"name": f"Black-{_uid()}", "hex_code": "#000000"},
        format="json",
    )
    assert c1.status_code == 201
    color_id = c1.data["id"]
    assert c1.data["is_active"] is True

    all_colors = inv_client.get("/inventory/colors/")
    assert all_colors.status_code == 200
    assert any(c["id"] == color_id for c in all_colors.data)

    dup = inv_client.post(
        "/inventory/colors/",
        {"name": c1.data["name"], "hex_code": "#111111"},
        format="json",
    )
    assert dup.status_code == 400
    assert dup.data["errors"]["messages"] == ["DuplicateColorName"]

    invalid_hex = inv_client.post(
        "/inventory/colors/",
        {"name": f"BadHex-{_uid()}", "hex_code": "blue"},
        format="json",
    )
    assert invalid_hex.status_code == 400
    assert invalid_hex.data["errors"]["messages"] == ["InvalidHexCode"]

    deact = inv_client.post(f"/inventory/colors/{color_id}/deactivate/", {}, format="json")
    assert deact.status_code == 200
    assert deact.data["is_active"] is False

    inactive_colors = inv_client.get("/inventory/colors/?is_active=false")
    assert inactive_colors.status_code == 200
    assert any(c["id"] == color_id for c in inactive_colors.data)

    act = inv_client.post(f"/inventory/colors/{color_id}/activate/", {}, format="json")
    assert act.status_code == 200
    assert act.data["is_active"] is True

    delete = inv_client.delete(f"/inventory/colors/{color_id}/")
    assert delete.status_code == 204


@pytest.mark.django_db
def test_e2e_04_member_products_variants_bookings_full_roundtrip(inv_client):
    """
    A long end-to-end member flow that touches:
    categories, size systems/sizes, colors, products (list/detail/update/delete),
    variants (list/detail/update/delete), bookings (list/detail/update/delete),
    and the guard that blocks deleting a variant with active bookings.
    """
    # prerequisites: category, size system + size, color
    category = inv_client.post(
        "/inventory/categories/",
        {"name": f"Costumes-{_uid()}"},
        format="json",
    )
    assert category.status_code == 201
    category_id = category.data["id"]

    size_system = inv_client.post(
        "/inventory/size-systems/",
        {"name": f"Clothing-{_uid()}"},
        format="json",
    )
    assert size_system.status_code == 201
    size_system_id = size_system.data["id"]

    size = inv_client.post(
        "/inventory/sizes/",
        {"name": "M", "size_system_id": size_system_id},
        format="json",
    )
    assert size.status_code == 201
    size_id = size.data["id"]

    color = inv_client.post(
        "/inventory/colors/",
        {"name": f"Blue-{_uid()}", "hex_code": "#0000FF"},
        format="json",
    )
    assert color.status_code == 201
    color_id = color.data["id"]

    # product: create
    product = inv_client.post(
        "/inventory/products/",
        {
            "name": f"T-Shirt-{_uid()}",
            "description": "e2e member product",
            "category_id": category_id,
            "status": "active",
        },
        format="json",
    )
    assert product.status_code == 201
    product_id = product.data["id"]
    assert product.data["owner_type"] == "member"

    # product: list, detail, update
    products = inv_client.get("/inventory/products/")
    assert products.status_code == 200
    assert "results" in products.data
    assert any(p["id"] == product_id for p in products.data["results"])

    detail = inv_client.get(f"/inventory/products/{product_id}/")
    assert detail.status_code == 200
    assert detail.data["id"] == product_id

    updated = inv_client.patch(
        f"/inventory/products/{product_id}/",
        {"description": "e2e member product updated", "brand": "E2E Brand"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.data["description"] == "e2e member product updated"
    assert updated.data["brand"] == "E2E Brand"

    # variant: create via product variants endpoint
    variant = inv_client.post(
        f"/inventory/products/{product_id}/variants/",
        {
            "sku": f"SKU-{_uid()}",
            "size_id": size_id,
            "color_ids": [color_id],
            "condition": "good",
            "status": "available",
            "acquisition_type": "other",
        },
        format="json",
    )
    assert variant.status_code == 201
    variant_id = variant.data["id"]

    # variant: list for product + detail + update
    v_list = inv_client.get(f"/inventory/products/{product_id}/variants/")
    assert v_list.status_code == 200
    assert "results" in v_list.data
    assert any(v["id"] == variant_id for v in v_list.data["results"])

    v_detail = inv_client.get(f"/inventory/variants/{variant_id}/")
    assert v_detail.status_code == 200
    assert v_detail.data["id"] == variant_id
    assert v_detail.data["size"]["id"] == size_id

    v_patch = inv_client.patch(
        f"/inventory/variants/{variant_id}/",
        {"internal_notes": "internal", "public_notes": "public"},
        format="json",
    )
    assert v_patch.status_code == 200
    assert v_patch.data["internal_notes"] == "internal"
    assert v_patch.data["public_notes"] == "public"

    # booking: create, list, detail, update
    start_at = timezone.now()
    end_at = start_at + timedelta(days=2)
    booking = inv_client.post(
        f"/inventory/variants/{variant_id}/bookings/",
        {
            "booking_type": "rent",
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
            "title": "E2E booking",
            "notes": "initial",
        },
        format="json",
    )
    assert booking.status_code == 201
    booking_id = booking.data["id"]
    assert booking.data["variant"] == variant_id

    b_list = inv_client.get(f"/inventory/variants/{variant_id}/bookings/")
    assert b_list.status_code == 200
    assert "results" in b_list.data
    assert any(b["id"] == booking_id for b in b_list.data["results"])

    b_detail = inv_client.get(f"/inventory/bookings/{booking_id}/")
    assert b_detail.status_code == 200
    assert b_detail.data["id"] == booking_id

    b_patch = inv_client.patch(
        f"/inventory/bookings/{booking_id}/",
        {"notes": "updated", "status": "confirmed"},
        format="json",
    )
    assert b_patch.status_code == 200
    assert b_patch.data["notes"] == "updated"
    assert b_patch.data["status"] == "confirmed"

    # variant delete must be blocked while booking is active/confirmed
    v_delete_blocked = inv_client.delete(f"/inventory/variants/{variant_id}/")
    assert v_delete_blocked.status_code == 400
    assert v_delete_blocked.data["errors"]["messages"] == ["VariantHasActiveBookings"]

    # delete booking then delete variant
    b_delete = inv_client.delete(f"/inventory/bookings/{booking_id}/")
    assert b_delete.status_code == 204

    v_delete = inv_client.delete(f"/inventory/variants/{variant_id}/")
    assert v_delete.status_code == 204

    # delete product
    p_delete = inv_client.delete(f"/inventory/products/{product_id}/")
    assert p_delete.status_code == 204


@pytest.mark.django_db
def test_e2e_05_school_products_and_cross_endpoints_roundtrip(inv_client):
    """
    Full school product API roundtrip:
    create/list/detail/update, create variant, create/delete booking, delete variant, delete product.

    This ensures we cover the separate school endpoints as well as the shared
    variants + bookings endpoints.
    """
    # prerequisites
    category = inv_client.post(
        "/inventory/categories/",
        {"name": f"School-Cat-{_uid()}"},
        format="json",
    )
    assert category.status_code == 201
    category_id = category.data["id"]

    size_system = inv_client.post(
        "/inventory/size-systems/",
        {"name": f"School-Sizes-{_uid()}"},
        format="json",
    )
    assert size_system.status_code == 201
    size_system_id = size_system.data["id"]

    size = inv_client.post(
        "/inventory/sizes/",
        {"name": "XL", "size_system_id": size_system_id},
        format="json",
    )
    assert size.status_code == 201
    size_id = size.data["id"]

    # school product: create
    school_product = inv_client.post(
        "/inventory/school/products/",
        {
            "name": f"School-Prod-{_uid()}",
            "description": "e2e school product",
            "category_id": category_id,
            "school_details": {
                "inventory_code": f"INV-{_uid()}",
                "storage_location": "Room A",
                "notes": "initial notes",
            },
        },
        format="json",
    )
    assert school_product.status_code == 201
    school_product_id = school_product.data["id"]
    assert school_product.data["owner_type"] == "school"

    # school product: list + detail + update
    list_school = inv_client.get("/inventory/school/products/")
    assert list_school.status_code == 200
    assert "results" in list_school.data
    assert any(p["id"] == school_product_id for p in list_school.data["results"])

    school_detail = inv_client.get(f"/inventory/school/products/{school_product_id}/")
    assert school_detail.status_code == 200
    assert school_detail.data["id"] == school_product_id

    school_update = inv_client.patch(
        f"/inventory/school/products/{school_product_id}/",
        {
            "description": "updated school description",
            "school_details": {"storage_location": "Room B"},
        },
        format="json",
    )
    assert school_update.status_code == 200
    assert school_update.data["description"] == "updated school description"

    # create variant for this school product
    variant = inv_client.post(
        f"/inventory/products/{school_product_id}/variants/",
        {
            "sku": f"SCH-{_uid()}",
            "size_id": size_id,
            "condition": "excellent",
            "status": "available",
            "acquisition_type": "school_owned",
        },
        format="json",
    )
    assert variant.status_code == 201
    variant_id = variant.data["id"]

    # booking create + delete via shared booking endpoints
    start_at = timezone.now()
    end_at = start_at + timedelta(days=1)
    booking = inv_client.post(
        f"/inventory/variants/{variant_id}/bookings/",
        {
            "booking_type": "school_use",
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
            "title": "School usage",
        },
        format="json",
    )
    assert booking.status_code == 201
    booking_id = booking.data["id"]

    delete_booking = inv_client.delete(f"/inventory/bookings/{booking_id}/")
    assert delete_booking.status_code == 204

    # delete variant then delete school product
    delete_variant = inv_client.delete(f"/inventory/variants/{variant_id}/")
    assert delete_variant.status_code == 204

    delete_school = inv_client.delete(f"/inventory/school/products/{school_product_id}/")
    assert delete_school.status_code == 204

