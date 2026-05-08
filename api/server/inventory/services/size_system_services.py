import logging

from django.db import transaction
from django.db.models import Prefetch
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from inventory.models import (
    SizeSystem,
    Size,
    ProductVariant,
)

logger = logging.getLogger(__name__)


# GET
def get_size_system(*, pk):
    try:
        # Fetch regardless of `is_active` so management operations
        # (activate/deactivate/update/delete) can target inactive records.
        return SizeSystem.objects.get(pk=pk)
    except SizeSystem.DoesNotExist:
        raise AppNotFound("SizeSystemNotFound")


# LIST
def list_size_systems(*, is_active=None):
    qs = SizeSystem.objects.all()

    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    else:
        qs = qs.filter(is_active=True)

    return (
        qs.prefetch_related(
            Prefetch(
                "sizes",
                queryset=Size.objects.filter(is_active=True).order_by(
                    "sort_order", "name"
                ),
            )
        )
        .order_by("name")
    )


# CREATE
@transaction.atomic
def create_size_system(*, name, is_active=True, sizes=None, created_by=None):
    if SizeSystem.objects.filter(name__iexact=name.strip()).exists():
        raise ValidationError({"messages": ["DuplicateSizeSystemName"]})

    size_system = SizeSystem(
        name=name.strip(),
        is_active=is_active,
        created_by=created_by,
    )
    size_system.full_clean()
    size_system.save()

    logger.info("SizeSystem created: %s", size_system.pk)

    if sizes:
        size_names = set()
        for idx, s in enumerate(sizes, start=1):
            s_name = s["name"].strip().lower()
            if s_name in size_names:
                raise ValidationError({"messages": ["DuplicateSizeInSystem"]})
            size_names.add(s_name)

            size_obj = Size(
                name=s["name"].strip(),
                sort_order=s.get("sort_order", idx),
                size_system=size_system,
                created_by=created_by,
            )
            size_obj.full_clean()
            size_obj.save()

    return size_system


# UPDATE
def update_size_system(*, size_system, name=None, updated_by=None):
    if name is not None:
        cleaned_name = name.strip()

        if (
            SizeSystem.objects.filter(name__iexact=cleaned_name)
            .exclude(id=size_system.id)
            .exists()
        ):
            raise ValidationError({"messages": ["DuplicateSizeSystemName"]})

        size_system.name = cleaned_name
    size_system.updated_by = updated_by
    size_system.full_clean()
    size_system.save()
    return size_system


# DELETE (Soft + regras)
def delete_size_system(*, size_system, deleted_by=None):
    in_use = ProductVariant.objects.filter(
        size__size_system=size_system,
    ).exists()
    if in_use:
        logger.warning(
            "SizeSystem delete blocked: system %s still referenced",
            size_system.pk,
        )
        raise ValidationError({"messages": ["SizeSystemInUse"]})

    size_system.delete(deleted_by=deleted_by)
    logger.info("SizeSystem soft-deleted: %s", size_system.pk)
    return size_system


# ACTIVATE
def activate_size_system(*, size_system, updated_by=None):
    size_system.is_active = True
    size_system.updated_by = updated_by
    size_system.save()
    return size_system


# DEACTIVATE
def deactivate_size_system(*, size_system, updated_by=None):
    size_system.is_active = False
    size_system.updated_by = updated_by
    size_system.save()
    return size_system
