import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from rest_framework.exceptions import PermissionDenied, ValidationError

from inventory.services.category_services import create_category
from inventory.services.product_services import create_product


@pytest.mark.django_db
def test_user_without_permission_cannot_create_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="nopermission@test.com",
        password="1234",
    )

    category = create_category(name="Roupa")

    with pytest.raises(PermissionDenied):
        create_product(
            user=user,
            name="Produto X",
            description="Teste",
            category_id=category.id,
        )


@pytest.mark.django_db
def test_user_with_permission_can_create_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="withpermission@test.com",
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
        name="Produto Y",
        description="Teste",
        category_id=category.id,
    )

    assert product.id is not None
    assert product.owner_type == "member"


@pytest.mark.django_db
def test_user_cannot_create_product_with_invalid_category():
    User = get_user_model()

    user = User.objects.create_user(
        email="invalidcategory@test.com",
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
            name="Produto Z",
            description="Teste",
            category_id=9999,
        )

    assert exc.value.detail["messages"] == ["InvalidCategory"]


@pytest.mark.django_db
def test_user_without_permission_cannot_create_second_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="blocked@test.com",
        password="1234",
    )

    category = create_category(name="Calçado")

    with pytest.raises(PermissionDenied):
        create_product(
            user=user,
            name="Sapatos",
            description="Teste",
            category_id=category.id,
        )
