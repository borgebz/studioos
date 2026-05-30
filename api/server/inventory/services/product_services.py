import logging

from django.db import IntegrityError, transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from core.exceptions import raise_drf_from_model_validation
from inventory.models import Product, Category, ProductMedia, ProductVariant
from utils.files import file_content_hash

logger = logging.getLogger(__name__)


def _validate_category(*, category_id):
    if not category_id:
        return None

    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        raise ValidationError({"messages": ["InvalidCategory"]})

    if not category.is_active:
        raise ValidationError({"messages": ["InactiveCategory"]})

    return category


def _check_member_permission(*, user):
    if not user.has_perm("inventory.add_product"):
        raise PermissionDenied()


def _check_school_permission(*, user):
    if not user.has_perm("inventory.add_school_product"):
        raise PermissionDenied()


def _check_delete_dependencies(*, product):
    if product.variants.exists():
        logger.warning(
            "Product delete blocked: product %s still has variants",
            product.pk,
        )
        raise ValidationError({"messages": ["ProductHasVariants"]})


def _full_clean_product(*, product):
    from django.core.exceptions import ValidationError as DjangoValidationError

    try:
        product.full_clean()
    except DjangoValidationError as exc:
        raise_drf_from_model_validation(exc)


_PRODUCT_ALLOWED_ORDERING = {
    "-updated_at",
    "updated_at",
    "name",
    "-name",
}


def list_products(*, user, filters=None):
    queryset = Product.objects.filter(
        owner_type=Product.OwnerType.MEMBER, owner_id=user.id
    ).select_related("category", "owner", "listing")

    ordering = "-updated_at"
    if filters:
        if filters.get("category_id"):
            queryset = queryset.filter(category_id=filters["category_id"])

        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("name"):
            queryset = queryset.filter(name__icontains=filters["name"])

        if filters.get("ordering") and filters["ordering"] in _PRODUCT_ALLOWED_ORDERING:
            ordering = filters["ordering"]

    return queryset.order_by(ordering)


def list_school_products(*, user, filters=None):
    if not user.has_perm("inventory.view_school_product"):
        raise PermissionDenied()

    queryset = Product.objects.filter(
        owner_type=Product.OwnerType.SCHOOL
    ).select_related("category", "listing")

    ordering = "-updated_at"
    if filters:
        if filters.get("category_id"):
            queryset = queryset.filter(category_id=filters["category_id"])

        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("name"):
            queryset = queryset.filter(name__icontains=filters["name"])

        if filters.get("ordering") and filters["ordering"] in _PRODUCT_ALLOWED_ORDERING:
            ordering = filters["ordering"]

    return queryset.order_by(ordering)


def get_product(*, pk, user):
    try:
        product = Product.objects.select_related("category", "owner", "listing").get(
            id=pk
        )
    except Product.DoesNotExist:
        raise AppNotFound("ProductNotFound")

    if product.owner_type == Product.OwnerType.MEMBER and product.owner_id != user.id:
        raise PermissionDenied()

    return product


def get_school_product(*, pk, user):
    if not user.has_perm("inventory.view_school_product"):
        raise PermissionDenied()

    try:
        return Product.objects.select_related("category", "listing").get(
            id=pk, owner_type=Product.OwnerType.SCHOOL
        )
    except Product.DoesNotExist:
        raise AppNotFound("ProductNotFound")


def _create_product_core(*, user, owner_type, owner, data):
    name = data.get("name")
    if not name:
        raise ValidationError({"messages": ["InvalidProductPayload"]})

    category = _validate_category(category_id=data.get("category_id"))

    product = Product(
        name=name,
        description=data.get("description", ""),
        category=category,
        target_gender=data.get("target_gender"),
        brand=data.get("brand"),
        material=data.get("material"),
        status=data.get("status", Product.Status.ACTIVE),
        owner_type=owner_type,
        owner=owner,
        created_by=user,
    )
    _full_clean_product(product=product)
    product.save()

    logger.info("Product created: %s by user %s", product.pk, user.pk)

    _handle_media(product=product, media_list=data.get("media"), created_by=user)
    _handle_variants(product=product, variants=data.get("variants"), created_by=user)

    return product


@transaction.atomic
def create_product(*, user, **data):
    _check_member_permission(user=user)

    if data.get("school_details"):
        raise ValidationError({"messages": ["InvalidSchoolDetailsForOwner"]})

    return _create_product_core(
        user=user,
        owner_type=Product.OwnerType.MEMBER,
        owner=user,
        data=data,
    )


@transaction.atomic
def create_school_product(*, user, **data):
    _check_school_permission(user=user)

    product = _create_product_core(
        user=user,
        owner_type=Product.OwnerType.SCHOOL,
        owner=None,
        data=data,
    )

    if data.get("school_details"):
        _handle_school_details(
            product=product, school_details=data["school_details"], created_by=user
        )

    return product


@transaction.atomic
def update_product(*, pk, user, **data):
    product = get_product(pk=pk, user=user)

    if "owner_type" in data or "owner_id" in data:
        raise ValidationError({"messages": ["ImmutableProductOwner"]})

    if data.get("school_details"):
        raise ValidationError({"messages": ["InvalidSchoolDetailsForOwner"]})

    if product.owner_type != Product.OwnerType.MEMBER:
        raise PermissionDenied()

    if "category_id" in data:
        product.category = _validate_category(category_id=data.get("category_id"))

    for field in [
        "name",
        "description",
        "target_gender",
        "brand",
        "material",
        "status",
    ]:
        if field in data:
            setattr(product, field, data[field])

    product.updated_by = user
    _full_clean_product(product=product)
    product.save()

    _handle_media_update(product=product, media_list=data.get("media"), deleted_by=user)

    return product


@transaction.atomic
def update_school_product(*, pk, user, **data):
    if not user.has_perm("inventory.change_school_product"):
        raise PermissionDenied()

    product = get_school_product(pk=pk, user=user)

    if "owner_type" in data or "owner_id" in data:
        raise ValidationError({"messages": ["ImmutableProductOwner"]})

    if "category_id" in data:
        product.category = _validate_category(category_id=data.get("category_id"))

    for field in [
        "name",
        "description",
        "target_gender",
        "brand",
        "material",
        "status",
    ]:
        if field in data:
            setattr(product, field, data[field])

    product.updated_by = user
    _full_clean_product(product=product)
    product.save()

    _handle_media_update(product=product, media_list=data.get("media"), deleted_by=user)

    if data.get("school_details"):
        _handle_school_details(
            product=product, school_details=data["school_details"], updated_by=user
        )

    return product


@transaction.atomic
def delete_product(*, pk, user):
    product = get_product(pk=pk, user=user)
    _check_delete_dependencies(product=product)
    product.delete(deleted_by=user)
    logger.info("Product soft-deleted: %s by user %s", product.pk, user.pk)


@transaction.atomic
def delete_school_product(*, pk, user):
    if not user.has_perm("inventory.delete_school_product"):
        raise PermissionDenied()

    product = get_school_product(pk=pk, user=user)
    _check_delete_dependencies(product=product)
    product.delete(deleted_by=user)
    logger.info("School product soft-deleted: %s by user %s", product.pk, user.pk)


def _media_image_is_duplicate(*, product, upload_file):
    if upload_file is None:
        return False
    new_hash = file_content_hash(upload_file)
    return ProductMedia.objects.filter(product=product, content_hash=new_hash).exists()


def _handle_media(*, product, media_list, created_by=None):
    if not media_list:
        return

    for item in media_list:
        image = item.get("image") or item.get("file")
        if image is None:
            continue
        if _media_image_is_duplicate(product=product, upload_file=image):
            logger.info(
                "Skipping duplicate product media upload for product %s",
                product.pk,
            )
            continue
        content_hash = file_content_hash(image)
        pm = ProductMedia(
            product=product,
            image=image,
            is_primary=item.get("is_primary", False),
            sort_order=item.get("sort_order", item.get("order", 0)),
            content_hash=content_hash,
            created_by=created_by,
        )
        try:
            pm.full_clean()
        except Exception:
            logger.exception(
                "ProductMedia validation failed for product %s", product.pk
            )
            raise
        pm.save()


def _handle_media_update(*, product, media_list, deleted_by=None):
    if media_list is None:
        return

    from inventory.models import VariantMedia

    # Build a map of old media by content_hash so we can remap VariantMedia references.
    old_media = list(
        ProductMedia.objects.filter(product=product).order_by("sort_order", "pk")
    )
    old_media_by_hash = {pm.content_hash: pm.id for pm in old_media if pm.content_hash}

    for pm in old_media:
        pm.delete(deleted_by=deleted_by)

    _handle_media(product=product, media_list=media_list, created_by=deleted_by)

    # Remap VariantMedia references from old media to new media by content_hash.
    new_media = list(
        ProductMedia.objects.filter(product=product).order_by("sort_order", "pk")
    )

    remapped_old_ids = set()
    for new_pm in new_media:
        if new_pm.content_hash and new_pm.content_hash in old_media_by_hash:
            old_pm_id = old_media_by_hash[new_pm.content_hash]
            VariantMedia.objects.filter(product_media_id=old_pm_id).update(
                product_media=new_pm
            )
            remapped_old_ids.add(old_pm_id)

    # Clean up orphaned VariantMedia records where old PM was deleted but no matching new PM exists.
    orphaned_old_ids = set(old_media_by_hash.values()) - remapped_old_ids
    if orphaned_old_ids:
        VariantMedia.objects.filter(product_media_id__in=orphaned_old_ids).delete()


def _handle_variants(*, product, variants, created_by=None):
    if not variants:
        return

    if not isinstance(variants, list):
        raise ValidationError({"messages": ["InvalidNestedVariantPayload"]})

    from django.core.exceptions import ValidationError as DjangoValidationError

    from inventory.models import VariantColor
    from inventory.services.product_variant_services import _validate_colors

    for v in variants:
        if not isinstance(v, dict):
            raise ValidationError({"messages": ["InvalidNestedVariantPayload"]})

        sku = v.get("sku")
        if isinstance(sku, str) and sku.strip() == "":
            sku = None

        variant = ProductVariant(
            product=product,
            size_id=v.get("size_id"),
            sku=sku,
            condition=v.get("condition") or ProductVariant.Condition.GOOD,
            status=v.get("status") or ProductVariant.Status.AVAILABLE,
            acquisition_type=v.get("acquisition_type")
            or ProductVariant.AcquisitionType.OTHER,
            acquired_at=v.get("acquired_at"),
            asking_price=v.get("asking_price"),
            internal_notes=v.get("internal_notes") or "",
            public_notes=v.get("public_notes") or "",
            created_by=created_by,
        )
        try:
            variant.full_clean()
        except DjangoValidationError as exc:
            raise_drf_from_model_validation(exc)
        try:
            variant.save()
        except IntegrityError as exc:
            if "inventory_productvariant_sku" in str(exc):
                logger.warning(
                    "Nested variant SKU conflict on product %s",
                    product.pk,
                )
                raise ValidationError({"messages": ["DuplicateSKU"]}) from exc
            raise

        color_ids = v.get("color_ids")
        if color_ids:
            colors = _validate_colors(color_ids=color_ids)
            for c in colors:
                vc = VariantColor(variant=variant, color=c, created_by=created_by)
                vc.full_clean()
                vc.save()


def _handle_school_details(
    *, product, school_details, created_by=None, updated_by=None
):
    from inventory.models import SchoolProductDetails

    try:
        details = product.school_details
        for field in ["inventory_code", "storage_location", "notes"]:
            if field in school_details:
                setattr(details, field, school_details[field])
        details.updated_by = updated_by
        details.full_clean()
        details.save()
    except SchoolProductDetails.DoesNotExist:
        details = SchoolProductDetails(
            product=product,
            inventory_code=school_details.get("inventory_code", ""),
            storage_location=school_details.get("storage_location", ""),
            notes=school_details.get("notes", ""),
            created_by=created_by,
        )
        details.full_clean()
        details.save()
