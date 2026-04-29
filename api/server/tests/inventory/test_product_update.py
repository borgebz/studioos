import pytest

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from core.exceptions import DomainError

from inventory.services.category_services import create_category
from inventory.services.product_services import (
    create_product,
    update_product,
)


@pytest.mark.django_db
def test_update_product_simple_fields():
    User = get_user_model()

    user = User.objects.create_user(
        email="update1@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="Produto Antigo",
        description="Descricao antiga",
        category_id=category.id,
        price=10
    )

    updated = update_product(
        pk=product.id,
        user=user,
        name="Produto Novo",
        description="Descricao nova",
        price=25
    )

    assert updated.name == "Produto Novo"
    assert updated.description == "Descricao nova"
    assert updated.price == 25


@pytest.mark.django_db
def test_update_product_cannot_change_owner_type():
    User = get_user_model()

    user = User.objects.create_user(
        email="update2@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Calçado")

    product = create_product(
        user=user,
        name="Produto X",
        description="Teste",
        category_id=category.id,
        price=20
    )

    with pytest.raises(DomainError):
        update_product(
            pk=product.id,
            user=user,
            owner_type="school"
        )


@pytest.mark.django_db
def test_update_product_cannot_change_owner_id():
    User = get_user_model()

    user = User.objects.create_user(
        email="update3@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Acessórios")

    product = create_product(
        user=user,
        name="Produto Y",
        description="Teste",
        category_id=category.id,
        price=30
    )

    with pytest.raises(DomainError):
        update_product(
            pk=product.id,
            user=user,
            owner_id=999
        )


@pytest.mark.django_db
def test_update_product_invalid_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="update4@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    with pytest.raises(DomainError):
        update_product(
            pk=9999,
            user=user,
            name="Novo Nome"
        )