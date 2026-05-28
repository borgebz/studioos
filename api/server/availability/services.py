import logging
from datetime import datetime, timedelta, timezone as dt_timezone

from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.services import get_teacher_user_by_pk
from availability.models import RecurringAvailability, TeacherAvailability, Weekday
from core.exceptions import AppNotFound
from modality.models import Modality

logger = logging.getLogger(__name__)

_DEFAULT_RECURRING_HORIZON_DAYS = 365


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_datetime_range(*, start, end):
    if start is None or end is None:
        raise ValidationError({"messages": ["InvalidDateRange"]})
    if start >= end:
        raise ValidationError({"messages": ["InvalidDateRange"]})


def _validate_time_range(*, start_time, end_time):
    if start_time is None or end_time is None:
        raise ValidationError({"messages": ["InvalidTimeRange"]})
    if start_time >= end_time:
        raise ValidationError({"messages": ["InvalidTimeRange"]})


def _validate_validity_range(*, valid_from, valid_until):
    if valid_from is None:
        raise ValidationError({"messages": ["InvalidValidityRange"]})
    if valid_until is not None and valid_until < valid_from:
        raise ValidationError({"messages": ["InvalidValidityRange"]})


def _validate_days_of_week(days_of_week_str):
    valid = {str(c[0]) for c in Weekday.choices}
    parts = [d.strip() for d in days_of_week_str.split(",") if d.strip()]
    if not parts:
        raise ValidationError({"messages": ["AtLeastOneDayRequired"]})
    for d in parts:
        if d not in valid:
            raise ValidationError({"messages": ["InvalidDayOfWeek"]})
    return [int(d) for d in parts]


def _resolve_modality(modality_id):
    if modality_id is None:
        return None
    try:
        return Modality.objects.get(pk=modality_id)
    except Modality.DoesNotExist:
        raise AppNotFound("ModalityNotFound")


def _get_teacher(teacher_id):
    return get_teacher_user_by_pk(pk=teacher_id)


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


# ---------------------------------------------------------------------------
# Slot expansion — turns recurring rules into concrete date/time slots
# ---------------------------------------------------------------------------


def _expand_recurring_slots(*, recurring, availability, date_from, date_to):
    weekdays = recurring.get_weekday_list()
    start_time = recurring.start_time
    end_time = recurring.end_time

    range_start = max(recurring.valid_from, date_from.date())
    if recurring.valid_until is not None:
        range_end = min(recurring.valid_until, date_to.date())
    else:
        range_end = date_to.date()

    if range_start > range_end:
        return []

    slots = []
    current = range_start
    tz = dt_timezone.utc
    while current <= range_end:
        if current.weekday() in weekdays:
            slot_start = datetime.combine(current, start_time, tzinfo=tz)
            slot_end = datetime.combine(current, end_time, tzinfo=tz)
            if slot_start < date_to and slot_end > date_from:
                slots.append(
                    {
                        "id": None,
                        "teacher_id": availability.teacher_id,
                        "modality": availability.modality,
                        "start_datetime": slot_start,
                        "end_datetime": slot_end,
                        "notes": availability.notes,
                        "is_recurring": True,
                        "recurring_id": availability.pk,
                    }
                )
        current += timedelta(days=1)
    return slots


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------


def list_availability(*, teacher_id, date_from, date_to):
    one_time_qs = (
        TeacherAvailability.objects.select_related("modality")
        .filter(teacher_id=teacher_id)
        .filter(
            start_datetime__lt=date_to,
            end_datetime__gt=date_from,
        )
        .filter(
            models.Q(recurring__isnull=True)
            | models.Q(recurring__deleted_at__isnull=False)
        )
    )

    one_time_slots = [
        {
            "id": block.pk,
            "teacher_id": block.teacher_id,
            "modality": block.modality,
            "start_datetime": block.start_datetime,
            "end_datetime": block.end_datetime,
            "notes": block.notes,
            "is_recurring": False,
            "recurring_id": None,
        }
        for block in one_time_qs
    ]

    recurring_qs = (
        TeacherAvailability.objects.select_related("modality", "recurring")
        .filter(teacher_id=teacher_id)
        .filter(recurring__isnull=False, recurring__deleted_at__isnull=True)
        .filter(
            models.Q(recurring__valid_until__isnull=True)
            | models.Q(recurring__valid_until__gte=date_from.date())
        )
        .filter(recurring__valid_from__lte=date_to.date())
    )

    recurring_slots = []
    for block in recurring_qs:
        recurring_slots.extend(
            _expand_recurring_slots(
                recurring=block.recurring,
                availability=block,
                date_from=date_from,
                date_to=date_to,
            )
        )

    all_slots = one_time_slots + recurring_slots
    all_slots.sort(key=lambda s: s["start_datetime"])
    return all_slots


def get_availability(*, teacher_id, pk):
    try:
        block = (
            TeacherAvailability.objects.select_related("modality")
            .prefetch_related("recurring")
            .get(pk=pk, teacher_id=teacher_id)
        )
    except TeacherAvailability.DoesNotExist:
        raise AppNotFound("TeacherAvailabilityNotFound")
    # OneToOneField reverse access bypasses SoftDeleteManager, so check manually.
    try:
        if block.recurring and block.recurring.deleted_at is not None:
            block.recurring = None
    except RecurringAvailability.DoesNotExist:
        pass
    return block


@transaction.atomic
def create_availability(*, teacher_id, requesting_user, **data):
    _get_teacher(teacher_id)

    start = data["start_datetime"]
    end = data["end_datetime"]
    _validate_datetime_range(start=start, end=end)

    modality = _resolve_modality(data.get("modality_id"))
    notes = data.get("notes", "")

    recurring_data = data.get("recurring")

    if not recurring_data:
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

    if recurring_data:
        _create_recurring_rule(
            availability=block,
            recurring_data=recurring_data,
            requesting_user=requesting_user,
        )

    logger.info(
        "TeacherAvailability created pk=%s teacher=%s recurring=%s by user=%s",
        block.pk,
        teacher_id,
        bool(recurring_data),
        requesting_user.id,
    )

    return get_availability(teacher_id=teacher_id, pk=block.pk)


def _create_recurring_rule(*, availability, recurring_data, requesting_user):
    start_time = recurring_data["start_time"]
    end_time = recurring_data["end_time"]
    _validate_time_range(start_time=start_time, end_time=end_time)

    valid_from = recurring_data.get("valid_from") or timezone.now().date()
    valid_until = recurring_data.get("valid_until")
    _validate_validity_range(valid_from=valid_from, valid_until=valid_until)

    days_of_week = recurring_data["days_of_week"]
    _validate_days_of_week(days_of_week)

    rule = RecurringAvailability(
        availability=availability,
        days_of_week=days_of_week,
        start_time=start_time,
        end_time=end_time,
        valid_from=valid_from,
        valid_until=valid_until,
        created_by=requesting_user,
    )
    rule.full_clean()
    rule.save()
    return rule


@transaction.atomic
def update_availability(*, teacher_id, pk, requesting_user, **data):
    _get_teacher(teacher_id)
    block = get_availability(teacher_id=teacher_id, pk=pk)

    modality_id = data.pop("modality_id", "__unset__")
    if modality_id != "__unset__":
        block.modality = _resolve_modality(modality_id)

    if "start_datetime" in data:
        block.start_datetime = data["start_datetime"]
    if "end_datetime" in data:
        block.end_datetime = data["end_datetime"]
    if "notes" in data:
        block.notes = data["notes"]

    _validate_datetime_range(start=block.start_datetime, end=block.end_datetime)

    recurring_data = data.pop("recurring", "__unset__")

    has_recurring = hasattr(block, "recurring") and block.recurring is not None

    if recurring_data == "__unset__":
        # recurring not in payload — don't touch it
        if not has_recurring:
            _check_availability_overlap(
                teacher_id=teacher_id,
                start_datetime=block.start_datetime,
                end_datetime=block.end_datetime,
                exclude_pk=pk,
            )
    elif recurring_data is None:
        # recurring: null — remove recurring rule
        if has_recurring:
            block.recurring.delete(deleted_by=requesting_user)
            logger.info(
                "RecurringAvailability soft-deleted for availability=%s by user=%s",
                pk,
                requesting_user.id,
            )
        _check_availability_overlap(
            teacher_id=teacher_id,
            start_datetime=block.start_datetime,
            end_datetime=block.end_datetime,
            exclude_pk=pk,
        )
    else:
        # recurring: {...} — create or update recurring rule
        if has_recurring:
            _update_recurring_rule(
                rule=block.recurring,
                recurring_data=recurring_data,
                requesting_user=requesting_user,
            )
        else:
            _create_recurring_rule(
                availability=block,
                recurring_data=recurring_data,
                requesting_user=requesting_user,
            )

    block.updated_by = requesting_user
    block.full_clean()
    block.save()

    logger.info("TeacherAvailability %s updated by user=%s", pk, requesting_user.id)
    return get_availability(teacher_id=teacher_id, pk=pk)


def _update_recurring_rule(*, rule, recurring_data, requesting_user):
    if "days_of_week" in recurring_data:
        _validate_days_of_week(recurring_data["days_of_week"])
        rule.days_of_week = recurring_data["days_of_week"]
    if "start_time" in recurring_data:
        rule.start_time = recurring_data["start_time"]
    if "end_time" in recurring_data:
        rule.end_time = recurring_data["end_time"]
    if "valid_from" in recurring_data:
        rule.valid_from = recurring_data["valid_from"]
    if "valid_until" in recurring_data:
        rule.valid_until = recurring_data["valid_until"]

    _validate_time_range(start_time=rule.start_time, end_time=rule.end_time)
    _validate_validity_range(valid_from=rule.valid_from, valid_until=rule.valid_until)

    rule.updated_by = requesting_user
    rule.full_clean()
    rule.save()


@transaction.atomic
def delete_availability(*, teacher_id, pk, requesting_user):
    _get_teacher(teacher_id)
    block = get_availability(teacher_id=teacher_id, pk=pk)

    has_recurring = hasattr(block, "recurring") and block.recurring is not None
    if has_recurring:
        block.recurring.delete(deleted_by=requesting_user)

    block.delete(deleted_by=requesting_user)
    logger.info("TeacherAvailability %s deleted by user=%s", pk, requesting_user.id)
