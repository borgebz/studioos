import logging

from django.db import transaction
from rest_framework.exceptions import NotFound, ValidationError
from .models import Studio, Modality

logger = logging.getLogger(__name__)


# Studio
def get_all_studios():
    return Studio.objects.all()


def get_studio(*, pk: int) -> Studio:
    try:
        return Studio.objects.get(pk=pk)
    except Studio.DoesNotExist:
        raise NotFound()


@transaction.atomic
def create_studio(*, user, **data):
    # Prevents 500 IntegrityError since models.py uses unique=True
    if Studio.all_objects.filter(name=data.get("name")).exists():
        raise ValidationError({"name": ["StudioNameAlreadyExists"]})

    studio = Studio(**data, created_by=user)
    studio.full_clean()
    studio.save()

    logger.info(f"Studio {studio.name} created by user {user.id}")
    return studio


@transaction.atomic
def update_studio(*, pk: int, user, **data):
    studio = get_studio(pk=pk)

    new_name = data.get("name")
    # Check for unique name collisions on update
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
    studio.save()

    logger.info(f"Studio {studio.name} updated by user {user.id}")
    return studio


@transaction.atomic
def delete_studio(*, pk: int, user):
    studio = get_studio(pk=pk)
    studio.delete(deleted_by=user)

    logger.info(f"Studio {studio.name} deleted by user {user.id}")


# Modality
def get_all_modalities():
    # Prefetch to prevent N+1 queries on serialization
    return Modality.objects.prefetch_related("studios").all()


def get_modality(*, pk: int) -> Modality:
    try:
        # Prefetch to prevent N+1 queries
        return Modality.objects.prefetch_related("studios").get(pk=pk)
    except Modality.DoesNotExist:
        raise NotFound()


@transaction.atomic
def create_modality(*, user, allowed_studio_ids=None, **data):
    # Prevents 500 IntegrityError
    if Modality.all_objects.filter(name=data.get("name")).exists():
        raise ValidationError({"name": ["ModalityNameAlreadyExists"]})

    min_age = data.get("min_age_months")
    max_age = data.get("max_age_months")
    if (
        min_age is not None
        and max_age is not None
        and min_age > max_age
    ):
        raise ValidationError({"messages": ["InvalidAgeRange"]})

    modality = Modality(**data, created_by=user)
    modality.full_clean()
    modality.save()

    logger.info(f"Modality {modality.name} created by user {user.id}")

    # Addresses reviewer feedback: ensures relationships are updated on PATCH
    if allowed_studio_ids is not None:
        studios = Studio.objects.filter(id__in=allowed_studio_ids)
        if len(studios) != len(allowed_studio_ids):
            raise ValidationError({"messages": ["OneOrMoreStudiosNotFound"]})
        modality.studios.set(studios)

    return modality


@transaction.atomic
def update_modality(*, pk: int, user, allowed_studio_ids=None, **data):
    modality = get_modality(pk=pk)

    new_name = data.get("name")
    if (
        new_name
        and new_name != modality.name
        and Modality.all_objects.filter(name=new_name).exists()
    ):
        raise ValidationError({"name": ["ModalityNameAlreadyExists"]})

    for field, value in data.items():
        setattr(modality, field, value)

    if (
        modality.min_age_months is not None
        and modality.max_age_months is not None
        and modality.min_age_months > modality.max_age_months
    ):
        raise ValidationError({"messages": ["InvalidAgeRange"]})

    modality.updated_by = user
    modality.full_clean()
    modality.save()

    logger.info(f"Modality {modality.name} updated by user {user.id}")

    if allowed_studio_ids is not None:
        studios = Studio.objects.filter(id__in=allowed_studio_ids)
        if len(studios) != len(allowed_studio_ids):
            raise ValidationError({"messages": ["OneOrMoreStudiosNotFound"]})
        modality.studios.set(studios)

    return modality


@transaction.atomic
def delete_modality(*, pk: int, user):
    modality = get_modality(pk=pk)
    modality.delete(deleted_by=user)

    logger.info(f"Modality {modality.name} deleted by user {user.id}")
