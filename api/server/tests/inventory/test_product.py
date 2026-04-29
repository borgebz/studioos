import pytest

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from core.exceptions import DomainError

from inventory.services.category_services import create_category
from inventory.services.product_services import create_product


@pytest.mark.django_db
def test_create_valid_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod1@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste",
        category_id=category.id,
        price=15
    )

    assert product.id is not None
    assert product.name == "T-Shirt"
    assert product.price == 15


@pytest.mark.django_db
def test_create_product_without_permission():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod2@test.com",
        password="1234"
    )

    category = create_category(name="Roupa")

    with pytest.raises(DomainError):
        create_product(
            user=user,
            name="Produto",
            description="Teste",
            category_id=category.id,
            price=10
        )


@pytest.mark.django_db
def test_create_product_without_name():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod3@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    with pytest.raises(DomainError):
        create_product(
            user=user,
            description="Teste",
            category_id=category.id,
            price=10
        )


@pytest.mark.django_db
def test_create_product_invalid_category():
    User = get_user_model()

    user = User.objects.create_user(
        email="prod4@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    with pytest.raises(DomainError):
        create_product(
            user=user,
            name="Produto",
            description="Teste",
            category_id=9999,
            price=10
        )