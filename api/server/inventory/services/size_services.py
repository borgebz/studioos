from django.db import transaction
from rest_framework.exceptions import NotFound
from core.exceptions import DomainError

from inventory.models import Size, SizeSystem, ProductVariant


# GET
def get_size(*, pk):
    try:
        return Size.objects.get(pk=pk, is_active=True)
    except Size.DoesNotExist:
        raise NotFound()


# LIST (com filtro)
def list_sizes(*, size_system_id=None):
    qs = Size.objects.filter(is_active=True)

    if size_system_id is not None:
        qs = qs.filter(size_system_id=size_system_id)

    return qs.order_by("sort_order", "name")


# CREATE
@transaction.atomic
def create_size(*, name, size_system_id, is_active=True, created_by=None):
    if Size.objects.filter(
        name__iexact=name.strip(),
        size_system_id=size_system_id,
        is_active=True,
    ).exists():
        raise DomainError(
            "DuplicateSizeInSystem",
            "Já existe um size com este nome neste sistema."
        )
    try:
        size_system = SizeSystem.objects.get(pk=size_system_id)
    except SizeSystem.DoesNotExist:
        raise DomainError(
            "InvalidSizeSystem",
            "Sistema de tamanhos inválido."
        )

    # infer sort_order simples
    last = Size.objects.filter(size_system=size_system).order_by("-sort_order").first()
    next_order = (last.sort_order + 1) if last else 1

    size = Size(
        name=name.strip(),
        size_system=size_system,
        sort_order=next_order,
        is_active=is_active,
        created_by=created_by,
    )

    size.full_clean()
    size.save()

    return size


# DELETE
def delete_size(*, size, deleted_by=None):
    if not size.is_active:
        return size
    # bloquear se estiver em uso
    if ProductVariant.objects.filter(size=size).exists():
        raise DomainError(
            "SizeInUse",
            "O size está a ser utilizado por variantes."
        )

    size.is_active = False
    size.save()
    return size


# ACTIVATE
def activate_size(*, size, updated_by=None):
    size.is_active = True
    size.save()
    return size


# DEACTIVATE
def deactivate_size(*, size, updated_by=None):
    size.is_active = False
    size.save()
    return size
