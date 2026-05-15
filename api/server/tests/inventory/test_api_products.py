import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from tests.conftest import make_user_with_role

from inventory.models import Product
from inventory.services.category_services import create_category


@pytest.mark.django_db
def test_products_endpoint_requires_authentication():
    client = APIClient()

    response = client.get("/api/inventory/products/")

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_product_detail_requires_authentication():
    client = APIClient()

    response = client.get("/api/inventory/products/1/")

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_school_products_requires_authentication():
    client = APIClient()

    response = client.get("/api/inventory/school/products/")

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_authenticated_user_can_get_products():
    user = make_user_with_role("direction")

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get("/api/inventory/products/")

    assert response.status_code == 200
    assert response.data is not None


@pytest.mark.django_db
def test_authenticated_user_can_create_product():
    user = make_user_with_role("direction")

    client = APIClient()
    client.force_authenticate(user=user)
    category = create_category(name="API Category")
    payload = {
        "name": "Produto API",
        "description": "Criado por teste",
        "category_id": category.id,
    }

    response = client.post("/api/inventory/products/", payload, format="json")

    assert response.status_code in [200, 201]
    assert Product.objects.filter(name="Produto API").exists()


@pytest.mark.django_db
def test_user_without_school_permission_cannot_create_school_product():
    User = get_user_model()
    user = User.objects.create_user(email="api3@test.com", password="1234")

    client = APIClient()

    client.force_authenticate(user=user)
    category = create_category(name="School Category")
    payload = {
        "name": "Produto School",
        "description": "Teste",
        "category_id": category.id,
    }

    response = client.post("/api/inventory/school/products/", payload, format="json")

    assert response.status_code in [401, 403]


@pytest.mark.django_db
def test_authenticated_user_can_get_product_detail():
    user = make_user_with_role("direction")

    category = create_category(name="Detail Category")

    client = APIClient()
    client.force_authenticate(user=user)

    create_response = client.post(
        "/api/inventory/products/",
        {
            "name": "Produto Detail",
            "description": "Teste",
            "category_id": category.id,
        },
        format="json",
    )

    assert create_response.status_code in [200, 201]

    product = Product.objects.get(name="Produto Detail")

    response = client.get(f"/api/inventory/products/{product.id}/")

    assert response.status_code == 200
    assert response.data["name"] == "Produto Detail"
