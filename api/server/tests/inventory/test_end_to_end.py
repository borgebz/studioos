import pytest

from datetime import timedelta
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from tests.conftest import make_user_with_role

from inventory.services.category_services import create_category
from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.color_services import create_color

from inventory.services.product_services import create_product

from inventory.services.product_variant_services import create_variant, delete_variant
from inventory.services.variant_booking_services import create_booking


@pytest.mark.django_db
def test_create_complete_product_flow():
    user = make_user_with_role("direction")

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
    user = make_user_with_role("direction")

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
    user = make_user_with_role("direction")

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
