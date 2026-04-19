import re
from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError

from inventory.models import Color, ProductVariant

HEX_REGEX = r"^#(?:[0-9a-fA-F]{3}){1,2}$"


def get_color(*, pk):
    try:
        return Color.objects.get(pk=pk)
    except Color.DoesNotExist:
        raise NotFound()


def list_colors(*, is_active=None):
    qs = Color.objects.all()

    if is_active is not None:
        qs = qs.filter(is_active=is_active)

    return qs.order_by("name")


@transaction.atomic
def create_color(*, name, hex_code, is_active=True):
    normalized_name = name.strip().lower()

    # validar duplicados
    if Color.objects.filter(name__iexact=normalized_name).exists():
        raise ValidationError({"messages": ["ColorAlreadyExists"]})

    # validar hex
    if not re.match(HEX_REGEX, hex_code):
        raise ValidationError({"messages": ["InvalidHexCode"]})

    color = Color.objects.create(
        name=name.strip(),
        hex_code=hex_code.upper(),
        is_active=is_active,
    )

    return color


def delete_color(*, color):
    if ProductVariant.objects.filter(colors__id=color.id).exists():
        raise ValidationError({"messages": ["ColorHasAssociatedVariants"]})

    color.delete()
    return {"messages": ["ColorDeletedSuccessfully"]}


def activate_color(*, color):
    color.is_active = True
    color.save()
    return color


def deactivate_color(*, color):
    color.is_active = False
    color.save()
    return color
