import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework.exceptions import NotFound, ValidationError

from accounts.services import get_user_by_pk
from classes.models import Classe, ClasseMember

logger = logging.getLogger(__name__)


def _classe_detail_queryset():
    return Classe.objects.prefetch_related("members__student")


def list_classes():
    return Classe.objects.all()


def get_classe(*, pk):
    try:
        return _classe_detail_queryset().get(pk=pk)
    except Classe.DoesNotExist:
        raise NotFound()


@transaction.atomic
def create_classe(*, name, description="", created_by):
    classe = Classe(
        name=name,
        description=description,
        created_by=created_by,
    )
    try:
        classe.full_clean()
    except DjangoValidationError:
        raise ValidationError({"messages": ["ClasseNameAlreadyExists"]})
    try:
        classe.save()
    except IntegrityError:
        raise ValidationError({"messages": ["ClasseNameAlreadyExists"]})
    logger.info("Classe created name=%s by user=%s", name, created_by.id)
    return classe


@transaction.atomic
def update_classe(*, pk, requesting_user, **updates):
    try:
        classe = Classe.objects.select_for_update().get(pk=pk)
    except Classe.DoesNotExist:
        raise NotFound()

    if "name" in updates:
        classe.name = updates["name"]
    if "description" in updates:
        classe.description = updates["description"]

    classe.updated_by = requesting_user
    try:
        classe.full_clean()
    except DjangoValidationError:
        raise ValidationError({"messages": ["ClasseNameAlreadyExists"]})
    try:
        classe.save()
    except IntegrityError:
        raise ValidationError({"messages": ["ClasseNameAlreadyExists"]})
    logger.info("Classe %s updated by user=%s", pk, requesting_user.id)
    return get_classe(pk=pk)


@transaction.atomic
def delete_classe(*, pk, requesting_user):
    try:
        classe = Classe.objects.get(pk=pk)
    except Classe.DoesNotExist:
        raise NotFound()
    classe.delete(deleted_by=requesting_user)
    logger.info("Classe %s deleted by user=%s", pk, requesting_user.id)


def list_classe_members(*, classe_id):
    try:
        Classe.objects.get(pk=classe_id)
    except Classe.DoesNotExist:
        raise NotFound()
    return ClasseMember.objects.filter(classe_id=classe_id).select_related("student")


@transaction.atomic
def add_classe_member(*, classe_id, student_id, created_by):
    try:
        classe = Classe.objects.get(pk=classe_id)
    except Classe.DoesNotExist:
        raise NotFound()

    student = get_user_by_pk(pk=student_id)
    if not student.has_perm("accounts.can_participate_in_coaching"):
        raise ValidationError({"messages": ["UserCannotParticipateInCoaching"]})

    member = ClasseMember(
        classe=classe,
        student=student,
        created_by=created_by,
    )
    try:
        member.full_clean()
    except DjangoValidationError:
        raise ValidationError({"messages": ["StudentAlreadyInClasse"]})
    try:
        member.save()
    except IntegrityError:
        raise ValidationError({"messages": ["StudentAlreadyInClasse"]})
    logger.info(
        "ClasseMember student=%s added to classe=%s by user=%s",
        student_id,
        classe_id,
        created_by.id,
    )
    return ClasseMember.objects.select_related("student").get(pk=member.pk)


@transaction.atomic
def remove_classe_member(*, classe_id, member_pk, requesting_user):
    try:
        Classe.objects.get(pk=classe_id)
    except Classe.DoesNotExist:
        raise NotFound()
    try:
        member = ClasseMember.objects.get(pk=member_pk, classe_id=classe_id)
    except ClasseMember.DoesNotExist:
        raise NotFound()
    member.delete(deleted_by=requesting_user)
    logger.info(
        "ClasseMember %s removed from classe=%s by user=%s",
        member_pk,
        classe_id,
        requesting_user.id,
    )


def get_student_ids_for_classe(*, classe_id):
    return list(
        ClasseMember.objects.filter(classe_id=classe_id).values_list(
            "student_id", flat=True
        )
    )
