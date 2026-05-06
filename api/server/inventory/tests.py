"""
Inventory app-level checks (contract + HTTP semantics).

Collected when pytest ``testpaths`` includes ``inventory`` — see ``pyproject.toml``.
"""

import pytest
from django.contrib.auth.models import Permission
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_product_delete_returns_204_empty_body():
    from django.contrib.auth import get_user_model

    from inventory.services.category_services import create_category
    from inventory.services.product_services import create_product

    User = get_user_model()
    user = User.objects.create_user(email="rules-del@test.com", password="1234")
    for codename in ("add_product", "view_product", "change_product", "delete_product"):
        perm = Permission.objects.get(
            codename=codename,
            content_type__app_label="inventory",
            content_type__model="product",
        )
        user.user_permissions.add(perm)

    category = create_category(name="DelCat")
    product = create_product(
        user=user,
        name="ToDelete",
        description="x",
        category_id=category.id,
    )

    client = APIClient()
    client.force_authenticate(user=user)
    url = f"/inventory/products/{product.pk}/"
    response = client.delete(url)

    assert response.status_code == 204
    assert response.content == b""


@pytest.mark.django_db
def test_validation_error_response_has_errors_messages():
    from django.contrib.auth import get_user_model

    from inventory.services.color_services import create_color

    User = get_user_model()
    user = User.objects.create_user(email="rules-val@test.com", password="1234")
    for codename in ("add_color", "view_color"):
        perm = Permission.objects.get(
            codename=codename,
            content_type__app_label="inventory",
            content_type__model="color",
        )
        user.user_permissions.add(perm)

    create_color(name="Dup", hex_code="#010101")

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post(
        "/inventory/colors/",
        {"name": "Dup", "hex_code": "#020202"},
        format="json",
    )

    assert response.status_code == 400
    body = response.json()
    assert "errors" in body
    assert "messages" in body["errors"]
    assert body["errors"]["messages"]
