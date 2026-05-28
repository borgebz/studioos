import pytest
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from tests.conftest import make_user_with_role

from inventory.services.category_services import create_category
from inventory.services.product_services import create_product
from inventory.services.product_variant_services import create_variant
from inventory.services.size_services import create_size
from inventory.services.size_system_services import create_size_system
from inventory.services.variant_booking_services import create_booking


@pytest.mark.django_db
def test_create_valid_variant_booking():
    user = make_user_with_role("direction")

    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-001",
        condition="new",
        acquisition_type="purchased",
    )

    start_at = timezone.now()
    end_at = start_at + timedelta(days=3)

    booking = create_booking(
        variant_id=variant.id,
        user=user,
        booking_type="rent",
        start_at=start_at,
        end_at=end_at,
    )

    assert booking.id is not None
    assert booking.variant == variant


@pytest.mark.django_db
def test_invalid_booking_dates():
    user = make_user_with_role("direction")

    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste2",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-002",
        condition="new",
        acquisition_type="purchased",
    )

    start_at = timezone.now()
    end_at = start_at

    with pytest.raises(ValidationError) as exc:
        create_booking(
            variant_id=variant.id,
            user=user,
            booking_type="rent",
            start_at=start_at,
            end_at=end_at,
        )

    assert exc.value.detail["messages"] == ["InvalidBookingDateRange"]


@pytest.mark.django_db
def test_overlap_booking_same_variant():
    user = make_user_with_role("direction")

    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste3",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-003",
        condition="new",
        acquisition_type="purchased",
    )

    start_at = timezone.now()
    end_at = start_at + timedelta(days=5)

    create_booking(
        variant_id=variant.id,
        user=user,
        booking_type="rent",
        start_at=start_at,
        end_at=end_at,
    )

    with pytest.raises(ValidationError) as exc:
        create_booking(
            variant_id=variant.id,
            user=user,
            booking_type="rent",
            start_at=start_at + timedelta(days=1),
            end_at=end_at + timedelta(days=1),
        )

    assert exc.value.detail["messages"] == ["BookingOverlap"]
