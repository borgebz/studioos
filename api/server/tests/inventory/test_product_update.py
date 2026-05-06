import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from inventory.services.category_services import create_category
from inventory.services.product_services import (
    create_product,
    update_product,
)


def _add_product_perm(user):
    perm = Permission.objects.get(
        codename="add_product",
        content_type__app_label="inventory",
        content_type__model="product",
    )
    user.user_permissions.add(perm)


@pytest.mark.django_db
def test_update_product_simple_fields():
    User = get_user_model()

    user = User.objects.create_user(
        email="update1@test.com",
        password="1234",
    )

    _add_product_perm(user)

    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="Produto Antigo",
        description="Descricao antiga",
        category_id=category.id,
        brand="OldBrand",
    )

    updated = update_product(
        pk=product.id,
        user=user,
        name="Produto Novo",
        description="Descricao nova",
        brand="NewBrand",
    )

    assert updated.name == "Produto Novo"
    assert updated.description == "Descricao nova"
    assert updated.brand == "NewBrand"


@pytest.mark.django_db
def test_update_product_cannot_change_owner_type():
    User = get_user_model()

    user = User.objects.create_user(
        email="update2@test.com",
        password="1234",
    )

    _add_product_perm(user)

    category = create_category(name="Calçado")

    product = create_product(
        user=user,
        name="Produto X",
        description="Teste",
        category_id=category.id,
    )

    with pytest.raises(ValidationError) as exc:
        update_product(
            pk=product.id,
            user=user,
            owner_type="school",
        )

    assert exc.value.detail["messages"] == ["ImmutableProductOwner"]


@pytest.mark.django_db
def test_update_product_cannot_change_owner_id():
    User = get_user_model()

    user = User.objects.create_user(
        email="update3@test.com",
        password="1234",
    )

    _add_product_perm(user)

    category = create_category(name="Acessórios")

    product = create_product(
        user=user,
        name="Produto Y",
        description="Teste",
        category_id=category.id,
    )

    with pytest.raises(ValidationError) as exc:
        update_product(
            pk=product.id,
            user=user,
            owner_id=999,
        )

    assert exc.value.detail["messages"] == ["ImmutableProductOwner"]


@pytest.mark.django_db
def test_update_product_invalid_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="update4@test.com",
        password="1234",
    )

    _add_product_perm(user)

    with pytest.raises(AppNotFound):
        update_product(
            pk=9999,
            user=user,
            name="Novo Nome",
        )
