from django.db import transaction
from django.db.models import Prefetch
from rest_framework.exceptions import NotFound
from core.exceptions import DomainError

from inventory.models import SizeSystem, Size, Category, ProductVariant


# GET
def get_size_system(*, pk):
    try:
        return SizeSystem.objects.get(pk=pk, is_active=True)
    except SizeSystem.DoesNotExist:
        raise NotFound()


# LIST
def list_size_systems():
    return SizeSystem.objects.filter(is_active=True).prefetch_related(
        Prefetch("sizes", queryset=Size.objects.filter(is_active=True).order_by("sort_order", "name"))
    ).order_by("name")


# CREATE
@transaction.atomic
def create_size_system(*, name, is_active=True, sizes=None, created_by=None):
    if SizeSystem.objects.filter(name__iexact=name.strip()).exists():
        raise DomainError(
            "DuplicateSizeSystemName",
            "Já existe um SizeSystem com este nome."
        )
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


# UPDATE
def update_size_system(*, size_system, name, updated_by=None):
    cleaned_name = name.strip()

    if SizeSystem.objects.filter(name__iexact=cleaned_name).exclude(id=size_system.id).exists():
        raise DomainError(
            "DuplicateSizeSystemName",
            "Já existe um SizeSystem com este nome."
        )

    size_system.name = cleaned_name
    size_system.save()
    return size_system


# DELETE (Soft + regras)
def delete_size_system(*, size_system, deleted_by=None):
    has_variants = ProductVariant.objects.filter(
        product__category__size_system=size_system
    ).exists()

    has_categories = Category.objects.filter(size_system=size_system).exists()
    has_sizes = Size.objects.filter(size_system=size_system, is_active=True).exists()

    if has_variants or has_categories or has_sizes:
        raise DomainError(
            "SizeSystemInUse",
            "O SizeSystem está em uso e não pode ser removido."
        )

    size_system.is_active = False
    size_system.save()
    return size_system


# ACTIVATE
def activate_size_system(*, size_system, updated_by=None):
    size_system.is_active = True
    size_system.save()
    return size_system


# DEACTIVATE
def deactivate_size_system(*, size_system, updated_by=None):
    size_system.is_active = False
    size_system.save()
    return size_system
