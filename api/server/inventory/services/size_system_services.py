from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from inventory.models import SizeSystem, Size, Category, ProductVariant


# 🔹 GET
def get_size_system(*, pk):
    try:
        return SizeSystem.objects.get(pk=pk)
    except SizeSystem.DoesNotExist:
        raise NotFound()


# 🔹 LIST
def list_size_systems():
    return SizeSystem.objects.prefetch_related("sizes").all().order_by("name")


# 🔹 CREATE
@transaction.atomic
def create_size_system(*, name, is_active=True, sizes=None, created_by=None):
    size_system = SizeSystem.objects.create(
        name=name.strip(),
        is_active=is_active,
    )

    if sizes:
        size_objects = []

        for s in sizes:
            size_objects.append(
                Size(
                    name=s["name"].strip(),
                    sort_order=s.get("sort_order", 0),
                    size_system=size_system,
                )
            )

        Size.objects.bulk_create(size_objects)

    return size_system


# 🔹 UPDATE
def update_size_system(*, size_system, name, updated_by=None):
    size_system.name = name.strip()
    size_system.save()
    return size_system


# 🔹 DELETE (Soft + regras)
def delete_size_system(*, size_system, deleted_by=None):
    #BLOQUEAR se houver ProductVariants associados
    has_variants = ProductVariant.objects.filter(
        product__category__size_system=size_system
    ).exists()

    if has_variants:
        raise ValidationError({"messages": ["SizeSystemHasAssociatedProducts"]})

    #LIMPAR categories
    Category.objects.filter(size_system=size_system).update(size_system=None)

    # ✔️ Soft delete (se tiveres BaseModel com delete override, usa)
    size_system.delete()


# 🔹 ACTIVATE
def activate_size_system(*, size_system, updated_by=None):
    size_system.is_active = True
    size_system.save()
    return size_system


# 🔹 DEACTIVATE
def deactivate_size_system(*, size_system, updated_by=None):
    size_system.is_active = False
    size_system.save()
    return size_system