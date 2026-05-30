import calendar
import logging
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.services import (
    assert_user_can_participate_in_coaching,
    assert_user_ids_can_participate_in_coaching,
    get_teacher_user_by_pk,
    get_user_by_pk,
)
from core.exceptions import AppNotFound
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingParticipantStatus,
    CoachingStatus,
    RecurringCoaching,
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


def _student_ids_for_modality_roster(*, modality_id):
    """
    Students with approved enrollment for ``modality_id`` and coaching participation permission.
    """
    from django.contrib.auth import get_user_model
    from enrollments.models import Enrollment, EnrollmentStatus

    User = get_user_model()
    ct = ContentType.objects.get_for_model(User)
    perm = Permission.objects.filter(
        codename="can_participate_in_coaching",
        content_type=ct,
    ).first()
    raw_ids = (
        Enrollment.objects.filter(
            status=EnrollmentStatus.APPROVED,
            student_id__isnull=False,
            enrollment_modalities__modality_id=modality_id,
            enrollment_modalities__deleted_at__isnull=True,
        )
        .values_list("student_id", flat=True)
        .distinct()
    )
    if not raw_ids:
        return []
    qs = User.objects.filter(pk__in=list(raw_ids)).distinct()
    if perm is not None:
        qs = qs.filter(
            models.Q(user_permissions=perm) | models.Q(groups__permissions=perm)
        ).distinct()
    return list(qs.values_list("pk", flat=True))


def _bulk_roster_direct_coordination(
    *,
    coaching,
    auto_confirm_participants,
    created_by,
    classe_id=None,
    participant_ids=None,
):
    """
    Fill roster from classe members and/or explicit participant IDs.

    When both ``classe_id`` and ``participant_ids`` are provided the two sets are merged
    and deduplicated — the frontend may send participants from the classe roster alongside
    individually added students.

    Falls back to modality-wide enrollment roster only when neither source is given.

    Validates every row before inserting any (no partial roster). All inserts run in the
    caller’s transaction — :func:`create_direct_coordination_coaching` is ``atomic``; any
    failure rolls back the coaching, recurrence row, and participants.
    """
    has_classe = classe_id is not None
    has_explicit = participant_ids is not None and len(participant_ids) > 0

    if has_classe or has_explicit:
        student_ids = set()

        if has_classe:
            from classes.services import get_student_ids_for_classe

            classe_student_ids = get_student_ids_for_classe(classe_id=classe_id)
            if not classe_student_ids and not has_explicit:
                raise ValidationError({"messages": ["ClasseHasNoMembers"]})
            student_ids.update(classe_student_ids)

        if has_explicit:
            student_ids.update(participant_ids)

        student_ids = list(student_ids)
    else:
        student_ids = _student_ids_for_modality_roster(modality_id=coaching.modality_id)
    max_cap = coaching.modality.max_capacity
    if max_cap is not None and len(student_ids) > max_cap:
        raise ValidationError({"messages": ["CoachingParticipantCapacityReached"]})

    assert_user_ids_can_participate_in_coaching(user_ids=student_ids)

    row_status = (
        CoachingParticipantStatus.ACTIVE
        if auto_confirm_participants
        else CoachingParticipantStatus.INVITED
    )
    invited_by_staff = True

    pending = []
    for student_id in student_ids:
        participant = CoachingParticipant(
            coaching_class=coaching,
            student_id=student_id,
            status=row_status,
            invited_by_staff=invited_by_staff,
            created_by=created_by,
        )
        try:
            participant.full_clean()
        except DjangoValidationError as exc:
            logger.warning(
                "Bulk roster model validation failed coaching=%s student_id=%s detail=%s",
                coaching.pk,
                student_id,
                getattr(exc, "error_dict", None) or exc,
            )
            raise ValidationError(
                {
                    "messages": ["BulkRosterParticipantInvalid"],
                    "student_id": ["BulkRosterParticipantInvalid"],
                }
            ) from exc
        pending.append(participant)

    try:
        CoachingParticipant.objects.bulk_create(pending)
    except IntegrityError as exc:
        logger.warning(
            "Bulk roster integrity failure coaching=%s",
            coaching.pk,
        )
        raise ValidationError(
            {
                "messages": ["ParticipantAlreadyEnrolled"],
                "student_id": ["ParticipantAlreadyEnrolled"],
            }
        ) from exc


def _invite_explicit_participants_to_request(
    *,
    coaching,
    requesting_user,
    participant_ids,
    actual_student,
):
    """
    Invite a list of arbitrary students to a student-requested coaching.

    Mirrors the INVITED + ``invited_by_staff=False`` shape used by
    :func:`_bulk_roster_coaching_request` so invitees must each accept.

    Skips the actual student and anyone already rostered (e.g. via classe_id),
    enforces the modality capacity across the *union* of all participants,
    and surfaces validation errors with stable PascalCase i18n keys.
    """
    already_rostered = set(
        CoachingParticipant.objects.filter(coaching_class=coaching).values_list(
            "student_id", flat=True
        )
    )
    target_ids = []
    seen = set()
    for sid in participant_ids:
        if sid in seen:
            continue
        seen.add(sid)
        if sid == actual_student.pk:
            continue
        if sid in already_rostered:
            continue
        target_ids.append(sid)

    if not target_ids:
        return

    max_cap = coaching.modality.max_capacity
    if max_cap is not None:
        total = len(already_rostered) + len(target_ids)
        if total > max_cap:
            raise ValidationError(
                {"messages": ["CoachingParticipantCapacityReached"]}
            )

    assert_user_ids_can_participate_in_coaching(user_ids=target_ids)

    pending = []
    for sid in target_ids:
        participant = CoachingParticipant(
            coaching_class=coaching,
            student_id=sid,
            status=CoachingParticipantStatus.INVITED,
            invited_by_staff=False,
            created_by=requesting_user,
        )
        try:
            participant.full_clean()
        except DjangoValidationError as exc:
            logger.warning(
                "Explicit invite model validation failed coaching=%s student_id=%s detail=%s",
                coaching.pk,
                sid,
                getattr(exc, "error_dict", None) or exc,
            )
            raise ValidationError(
                {
                    "messages": ["BulkRosterParticipantInvalid"],
                    "student_id": ["BulkRosterParticipantInvalid"],
                }
            ) from exc
        pending.append(participant)

    for participant in pending:
        try:
            participant.save()
        except IntegrityError as exc:
            logger.warning(
                "Explicit invite integrity failure coaching=%s student_id=%s",
                coaching.pk,
                participant.student_id,
            )
            raise ValidationError(
                {
                    "messages": ["ParticipantAlreadyEnrolled"],
                    "student_id": ["ParticipantAlreadyEnrolled"],
                }
            ) from exc


def _bulk_roster_coaching_request(*, coaching, requesting_user, classe_id):
    """
    Fill roster for a student-requested coaching from a classe's members.

    The requesting user is intentionally skipped here — they are added separately
    by :func:`create_coaching_request` via :func:`add_participant` (which gives them
    ``PENDING`` status). All remaining class members are added as ``INVITED`` with
    ``invited_by_staff=False`` so that each invited student must individually accept.

    Runs inside the caller's ``atomic`` block; any failure rolls back the whole request.
    """
    from classes.services import get_student_ids_for_classe

    student_ids = get_student_ids_for_classe(classe_id=classe_id)
    if not student_ids:
        raise ValidationError({"messages": ["ClasseHasNoMembers"]})

    max_cap = coaching.modality.max_capacity
    if max_cap is not None and len(student_ids) > max_cap:
        raise ValidationError({"messages": ["CoachingParticipantCapacityReached"]})

    assert_user_ids_can_participate_in_coaching(user_ids=student_ids)

    pending = []
    for student_id in student_ids:
        # The requesting user will be added as PENDING by the caller — skip here to avoid
        # a duplicate row and let the existing add_participant call handle their status.
        if student_id == requesting_user.pk:
            continue
        participant = CoachingParticipant(
            coaching_class=coaching,
            student_id=student_id,
            status=CoachingParticipantStatus.INVITED,
            invited_by_staff=False,
            created_by=requesting_user,
        )
        try:
            participant.full_clean()
        except DjangoValidationError as exc:
            logger.warning(
                "Bulk request roster model validation failed coaching=%s student_id=%s detail=%s",
                coaching.pk,
                student_id,
                getattr(exc, "error_dict", None) or exc,
            )
            raise ValidationError(
                {
                    "messages": ["BulkRosterParticipantInvalid"],
                    "student_id": ["BulkRosterParticipantInvalid"],
                }
            ) from exc
        pending.append(participant)

    for participant in pending:
        try:
            participant.save()
        except IntegrityError as exc:
            logger.warning(
                "Bulk request roster integrity failure coaching=%s student_id=%s",
                coaching.pk,
                participant.student_id,
            )
            raise ValidationError(
                {
                    "messages": ["ParticipantAlreadyEnrolled"],
                    "student_id": ["ParticipantAlreadyEnrolled"],
                }
            ) from exc


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
    is_self_request = (
        coaching.requested_by_id is not None
        and student_id == coaching.requested_by_id
        and requesting_user.pk == student_id
    )
    if is_self_request:
        return CoachingParticipantStatus.PENDING, False

    # Parent adding their child as part of the coaching they requested.
    if (
        coaching.requested_by_id is not None
        and coaching.requested_by_id == requesting_user.pk
        and student_id != requesting_user.pk
    ):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            student_obj = User.objects.get(pk=student_id)
            if student_obj.parent_id == requesting_user.pk:
                return CoachingParticipantStatus.PENDING, False
        except User.DoesNotExist:
            pass

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
    from django.db.models import Count

    return (
        CoachingClass.objects.select_related(
            "teacher",
            "modality",
            "studio",
            "requested_by",
            "teacher_confirmed_by",
            "recurring_coaching",
            "classe",
        )
        .prefetch_related("participants__student")
        .annotate(
            _recurring_sessions_count=Count(
                "recurring_coaching__sessions",
                distinct=True,
                filter=models.Q(
                    recurring_coaching__sessions__deleted_at__isnull=True,
                ),
            ),
        )
    )


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


def _assert_studio_modality_compatible(*, studio, modality):
    if not StudioModality.objects.filter(
        studio=studio,
        modality=modality,
    ).exists():
        raise ValidationError({"messages": ["StudioModalityIncompatible"]})


def _find_scheduled_conflicts(
    *,
    teacher_id,
    studio_id,
    start_datetime,
    end_datetime,
    exclude_pk=None,
):
    """Return overlapping SCHEDULED coachings for the teacher and studio."""
    teacher_conflicts = []
    if teacher_id is not None:
        teacher_qs = CoachingClass.objects.filter(
            teacher_id=teacher_id,
            status=CoachingStatus.SCHEDULED,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        )
        if exclude_pk:
            teacher_qs = teacher_qs.exclude(pk=exclude_pk)
        teacher_conflicts = list(teacher_qs.select_related("modality"))

    studio_conflicts = []
    if studio_id is not None:
        studio_qs = CoachingClass.objects.filter(
            studio_id=studio_id,
            status=CoachingStatus.SCHEDULED,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        )
        if exclude_pk:
            studio_qs = studio_qs.exclude(pk=exclude_pk)
        studio_conflicts = list(studio_qs.select_related("modality"))

    return teacher_conflicts, studio_conflicts


def _assert_no_scheduled_conflict(
    *,
    teacher_id,
    studio_id,
    start_datetime,
    end_datetime,
    exclude_pk=None,
):
    teacher_conflicts, studio_conflicts = _find_scheduled_conflicts(
        teacher_id=teacher_id,
        studio_id=studio_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        exclude_pk=exclude_pk,
    )
    if teacher_conflicts:
        raise ValidationError({"messages": ["TeacherScheduleConflict"]})
    if studio_conflicts:
        raise ValidationError({"messages": ["StudioScheduleConflict"]})


def _ensure_scheduled_slot_free(
    *,
    teacher_id,
    studio_id,
    start_datetime,
    end_datetime,
    exclude_pk=None,
):
    # Lock the teacher and studio rows first so concurrent requests for the same
    # teacher/studio are serialized even when no conflicting coachings exist yet.
    # Without this, SELECT FOR UPDATE on an empty result set locks nothing (TOCTOU).
    from django.contrib.auth import get_user_model

    User = get_user_model()
    User.objects.select_for_update().filter(pk=teacher_id).first()
    if studio_id is not None:
        from studios.models import Studio as _Studio

        _Studio.objects.select_for_update().filter(pk=studio_id).first()

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


def check_coaching_availability(
    *,
    teacher_id,
    studio_id=None,
    date_from,
    date_to,
    exclude_coaching_id=None,
):
    """Return SCHEDULED coachings blocking the teacher and studio within a window.

    Used by the form-side availability preview before submitting a coaching.
    Mirrors the conflict detection used at create/approve/update time, but returns
    the busy slots instead of raising. Caller is expected to redact at the
    serializer boundary.
    """
    if date_from is None or date_to is None or date_from >= date_to:
        raise ValidationError({"messages": ["InvalidDateRange"]})

    teacher_busy = []
    if teacher_id is not None:
        teacher_qs = (
            CoachingClass.objects.filter(
                teacher_id=teacher_id,
                status=CoachingStatus.SCHEDULED,
                start_datetime__lt=date_to,
                end_datetime__gt=date_from,
            )
            .select_related("modality")
            .order_by("start_datetime")
        )
        if exclude_coaching_id:
            teacher_qs = teacher_qs.exclude(pk=exclude_coaching_id)
        teacher_busy = list(teacher_qs)

    studio_busy = []
    if studio_id is not None:
        studio_qs = (
            CoachingClass.objects.filter(
                studio_id=studio_id,
                status=CoachingStatus.SCHEDULED,
                start_datetime__lt=date_to,
                end_datetime__gt=date_from,
            )
            .select_related("modality")
            .order_by("start_datetime")
        )
        if exclude_coaching_id:
            studio_qs = studio_qs.exclude(pk=exclude_coaching_id)
        studio_busy = list(studio_qs)

    return {
        "teacher_busy": teacher_busy,
        "studio_busy": studio_busy,
    }


_WEEKDAY_CODES = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}
MAX_RECURRING_SESSIONS = 200
_DEFAULT_RECURRING_HORIZON_DAYS = 365


def _parse_days_of_week(days_of_week_str):
    if not days_of_week_str or not days_of_week_str.strip():
        return []
    codes = [c.strip().upper() for c in days_of_week_str.split(",") if c.strip()]
    result = []
    for code in codes:
        if code not in _WEEKDAY_CODES:
            raise ValidationError(
                {"messages": ["InvalidDayOfWeek"], "days_of_week": [f"Unknown: {code}"]}
            )
        result.append(_WEEKDAY_CODES[code])
    return sorted(set(result))


def _generate_recurrence_dates(
    *,
    anchor_start,
    anchor_end,
    recurrence_type,
    recurrence_interval,
    days_of_week_str,
    end_date,
    occurrences_count,
):
    """
    Compute (start, end) datetime pairs for all occurrences AFTER the anchor.
    The anchor itself counts as occurrence #1.
    """
    duration = anchor_end - anchor_start
    max_sessions = occurrences_count or MAX_RECURRING_SESSIONS
    max_sessions = min(max_sessions, MAX_RECURRING_SESSIONS)

    horizon = end_date
    if horizon is None:
        horizon = (
            anchor_start + timedelta(days=_DEFAULT_RECURRING_HORIZON_DAYS)
        ).date()

    dates = []
    count = 1  # anchor = 1

    if recurrence_type == "daily":
        current = anchor_start
        while count < max_sessions:
            current = current + timedelta(days=recurrence_interval)
            if current.date() > horizon:
                break
            dates.append((current, current + duration))
            count += 1

    elif recurrence_type in ("weekly", "biweekly"):
        week_multiplier = 2 if recurrence_type == "biweekly" else 1
        week_step = timedelta(weeks=recurrence_interval * week_multiplier)

        target_days = _parse_days_of_week(days_of_week_str)
        if not target_days:
            target_days = [anchor_start.weekday()]

        anchor_date = anchor_start.date()
        anchor_weekday = anchor_start.weekday()
        week_start = anchor_date - timedelta(days=anchor_weekday)

        current_week = week_start
        first_week = True

        while count < max_sessions:
            for day_num in target_days:
                session_date = current_week + timedelta(days=day_num)
                if first_week and session_date <= anchor_date:
                    continue
                if session_date > horizon:
                    return dates
                session_start = anchor_start.replace(
                    year=session_date.year,
                    month=session_date.month,
                    day=session_date.day,
                )
                dates.append((session_start, session_start + duration))
                count += 1
                if count >= max_sessions:
                    return dates

            first_week = False
            current_week += week_step

    elif recurrence_type == "monthly":
        anchor_day = anchor_start.day
        current_year = anchor_start.year
        current_month = anchor_start.month

        while count < max_sessions:
            current_month += recurrence_interval
            while current_month > 12:
                current_month -= 12
                current_year += 1

            max_day = calendar.monthrange(current_year, current_month)[1]
            day = min(anchor_day, max_day)

            session_start = anchor_start.replace(
                year=current_year, month=current_month, day=day
            )
            if session_start.date() > horizon:
                break
            dates.append((session_start, session_start + duration))
            count += 1

    return dates


def get_coaching(*, pk):
    try:
        return _coaching_detail_queryset().get(pk=pk)
    except CoachingClass.DoesNotExist:
        raise AppNotFound("CoachingNotFound")


def get_coaching_for_update(*, pk):
    try:
        return (
            CoachingClass.objects.select_for_update(of=("self",))
            .select_related("teacher", "modality", "studio", "requested_by")
            .get(pk=pk)
        )
    except CoachingClass.DoesNotExist:
        raise AppNotFound("CoachingNotFound")


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
        raise AppNotFound("CoachingNotFound")

    if coaching.status not in _EDITABLE_COACHING_STATUSES:
        raise ValidationError({"messages": ["CoachingNotEditable"]})

    if not allow_teacher_change and "teacher_id" in updates:
        raise ValidationError({"messages": ["TeacherIdNotEditable"]})

    if "is_billable" in updates:
        if coaching.requested_by_id is not None:
            raise ValidationError({"messages": ["IsBillableCoordinationCoachingOnly"]})
        if not allow_teacher_change:
            raise ValidationError({"messages": ["IsBillableStaffOnly"]})

    new_start = updates.get("start_datetime", coaching.start_datetime)
    new_end = updates.get("end_datetime", coaching.end_datetime)
    _validate_datetime_range(start=new_start, end=new_end)

    effective_modality = coaching.modality
    if "modality_id" in updates:
        try:
            effective_modality = Modality.objects.get(pk=updates["modality_id"])
        except Modality.DoesNotExist:
            raise AppNotFound("ModalityNotFound")

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
    modality_id=None,
    requested_by_id=None,
    participant_id=None,
    for_me_user_id=None,
    for_me_roles=None,
    recurring_coaching_id=None,
    date_from=None,
    date_to=None,
):
    qs = _coaching_detail_queryset()
    if teacher_id:
        qs = qs.filter(teacher_id__in=teacher_id)
    if status:
        qs = qs.filter(status__in=status)
    if studio_id:
        qs = qs.filter(studio_id__in=studio_id)
    if modality_id:
        qs = qs.filter(modality_id__in=modality_id)
    if requested_by_id is not None:
        qs = qs.filter(requested_by_id=requested_by_id)
    if participant_id is not None:
        qs = qs.filter(
            participants__student_id=participant_id,
            participants__deleted_at__isnull=True,
        )
    if for_me_user_id is not None and for_me_roles:
        roles = set(for_me_roles)
        q = models.Q()
        if "requester" in roles:
            q |= models.Q(requested_by_id=for_me_user_id)
        if "teacher" in roles:
            q |= models.Q(teacher_id=for_me_user_id)
        if "participant" in roles:
            q |= models.Q(
                participants__student_id=for_me_user_id,
                participants__deleted_at__isnull=True,
            )
        if "dependent" in roles:
            q |= models.Q(
                participants__student__parent_id=for_me_user_id,
                participants__deleted_at__isnull=True,
            )
        qs = qs.filter(q).distinct()
    if recurring_coaching_id is not None:
        qs = qs.filter(recurring_coaching_id=recurring_coaching_id)
    if date_from is not None:
        qs = qs.filter(end_datetime__gte=date_from)
    if date_to is not None:
        qs = qs.filter(start_datetime__lte=date_to)
    # Default to most-recent-first so list pages (My Coachings, Review
    # Requests, calendar feeds) open with the freshest items at the top.
    # Tied dates get a stable secondary order by id.
    return qs.order_by("-start_datetime", "-id")


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
    classe_id=None,
    student=None,
    participant_ids=None,
):
    actual_student = student or requesting_user

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
    else:
        teacher_qs = CoachingClass.objects.filter(
            teacher_id=teacher_id,
            status=CoachingStatus.SCHEDULED,
            start_datetime__lt=end_datetime,
            end_datetime__gt=start_datetime,
        )
        if teacher_qs.exists():
            raise ValidationError({"messages": ["TeacherScheduleConflict"]})

    classe_row = None
    if classe_id is not None:
        from classes.models import Classe

        try:
            classe_row = Classe.objects.get(pk=classe_id)
        except Classe.DoesNotExist:
            raise AppNotFound("ClasseNotFound")

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
        classe=classe_row,
    )
    coaching.full_clean()
    coaching.save()
    logger.info(
        "CoachingClass requested by user=%s student=%s teacher=%s classe=%s",
        requesting_user.id,
        actual_student.id,
        teacher_id,
        classe_id,
    )

    # Add the actual student (child or self) as PENDING participant.
    if actual_student.has_perm("accounts.can_participate_in_coaching"):
        add_participant(
            coaching_class_id=coaching.pk,
            student_id=actual_student.pk,
            requesting_user=requesting_user,
        )

    if classe_id is not None:
        _bulk_roster_coaching_request(
            coaching=coaching,
            requesting_user=requesting_user,
            classe_id=classe_id,
        )

    if participant_ids:
        _invite_explicit_participants_to_request(
            coaching=coaching,
            requesting_user=requesting_user,
            participant_ids=participant_ids,
            actual_student=actual_student,
        )

    from messaging.services import get_or_create_coaching_conversation

    get_or_create_coaching_conversation(coaching=coaching, created_by=requesting_user)

    from coachings.tasks import notify_new_coaching_request

    transaction.on_commit(
        lambda cid=coaching.pk: notify_new_coaching_request.delay(cid)
    )

    return coaching


@transaction.atomic
def create_direct_coordination_coaching(
    *,
    teacher_id,
    modality_id,
    studio_id,
    total_price,
    start_datetime,
    end_datetime,
    requesting_user,
    notes="",
    schedule=True,
    auto_confirm_participants=True,
    recurring_data=None,
    classe_id=None,
    is_billable=True,
    participant_ids=None,
):
    """
    Create a coordination-scheduled coaching and roster in one transaction.

    Slot checks, recurrence row, coaching row, and bulk roster inserts succeed together or
    all roll back. Bulk roster errors use ``BulkRosterParticipantInvalid`` or
    ``ParticipantAlreadyEnrolled`` (with optional ``student_id`` field codes).
    """
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

    classe_row = None
    if classe_id is not None:
        from classes.models import Classe

        try:
            classe_row = Classe.objects.get(pk=classe_id)
        except Classe.DoesNotExist:
            raise AppNotFound("ClasseNotFound")

    _assert_studio_modality_compatible(studio=studio, modality=modality)

    _ensure_scheduled_slot_free(
        teacher_id=teacher_id,
        studio_id=studio_id,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
    )

    recurring_row = None
    if recurring_data:
        rd = recurring_data
        recurring_row = RecurringCoaching(
            recurrence_type=rd["recurrence_type"],
            recurrence_interval=rd.get("recurrence_interval", 1),
            days_of_week=rd.get("days_of_week", ""),
            end_date=rd.get("end_date"),
            occurrences_count=rd.get("occurrences_count"),
            notes=rd.get("notes", ""),
            created_by=requesting_user,
        )
        try:
            recurring_row.full_clean()
        except DjangoValidationError as exc:
            error_dict = getattr(exc, "message_dict", {})
            messages = []
            for field_errors in error_dict.values():
                messages.extend(field_errors)
            raise ValidationError({"messages": messages}) from exc
        recurring_row.save()

    coaching_status = CoachingStatus.SCHEDULED if schedule else CoachingStatus.REQUESTED

    coaching = CoachingClass(
        teacher_id=teacher_id,
        modality=modality,
        studio=studio,
        total_price=total_price,
        start_datetime=start_datetime,
        end_datetime=end_datetime,
        notes=notes,
        status=coaching_status,
        created_by=requesting_user,
        recurring_coaching=recurring_row,
        classe=classe_row,
        is_billable=is_billable,
    )
    coaching.full_clean()
    coaching.save()

    _bulk_roster_direct_coordination(
        coaching=coaching,
        auto_confirm_participants=auto_confirm_participants,
        created_by=requesting_user,
        classe_id=classe_id,
        participant_ids=participant_ids,
    )

    if recurring_row:
        rd = recurring_data
        occurrence_dates = _generate_recurrence_dates(
            anchor_start=start_datetime,
            anchor_end=end_datetime,
            recurrence_type=rd["recurrence_type"],
            recurrence_interval=rd.get("recurrence_interval", 1),
            days_of_week_str=rd.get("days_of_week", ""),
            end_date=rd.get("end_date"),
            occurrences_count=rd.get("occurrences_count"),
        )

        if schedule:
            for occ_start, occ_end in occurrence_dates:
                _ensure_scheduled_slot_free(
                    teacher_id=teacher_id,
                    studio_id=studio_id,
                    start_datetime=occ_start,
                    end_datetime=occ_end,
                )

        for occ_start, occ_end in occurrence_dates:
            session = CoachingClass(
                teacher_id=teacher_id,
                modality=modality,
                studio=studio,
                total_price=total_price,
                start_datetime=occ_start,
                end_datetime=occ_end,
                notes=notes,
                status=coaching_status,
                created_by=requesting_user,
                recurring_coaching=recurring_row,
                classe=classe_row,
                is_billable=is_billable,
            )
            session.full_clean()
            session.save()

            _bulk_roster_direct_coordination(
                coaching=session,
                auto_confirm_participants=auto_confirm_participants,
                created_by=requesting_user,
                classe_id=classe_id,
                participant_ids=participant_ids,
            )

        logger.info(
            "Recurring series: %d additional session(s) generated for recurring_coaching=%s",
            len(occurrence_dates),
            recurring_row.pk,
        )

    from messaging.services import get_or_create_coaching_conversation

    get_or_create_coaching_conversation(coaching=coaching, created_by=requesting_user)

    logger.info(
        "CoachingClass direct coordination create user=%s teacher=%s schedule=%s auto_confirm=%s recurring=%s",
        requesting_user.id,
        teacher_id,
        schedule,
        auto_confirm_participants,
        bool(recurring_row),
    )

    from coachings.tasks import notify_coordination_coaching_created

    transaction.on_commit(
        lambda cid=coaching.pk: notify_coordination_coaching_created.delay(cid)
    )

    return coaching


@transaction.atomic
def teacher_accept_coaching(*, pk, user):
    """
    Teacher accepts the coaching request — updates coaching status only.
    Participant rows are unchanged (roster updates happen on coordination approve).
    """
    # Lock the coaching row to prevent concurrent status transitions (race condition guard).
    coaching = CoachingClass.objects.select_for_update().get(pk=pk)
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
    coaching.rejected_at = timezone.now()
    coaching.updated_by = user
    coaching.full_clean()
    coaching.save()
    logger.info("CoachingClass %s rejected by teacher=%s", coaching.pk, user.id)
    return coaching


@transaction.atomic
def reject_coaching_coordination(*, user, rejection_reason="", pk=None, coaching=None):
    coaching = _resolve_coaching_from_pk_or_instance(pk=pk, coaching=coaching)
    _validate_status_transition(coaching, CoachingStatus.REJECTED)
    coaching.status = CoachingStatus.REJECTED
    coaching.rejection_reason = rejection_reason
    coaching.rejected_at = timezone.now()
    coaching.updated_by = user
    coaching.full_clean()
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
        raise AppNotFound("CoachingNotFound")

    _validate_status_transition(coaching, CoachingStatus.SCHEDULED)

    try:
        studio = Studio.objects.get(pk=studio_id)
    except Studio.DoesNotExist:
        raise AppNotFound("StudioNotFound")

    _assert_studio_modality_compatible(studio=studio, modality=coaching.modality)
    _ensure_scheduled_slot_free(
        teacher_id=coaching.teacher_id,
        studio_id=studio_id,
        start_datetime=coaching.start_datetime,
        end_datetime=coaching.end_datetime,
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

    max_cap = coaching.modality.max_capacity if coaching.modality_id else None
    if max_cap is not None:
        active_count = _active_participant_count(coaching_class=coaching)
        pending_count = pending_participants.count()
        if active_count + pending_count > max_cap:
            raise ValidationError({"messages": ["CoachingParticipantCapacityReached"]})

    pending_participants.update(
        status=CoachingParticipantStatus.ACTIVE,
        updated_by=user,
    )

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
        raise AppNotFound("CoachingNotFound")
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

    from coachings.tasks import notify_coaching_completed

    transaction.on_commit(lambda cid=coaching.pk: notify_coaching_completed.delay(cid))

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

            CoachingParticipant.objects.filter(
                coaching_class_id=pk,
                status=CoachingParticipantStatus.ACTIVE,
            ).update(
                status=CoachingParticipantStatus.PENDING_COMPLETION,
                updated_by=updated_by,
            )

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
        raise AppNotFound("CoachingNotFound")

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

    if participant.status not in (
        CoachingParticipantStatus.ACTIVE,
        CoachingParticipantStatus.PENDING_COMPLETION,
    ):
        raise ValidationError(
            {"messages": ["ParticipantNotEligibleForAttendanceConfirmation"]}
        )

    student = participant.student
    actor_ok = user.id == student.id or (
        student.parent_id is not None and user.id == student.parent_id
    )
    if not actor_ok:
        # Staff override: users with this permission may confirm on behalf of any participant.
        if not user.has_perm("coachings.can_confirm_dependent_coaching_attendance"):
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


_PARTICIPANT_STATUSES_CANCELLABLE_BY_COACHING = frozenset(
    {
        CoachingParticipantStatus.ACTIVE,
        CoachingParticipantStatus.PENDING,
        CoachingParticipantStatus.INVITED,
        CoachingParticipantStatus.PENDING_COMPLETION,
    }
)


@transaction.atomic
def cancel_coaching(*, pk, user, cancellation_reason=""):
    # Lock the coaching row to prevent concurrent status transitions (race condition guard).
    coaching = CoachingClass.objects.select_for_update().get(pk=pk)
    _validate_status_transition(coaching, CoachingStatus.CANCELLED)
    coaching.status = CoachingStatus.CANCELLED
    coaching.cancellation_reason = cancellation_reason
    coaching.cancelled_at = timezone.now()
    coaching.updated_by = user
    coaching.full_clean()
    coaching.save()

    now = timezone.now()
    coaching.participants.filter(
        status__in=list(_PARTICIPANT_STATUSES_CANCELLABLE_BY_COACHING)
    ).update(
        status=CoachingParticipantStatus.CANCELLED,
        cancelled_at=now,
        updated_by=user,
    )

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


def _enqueue_participant_cancel_side_effects(
    *,
    participant_id,
    coaching_class_id,
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
    assert_user_can_participate_in_coaching(user=student)

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

    from messaging.services import sync_coaching_conversation_participants

    sync_coaching_conversation_participants(coaching=coaching)

    logger.info(
        "CoachingParticipant student=%s added to coaching=%s by user=%s",
        student_id,
        coaching_class_id,
        requesting_user.id,
    )
    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)


@transaction.atomic
def student_accept_coaching_invitation(*, coaching_class_id, user, student=None):
    """
    Invited participant confirms attendance.

    Staff-invited rows (``invited_by_staff=True``): INVITED → ACTIVE.
    Non-staff invites (``invited_by_staff=False``): INVITED → PENDING (needs staff approval).

    When ``student`` is provided (parent acting on behalf of child), the lookup
    targets the child's participant row. Guardian check is done in the view layer.
    """
    actual_student = student or user

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

    try:
        participant = CoachingParticipant.objects.select_for_update().get(
            coaching_class_id=coaching_class_id,
            student_id=actual_student.id,
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
        raise AppNotFound("CoachingNotFound")
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
        raise AppNotFound("CoachingNotFound")

    try:
        participant = (
            CoachingParticipant.objects.select_for_update()
            .select_related("student")
            .get(pk=participant_pk, coaching_class_id=coaching_class_id)
        )
    except CoachingParticipant.DoesNotExist:
        raise AppNotFound("ParticipantNotFound")

    if not may_cancel_on_behalf_of_others:
        is_self = participant.student_id == requesting_user.id
        is_guardian = (
            participant.student.parent_id is not None
            and participant.student.parent_id == requesting_user.id
        )
        if not is_self and not is_guardian:
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
        is_late_cancelled=(new_status == CoachingParticipantStatus.LATE_CANCELLED),
    )

    return CoachingParticipant.objects.select_related("student").get(pk=participant.pk)


_CANCELLABLE_COACHING_STATUSES = frozenset(
    {
        CoachingStatus.REQUESTED,
        CoachingStatus.PENDING_APPROVAL,
        CoachingStatus.SCHEDULED,
        CoachingStatus.WAITING_CONFIRMATION,
        CoachingStatus.PENDING_COMPLETION_APPROVAL,
    }
)


def cancel_recurring_series(
    *, recurring_coaching_id, user, cancellation_reason="", cancel_past=False
):
    try:
        recurring = RecurringCoaching.objects.get(pk=recurring_coaching_id)
    except RecurringCoaching.DoesNotExist:
        raise AppNotFound("RecurringCoachingNotFound")

    sessions = CoachingClass.objects.filter(
        recurring_coaching_id=recurring.pk,
        status__in=_CANCELLABLE_COACHING_STATUSES,
    )
    if not cancel_past:
        sessions = sessions.filter(start_datetime__gt=timezone.now())

    cancelled_ids = []
    for session_pk in sessions.values_list("pk", flat=True):
        try:
            cancel_coaching(
                pk=session_pk, user=user, cancellation_reason=cancellation_reason
            )
            cancelled_ids.append(session_pk)
        except (ValidationError, AppNotFound):
            logger.warning(
                "cancel_recurring_series: skipped session %s (not cancellable)",
                session_pk,
            )

    logger.info(
        "cancel_recurring_series: cancelled %d session(s) for recurring_coaching=%s by user=%s",
        len(cancelled_ids),
        recurring_coaching_id,
        user.id,
    )
    return cancelled_ids
