import logging

from django.db import IntegrityError, transaction
from rest_framework.exceptions import NotFound, ValidationError

from studios.models import Studio, StudioModality

logger = logging.getLogger(__name__)


def get_all_studios():
    return Studio.objects.all()


def get_studio(*, pk: int) -> Studio:
    try:
        return Studio.objects.get(pk=pk)
    except Studio.DoesNotExist:
        raise NotFound()


@transaction.atomic
def create_studio(*, user, **data):
    if Studio.all_objects.filter(name=data.get("name")).exists():
        raise ValidationError({"name": ["StudioNameAlreadyExists"]})

    studio = Studio(**data, created_by=user)
    studio.full_clean()
    try:
        studio.save()
    except IntegrityError as exc:
        raise ValidationError({"name": ["StudioNameAlreadyExists"]}) from exc

    logger.info("Studio %s created by user %s", studio.name, user.id)
    return studio


@transaction.atomic
def update_studio(*, pk: int, user, **data):
    studio = get_studio(pk=pk)

    new_name = data.get("name")
    if (
        new_name
        and new_name != studio.name
        and Studio.all_objects.filter(name=new_name).exists()
    ):
        raise ValidationError({"name": ["StudioNameAlreadyExists"]})

    for field, value in data.items():
        setattr(studio, field, value)

    studio.updated_by = user
    studio.full_clean()
    try:
        studio.save()
    except IntegrityError as exc:
        raise ValidationError({"name": ["StudioNameAlreadyExists"]}) from exc

    logger.info("Studio %s updated by user %s", studio.name, user.id)
    return studio


@transaction.atomic
def delete_studio(*, pk: int, user):
    studio = get_studio(pk=pk)

    active_links = StudioModality.objects.filter(studio=studio)
    for link in active_links:
        link.delete(deleted_by=user)

    studio.delete(deleted_by=user)

    logger.info("Studio %s deleted by user %s", studio.name, user.id)
