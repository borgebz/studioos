import logging
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from accounts.services import get_teacher_user_by_pk, get_user_by_pk
from core.exceptions import AppNotFound
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingParticipantStatus,
    CoachingStatus,
    TeacherAvailability,
)
from modality.models import Modality
from studios.models import Studio, StudioModality

from billing.services import (
    create_billing_entries_for_coaching,
    create_fines_for_coaching,
)

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
        CoachingStatus.WAITING_CONFIRMATION,
        CoachingStatus.CANCELLED,
    ],
    CoachingStatus.WAITING_CONFIRMATION: [
        CoachingStatus.PENDING_COMPLETION_APPROVAL,
        CoachingStatus.CANCELLED,
    ],
    CoachingStatus.PENDING_COMPLETION_APPROVAL: [
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
    ],
}

_EDITABLE_COACHING_STATUSES = frozenset(
    {
        CoachingStatus.REQUESTED,
        CoachingStatus.PENDING_APPROVAL,
        CoachingStatus.SCHEDULED,
    }
)

# Cancellations are not accepted once the session is in completion / ended, or already past.
_COACHING_STATUSES_BLOCKING_PARTICIPANT_CANCEL = frozenset(
    {
        CoachingStatus.PENDING_COMPLETION_APPROVAL,
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
        CoachingStatus.REJECTED,
        CoachingStatus.WAITING_CONFIRMATION,
    }
)

_PARTICIPANT_STATUSES_BLOCKING_CANCEL = frozenset(
    {
        CoachingParticipantStatus.CANCELLED,
        CoachingParticipantStatus.LATE_CANCELLED,
        CoachingParticipantStatus.ATTENDED,
        CoachingParticipantStatus.ABSENT,
    }
)


# Policy: cancellations within this window before start_datetime are "late".
# Hours are env-driven (COACHING_LATE_CANCELLATION_HOURS, default 48).
def _participant_cancel_min_notice() -> timedelta:
    return timedelta(hours=getattr(settings, "COACHING_LATE_CANCELLATION_HOURS", 48))


# Cancelled / late-cancelled rows no longer occupy modality capacity.
_STATUSES_NOT_OCCUPYING_CAPACITY = frozenset(
    {
        CoachingParticipantStatus.CANCELLED,
        CoachingParticipantStatus.LATE_CANCELLED,
    }
)

# Roster rows that no longer participate; add_participant revives the same row instead of inserting.
_PARTICIPANT_DEATH_STATUSES = frozenset(
    {
        CoachingParticipantStatus.CANCELLED,
        CoachingParticipantStatus.LATE_CANCELLED,
        CoachingParticipantStatus.ATTENDED,
        CoachingParticipantStatus.ABSENT,
    }
)


def _participant_status_counts_toward_capacity(status):
    return status not in _STATUSES_NOT_OCCUPYING_CAPACITY


def _initial_participant_status(*, coaching, student_id):
    """
    New roster rows: scheduled sessions enroll as active; requested (non-scheduled)
    sessions use pending for whoever requested the coaching and invited for everyone else.
    """
    if coaching.status == CoachingStatus.SCHEDULED:
        return CoachingParticipantStatus.ACTIVE
    if coaching.requested_by_id is not None:
        if student_id == coaching.requested_by_id:
            return CoachingParticipantStatus.PENDING
        return CoachingParticipantStatus.INVITED
    return CoachingParticipantStatus.PENDING


def _participant_row_for_add_participant(*, coaching, student_id, requesting_user):
    """
    Initial ``status`` and ``invited_by_staff`` for :func:`add_participant` (also used when
    :func:`create_coaching_request` rosters the requester).

    **Requester adding themselves** (``student_id == coaching.requested_by_id`` and
    ``requesting_user`` is that same user): always ``PENDING`` and ``invited_by_staff=False`` —
    they requested the session, not an invitee flow.

    Staff vs everyone else is determined by ``coachings.change_coachingparticipant``.

    **Scheduled coaching** (after those rules)
    - Staff: ``ACTIVE`` and ``invited_by_staff=True``.
    - Other: ``INVITED`` and ``invited_by_staff=False`.

    **Any other coaching status** (not ``SCHEDULED``)
    - Staff: ``INVITED`` and ``invited_by_staff=True``.
    - Other: ``INVITED`` and ``invited_by_staff=False``.

    The ``invited_by_staff`` flag drives downstream behaviour (e.g. accept-invite → active vs
    pending, and whether teacher-accept bumps an invite to pending).
    """
    if (
        coaching.requested_by_id is not None
        and student_id == coaching.requested_by_id
        and requesting_user.pk == student_id
    ):
        return CoachingParticipantStatus.PENDING, False

    invited_by_staff = requesting_user.has_perm("coachings.change_coachingparticipant")
    if coaching.status == CoachingStatus.SCHEDULED:
        if invited_by_staff:
            return CoachingParticipantStatus.ACTIVE, True
        return CoachingParticipantStatus.INVITED, False
    if invited_by_staff:
        return CoachingParticipantStatus.INVITED, True
    return CoachingParticipantStatus.INVITED, False


def _validate_datetime_range(*, start, end):
    if start is None or end is None:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    if start >= end:
        raise ValidationError({"messages": ["InvalidDateRange"]})


def _get_teacher_user(*, teacher_id):
    return get_teacher_user_by_pk(pk=teacher_id)


def _coaching_detail_queryset():
    return CoachingClass.objects.select_related(
        "teacher",
        "modality",
        "studio",
        "requested_by",
        "teacher_confirmed_by",
    ).prefetch_related("participants__student")


# Participants who are not yet "in session" for attendance completion / roster gate.
_STATUSES_EXCLUDED_FROM_ATTENDANCE_COMPLETION_GATE = frozenset(
    {
        CoachingParticipantStatus.CANCELLED,
        CoachingParticipantStatus.LATE_CANCELLED,
        CoachingParticipantStatus.INVITED,
        CoachingParticipantStatus.PENDING,
    }
)


def _all_roster_attendance_confirmed_for_completion(*, coaching_class_id):
    """Every roster row that counts toward completion must be ATTENDED or ABSENT."""
    return (
        not CoachingParticipant.objects.filter(coaching_class_id=coaching_class_id)
        .exclude(status__in=_STATUSES_EXCLUDED_FROM_ATTENDANCE_COMPLETION_GATE)
        .exclude(
            status__in=[
                CoachingParticipantStatus.ATTENDED,
                CoachingParticipantStatus.ABSENT,
            ]
        )
        .exists()
    )


def _maybe_advance_to_pending_completion_approval(*, coaching, updated_by):
    """
    When teacher confirmation and all roster attendance rows are filled, move the
    coaching to ``PENDING_COMPLETION_APPROVAL`` for coordination to complete.
    """
    if coaching.status != CoachingStatus.WAITING_CONFIRMATION:
        return
    if coaching.teacher_confirmed_at is None:
        return
    if not _all_roster_attendance_confirmed_for_completion(
        coaching_class_id=coaching.pk
    ):
        return
    _validate_status_transition(coaching, CoachingStatus.PENDING_COMPLETION_APPROVAL)
    coaching.status = CoachingStatus.PENDING_COMPLETION_APPROVAL
    coaching.updated_by = updated_by
    coaching.full_clean()
    coaching.save()
    logger.info(
        "CoachingClass %s advanced waiting_confirmation → pending_completion_approval",
        coaching.pk,
    )


def _validate_status_transition(coaching, target_status):
    allowed = _VALID_TRANSITIONS.get(coaching.status, [])
    if target_status not in allowed:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})


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


def _ensure_scheduled_slot_free(
    *,
    teacher_id,
    studio_id,
    start_datetime,
    end_datetime,
    exclude_pk=None,
):
    conflict_lock_qs = (
        CoachingClass.objects.select_for_update()
        .filter(
            status=CoachingStatus.SCHEDULED,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        )
        .filter(models.Q(teacher_id=teacher_id) | models.Q(studio_id=studio_id))
    )
    if exclude_pk is not None:
        conflict_lock_qs = conflict_lock_qs.exclude(pk=exclude_pk)
    list(conflict_lock_qs)

    _assert_no_scheduled_conflict(
        teacher_id=teacher_id,
        studio_id=studio_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        exclude_pk=exclude_pk,
    )


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
    _validate_datetime_range(start=start, end=end)
    _get_teacher_user(teacher_id=teacher_id)

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
    _get_teacher_user(teacher_id=teacher_id)
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

    _validate_datetime_range(start=block.start_datetime, end=block.end_datetime)

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
    _get_teacher_user(teacher_id=teacher_id)
    try:
        block = TeacherAvailability.objects.get(pk=pk, teacher_id=teacher_id)
    except TeacherAvailability.DoesNotExist:
        raise NotFound()
    block.delete(deleted_by=requesting_user)
    logger.info("TeacherAvailability %s deleted by user=%s", pk, requesting_user.id)


def get_coaching(*, pk):
    try:
        return _coaching_detail_queryset().get(pk=pk)
    except CoachingClass.DoesNotExist:
        raise NotFound()


def _resolve_coaching_from_pk_or_instance(*, pk, coaching):
    if coaching is not None:
        return coaching
    if pk is None:
        raise ValidationError({"messages": ["InvalidRequest"]})
    return get_coaching(pk=pk)


@transaction.atomic
def update_coaching(*, pk, requesting_user, allow_teacher_change, updates):
    """
    Partial update of a coaching. ``updates`` must only contain keys present in the request body.
    """
    if not updates:
        return get_coaching(pk=pk)

    try:
        coaching = (
            CoachingClass.objects.select_for_update(of=("self",))
            .select_related("modality", "studio", "teacher", "requested_by")
            .get(pk=pk)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()

    if coaching.status not in _EDITABLE_COACHING_STATUSES:
        raise ValidationError({"messages": ["CoachingNotEditable"]})

    if not allow_teacher_change and "teacher_id" in updates:
        raise ValidationError({"messages": ["TeacherIdNotEditable"]})

    if not allow_teacher_change and "is_billable" in updates:
        raise ValidationError({"messages": ["IsBillableStaffOnly"]})

    new_start = updates.get("start_datetime", coaching.start_datetime)
    new_end = updates.get("end_datetime", coaching.end_datetime)
    _validate_datetime_range(start=new_start, end=new_end)

    effective_modality = coaching.modality
    if "modality_id" in updates:
        try:
            effective_modality = Modality.objects.get(pk=updates["modality_id"])
        except Modality.DoesNotExist:
            raise NotFound()

    if "studio_id" in updates:
        new_studio_id = updates["studio_id"]
        if new_studio_id is None:
            if coaching.status == CoachingStatus.SCHEDULED:
                raise ValidationError(
                    {"messages": ["StudioRequiredForScheduledCoaching"]}
                )
        else:
            try:
                new_studio = Studio.objects.get(pk=new_studio_id)
            except Studio.DoesNotExist:
                raise AppNotFound("StudioNotFound")
            _assert_studio_modality_compatible(
                studio=new_studio, modality=effective_modality
            )
    else:
        new_studio_id = coaching.studio_id
        if "modality_id" in updates and coaching.studio_id is not None:
            _assert_studio_modality_compatible(
                studio=coaching.studio, modality=effective_modality
            )

    if "teacher_id" in updates:
        _get_teacher_user(teacher_id=updates["teacher_id"])
        new_teacher_id = updates["teacher_id"]
    else:
        new_teacher_id = coaching.teacher_id

    scheduled_fields_changed = coaching.status == CoachingStatus.SCHEDULED and (
        ("start_datetime" in updates and new_start != coaching.start_datetime)
        or ("end_datetime" in updates and new_end != coaching.end_datetime)
        or ("teacher_id" in updates and new_teacher_id != coaching.teacher_id)
        or ("studio_id" in updates and new_studio_id != coaching.studio_id)
    )

    if scheduled_fields_changed:
        if new_studio_id is None:
            raise ValidationError({"messages": ["StudioRequiredForScheduledCoaching"]})
        _ensure_scheduled_slot_free(
            teacher_id=new_teacher_id,
            studio_id=new_studio_id,
            start_datetime=new_start,
            end_datetime=new_end,
            exclude_pk=pk,
        )

    if "teacher_id" in updates:
        coaching.teacher_id = updates["teacher_id"]
    if "modality_id" in updates:
        coaching.modality = effective_modality
    if "studio_id" in updates:
        coaching.studio_id = updates["studio_id"]
    if "total_price" in updates:
        coaching.total_price = updates["total_price"]
    if "start_datetime" in updates:
        coaching.start_datetime = updates["start_datetime"]
    if "end_datetime" in updates:
        coaching.end_datetime = updates["end_datetime"]
    if "notes" in updates:
        coaching.notes = updates["notes"]
    if "is_billable" in updates:
        coaching.is_billable = updates["is_billable"]

    coaching.updated_by = requesting_user
    coaching.full_clean()
    coaching.save()
    logger.info("CoachingClass %s updated by user=%s", pk, requesting_user.id)
    return get_coaching(pk=pk)


def list_coachings(
    *,
    teacher_id=None,
    status=None,
    studio_id=None,
    requested_by_id=None,
    date_from=None,
    date_to=None,
):
    qs = _coaching_detail_queryset()
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
    studio_id=None,
):
    _validate_datetime_range(start=start_datetime, end=end_datetime)
    _get_teacher_user(teacher_id=teacher_id)
    try:
        modality = Modality.objects.get(pk=modality_id)
    except Modality.DoesNotExist:
        raise AppNotFound("ModalityNotFound")

    studio = None
    if studio_id is not None:
        try:
            studio = Studio.objects.get(pk=studio_id)
        except Studio.DoesNotExist:
            raise AppNotFound("StudioNotFound")
        _assert_studio_modality_compatible(studio=studio, modality=modality)
        _ensure_scheduled_slot_free(
            teacher_id=teacher_id,
            studio_id=studio_id,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
        )

    coaching = CoachingClass(
        teacher_id=teacher_id,
        modality=modality,
        studio=studio,
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
    if requesting_user.has_perm("accounts.can_participate_in_coaching"):
        add_participant(
            coaching_class_id=coaching.pk,
            student_id=requesting_user.pk,
            requesting_user=requesting_user,
        )

    from coachings.tasks import notify_new_coaching_request

    transaction.on_commit(
        lambda cid=coaching.pk: notify_new_coaching_request.delay(cid)
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
    _validate_datetime_range(start=start_datetime, end=end_datetime)
    _get_teacher_user(teacher_id=teacher_id)
    try:
        modality = Modality.objects.get(pk=modality_id)
    except Modality.DoesNotExist:
        raise AppNotFound("ModalityNotFound")
    try:
        studio = Studio.objects.get(pk=studio_id)
    except Studio.DoesNotExist:
        raise AppNotFound("StudioNotFound")

    _assert_studio_modality_compatible(studio=studio, modality=modality)

    _ensure_scheduled_slot_free(
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
    """
    Teacher accepts the coaching request — updates coaching status only.
    Participant rows are unchanged (roster updates happen on coordination approve).
    """
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
    coaching = _resolve_coaching_from_pk_or_instance(pk=pk, coaching=coaching)
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
    coaching = _resolve_coaching_from_pk_or_instance(pk=pk, coaching=coaching)
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
    """
    Coordination schedules the session and activates ``PENDING`` participants only
    (``PENDING`` → ``ACTIVE``). ``INVITED`` rows are unchanged — confirmation uses the
    invite / accept-invite flow (and related endpoints), not this transition.
    """
    if total_price is None:
        raise ValidationError({"messages": ["CoachingTotalPriceRequired"]})

    try:
        coaching = (
            CoachingClass.objects.select_for_update(of=("self",))
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

    pending_participants = CoachingParticipant.objects.filter(
        coaching_class=coaching,
        status=CoachingParticipantStatus.PENDING,
    )
    for participant in pending_participants:
        participant.status = CoachingParticipantStatus.ACTIVE
        participant.updated_by = user
        participant.full_clean()
        participant.save()

    logger.info("CoachingClass %s approved by user=%s", pk, user.id)

    from coachings.tasks import notify_coaching_approved

    transaction.on_commit(lambda cid=coaching.pk: notify_coaching_approved.delay(cid))

    return get_coaching(pk=pk)


@transaction.atomic
def complete_coaching(*, pk, user):
    try:
        coaching = (
            CoachingClass.objects.select_for_update(of=("self",))
            .select_related(
                "teacher",
                "modality",
                "studio",
                "requested_by",
                "teacher_confirmed_by",
            )
            .prefetch_related("participants__student")
            .get(pk=pk)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()
    _validate_status_transition(coaching, CoachingStatus.COMPLETED)

    # Explicit gating: every roster row that counts toward completion must be
    # in a final state (ATTENDED or ABSENT). Intermediate statuses (ACTIVE,
    # PENDING_COMPLETION) block the transition. INVITED/PENDING/CANCELLED/
    # LATE_CANCELLED are excluded from the check (already handled or never
    # in session).
    if not _all_roster_attendance_confirmed_for_completion(coaching_class_id=pk):
        raise ValidationError(
            {"messages": ["CoachingHasUnresolvedParticipantStatuses"]}
        )

    coaching.status = CoachingStatus.COMPLETED
    coaching.completed_at = timezone.now()
    coaching.updated_by = user
    coaching.full_clean()
    coaching.save()

    create_billing_entries_for_coaching(coaching=coaching, user=user)
    create_fines_for_coaching(coaching=coaching, user=user)

    logger.info("CoachingClass %s completed by user=%s", pk, user.id)
    return get_coaching(pk=pk)


def eligible_scheduled_coachings_queryset(*, now=None):
    """
    Coachings still ``SCHEDULED`` whose session end is at or before ``now``.
    Used by :func:`advance_scheduled_to_waiting_confirmation_batch` and by a future cron job.
    """
    at = timezone.now() if now is None else now
    return CoachingClass.objects.filter(
        status=CoachingStatus.SCHEDULED,
        end_datetime__lte=at,
    ).order_by("pk")


def advance_scheduled_to_waiting_confirmation_batch(*, now=None, updated_by=None):
    """
    For each eligible coaching, transition ``SCHEDULED`` → ``WAITING_CONFIRMATION``.
    One DB transaction per coaching so a single failure does not roll back the whole batch.

    Returns the number of coachings transitioned.
    """
    at = timezone.now() if now is None else now
    transitioned = 0
    for pk in eligible_scheduled_coachings_queryset(now=at).values_list(
        "pk", flat=True
    ):
        with transaction.atomic():
            coaching = CoachingClass.objects.select_for_update().filter(pk=pk).first()
            if coaching is None:
                continue
            if coaching.status != CoachingStatus.SCHEDULED:
                continue
            if coaching.end_datetime > at:
                continue
            _validate_status_transition(coaching, CoachingStatus.WAITING_CONFIRMATION)
            coaching.status = CoachingStatus.WAITING_CONFIRMATION
            coaching.updated_by = updated_by
            coaching.full_clean()
            coaching.save()
            transitioned += 1
            logger.info(
                "CoachingClass %s advanced SCHEDULED → waiting_confirmation (batch/cron)",
                pk,
            )
    return transitioned


@transaction.atomic
def teacher_confirm_coaching(*, pk, user, teacher_notes="", now=None):
    """
    Assigned teacher confirms the session took place (``WAITING_CONFIRMATION`` only).
    Idempotent denied: a second confirmation raises validation error.
    """
    at = timezone.now() if now is None else now
    try:
        coaching = CoachingClass.objects.select_for_update().get(pk=pk)
    except CoachingClass.DoesNotExist:
        raise NotFound()

    if coaching.teacher_id != user.id:
        raise ValidationError({"messages": ["NotTheAssignedTeacher"]})
    if coaching.status != CoachingStatus.WAITING_CONFIRMATION:
        raise ValidationError({"messages": ["CoachingNotWaitingConfirmation"]})
    if at < coaching.end_datetime:
        raise ValidationError({"messages": ["CoachingSessionNotEndedYet"]})
    if coaching.teacher_confirmed_at is not None:
        raise ValidationError({"messages": ["TeacherAlreadyConfirmedCoaching"]})

    coaching.teacher_notes = teacher_notes
    coaching.teacher_confirmed_at = at
    coaching.teacher_confirmed_by = user
    coaching.updated_by = user
    coaching.full_clean()
    coaching.save()

    _maybe_advance_to_pending_completion_approval(coaching=coaching, updated_by=user)
    logger.info("CoachingClass %s teacher-confirmed by user=%s", pk, user.id)
    return get_coaching(pk=pk)


@transaction.atomic
def confirm_participant_attendance(
    *, coaching_class_id, participant_pk, user, attended, now=None
):
    """
    Student or their parent marks ATTENDED / ABSENT while the coaching is in
    ``WAITING_CONFIRMATION`` (after session end).
    """
    at = timezone.now() if now is None else now
    try:
        coaching = CoachingClass.objects.select_for_update().get(pk=coaching_class_id)
    except CoachingClass.DoesNotExist:
        raise AppNotFound("CoachingNotFound")

    if coaching.status != CoachingStatus.WAITING_CONFIRMATION:
        raise ValidationError({"messages": ["CoachingNotWaitingConfirmation"]})
    if at < coaching.end_datetime:
        raise ValidationError({"messages": ["CoachingSessionNotEndedYet"]})

    try:
        participant = (
            CoachingParticipant.objects.select_for_update()
            .select_related("student")
            .get(pk=participant_pk, coaching_class_id=coaching_class_id)
        )
    except CoachingParticipant.DoesNotExist:
        raise AppNotFound("ParticipantNotFound")

    if participant.status != CoachingParticipantStatus.ACTIVE:
        raise ValidationError(
            {"messages": ["ParticipantNotEligibleForAttendanceConfirmation"]}
        )

    student = participant.student
    actor_ok = user.id == student.id or (
        student.parent_id is not None and user.id == student.parent_id
    )
    if not actor_ok:
        raise ValidationError(
            {"messages": ["CannotConfirmAttendanceForThisParticipant"]}
        )

    participant.status = (
        CoachingParticipantStatus.ATTENDED
        if attended
        else CoachingParticipantStatus.ABSENT
    )
    participant.updated_by = user
    participant.full_clean()
    participant.save()

    _maybe_advance_to_pending_completion_approval(coaching=coaching, updated_by=user)
    logger.info(
        "Participant %s attendance confirmed attended=%s coaching=%s user=%s",
        participant_pk,
        attended,
        coaching_class_id,
        user.id,
    )
    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)


@transaction.atomic
def cancel_coaching(*, pk, user, cancellation_reason=""):
    coaching = get_coaching(pk=pk)
    _validate_status_transition(coaching, CoachingStatus.CANCELLED)
    coaching.status = CoachingStatus.CANCELLED
    coaching.cancellation_reason = cancellation_reason
    coaching.updated_by = user
    coaching.save()
    logger.info("CoachingClass %s cancelled by user=%s", pk, user.id)

    from coachings.tasks import notify_coaching_cancelled

    transaction.on_commit(lambda cid=coaching.pk: notify_coaching_cancelled.delay(cid))

    return get_coaching(pk=pk)


def _active_participant_count(*, coaching_class):
    """Participants that still occupy a modality capacity slot."""
    return (
        CoachingParticipant.objects.filter(coaching_class=coaching_class)
        .exclude(status__in=_STATUSES_NOT_OCCUPYING_CAPACITY)
        .count()
    )


def _student_has_active_enrollment(*, coaching_class, student_id):
    return (
        CoachingParticipant.objects.filter(
            coaching_class=coaching_class,
            student_id=student_id,
        )
        .exclude(status__in=_STATUSES_NOT_OCCUPYING_CAPACITY)
        .exists()
    )


def _enqueue_participant_cancel_side_effects(
    *,
    participant_id,
    coaching_class_id,
    teacher_id,
    is_late_cancelled,
):
    """Runs after commit — notifications and any async work must not roll back DB.
    Fines are NOT created here — LATE_CANCELLED participants are reviewed at
    coaching completion (see ``billing.services.create_fines_for_coaching``).
    """

    def _run():
        from coachings.tasks import notify_participant_cancelled

        notify_participant_cancelled.delay(
            participant_id,
            coaching_class_id,
            is_late_cancelled,
        )
        # TODO: Auto-generate a Fine when is_late_cancelled is True (billing/fines module).
        # TODO: Notify coordination about the cancellation (coaching_class_id, participant_id).

    transaction.on_commit(_run)


@transaction.atomic
def add_participant(*, coaching_class_id, student_id, requesting_user):
    try:
        coaching = (
            CoachingClass.objects.select_for_update()
            .select_related("modality")
            .get(pk=coaching_class_id)
        )
    except CoachingClass.DoesNotExist:
        raise AppNotFound("CoachingNotFound")

    if coaching.status in (
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
        CoachingStatus.REJECTED,
    ):
        raise ValidationError({"messages": ["CoachingNotOpenForParticipants"]})

    student = get_user_by_pk(pk=student_id)
    if not student.has_perm("accounts.can_participate_in_coaching"):
        raise ValidationError({"messages": ["UserCannotParticipateInCoaching"]})

    existing = (
        CoachingParticipant.objects.select_for_update()
        .filter(coaching_class_id=coaching_class_id, student_id=student_id)
        .first()
    )
    if existing:
        if existing.status not in _PARTICIPANT_DEATH_STATUSES:
            raise ValidationError({"messages": ["ParticipantAlreadyEnrolled"]})
        new_status, invited_by_staff = _participant_row_for_add_participant(
            coaching=coaching,
            student_id=student_id,
            requesting_user=requesting_user,
        )
        max_cap = coaching.modality.max_capacity
        if max_cap is not None:
            active = _active_participant_count(coaching_class=coaching)
            old_contrib = (
                1 if _participant_status_counts_toward_capacity(existing.status) else 0
            )
            new_contrib = (
                1 if _participant_status_counts_toward_capacity(new_status) else 0
            )
            projected = active - old_contrib + new_contrib
            if projected > max_cap:
                raise ValidationError(
                    {"messages": ["CoachingParticipantCapacityReached"]}
                )

        existing.status = new_status
        existing.invited_by_staff = invited_by_staff
        existing.cancelled_at = None
        existing.cancellation_reason = ""
        existing.updated_by = requesting_user
        existing.full_clean()
        existing.save()
        logger.info(
            "CoachingParticipant student=%s revived on coaching=%s by user=%s",
            student_id,
            coaching_class_id,
            requesting_user.id,
        )
        return CoachingParticipant.objects.select_related("student").get(pk=existing.pk)

    max_cap = coaching.modality.max_capacity
    if max_cap is not None:
        if _active_participant_count(coaching_class=coaching) >= max_cap:
            raise ValidationError({"messages": ["CoachingParticipantCapacityReached"]})

    if _student_has_active_enrollment(coaching_class=coaching, student_id=student_id):
        raise ValidationError({"messages": ["ParticipantAlreadyEnrolled"]})

    row_status, invited_by_staff = _participant_row_for_add_participant(
        coaching=coaching,
        student_id=student_id,
        requesting_user=requesting_user,
    )
    participant = CoachingParticipant(
        coaching_class=coaching,
        student_id=student_id,
        status=row_status,
        invited_by_staff=invited_by_staff,
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


@transaction.atomic
def student_accept_coaching_invitation(*, coaching_class_id, user):
    """
    Invited participant confirms attendance.

    Staff-invited rows: INVITED → ACTIVE. Legacy / peer invites: INVITED → PENDING.
    """
    try:
        coaching = (
            CoachingClass.objects.select_for_update()
            .select_related("modality")
            .get(pk=coaching_class_id)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()

    if coaching.status in (
        CoachingStatus.COMPLETED,
        CoachingStatus.CANCELLED,
        CoachingStatus.REJECTED,
    ):
        raise ValidationError({"messages": ["CoachingNotOpenForParticipants"]})

    try:
        participant = CoachingParticipant.objects.select_for_update().get(
            coaching_class_id=coaching_class_id,
            student_id=user.id,
        )
    except CoachingParticipant.DoesNotExist:
        raise AppNotFound("ParticipantNotFound")

    if participant.status != CoachingParticipantStatus.INVITED:
        raise ValidationError({"messages": ["ParticipantNotInvited"]})

    if participant.invited_by_staff:
        participant.status = CoachingParticipantStatus.ACTIVE
    else:
        participant.status = CoachingParticipantStatus.PENDING
    participant.updated_by = user
    participant.full_clean()
    participant.save()

    logger.info(
        "Coaching invite accepted student=%s coaching=%s",
        user.id,
        coaching_class_id,
    )
    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)


@transaction.atomic
def staff_approve_pending_participant(
    *, coaching_class_id, participant_pk, approving_user
):
    """
    Coordination/direction approves a peer-invited participant on an already-scheduled
    coaching (pending → active).
    """
    try:
        coaching = CoachingClass.objects.select_for_update().get(pk=coaching_class_id)
    except CoachingClass.DoesNotExist:
        raise AppNotFound("CoachingNotFound")

    if coaching.status != CoachingStatus.SCHEDULED:
        raise ValidationError(
            {"messages": ["CoachingNotEligibleForParticipantApproval"]}
        )

    try:
        participant = CoachingParticipant.objects.select_for_update().get(
            pk=participant_pk,
            coaching_class_id=coaching_class_id,
        )
    except CoachingParticipant.DoesNotExist:
        raise AppNotFound("ParticipantNotFound")

    if participant.status != CoachingParticipantStatus.PENDING:
        raise ValidationError({"messages": ["ParticipantNotPendingApproval"]})

    participant.status = CoachingParticipantStatus.ACTIVE
    participant.updated_by = approving_user
    participant.full_clean()
    participant.save()

    logger.info(
        "CoachingParticipant staff-approved pending participant=%s coaching=%s user=%s",
        participant_pk,
        coaching_class_id,
        approving_user.id,
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
def cancel_coaching_participant(
    *,
    coaching_class_id,
    participant_pk,
    requesting_user,
    cancellation_reason="",
    may_cancel_on_behalf_of_others=False,
):
    """
    Cancel a participant enrolment. Students may only cancel their own row unless
    may_cancel_on_behalf_of_others (coordination with change permission).
    """
    try:
        coaching = (
            CoachingClass.objects.select_for_update()
            .select_related("modality")
            .get(pk=coaching_class_id)
        )
    except CoachingClass.DoesNotExist:
        raise NotFound()

    try:
        participant = CoachingParticipant.objects.select_for_update().get(
            pk=participant_pk,
            coaching_class_id=coaching_class_id,
        )
    except CoachingParticipant.DoesNotExist:
        raise AppNotFound("ParticipantNotFound")

    if not may_cancel_on_behalf_of_others:
        if participant.student_id != requesting_user.id:
            raise ValidationError(
                {"messages": ["CannotCancelAnotherParticipantsRegistration"]}
            )

    if participant.status in _PARTICIPANT_STATUSES_BLOCKING_CANCEL:
        raise ValidationError({"messages": ["ParticipantEnrollmentIsTerminal"]})

    now = timezone.now()
    if coaching.status in _COACHING_STATUSES_BLOCKING_PARTICIPANT_CANCEL:
        raise ValidationError(
            {"messages": ["CoachingNotEligibleForParticipantCancellation"]}
        )
    if now >= coaching.end_datetime:
        raise ValidationError(
            {"messages": ["CoachingNotEligibleForParticipantCancellation"]}
        )
    if now >= coaching.start_datetime:
        raise ValidationError(
            {"messages": ["CoachingNotEligibleForParticipantCancellation"]}
        )

    time_until_start = coaching.start_datetime - now
    if time_until_start > _participant_cancel_min_notice():
        new_status = CoachingParticipantStatus.CANCELLED
    else:
        new_status = CoachingParticipantStatus.LATE_CANCELLED

    participant.status = new_status
    participant.cancelled_at = now
    participant.cancellation_reason = cancellation_reason
    participant.updated_by = requesting_user
    participant.full_clean()
    participant.save()

    logger.info(
        "CoachingParticipant %s cancelled status=%s by user=%s",
        participant_pk,
        new_status,
        requesting_user.id,
    )

    _enqueue_participant_cancel_side_effects(
        participant_id=participant.pk,
        coaching_class_id=coaching.pk,
        teacher_id=coaching.teacher_id,
        is_late_cancelled=(new_status == CoachingParticipantStatus.LATE_CANCELLED),
    )

    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)
