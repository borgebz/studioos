import logging

from django.db import IntegrityError, models, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.models import User
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingStatus,
    TeacherAvailability,
)
from modality.models import Modality
from studios.models import Studio, StudioModality

logger = logging.getLogger(__name__)

_VALID_TRANSITIONS = {
    CoachingStatus.REQUESTED: [
        CoachingStatus.PENDING_APPROVAL,
        CoachingStatus.REJECTED,
        CoachingStatus.CANCELLED,
    ],
    CoachingStatus.PENDING_APPROVAL: [
        CoachingStatus.SCHEDULED,
        CoachingStatus.REJECTED,
        CoachingStatus.CANCELLED,
    ],
    CoachingStatus.SCHEDULED: [
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
    ],
}


def _validate_status_transition(coaching, target_status):
    allowed = _VALID_TRANSITIONS.get(coaching.status, [])
    if target_status not in allowed:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})


def _get_user(*, pk):
    try:
        return User.objects.get(pk=pk)
    except User.DoesNotExist:
        raise NotFound()


def _check_availability_overlap(
    *, teacher_id, start_datetime, end_datetime, exclude_pk=None
):
    qs = TeacherAvailability.objects.filter(
        teacher_id=teacher_id,
        start_datetime__lt=end_datetime,
        end_datetime__gt=start_datetime,
    )
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    if qs.exists():
        raise ValidationError({"messages": ["TeacherAvailabilityOverlap"]})


def _assert_studio_modality_compatible(*, studio, modality):
    if not StudioModality.objects.filter(
        studio=studio,
        modality=modality,
        deleted_at__isnull=True,
    ).exists():
        raise ValidationError({"messages": ["StudioModalityIncompatible"]})


def _assert_no_scheduled_conflict(
    *,
    teacher_id,
    studio_id,
    start_datetime,
    end_datetime,
    exclude_pk=None,
):
    teacher_qs = CoachingClass.objects.filter(
        teacher_id=teacher_id,
        status=CoachingStatus.SCHEDULED,
        start_datetime__lt=end_datetime,
        end_datetime__gt=start_datetime,
    )
    if exclude_pk:
        teacher_qs = teacher_qs.exclude(pk=exclude_pk)
    if teacher_qs.exists():
        raise ValidationError({"messages": ["TeacherScheduleConflict"]})

    studio_qs = CoachingClass.objects.filter(
        studio_id=studio_id,
        status=CoachingStatus.SCHEDULED,
        start_datetime__lt=end_datetime,
        end_datetime__gt=start_datetime,
    )
    if exclude_pk:
        studio_qs = studio_qs.exclude(pk=exclude_pk)
    if studio_qs.exists():
        raise ValidationError({"messages": ["StudioScheduleConflict"]})


def list_teacher_availability(*, teacher_id, date_from=None, date_to=None):
    qs = TeacherAvailability.objects.select_related("modality").filter(
        teacher_id=teacher_id
    )
    if date_from:
        qs = qs.filter(end_datetime__gte=date_from)
    if date_to:
        qs = qs.filter(start_datetime__lte=date_to)
    return qs


@transaction.atomic
def create_teacher_availability(*, teacher_id, requesting_user, **data):
    start = data.get("start_datetime")
    end = data.get("end_datetime")
    if start is None or end is None:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    if start >= end:
        raise ValidationError({"messages": ["InvalidDateRange"]})

    data = {**data}
    modality_id = data.pop("modality_id", None)
    modality = None
    if modality_id is not None:
        try:
            modality = Modality.objects.get(pk=modality_id)
        except Modality.DoesNotExist:
            raise NotFound()

    notes = data.get("notes", "")
    _check_availability_overlap(
        teacher_id=teacher_id, start_datetime=start, end_datetime=end
    )

    block = TeacherAvailability(
        teacher_id=teacher_id,
        modality=modality,
        start_datetime=start,
        end_datetime=end,
        notes=notes,
        created_by=requesting_user,
    )
    block.full_clean()
    block.save()
    logger.info(
        "TeacherAvailability created for teacher=%s by user=%s",
        teacher_id,
        requesting_user.id,
    )
    return block


@transaction.atomic
def update_teacher_availability(*, teacher_id, pk, requesting_user, **data):
    try:
        block = TeacherAvailability.objects.get(pk=pk, teacher_id=teacher_id)
    except TeacherAvailability.DoesNotExist:
        raise NotFound()

    modality_id = data.pop("modality_id", "__unset__")
    if modality_id != "__unset__":
        if modality_id is not None:
            try:
                block.modality = Modality.objects.get(pk=modality_id)
            except Modality.DoesNotExist:
                raise NotFound()
        else:
            block.modality = None

    if "start_datetime" in data:
        block.start_datetime = data["start_datetime"]
    if "end_datetime" in data:
        block.end_datetime = data["end_datetime"]
    if "notes" in data:
        block.notes = data["notes"]

    if block.start_datetime >= block.end_datetime:
        raise ValidationError({"messages": ["InvalidDateRange"]})

    _check_availability_overlap(
        teacher_id=teacher_id,
        start_datetime=block.start_datetime,
        end_datetime=block.end_datetime,
        exclude_pk=pk,
    )

    block.updated_by = requesting_user
    block.full_clean()
    block.save()
    logger.info("TeacherAvailability %s updated by user=%s", pk, requesting_user.id)
    return block


@transaction.atomic
def delete_teacher_availability(*, teacher_id, pk, requesting_user):
    try:
        block = TeacherAvailability.objects.get(pk=pk, teacher_id=teacher_id)
    except TeacherAvailability.DoesNotExist:
        raise NotFound()
    block.delete(deleted_by=requesting_user)
    logger.info("TeacherAvailability %s deleted by user=%s", pk, requesting_user.id)


def get_coaching(*, pk):
    try:
        return (
            CoachingClass.objects.select_related(
                "teacher", "modality", "studio", "requested_by"
            )
            .prefetch_related("participants__student")
            .get(pk=pk)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()


def list_coachings(
    *,
    teacher_id=None,
    status=None,
    studio_id=None,
    requested_by_id=None,
    date_from=None,
    date_to=None,
):
    qs = CoachingClass.objects.select_related(
        "teacher", "modality", "studio", "requested_by"
    ).prefetch_related("participants__student")
    if teacher_id is not None:
        qs = qs.filter(teacher_id=teacher_id)
    if status is not None:
        qs = qs.filter(status=status)
    if studio_id is not None:
        qs = qs.filter(studio_id=studio_id)
    if requested_by_id is not None:
        qs = qs.filter(requested_by_id=requested_by_id)
    if date_from is not None:
        qs = qs.filter(end_datetime__gte=date_from)
    if date_to is not None:
        qs = qs.filter(start_datetime__lte=date_to)
    return qs


@transaction.atomic
def create_coaching_request(
    *,
    teacher_id,
    modality_id,
    start_datetime,
    end_datetime,
    requesting_user,
    notes="",
):
    if start_datetime >= end_datetime:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    _get_user(pk=teacher_id)
    try:
        modality = Modality.objects.get(pk=modality_id)
    except Modality.DoesNotExist:
        raise NotFound()

    coaching = CoachingClass(
        teacher_id=teacher_id,
        modality=modality,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        notes=notes,
        status=CoachingStatus.REQUESTED,
        requested_by=requesting_user,
        created_by=requesting_user,
    )
    coaching.full_clean()
    coaching.save()
    logger.info(
        "CoachingClass requested by user=%s teacher=%s",
        requesting_user.id,
        teacher_id,
    )
    return coaching


@transaction.atomic
def create_scheduled_coaching(
    *,
    teacher_id,
    modality_id,
    studio_id,
    total_price,
    start_datetime,
    end_datetime,
    requesting_user,
    notes="",
):
    if start_datetime >= end_datetime:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    _get_user(pk=teacher_id)
    try:
        modality = Modality.objects.get(pk=modality_id)
    except Modality.DoesNotExist:
        raise NotFound()
    try:
        studio = Studio.objects.get(pk=studio_id)
    except Studio.DoesNotExist:
        raise NotFound()

    _assert_studio_modality_compatible(studio=studio, modality=modality)

    conflict_lock_qs = (
        CoachingClass.objects.select_for_update()
        .filter(
            status=CoachingStatus.SCHEDULED,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        )
        .filter(models.Q(teacher_id=teacher_id) | models.Q(studio_id=studio_id))
    )
    list(conflict_lock_qs)

    _assert_no_scheduled_conflict(
        teacher_id=teacher_id,
        studio_id=studio_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
    )

    coaching = CoachingClass(
        teacher_id=teacher_id,
        modality=modality,
        studio=studio,
        total_price=total_price,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        notes=notes,
        status=CoachingStatus.SCHEDULED,
        created_by=requesting_user,
    )
    coaching.full_clean()
    coaching.save()
    logger.info(
        "CoachingClass scheduled directly by user=%s teacher=%s",
        requesting_user.id,
        teacher_id,
    )
    return coaching


@transaction.atomic
def teacher_accept_coaching(*, pk, user):
    coaching = get_coaching(pk=pk)
    if coaching.teacher_id != user.id:
        raise ValidationError({"messages": ["NotTheAssignedTeacher"]})
    _validate_status_transition(coaching, CoachingStatus.PENDING_APPROVAL)
    coaching.status = CoachingStatus.PENDING_APPROVAL
    coaching.updated_by = user
    coaching.save()
    logger.info("CoachingClass %s accepted by teacher=%s", pk, user.id)
    return get_coaching(pk=pk)


@transaction.atomic
def teacher_reject_coaching(*, user, rejection_reason="", pk=None, coaching=None):
    if coaching is None:
        if pk is None:
            raise ValidationError({"messages": ["InvalidRequest"]})
        coaching = get_coaching(pk=pk)
    if coaching.teacher_id != user.id:
        raise ValidationError({"messages": ["NotTheAssignedTeacher"]})
    if coaching.status != CoachingStatus.REQUESTED:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})
    coaching.status = CoachingStatus.REJECTED
    coaching.rejection_reason = rejection_reason
    coaching.updated_by = user
    coaching.save()
    logger.info("CoachingClass %s rejected by teacher=%s", coaching.pk, user.id)
    return coaching


@transaction.atomic
def reject_coaching_coordination(*, user, rejection_reason="", pk=None, coaching=None):
    if coaching is None:
        if pk is None:
            raise ValidationError({"messages": ["InvalidRequest"]})
        coaching = get_coaching(pk=pk)
    _validate_status_transition(coaching, CoachingStatus.REJECTED)
    coaching.status = CoachingStatus.REJECTED
    coaching.rejection_reason = rejection_reason
    coaching.updated_by = user
    coaching.save()
    logger.info(
        "CoachingClass %s rejected by coordination user=%s", coaching.pk, user.id
    )
    return coaching


@transaction.atomic
def approve_coaching(*, pk, studio_id, total_price, user):
    try:
        coaching = (
            CoachingClass.objects.select_for_update()
            .select_related("teacher", "modality", "studio", "requested_by")
            .get(pk=pk)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()

    _validate_status_transition(coaching, CoachingStatus.SCHEDULED)

    try:
        studio = Studio.objects.get(pk=studio_id)
    except Studio.DoesNotExist:
        raise NotFound()

    _assert_studio_modality_compatible(studio=studio, modality=coaching.modality)
    _assert_no_scheduled_conflict(
        teacher_id=coaching.teacher_id,
        studio_id=studio_id,
        start_datetime=coaching.start_datetime,
        end_datetime=coaching.end_datetime,
        exclude_pk=pk,
    )

    coaching.studio = studio
    coaching.total_price = total_price
    coaching.status = CoachingStatus.SCHEDULED
    coaching.updated_by = user
    coaching.full_clean()
    coaching.save()
    logger.info("CoachingClass %s approved by user=%s", pk, user.id)
    return get_coaching(pk=pk)


@transaction.atomic
def complete_coaching(*, pk, user):
    coaching = get_coaching(pk=pk)
    _validate_status_transition(coaching, CoachingStatus.COMPLETED)
    coaching.status = CoachingStatus.COMPLETED
    coaching.completed_at = timezone.now()
    coaching.updated_by = user
    coaching.save()
    logger.info("CoachingClass %s completed by user=%s", pk, user.id)
    return get_coaching(pk=pk)


@transaction.atomic
def cancel_coaching(*, pk, user, cancellation_reason=""):
    coaching = get_coaching(pk=pk)
    _validate_status_transition(coaching, CoachingStatus.CANCELLED)
    coaching.status = CoachingStatus.CANCELLED
    coaching.cancellation_reason = cancellation_reason
    coaching.updated_by = user
    coaching.save()
    logger.info("CoachingClass %s cancelled by user=%s", pk, user.id)
    return get_coaching(pk=pk)


def _active_participant_count(*, coaching_class):
    return CoachingParticipant.objects.filter(coaching_class=coaching_class).count()


@transaction.atomic
def add_participant(*, coaching_class_id, student_id, requesting_user):
    try:
        coaching = CoachingClass.objects.select_related("modality").get(
            pk=coaching_class_id
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()

    if coaching.status in (
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
        CoachingStatus.REJECTED,
    ):
        raise ValidationError({"messages": ["CoachingNotOpenForParticipants"]})

    _get_user(pk=student_id)

    max_cap = coaching.modality.max_capacity
    if max_cap is not None:
        if _active_participant_count(coaching_class=coaching) >= max_cap:
            raise ValidationError({"messages": ["CoachingParticipantCapacityReached"]})

    if CoachingParticipant.objects.filter(
        coaching_class=coaching,
        student_id=student_id,
    ).exists():
        raise ValidationError({"messages": ["ParticipantAlreadyEnrolled"]})

    participant = CoachingParticipant(
        coaching_class=coaching,
        student_id=student_id,
        created_by=requesting_user,
    )
    participant.full_clean()
    try:
        participant.save()
    except IntegrityError as exc:
        raise ValidationError({"messages": ["ParticipantAlreadyEnrolled"]}) from exc

    logger.info(
        "CoachingParticipant student=%s added to coaching=%s by user=%s",
        student_id,
        coaching_class_id,
        requesting_user.id,
    )
    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)


def list_participants(*, coaching_class_id):
    try:
        CoachingClass.objects.get(pk=coaching_class_id)
    except CoachingClass.DoesNotExist:
        raise NotFound()
    return CoachingParticipant.objects.filter(
        coaching_class_id=coaching_class_id
    ).select_related("student")


@transaction.atomic
def remove_participant(*, coaching_class_id, pk, requesting_user):
    try:
        participant = CoachingParticipant.objects.get(
            pk=pk,
            coaching_class_id=coaching_class_id,
        )
    except CoachingParticipant.DoesNotExist:
        raise NotFound()
    participant.delete(deleted_by=requesting_user)
    logger.info("CoachingParticipant %s removed by user=%s", pk, requesting_user.id)
