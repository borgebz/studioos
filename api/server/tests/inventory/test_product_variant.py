import pytest

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from core.exceptions import DomainError

from inventory.services.category_services import create_category
from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.product_services import create_product
from inventory.services.product_variant_services import (
    create_variant,
    delete_variant,
)


@pytest.mark.django_db
def test_create_valid_variant():
    User = get_user_model()

    user = User.objects.create_user(
        email="variant1@test.com",
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

    size_system = create_size_system(name="EU")
    size = create_size(
        name="M",
        size_system_id=size_system.id
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-001",
        condition="new",
        acquisition_type="owned"
    )

    assert variant.id is not None
    assert variant.sku == "TSHIRT-M-001"


@pytest.mark.django_db
def test_create_variant_duplicate_sku():
    User = get_user_model()

    user = User.objects.create_user(
        email="variant2@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="Produto A",
        description="Teste",
        category_id=category.id,
        price=10
    )

    size_system = create_size_system(name="EU")
    size = create_size(
        name="L",
        size_system_id=size_system.id
    )

    create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="SKU-001",
        condition="new",
        acquisition_type="owned"
    )

    with pytest.raises(DomainError):
        create_variant(
            product_id=product.id,
            user=user,
            size_id=size.id,
            sku="SKU-001",
            condition="new",
            acquisition_type="owned"
        )


@pytest.mark.django_db
def test_create_variant_invalid_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="variant3@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    size_system = create_size_system(name="EU")
    size = create_size(
        name="S",
        size_system_id=size_system.id
    )

    with pytest.raises(DomainError):
        create_variant(
            product_id=9999,
            user=user,
            size_id=size.id,
            sku="SKU-002",
            condition="new",
            acquisition_type="owned"
        )


@pytest.mark.django_db
def test_create_variant_invalid_size():
    User = get_user_model()

    user = User.objects.create_user(
        email="variant4@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="Produto B",
        description="Teste",
        category_id=category.id,
        price=20
    )

    with pytest.raises(DomainError):
        create_variant(
            product_id=product.id,
            user=user,
            size_id=9999,
            sku="SKU-003",
            condition="new",
            acquisition_type="owned"
        )


@pytest.mark.django_db
def test_delete_variant_archives():
    User = get_user_model()

    user = User.objects.create_user(
        email="variant5@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="Produto C",
        description="Teste",
        category_id=category.id,
        price=30
    )

    size_system = create_size_system(name="EU")
    size = create_size(
        name="XL",
        size_system_id=size_system.id
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="SKU-004",
        condition="new",
        acquisition_type="owned"
    )

    delete_variant(
        variant_id=variant.id,
        user=user
    )
    variant.refresh_from_db()

    assert variant.status == "archived"