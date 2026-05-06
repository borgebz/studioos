import logging

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from inventory.models import Size, SizeSystem, ProductVariant

logger = logging.getLogger(__name__)


# GET
def get_size(*, pk):
    try:
        return Size.objects.get(pk=pk)
    except Size.DoesNotExist:
        raise AppNotFound("SizeNotFound")


# LIST (com filtro)
def list_sizes(*, size_system_id=None):
    qs = Size.objects.filter(is_active=True).select_related("size_system")

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
        raise ValidationError({"messages": ["DuplicateSizeInSystem"]})

    try:
        size_system = SizeSystem.objects.get(pk=size_system_id)
    except SizeSystem.DoesNotExist:
        raise ValidationError({"messages": ["InvalidSizeSystem"]})

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

    logger.info("Size created: %s", size.pk)
    return size


# DELETE
def delete_size(*, size, deleted_by=None):
    if ProductVariant.objects.filter(size=size).exists():
        raise ValidationError({"messages": ["SizeInUse"]})
    size.delete(deleted_by=deleted_by)
    return size


# ACTIVATE
def activate_size(*, size, updated_by=None):
    size.is_active = True
    size.updated_by = updated_by
    size.save()
    return size


# DEACTIVATE
def deactivate_size(*, size, updated_by=None):
    size.is_active = False
    size.updated_by = updated_by
    size.save()
    return size
