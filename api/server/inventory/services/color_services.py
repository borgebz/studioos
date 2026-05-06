import logging
import re

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from inventory.models import Color, ProductVariant

logger = logging.getLogger(__name__)

HEX_REGEX = r"^#(?:[0-9a-fA-F]{3}){1,2}$"


def get_color(*, pk):
    try:
        return Color.objects.get(pk=pk)
    except Color.DoesNotExist:
        raise AppNotFound("ColorNotFound")


def list_colors(*, is_active=None):
    qs = Color.objects.all()

    if is_active is not None:
        qs = qs.filter(is_active=is_active)

    return qs.order_by("name")


@transaction.atomic
def create_color(*, name, hex_code, is_active=True, created_by=None):
    normalized_name = name.strip().lower()

    if Color.objects.filter(name__iexact=normalized_name).exists():
        raise ValidationError({"messages": ["DuplicateColorName"]})

    if Color.objects.filter(hex_code__iexact=hex_code).exists():
        raise ValidationError({"messages": ["DuplicateColorHexCode"]})

    if not re.match(HEX_REGEX, hex_code):
        raise ValidationError({"messages": ["InvalidHexCode"]})

    color = Color(
        name=name.strip(),
        hex_code=hex_code.upper(),
        is_active=is_active,
        created_by=created_by,
    )
    color.full_clean()
    color.save()

    logger.info("Color created: %s", color.pk)
    return color


def delete_color(*, color, deleted_by=None):
    in_use = ProductVariant.objects.filter(
        deleted_at__isnull=True,
        colors__color_id=color.id,
        colors__deleted_at__isnull=True,
    ).exists()
    if in_use:
        logger.warning("Color delete blocked: color %s in use by active variant", color.pk)
        raise ValidationError({"messages": ["ColorInUse"]})
    color.delete(deleted_by=deleted_by)
    logger.info("Color soft-deleted: %s", color.pk)
    return color


def activate_color(*, color, updated_by=None):
    color.is_active = True
    color.updated_by = updated_by
    color.save()
    return color


def deactivate_color(*, color, updated_by=None):
    color.is_active = False
    color.updated_by = updated_by
    color.save()
    return color
