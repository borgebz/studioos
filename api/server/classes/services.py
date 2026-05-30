import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from accounts.services import assert_user_can_participate_in_coaching, get_user_by_pk
from core.exceptions import AppNotFound
from classes.models import Classe, ClasseMember

logger = logging.getLogger(__name__)


def _classe_detail_queryset():
    return Classe.objects.prefetch_related("members__student")


def list_classes(*, requesting_user=None):
    """
    List classes visible to the requesting user.

    - Direction / coordination / teachers (have ``classes.can_manage_classes`` or
      ``accounts.can_teach``) see every class.
    - Students (``accounts.can_participate_in_coaching``) see only classes
      they are an active member of.
    - Guardians (``coachings.can_confirm_dependent_coaching_attendance``)
      see classes where any of their dependents is an active member.
    """
    qs = Classe.objects.prefetch_related("members__student")
    if requesting_user is None or not requesting_user.is_authenticated:
        return qs.all()

    if requesting_user.has_perm(
        "classes.can_manage_classes"
    ) or requesting_user.has_perm("accounts.can_teach"):
        return qs.all()

    member_user_ids = [requesting_user.id]
    if requesting_user.has_perm(
        "coachings.can_confirm_dependent_coaching_attendance"
    ):
        from accounts.models import User

        dependent_ids = list(
            User.objects.filter(parent_id=requesting_user.id).values_list(
                "id", flat=True
            )
        )
        member_user_ids.extend(dependent_ids)

    return qs.filter(
        members__student_id__in=member_user_ids,
        members__deleted_at__isnull=True,
    ).distinct()


def get_classe(*, pk):
    try:
        return _classe_detail_queryset().get(pk=pk)
    except Classe.DoesNotExist:
        raise AppNotFound("ClasseNotFound")


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
        raise AppNotFound("ClasseNotFound")

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
        raise AppNotFound("ClasseNotFound")
    classe.delete(deleted_by=requesting_user)
    logger.info("Classe %s deleted by user=%s", pk, requesting_user.id)


def list_classe_members(*, classe_id):
    try:
        Classe.objects.get(pk=classe_id)
    except Classe.DoesNotExist:
        raise AppNotFound("ClasseNotFound")
    return ClasseMember.objects.filter(classe_id=classe_id).select_related("student")


@transaction.atomic
def add_classe_member(*, classe_id, student_id, created_by):
    try:
        classe = Classe.objects.get(pk=classe_id)
    except Classe.DoesNotExist:
        raise AppNotFound("ClasseNotFound")

    student = get_user_by_pk(pk=student_id)
    assert_user_can_participate_in_coaching(user=student)

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
        raise AppNotFound("ClasseNotFound")
    try:
        member = ClasseMember.objects.get(pk=member_pk, classe_id=classe_id)
    except ClasseMember.DoesNotExist:
        raise AppNotFound("ClasseMemberNotFound")
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
