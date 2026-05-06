import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from rest_framework.exceptions import PermissionDenied, ValidationError

from inventory.services.category_services import create_category
from inventory.services.product_services import create_product


@pytest.mark.django_db
def test_create_valid_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod1@test.com",
        password="1234",
    )

    permission = Permission.objects.get(
        codename="add_product",
        content_type__app_label="inventory",
        content_type__model="product",
    )
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste",
        category_id=category.id,
    )

    assert product.id is not None
    assert product.name == "T-Shirt"


@pytest.mark.django_db
def test_create_product_without_permission():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod2@test.com",
        password="1234",
    )

    category = create_category(name="Roupa")

    with pytest.raises(PermissionDenied):
        create_product(
            user=user,
            name="Produto",
            description="Teste",
            category_id=category.id,
        )


@pytest.mark.django_db
def test_create_product_without_name():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod3@test.com",
        password="1234",
    )

    permission = Permission.objects.get(
        codename="add_product",
        content_type__app_label="inventory",
        content_type__model="product",
    )
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    with pytest.raises(ValidationError) as exc:
        create_product(
            user=user,
            description="Teste",
            category_id=category.id,
        )

    assert exc.value.detail["messages"] == ["InvalidProductPayload"]


@pytest.mark.django_db
def test_create_product_invalid_category():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod4@test.com",
        password="1234",
    )

    permission = Permission.objects.get(
        codename="add_product",
        content_type__app_label="inventory",
        content_type__model="product",
    )
    user.user_permissions.add(permission)

    with pytest.raises(ValidationError) as exc:
        create_product(
            user=user,
            name="Produto",
            description="Teste",
            category_id=9999,
        )

    assert exc.value.detail["messages"] == ["InvalidCategory"]
