import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from inventory.models import ProductMedia, VariantMedia

from inventory.services.category_services import create_category
from inventory.services.size_system_services import create_size_system
from inventory.services.size_services import create_size
from inventory.services.product_services import create_product
from inventory.services.product_variant_services import create_variant


@pytest.mark.django_db
def test_product_media_can_link_to_multiple_variants():
    User = get_user_model()

    user = User.objects.create_user(
        email="media1@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Media Category")

    size_system = create_size_system(name="EU-MEDIA")
    size1 = create_size(name="M", size_system_id=size_system.id)
    size2 = create_size(name="L", size_system_id=size_system.id)

    product = create_product(
        user=user,
        name="Produto Media",
        description="Teste",
        category_id=category.id,
    )

    v1 = create_variant(
        product_id=product.id,
        user=user,
        size_id=size1.id,
        sku="MED-001",
        condition="new",
        acquisition_type="purchased"
    )

    v2 = create_variant(
        product_id=product.id,
        user=user,
        size_id=size2.id,
        sku="MED-002",
        condition="new",
        acquisition_type="purchased"
    )

    image = SimpleUploadedFile(
        "test.jpg",
        b"filecontent",
        content_type="image/jpeg"
    )

    media = ProductMedia.objects.create(
        product=product,
        image=image
    )

    VariantMedia.objects.create(
        variant=v1,
        product_media=media
    )

    VariantMedia.objects.create(
        variant=v2,
        product_media=media
    )

    assert VariantMedia.objects.filter(product_media=media).count() == 2


@pytest.mark.django_db
def test_variant_media_cannot_duplicate_same_relation():
    User = get_user_model()

    user = User.objects.create_user(
        email="media2@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Media Duplicate")

    size_system = create_size_system(name="EU-DUP")
    size = create_size(name="XL", size_system_id=size_system.id)

    product = create_product(
        user=user,
        name="Produto Duplicate",
        description="Teste",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product.id,
        user=user,
        size_id=size.id,
        sku="DUP-001",
        condition="new",
        acquisition_type="purchased"
    )

    image = SimpleUploadedFile(
        "dup.jpg",
        b"filecontent",
        content_type="image/jpeg"
    )

    media = ProductMedia.objects.create(
        product=product,
        image=image
    )

    VariantMedia.objects.create(
        variant=variant,
        product_media=media
    )

    with pytest.raises(IntegrityError):
        VariantMedia.objects.create(
            variant=variant,
            product_media=media
        )


@pytest.mark.django_db
def test_variant_media_must_belong_to_same_product():
    User = get_user_model()

    user = User.objects.create_user(
        email="media3@test.com",
        password="1234"
    )

    permission = Permission.objects.get(codename="add_product")
    user.user_permissions.add(permission)

    category = create_category(name="Media Ownership")

    size_system = create_size_system(name="EU-OWN")
    size = create_size(name="M", size_system_id=size_system.id)

    product1 = create_product(
        user=user,
        name="Produto A",
        description="Teste",
        category_id=category.id,
    )

    product2 = create_product(
        user=user,
        name="Produto B",
        description="Teste",
        category_id=category.id,
    )

    variant = create_variant(
        product_id=product1.id,
        user=user,
        size_id=size.id,
        sku="OWN-001",
        condition="new",
        acquisition_type="purchased"
    )

    image = SimpleUploadedFile(
        "own.jpg",
        b"filecontent",
        content_type="image/jpeg"
    )

    media = ProductMedia.objects.create(
        product=product2,
        image=image
    )

    relation = VariantMedia(
        variant=variant,
        product_media=media
    )

    with pytest.raises(ValidationError):
        relation.clean()