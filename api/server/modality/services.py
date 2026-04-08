import logging

from django.db import IntegrityError, transaction
from rest_framework.exceptions import NotFound, ValidationError

from modality.models import Modality, UserModality
from studios.models import Studio

logger = logging.getLogger(__name__)


def get_all_modalities():
    return Modality.objects.prefetch_related("studios").all()


def get_modality(*, pk: int) -> Modality:
    try:
        return Modality.objects.prefetch_related("studios").get(pk=pk)
    except Modality.DoesNotExist:
        raise NotFound()


@transaction.atomic
def create_modality(*, user, allowed_studio_ids=None, **data):
    if Modality.all_objects.filter(name=data.get("name")).exists():
        raise ValidationError({"name": ["ModalityNameAlreadyExists"]})

    min_age = data.get("min_age_months")
    max_age = data.get("max_age_months")
    if min_age is not None and max_age is not None and min_age > max_age:
        raise ValidationError({"messages": ["InvalidAgeRange"]})

    modality = Modality(**data, created_by=user)
    modality.full_clean()
    try:
        modality.save()
    except IntegrityError as exc:
        raise ValidationError({"name": ["ModalityNameAlreadyExists"]}) from exc

    logger.info("Modality %s created by user %s", modality.name, user.id)

    if allowed_studio_ids is not None:
        studios = Studio.objects.filter(id__in=allowed_studio_ids)
        if len(studios) != len(allowed_studio_ids):
            raise ValidationError({"messages": ["OneOrMoreStudiosNotFound"]})
        try:
            modality.studios.set(studios)
        except IntegrityError as exc:
            raise ValidationError({"messages": ["StudioModalityLinkConflict"]}) from exc

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
    try:
        modality.save()
    except IntegrityError as exc:
        raise ValidationError({"name": ["ModalityNameAlreadyExists"]}) from exc

    logger.info("Modality %s updated by user %s", modality.name, user.id)

    if allowed_studio_ids is not None:
        studios = Studio.objects.filter(id__in=allowed_studio_ids)
        if len(studios) != len(allowed_studio_ids):
            raise ValidationError({"messages": ["OneOrMoreStudiosNotFound"]})
        try:
            modality.studios.set(studios)
        except IntegrityError as exc:
            raise ValidationError({"messages": ["StudioModalityLinkConflict"]}) from exc

    return modality


@transaction.atomic
def delete_modality(*, pk: int, user):
    modality = get_modality(pk=pk)
    modality.delete(deleted_by=user)

    logger.info("Modality %s deleted by user %s", modality.name, user.id)


def get_user_modalities(*, user_id: int):
    return (
        UserModality.objects.filter(user_id=user_id)
        .select_related("modality")
        .prefetch_related("modality__studios")
    )


@transaction.atomic
def add_user_modality(*, user_id: int, modality_id: int, requesting_user):
    modality = get_modality(pk=modality_id)

    if UserModality.objects.filter(user_id=user_id, modality=modality).exists():
        raise ValidationError({"messages": ["UserModalityAlreadyExists"]})

    link = UserModality(
        user_id=user_id,
        modality=modality,
        created_by=requesting_user,
    )
    link.full_clean()
    try:
        link.save()
    except IntegrityError as exc:
        raise ValidationError({"messages": ["UserModalityAlreadyExists"]}) from exc

    logger.info(
        "UserModality user=%s modality=%s created by %s",
        user_id,
        modality_id,
        requesting_user.id,
    )
    return UserModality.objects.select_related("modality").prefetch_related(
        "modality__studios"
    ).get(pk=link.pk)


@transaction.atomic
def remove_user_modality(*, user_id: int, pk: int, requesting_user):
    try:
        link = UserModality.objects.get(pk=pk, user_id=user_id)
    except UserModality.DoesNotExist:
        raise NotFound()

    link.delete(deleted_by=requesting_user)
    logger.info("UserModality %s deleted by %s", pk, requesting_user.id)
