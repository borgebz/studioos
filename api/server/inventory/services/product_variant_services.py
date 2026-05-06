import logging

from django.db import IntegrityError, transaction
from django.db.models import Prefetch
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound

from inventory.django_validation import raise_drf_from_model_validation
from inventory.models import (
    Product,
    ProductVariant,
    Size,
    Color,
    VariantColor,
    VariantMedia,
    ProductMedia,
    VariantBooking,
)

logger = logging.getLogger(__name__)

_ACTIVE_BOOKING_STATUSES = (
    VariantBooking.Status.PENDING,
    VariantBooking.Status.CONFIRMED,
    VariantBooking.Status.ACTIVE,
)


def _normalize_sku(value):
    if value is None:
        return None
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


# ===============================
# HELPERS
# ===============================


def _get_product(*, product_id, user):
    try:
        product = Product.objects.select_related("category").get(id=product_id)
    except Product.DoesNotExist:
        raise AppNotFound("ProductNotFound")

    if product.owner_type == Product.OwnerType.MEMBER:
        if product.owner_id != user.id:
            raise PermissionDenied()

    elif product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("inventory.manage_school_inventory"):
            raise PermissionDenied()

    return product


def _active_bookings_prefetch():
    return Prefetch(
        "bookings",
        queryset=VariantBooking.objects.filter(status__in=_ACTIVE_BOOKING_STATUSES),
    )


def _get_variant(*, variant_id):
    try:
        return (
            ProductVariant.objects.select_related("size", "product__category")
            .prefetch_related(
                "colors__color",
                "media_links__product_media",
                _active_bookings_prefetch(),
            )
            .get(id=variant_id)
        )
    except ProductVariant.DoesNotExist:
        raise AppNotFound("VariantNotFound")


def _check_permission(*, user, product):
    if product.owner_type == Product.OwnerType.MEMBER and product.owner_id != user.id:
        raise PermissionDenied()

    if product.owner_type == Product.OwnerType.SCHOOL:
        if not user.has_perm("inventory.manage_school_inventory"):
            raise PermissionDenied()


def _validate_size(*, product, size_id):
    if not size_id:
        return None

    try:
        size = Size.objects.get(id=size_id, is_active=True)
    except Size.DoesNotExist:
        raise ValidationError({"messages": ["InvalidSize"]})

    if product.category and product.category.size_system_id:
        if size.size_system_id != product.category.size_system_id:
            raise ValidationError({"messages": ["InvalidSizeForCategory"]})

    return size


def _validate_colors(*, color_ids):
    if not color_ids:
        return []

    colors = list(Color.objects.filter(id__in=color_ids, is_active=True))

    if len(colors) != len(color_ids):
        raise ValidationError({"messages": ["InvalidColor"]})

    return colors


def _validate_media(*, product, media_ids):
    if not media_ids:
        return []

    media = list(ProductMedia.objects.filter(id__in=media_ids, product=product))

    if len(media) != len(media_ids):
        raise ValidationError({"messages": ["InvalidVariantMediaAssociation"]})

    return media


# ===============================
# LIST
# ===============================


def list_variants(*, product_id, user):
    product = _get_product(product_id=product_id, user=user)

    return product.variants.select_related("size", "product__category").prefetch_related(
        "colors__color",
        "media_links__product_media",
        _active_bookings_prefetch(),
    ).order_by("id")


# ===============================
# DETAIL
# ===============================


def get_variant(*, variant_id, user):
    variant = _get_variant(variant_id=variant_id)
    _check_permission(user=user, product=variant.product)
    return variant


# ===============================
# CREATE
# ===============================


@transaction.atomic
def create_variant(*, product_id, user, **data):
    from django.core.exceptions import ValidationError as DjangoValidationError

    product = _get_product(product_id=product_id, user=user)

    size = _validate_size(product=product, size_id=data.get("size_id"))
    colors = _validate_colors(color_ids=data.get("color_ids"))
    media = _validate_media(product=product, media_ids=data.get("media_ids"))

    sku = _normalize_sku(data.get("sku"))
    if sku and ProductVariant.objects.filter(sku=sku).exists():
        raise ValidationError({"messages": ["DuplicateSKU"]})

    variant = ProductVariant(
        product=product,
        size=size,
        condition=data.get("condition") or ProductVariant.Condition.GOOD,
        sku=sku,
        status=data.get("status") or ProductVariant.Status.AVAILABLE,
        acquisition_type=data.get("acquisition_type")
        or ProductVariant.AcquisitionType.OTHER,
        acquired_at=data.get("acquired_at"),
        internal_notes=data.get("internal_notes", ""),
        public_notes=data.get("public_notes", ""),
        created_by=user,
    )
    try:
        variant.full_clean()
    except DjangoValidationError as exc:
        raise_drf_from_model_validation(exc)
    try:
        variant.save()
    except IntegrityError as exc:
        if "inventory_productvariant_sku" in str(exc):
            logger.warning("SKU integrity conflict on create_variant product %s", product_id)
            raise ValidationError({"messages": ["DuplicateSKU"]}) from exc
        raise

    logger.info("ProductVariant created: %s for product %s", variant.pk, product.pk)

    for c in colors:
        vc = VariantColor(variant=variant, color=c, created_by=user)
        vc.full_clean()
        vc.save()

    for m in media:
        vm = VariantMedia(variant=variant, product_media=m, created_by=user)
        vm.full_clean()
        vm.save()

    for file in data.get("media_upload") or []:
        pm = ProductMedia(product=product, image=file, created_by=user)
        pm.full_clean()
        pm.save()
        vm = VariantMedia(variant=variant, product_media=pm, created_by=user)
        vm.full_clean()
        vm.save()

    return variant


# ===============================
# UPDATE
# ===============================


@transaction.atomic
def update_variant(*, variant_id, user, **data):
    from django.core.exceptions import ValidationError as DjangoValidationError

    variant = _get_variant(variant_id=variant_id)
    product = variant.product

    _check_permission(user=user, product=product)

    if "sku" in data:
        sku = _normalize_sku(data.get("sku"))
        data = {**data, "sku": sku}
        if sku and (
            ProductVariant.objects.filter(sku=sku).exclude(id=variant.id).exists()
        ):
            raise ValidationError({"messages": ["DuplicateSKU"]})

    if "size_id" in data:
        variant.size = _validate_size(product=product, size_id=data.get("size_id"))

    for field in [
        "condition",
        "sku",
        "status",
        "acquisition_type",
        "acquired_at",
        "internal_notes",
        "public_notes",
    ]:
        if field in data:
            setattr(variant, field, data[field])

    variant.updated_by = user
    try:
        variant.full_clean()
    except DjangoValidationError as exc:
        raise_drf_from_model_validation(exc)
    try:
        variant.save()
    except IntegrityError as exc:
        if "inventory_productvariant_sku" in str(exc):
            logger.warning("SKU integrity conflict on update_variant %s", variant_id)
            raise ValidationError({"messages": ["DuplicateSKU"]}) from exc
        raise

    if "color_ids" in data:
        for vc in VariantColor.objects.filter(variant=variant):
            vc.delete(deleted_by=user)
        colors = _validate_colors(color_ids=data.get("color_ids"))
        for c in colors:
            vc = VariantColor(variant=variant, color=c, created_by=user)
            vc.full_clean()
            vc.save()

    if "media_ids" in data:
        for vm in VariantMedia.objects.filter(variant=variant):
            vm.delete(deleted_by=user)
        media = _validate_media(product=product, media_ids=data.get("media_ids"))
        for m in media:
            vm = VariantMedia(variant=variant, product_media=m, created_by=user)
            vm.full_clean()
            vm.save()

    if "media_upload" in data:
        for file in data.get("media_upload") or []:
            pm = ProductMedia(product=product, image=file, created_by=user)
            pm.full_clean()
            pm.save()
            vm = VariantMedia(variant=variant, product_media=pm, created_by=user)
            vm.full_clean()
            vm.save()

    return variant


# ===============================
# DELETE (SOFT)
# ===============================


@transaction.atomic
def delete_variant(*, variant_id, user):
    variant = _get_variant(variant_id=variant_id)
    _check_permission(user=user, product=variant.product)

    blocking = variant.bookings.filter(status__in=_ACTIVE_BOOKING_STATUSES)
    if blocking.exists():
        logger.warning(
            "Variant delete blocked: variant %s has active bookings",
            variant_id,
        )
        raise ValidationError({"messages": ["VariantHasActiveBookings"]})

    variant.delete(deleted_by=user)
    logger.info("ProductVariant soft-deleted: %s by user %s", variant_id, user.pk)
    return variant
