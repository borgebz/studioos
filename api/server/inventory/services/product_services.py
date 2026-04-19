from django.db import transaction
from django.core.exceptions import ValidationError

from inventory.models import Product, Category, ProductMedia, ProductVariant

ALLOWED_STATUS = ["active", "inactive", "archived"]


# ===============================
# HELPERS
# ===============================


def _validate_status(status):
    if status and status not in ALLOWED_STATUS:
        raise ValidationError("Invalid status.")


def _validate_category(category_id):
    if not category_id:
        return None

    try:
        return Category.objects.get(id=category_id, is_active=True)
    except Category.DoesNotExist:
        raise ValidationError("Invalid or inactive category.")


def _check_member_permission(user):
    if not user.has_perm("inventory.add_product"):
        raise ValidationError("Sem permissão para criar produtos.")


def _check_school_permission(user):
    if not user.has_perm("inventory.add_school_product"):
        raise ValidationError("Sem permissão para gerir inventário da escola.")


def _check_delete_dependencies(product):
    # TODO: substituir por lógica real de faturação
    has_dependencies = False

    if has_dependencies:
        raise ValidationError("Produto não pode ser apagado. Use archived.")


# ===============================
# LIST
# ===============================


def list_products(user, filters=None):
    queryset = Product.objects.filter(owner_type="member", owner_id=user.id).exclude(
        status="archived"
    )

    if filters:
        if filters.get("category_id"):
            queryset = queryset.filter(category_id=filters["category_id"])

        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("name"):
            queryset = queryset.filter(name__icontains=filters["name"])

    return queryset


def list_school_products(user, filters=None):
    if not user.has_perm("inventory.view_school_product"):
        raise ValidationError("Sem acesso ao inventário da escola.")

    queryset = Product.objects.filter(owner_type="school").exclude(status="archived")

    if filters:
        if filters.get("category_id"):
            queryset = queryset.filter(category_id=filters["category_id"])

        if filters.get("status"):
            queryset = queryset.filter(status=filters["status"])

        if filters.get("name"):
            queryset = queryset.filter(name__icontains=filters["name"])

    return queryset


# ===============================
# GET DETAIL
# ===============================


def get_product(pk, user):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        raise ValidationError("Produto não encontrado.")

    if product.owner_type == "member" and product.owner_id != user.id:
        raise ValidationError("Sem acesso ao produto.")

    return product


def get_school_product(pk, user):
    if not user.has_perm("inventory.view_school_product"):
        raise ValidationError("Sem acesso.")

    try:
        return Product.objects.get(id=pk, owner_type="school")
    except Product.DoesNotExist:
        raise ValidationError("Produto não encontrado.")


# ===============================
# CREATE
# ===============================


@transaction.atomic
def create_product(user, **data):
    _check_member_permission(user)

    name = data.get("name")
    if not name:
        raise ValidationError("Name é obrigatório.")

    if data.get("price") is None:
        raise ValidationError("Price é obrigatório.")

    _validate_status(data.get("status"))

    category = _validate_category(data.get("category_id"))

    product = Product.objects.create(
        name=name,
        description=data.get("description"),
        category=category,
        target_gender=data.get("target_gender"),
        brand=data.get("brand"),
        material=data.get("material"),
        price=data.get("price"),
        status=data.get("status", "active"),
        owner_type="member",
        owner_id=user.id,
    )

    _handle_media(product, data.get("media"))
    _handle_variants(product, data.get("variants"))

    return product


@transaction.atomic
def create_school_product(user, **data):
    _check_school_permission(user)

    name = data.get("name")
    if not name:
        raise ValidationError("Name é obrigatório.")

    if data.get("price") is None:
        raise ValidationError("Price é obrigatório.")

    _validate_status(data.get("status"))

    category = _validate_category(data.get("category_id"))

    product = Product.objects.create(
        name=name,
        description=data.get("description"),
        category=category,
        target_gender=data.get("target_gender"),
        brand=data.get("brand"),
        material=data.get("material"),
        price=data.get("price"),
        status=data.get("status", "active"),
        owner_type="school",
        owner_id=None,
    )

    _handle_media(product, data.get("media"))
    _handle_variants(product, data.get("variants"))

    # school_details
    if data.get("school_details"):
        product.school_details = data["school_details"]
        product.save()

    return product


# ===============================
# UPDATE
# ===============================


@transaction.atomic
def update_product(pk, user, **data):
    product = get_product(pk, user)

    if product.owner_type != "member":
        raise ValidationError("Produto não pertence ao utilizador.")

    _validate_status(data.get("status"))

    if "category_id" in data:
        product.category = _validate_category(data.get("category_id"))

    # campos editáveis
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

    product.save()

    _handle_media_update(product, data.get("media"))

    return product


@transaction.atomic
def update_school_product(pk, user, **data):
    if not user.has_perm("inventory.change_school_product"):
        raise ValidationError("Sem permissão.")

    product = get_school_product(pk, user)

    _validate_status(data.get("status"))

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

    product.save()

    _handle_media_update(product, data.get("media"))

    if data.get("school_details"):
        product.school_details = data["school_details"]
        product.save()

    return product


# ===============================
# DELETE (SOFT)
# ===============================


@transaction.atomic
def delete_product(pk, user):
    product = get_product(pk, user)

    _check_delete_dependencies(product)

    product.status = "archived"
    product.save()


@transaction.atomic
def delete_school_product(pk, user):
    if not user.has_perm("inventory.delete_school_product"):
        raise ValidationError("Sem permissão.")

    product = get_school_product(pk, user)

    _check_delete_dependencies(product)

    product.status = "archived"
    product.save()


# ===============================
# MEDIA
# ===============================


def _handle_media(product, media_list):
    if not media_list:
        return

    for item in media_list:
        ProductMedia.objects.create(
            product=product,
            file=item.get("file"),
            is_primary=item.get("is_primary", False),
            order=item.get("order", 0),
        )


def _handle_media_update(product, media_list):
    if media_list is None:
        return

    # simples: apagar tudo e recriar
    ProductMedia.objects.filter(product=product).delete()
    _handle_media(product, media_list)


# ===============================
# VARIANTS (BÁSICO)
# ===============================


def _handle_variants(product, variants):
    if not variants:
        return

    for v in variants:
        ProductVariant.objects.create(
            product=product,
            size_id=v.get("size_id"),
            sku=v.get("sku"),
            condition=v.get("condition"),
            status=v.get("status"),
            acquisition_type=v.get("acquisition_type"),
            acquired_at=v.get("acquired_at"),
            internal_notes=v.get("internal_notes"),
            public_notes=v.get("public_notes"),
        )
