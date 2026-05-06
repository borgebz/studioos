import pytest

from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from inventory.services.category_services import create_category
from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.color_services import create_color

from inventory.services.product_services import create_product
from rest_framework.exceptions import ValidationError

from inventory.services.product_variant_services import create_variant, delete_variant
from inventory.services.variant_booking_services import create_booking


@pytest.mark.django_db
def test_create_complete_product_flow():
    User = get_user_model()

    user = User.objects.create_user(email="flow1@test.com", password="1234")

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Roupa Flow")

    size_system = create_size_system(name="EU-FLOW")
    size = create_size(name="M", size_system_id=size_system.id)

    color = create_color(name="Azul Flow", hex_code="#0000FF")

    product = create_product(
        user=user,
        name="T-Shirt Flow",
        description="Produto completo",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        color_ids=[color.id],
        sku="FLOW-001",
        condition="new",
        acquisition_type="purchased",
    )

    assert product.id is not None
    assert variant.id is not None
    assert variant.product.id == product.id


@pytest.mark.django_db
def test_booking_flow_blocks_variant():
    User = get_user_model()

    user = User.objects.create_user(email="flow2@test.com", password="1234")

    for codename, model in (
        ("add_product", "product"),
        ("delete_productvariant", "productvariant"),
    ):
        user.user_permissions.add(
            Permission.objects.get(
                codename=codename,
                content_type__app_label="inventory",
                content_type__model=model,
            )
        )

    category = create_category(name="Roupa Booking")

    size_system = create_size_system(name="EU-BOOK")
    size = create_size(name="L", size_system_id=size_system.id)

    product = create_product(
        user=user,
        name="Casaco",
        description="Teste booking",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="BOOK-001",
        condition="new",
        acquisition_type="purchased",
    )

    start_at = timezone.now()
    end_at = start_at + timedelta(days=2)

    booking = create_booking(
        variant_id=variant.id,
        user=user,
        booking_type="rent",
        start_at=start_at,
        end_at=end_at,
    )

    assert booking.id is not None
    assert booking.variant.id == variant.id

    with pytest.raises(ValidationError) as exc:
        delete_variant(variant_id=variant.id, user=user)
    assert exc.value.detail["messages"] == ["VariantHasActiveBookings"]


@pytest.mark.django_db
def test_multiple_variants_same_product():
    User = get_user_model()

    user = User.objects.create_user(email="flow3@test.com", password="1234")

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Calçado Flow")

    size_system = create_size_system(name="EU-SHOE")

    size1 = create_size(name="42", size_system_id=size_system.id)
    size2 = create_size(name="43", size_system_id=size_system.id)

    product = create_product(
        user=user,
        name="Sapatilhas",
        description="Dois tamanhos",
        category_id=category.id,
    )

    v1 = create_variant(
        product_id=product.id,
        user=user,
        size_id=size1.id,
        sku="SAP-42",
        condition="new",
        acquisition_type="purchased",
    )

    v2 = create_variant(
        product_id=product.id,
        user=user,
        size_id=size2.id,
        sku="SAP-43",
        condition="new",
        acquisition_type="purchased",
    )

    assert v1.product.id == product.id
    assert v2.product.id == product.id
    assert v1.id != v2.id
