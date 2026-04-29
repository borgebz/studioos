import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from core.exceptions import DomainError

from inventory.services.category_services import (
    create_category,
    delete_category,
)

from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import (
    create_size,
    delete_size,
)

from inventory.services.product_services import (
    create_product,
    delete_product,
)
from inventory.services.color_services import (
    create_color,
    delete_color,
)


@pytest.mark.django_db
def test_delete_category_without_products():
    category = create_category(name="Roupa")
    delete_category(category=category)
    category.refresh_from_db()
    assert category.is_active is False


@pytest.mark.django_db
def test_delete_category_with_products_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft1@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Calçado")

    create_product(
        user=user,
        name="Produto Teste",
        description="Teste",
        category_id=category.id,
        price=20
    )

    with pytest.raises(DomainError):
        delete_category(category=category)


@pytest.mark.django_db
def test_delete_size_without_variants():
    size_system = create_size_system(name="EU")

    size = create_size(
        name="M",
        size_system_id=size_system.id
    )

    deleted = delete_size(size=size)

    assert deleted.is_active is False


@pytest.mark.django_db
def test_delete_size_with_variants_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft2@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Acessórios")

    product = create_product(
        user=user,
        name="Produto Size",
        description="Teste",
        category_id=category.id,
        price=15
    )

    size_system = create_size_system(name="US")

    size = create_size(
        name="L",
        size_system_id=size_system.id
    )

    from inventory.services.product_variant_services import create_variant

    create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="SKU-SIZE-001",
        condition="new",
        acquisition_type="owned"
    )

    with pytest.raises(DomainError):
        delete_size(size=size)

#Version 2
@pytest.mark.django_db
def test_delete_color_without_variants():
    color = create_color(
        name="Preto",
        hex_code="#000000"
    )
    delete_color(color=color)
    color.refresh_from_db()
    assert color.is_active is False


@pytest.mark.django_db
def test_delete_color_with_variants_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft3@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Cor Teste")

    product = create_product(
        user=user,
        name="Produto Cor",
        description="Teste",
        category_id=category.id,
        price=22
    )

    size_system = create_size_system(name="EU-COLOR")

    size = create_size(
        name="M",
        size_system_id=size_system.id
    )

    color = create_color(
        name="Azul",
        hex_code="#0000FF"
    )

    from inventory.services.product_variant_services import create_variant

    create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        color_ids=[color.id],
        sku="SKU-COLOR-001",
        condition="new",
        acquisition_type="owned"
    )

    with pytest.raises(DomainError):
        delete_color(color=color)


# New tests for product soft delete

@pytest.mark.django_db
def test_delete_product_without_critical_dependencies():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft4@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Produto Delete")

    product = create_product(
        user=user,
        name="Produto Remover",
        description="Teste",
        category_id=category.id,
        price=12
    )

    delete_product(
        pk=product.id,
        user=user
    )

    product.refresh_from_db()
    assert product.status == "archived"


@pytest.mark.django_db
def test_delete_product_invalid_owner_fails():
    User = get_user_model()

    owner = User.objects.create_user(
        email="soft5@test.com",
        password="1234"
    )

    other = User.objects.create_user(
        email="soft6@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    owner.user_permissions.add(permission)
    other.user_permissions.add(permission)

    category = create_category(name="Produto Owner")

    product = create_product(
        user=owner,
        name="Produto Protegido",
        description="Teste",
        category_id=category.id,
        price=18
    )

    with pytest.raises(DomainError):
        delete_product(
            pk=product.id,
            user=other
        )