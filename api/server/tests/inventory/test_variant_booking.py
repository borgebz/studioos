import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission

from core.exceptions import DomainError

from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.category_services import create_category
from inventory.services.product_services import create_product
from inventory.services.product_variant_services import create_variant
from inventory.services.variant_booking_services import create_booking

@pytest.mark.django_db
def test_create_valid_variant_booking():
    User = get_user_model()
    user = User.objects.create_user(
        email="test1@example.com",
        password="pass1234"
    )
    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste",
        category_id=category.id,
        price=10
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-001",
        condition="new",
        acquisition_type="owned"
    )

    start_at = timezone.now()
    end_at = start_at + timedelta(days=3)

    booking = create_booking(
        user=user,
        booking_type="rent",
        variant_id=variant.id,
        start_at=start_at,
        end_at=end_at
    )

    assert booking.id is not None
    assert booking.variant == variant


@pytest.mark.django_db
def test_invalid_booking_dates():
    User = get_user_model()
    user = User.objects.create_user(
        email="test2@example.com",
        password="pass1234"
    )
    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste2",
        category_id=category.id,
        price=10
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-002",
        condition="new",
        acquisition_type="owned"
    )

    start_at = timezone.now()
    end_at = start_at

    with pytest.raises(DomainError) as exc:
        create_booking(
            user=user,
            booking_type="rent",
            variant_id=variant.id,
            start_at=start_at,
            end_at=end_at
        )

    assert exc.value.detail["code"] == "InvalidBookingDates"


@pytest.mark.django_db
def test_overlap_booking_same_variant():
    User = get_user_model()
    user = User.objects.create_user(
        email="test3@example.com",
        password="pass1234"
    )
    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)


    size_system = create_size_system(name="EU")
    size = create_size(name="M", size_system_id=size_system.id)
    category = create_category(name="Roupa")

    product = create_product(
        user=user,
        name="T-Shirt",
        description="Produto teste3",
        category_id=category.id,
        price=10
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="TSHIRT-M-003",
        condition="new",
        acquisition_type="owned"
    )

    start_at = timezone.now()
    end_at = start_at + timedelta(days=5)

    create_booking(
        user=user,
        booking_type="rent",
        variant_id=variant.id,
        start_at=start_at,
        end_at=end_at
    )

    with pytest.raises(DomainError) as exc:
        create_booking(
            user=user,
            booking_type="rent",
            variant_id=variant.id,
            start_at=start_at + timedelta(days=1),
            end_at=end_at + timedelta(days=1)
        )

    assert exc.value.detail["code"] == "BookingOverlap"