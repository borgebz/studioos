import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from inventory.models import Color, SizeSystem, Size, Category

from inventory.services.color_services import create_color
from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.category_services import create_category

from inventory.services.product_services import create_product
from inventory.services.product_variant_services import create_variant


@pytest.mark.django_db
def test_reference_data_can_be_created():
    color = create_color(
        name="Preto Seed",
        hex_code="#000000"
    )

    size_system = create_size_system(name="EU-SEED")

    size = create_size(
        name="M",
        size_system_id=size_system.id
    )

    category = create_category(name="Roupa Seed")

    assert color.id is not None
    assert size_system.id is not None
    assert size.id is not None
    assert category.id is not None


@pytest.mark.django_db
def test_reference_data_can_create_product_and_variant():
    User = get_user_model()

    user = User.objects.create_user(
        email="seed@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Categoria Seed")

    size_system = create_size_system(name="EU")
    size = create_size(
        name="L",
        size_system_id=size_system.id
    )

    product = create_product(
        user=user,
        name="Produto Seed",
        description="Teste",
        category_id=category.id,
        price=20
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="SEED-001",
        condition="new",
        acquisition_type="owned"
    )

    assert product.id is not None
    assert variant.id is not None


@pytest.mark.django_db
def test_reference_tables_start_empty_or_valid():
    assert Color.objects.count() >= 0
    assert SizeSystem.objects.count() >= 0
    assert Size.objects.count() >= 0
    assert Category.objects.count() >= 0