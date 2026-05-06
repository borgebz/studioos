import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from rest_framework.exceptions import PermissionDenied, ValidationError

from inventory.models import Category, Color, Product, Size
from inventory.services.category_services import (
    create_category,
    delete_category,
)
from inventory.services.color_services import (
    create_color,
    delete_color,
)
from inventory.services.product_services import (
    create_product,
    delete_product,
)
from inventory.services.product_variant_services import create_variant
from inventory.services.size_services import (
    create_size,
    delete_size,
)
from inventory.services.size_system_services import create_size_system


@pytest.mark.django_db
def test_delete_category_without_products():
    category = create_category(name="Roupa")
    pk = category.pk
    delete_category(category=category)

    assert not Category.objects.filter(pk=pk).exists()
    assert Category.all_objects.filter(pk=pk, deleted_at__isnull=False).exists()


@pytest.mark.django_db
def test_delete_category_with_products_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft1@test.com",
        password="1234",
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Calçado")

    create_product(
        user=user,
        name="Produto Teste",
        description="Teste",
        category_id=category.id,
    )

    with pytest.raises(ValidationError) as exc:
        delete_category(category=category)

    assert exc.value.detail["messages"] == ["CategoryHasAssociatedProducts"]


@pytest.mark.django_db
def test_delete_size_without_variants():
    size_system = create_size_system(name="EU")

    size = create_size(
        name="M",
        size_system_id=size_system.id,
    )
    pk = size.pk

    delete_size(size=size)

    assert not Size.objects.filter(pk=pk).exists()
    assert Size.all_objects.filter(pk=pk, deleted_at__isnull=False).exists()


@pytest.mark.django_db
def test_delete_size_with_variants_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft2@test.com",
        password="1234",
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Acessórios")

    product = create_product(
        user=user,
        name="Produto Size",
        description="Teste",
        category_id=category.id,
    )

    size_system = create_size_system(name="US")

    size = create_size(
        name="L",
        size_system_id=size_system.id,
    )

    create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="SKU-SIZE-001",
        condition="new",
        acquisition_type="purchased",
    )

    with pytest.raises(ValidationError) as exc:
        delete_size(size=size)

    assert exc.value.detail["messages"] == ["SizeInUse"]


@pytest.mark.django_db
def test_delete_color_without_variants():
    color = create_color(
        name="Preto",
        hex_code="#000000",
    )
    pk = color.pk
    delete_color(color=color)

    assert not Color.objects.filter(pk=pk).exists()
    assert Color.all_objects.filter(pk=pk, deleted_at__isnull=False).exists()


@pytest.mark.django_db
def test_delete_color_with_variants_fails():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft3@test.com",
        password="1234",
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Cor Teste")

    product = create_product(
        user=user,
        name="Produto Cor",
        description="Teste",
        category_id=category.id,
    )

    size_system = create_size_system(name="EU-COLOR")

    size = create_size(
        name="M",
        size_system_id=size_system.id,
    )

    color = create_color(
        name="Azul",
        hex_code="#0000FF",
    )

    create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        color_ids=[color.id],
        sku="SKU-COLOR-001",
        condition="new",
        acquisition_type="purchased",
    )

    with pytest.raises(ValidationError) as exc:
        delete_color(color=color)

    assert exc.value.detail["messages"] == ["ColorInUse"]


@pytest.mark.django_db
def test_delete_product_without_critical_dependencies():
    User = get_user_model()

    user = User.objects.create_user(
        email="soft4@test.com",
        password="1234",
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Produto Delete")

    product = create_product(
        user=user,
        name="Produto Remover",
        description="Teste",
        category_id=category.id,
    )
    pk = product.pk

    delete_product(pk=product.id, user=user)

    assert not Product.objects.filter(pk=pk).exists()
    assert Product.all_objects.filter(pk=pk, deleted_at__isnull=False).exists()


@pytest.mark.django_db
def test_delete_product_invalid_owner_fails():
    User = get_user_model()

    owner = User.objects.create_user(
        email="soft5@test.com",
        password="1234",
    )

    other = User.objects.create_user(
        email="soft6@test.com",
        password="1234",
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
    )

    with pytest.raises(PermissionDenied):
        delete_product(
            pk=product.id,
            user=other,
        )
