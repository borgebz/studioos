from django.db import transaction
from core.exceptions import DomainError

from inventory.models import (
    Product,
    ProductVariant,
    Size,
    Color,
    VariantColor,
    VariantMedia,
    ProductMedia,
)


# ===============================
# HELPERS
# ===============================

def _get_product(product_id, user):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        raise DomainError("ProductNotFound", "Produto não encontrado.")

    # aplicar permissões aqui para evitar acessos indevidos
    if product.owner_type == "member":
        if product.owner_id != user.id:
            raise DomainError("PermissionDenied", "Sem acesso ao produto.")

    elif product.owner_type == "school":
        if not user.has_perm("inventory.manage_school_inventory"):
            raise DomainError("PermissionDenied", "Sem permissão.")

    return product


def _get_variant(variant_id):
    try:
        return ProductVariant.objects.get(id=variant_id)
    except ProductVariant.DoesNotExist:
        raise DomainError("VariantNotFound", "Variante não encontrada.")


def _check_permission(user, product):
    if product.owner_type == "member" and product.owner_id != user.id:
        raise DomainError("PermissionDenied", "Sem acesso.")

    if product.owner_type == "school":
        if not user.has_perm("inventory.manage_school_inventory"):
            raise DomainError("PermissionDenied", "Sem permissão.")


def _validate_size(product, size_id):
    if not size_id:
        return None

    try:
        size = Size.objects.get(id=size_id, is_active=True)
    except Size.DoesNotExist:
        raise DomainError("InvalidSize", "Size inválido.")

    if product.category and product.category.size_system_id:
        if size.size_system_id != product.category.size_system_id:
            raise DomainError("InvalidSizeForCategory", "Size não pertence ao sistema da categoria.")

    return size


def _validate_colors(color_ids):
    if not color_ids:
        return []

    colors = Color.objects.filter(id__in=color_ids, is_active=True)

    if len(colors) != len(color_ids):
        raise DomainError("InvalidColor", "Algumas cores são inválidas.")

    return colors


def _validate_media(product, media_ids):
    if not media_ids:
        return []

    media = ProductMedia.objects.filter(id__in=media_ids, product=product)

    if len(media) != len(media_ids):
        raise DomainError("InvalidVariantMediaAssociation", "Media inválida.")

    return media


# ===============================
# LIST
# ===============================

def list_variants(product_id, user):
    product = _get_product(product_id, user)
    #_check_permission(user, product)

    return product.variants.exclude(status="archived").order_by("id")

# ===============================
# DETAIL
# ===============================

def get_variant(variant_id, user):
    variant = _get_variant(variant_id)
    _check_permission(user, variant.product)

    if variant.status == "archived":
        raise DomainError("VariantNotFound", "Variante não encontrada.")

    return variant


# ===============================
# CREATE
# ===============================

@transaction.atomic
def create_variant(product_id, user, **data):
    product = _get_product(product_id, user)
    #_check_permission(user, product)

    size = _validate_size(product, data.get("size_id"))
    colors = _validate_colors(data.get("color_ids"))
    media = _validate_media(product, data.get("media_ids"))

    if ProductVariant.objects.filter(sku=data.get("sku")).exists():
        raise DomainError(
            "DuplicateSKU",
            "Já existe uma variante com este SKU."
        )

    variant = ProductVariant.objects.create(
        product=product,
        size=size,
        condition=data.get("condition"),
        sku=data.get("sku"),
        status=data.get("status", "available"),
        acquisition_type=data.get("acquisition_type"),
        acquired_at=data.get("acquired_at"),
        internal_notes=data.get("internal_notes", ""),
        public_notes=data.get("public_notes", ""),
    )

    # colors
    for c in colors:
        VariantColor.objects.create(variant=variant, color=c)

    # media
    for m in media:
        VariantMedia.objects.create(variant=variant, product_media=m)

    # upload de media
    for file in data.get("media_upload", []):
        media = ProductMedia.objects.create(
            product=product,
            image=file
        )

        VariantMedia.objects.create(
            variant=variant,
            product_media=media
        )
    return variant


# ===============================
# UPDATE
# ===============================

@transaction.atomic
def update_variant(variant_id, user, **data):
    variant = _get_variant(variant_id)
    product = variant.product

    _check_permission(user, product)

    if "sku" in data and data.get("sku"):
        if ProductVariant.objects.filter(sku=data.get("sku")).exclude(id=variant.id).exists():
            raise DomainError(
                "DuplicateSKU",
                "Já existe uma variante com este SKU."
            )

    if "size_id" in data:
        variant.size = _validate_size(product, data.get("size_id"))

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

    variant.save()

    # update colors
    if "color_ids" in data:
        VariantColor.objects.filter(variant=variant).delete()
        colors = _validate_colors(data.get("color_ids"))
        for c in colors:
            VariantColor.objects.create(variant=variant, color=c)

    # update media
    if "media_ids" in data:
        VariantMedia.objects.filter(variant=variant).delete()
        media = _validate_media(product, data.get("media_ids"))
        for m in media:
            VariantMedia.objects.create(variant=variant, product_media=m)

    if "media_upload" in data:
        for file in data.get("media_upload", []):
            media = ProductMedia.objects.create(
                product=product,
                image=file
            )

            VariantMedia.objects.create(
                variant=variant,
                product_media=media
            )

    return variant


# ===============================
# DELETE (SOFT)
# ===============================

@transaction.atomic
def delete_variant(variant_id, user):
    variant = _get_variant(variant_id)
    _check_permission(user, variant.product)

    has_billing_dependencies = False
    has_critical_dependencies = variant.bookings.exists()

    if has_billing_dependencies:
        raise DomainError(
            "VariantHasBillingDependencies",
            "Variante não pode ser apagada pois tem faturação associada."
        )

    if has_critical_dependencies:
        raise DomainError(
            "VariantHasCriticalDependencies",
            "Variante não pode ser apagada pois tem bookings."
        )

    variant.status = "archived"
    variant.save()

    return variant