from datetime import date

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Role
from core.exceptions import AppNotFound
from enrollments.models import (
    ConsentType,
    Enrollment,
    EnrollmentConsent,
    EnrollmentFile,
    EnrollmentModality,
    EnrollmentPayment,
    EnrollmentPeriod,
    EnrollmentStatus,
    EnrollmentType,
    PaymentStatus,
    PeriodType,
)
from modality.models import Modality
from utils.files import file_content_hash

import logging

logger = logging.getLogger(__name__)
User = get_user_model()

_REQUIRED_CONSENT_TYPES = (ConsentType.RGPD, ConsentType.INTERNAL_REGULATION)


def _age_in_months(*, birth_date: date, on_date: date) -> int:
    """Whole calendar months from birth_date to on_date (same notion as typical age rules)."""
    months = (on_date.year - birth_date.year) * 12 + (on_date.month - birth_date.month)
    if on_date.day < birth_date.day:
        months -= 1
    return months


# ---------------------------------------------------------------------------
# Enrollment Period
# ---------------------------------------------------------------------------


def _assert_no_other_open_period(*, period=None):
    """
    Enforce the global single-open-period invariant.

    Raises ValidationError("ConflictingOpenPeriod") if another period
    is currently open. When checking on PATCH/open of an existing period,
    pass it via `period` so it is excluded from the lookup.
    """
    qs = EnrollmentPeriod.objects.filter(is_open=True)
    if period is not None and period.pk is not None:
        qs = qs.exclude(pk=period.pk)
    conflicting = qs.only("pk").first()
    if conflicting is not None:
        raise ValidationError(
            {
                "messages": ["ConflictingOpenPeriod"],
                "conflicting_period_id": [conflicting.pk],
            }
        )


def create_period(*, created_by=None, **data):
    # Creates are always allowed; new periods land as drafts (is_open=False).
    # If a caller tries to create a period already open while another is open,
    # block it to keep the invariant intact.
    if data.get("is_open"):
        _assert_no_other_open_period()
    period = EnrollmentPeriod(**data, created_by=created_by)
    period.full_clean()
    period.save()
    return period


def update_period(*, period, updated_by=None, **data):
    # Only re-check the invariant when this PATCH flips is_open from False → True.
    # Editing dates/prices on an already-open period must not raise a false conflict.
    if "is_open" in data and data["is_open"] and not period.is_open:
        _assert_no_other_open_period(period=period)
    for field, value in data.items():
        setattr(period, field, value)
    period.updated_by = updated_by
    period.full_clean()
    period.save()
    return period


def open_period(*, period, updated_by=None):
    if not period.is_open:
        _assert_no_other_open_period(period=period)
    period.is_open = True
    period.updated_by = updated_by
    period.full_clean()
    period.save()
    return period


def close_period(*, period, updated_by=None):
    period.is_open = False
    period.updated_by = updated_by
    period.full_clean()
    period.save()
    return period


def get_period(*, pk):
    try:
        return EnrollmentPeriod.objects.get(pk=pk)
    except EnrollmentPeriod.DoesNotExist:
        raise AppNotFound("EnrollmentPeriodNotFound")


def list_periods(*, filters=None):
    qs = EnrollmentPeriod.objects.all()
    if filters:
        qs = qs.filter(**filters)
    return qs


def _get_open_period(*, enrollment_type):
    """
    Find an open period that accepts the given enrollment type.
    Raises ValidationError if none is open.
    """
    matching_period_types = [PeriodType.BOTH]
    if enrollment_type == EnrollmentType.NEW:
        matching_period_types.append(PeriodType.NEW)
    elif enrollment_type == EnrollmentType.RENEWAL:
        matching_period_types.append(PeriodType.RENEWAL)

    today = timezone.now().date()
    period = (
        EnrollmentPeriod.objects.filter(
            is_open=True,
            period_type__in=matching_period_types,
            start_date__lte=today,
            end_date__gte=today,
        )
        .order_by("-start_date")
        .first()
    )

    if not period:
        raise ValidationError({"messages": ["NoOpenEnrollmentPeriod"]})

    return period


# ---------------------------------------------------------------------------
# Submit
# ---------------------------------------------------------------------------


@transaction.atomic
def submit_enrollment(
    *,
    enrollment_data,
    modality_ids,
    consents,
    files=None,
    created_by=None,
    period_id=None,
):
    """
    Create a full enrollment submission in a single transaction.
    If period_id is supplied, uses that specific period (must be open and match the
    enrollment_type). Otherwise auto-detects the current open period.

    Args:
        enrollment_data: dict of Enrollment field values (must include enrollment_type)
        modality_ids: list of Modality PKs
        consents: list of dicts with consent_type, accepted, ip_address, user_agent
        files: list of dicts with file, original_filename, mime_type (optional)
        created_by: the user performing the action (optional)
        period_id: optional explicit period PK; validated against enrollment_type
    """
    if not modality_ids:
        raise ValidationError({"messages": ["AtLeastOneModalityRequired"]})

    modality_ids = list(dict.fromkeys(modality_ids))

    # --- Validate open period ---
    enrollment_type = enrollment_data.get("enrollment_type", EnrollmentType.NEW)
    if period_id is not None:
        try:
            period = EnrollmentPeriod.objects.get(pk=period_id)
        except EnrollmentPeriod.DoesNotExist:
            raise ValidationError({"messages": ["EnrollmentPeriodNotFound"]})
        if not period.is_open:
            raise ValidationError({"messages": ["EnrollmentPeriodNotOpen"]})
        matching_types = [PeriodType.BOTH]
        if enrollment_type == EnrollmentType.NEW:
            matching_types.append(PeriodType.NEW)
        elif enrollment_type == EnrollmentType.RENEWAL:
            matching_types.append(PeriodType.RENEWAL)
        if period.period_type not in matching_types:
            raise ValidationError({"messages": ["EnrollmentPeriodTypeIncompatible"]})
    else:
        period = _get_open_period(enrollment_type=enrollment_type)
    enrollment_data["period"] = period

    student_email = enrollment_data.get("student_email")
    parent_email = enrollment_data.get("parent_email")
    if student_email and parent_email and student_email == parent_email:
        raise ValidationError({"messages": ["StudentAndParentEmailMustBeDifferent"]})

    if Enrollment.objects.filter(period=period, student_email=student_email).exists():
        raise ValidationError({"messages": ["EnrollmentAlreadySubmittedForThisPeriod"]})

    unique_modality_ids = set(modality_ids)
    found_count = Modality.objects.filter(pk__in=modality_ids).count()
    if found_count != len(unique_modality_ids):
        raise ValidationError({"messages": ["OneOrMoreModalitiesNotFound"]})

    student_dob = enrollment_data.get("student_date_of_birth")
    if student_dob is not None:
        reference_date = timezone.now().date()
        age_months = _age_in_months(birth_date=student_dob, on_date=reference_date)
        modalities = Modality.objects.filter(pk__in=modality_ids).order_by("pk")
        for modality in modalities:
            if (
                modality.min_age_months is not None
                and age_months < modality.min_age_months
            ):
                raise ValidationError({"messages": ["StudentAgeBelowModalityMinimum"]})
            if (
                modality.max_age_months is not None
                and age_months > modality.max_age_months
            ):
                raise ValidationError({"messages": ["StudentAgeAboveModalityMaximum"]})

    for consent_type in _REQUIRED_CONSENT_TYPES:
        if not any(
            c.get("consent_type") == consent_type and c.get("accepted")
            for c in consents
        ):
            raise ValidationError({"messages": ["RequiredConsentsNotAccepted"]})

    enrollment = Enrollment(**enrollment_data, created_by=created_by)
    enrollment.full_clean()
    enrollment.save()

    # --- Modalities ---
    for modality_id in modality_ids:
        EnrollmentModality.objects.create(
            enrollment=enrollment,
            modality_id=modality_id,
            created_by=created_by,
        )

    # --- Consents ---
    now = timezone.now()
    for consent in consents:
        EnrollmentConsent.objects.create(
            enrollment=enrollment,
            consent_type=consent["consent_type"],
            accepted=consent.get("accepted", False),
            accepted_at=now if consent.get("accepted") else None,
            ip_address=consent.get("ip_address", ""),
            user_agent=consent.get("user_agent", ""),
            policy_version=consent.get("policy_version", ""),
            locale=consent.get("locale", ""),
            device=consent.get("device") or {},
            created_by=created_by,
        )

    # --- Files ---
    if files:
        for f in files:
            content_hash = file_content_hash(f["file"])
            if EnrollmentFile.objects.filter(
                enrollment=enrollment, content_hash=content_hash
            ).exists():
                raise ValidationError({"messages": ["DuplicateEnrollmentFile"]})
            EnrollmentFile.objects.create(
                enrollment=enrollment,
                file=f["file"],
                original_filename=f["original_filename"],
                mime_type=f.get("mime_type", ""),
                content_hash=content_hash,
                created_by=created_by,
            )

    return enrollment


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


def list_enrollments(*, filters=None):
    qs = Enrollment.objects.select_related(
        "student",
        "parent",
        "period",
    ).prefetch_related(
        "enrollment_modalities__modality",
        "payments",
        "consents",
        "files",
    )
    if filters:
        qs = qs.filter(**filters)
    return qs


def get_enrollment(*, pk):
    try:
        return (
            Enrollment.objects.select_related("student", "parent", "period")
            .prefetch_related(
                "enrollment_modalities__modality",
                "payments",
                "consents",
                "files",
            )
            .get(pk=pk)
        )
    except Enrollment.DoesNotExist:
        raise AppNotFound("EnrollmentNotFound")


# ---------------------------------------------------------------------------
# Update (data fields only — no status changes)
# ---------------------------------------------------------------------------


@transaction.atomic
def update_enrollment(*, enrollment, updated_by=None, **data):
    enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
    if enrollment.status not in (
        EnrollmentStatus.SUBMITTED,
        EnrollmentStatus.UNDER_REVIEW,
    ):
        if enrollment.status == EnrollmentStatus.APPROVED:
            raise ValidationError({"messages": ["CannotUpdateApprovedEnrollment"]})
        raise ValidationError({"messages": ["EnrollmentNotEditable"]})
    for field, value in data.items():
        setattr(enrollment, field, value)
    enrollment.updated_by = updated_by
    enrollment.full_clean()
    enrollment.save()
    return enrollment


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------


VALID_TRANSITIONS = {
    EnrollmentStatus.SUBMITTED: [
        EnrollmentStatus.UNDER_REVIEW,
        EnrollmentStatus.CANCELLED,
    ],
    EnrollmentStatus.UNDER_REVIEW: [
        EnrollmentStatus.APPROVED,
        EnrollmentStatus.REJECTED,
        EnrollmentStatus.CANCELLED,
    ],
}


def _validate_transition(enrollment, target_status):
    allowed = VALID_TRANSITIONS.get(enrollment.status, [])
    if target_status not in allowed:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})


@transaction.atomic
def start_review(*, enrollment, updated_by=None):
    """Move an enrollment from SUBMITTED to UNDER_REVIEW."""
    enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
    _validate_transition(enrollment, EnrollmentStatus.UNDER_REVIEW)
    enrollment.status = EnrollmentStatus.UNDER_REVIEW
    enrollment.updated_by = updated_by
    enrollment.save()
    return enrollment


def _update_user_from_enrollment(user, enrollment, field_map):
    """
    Update a User's fields from enrollment snapshot data.
    Only updates fields that have a non-empty value in the enrollment.
    """
    for enrollment_field, user_field in field_map.items():
        value = getattr(enrollment, enrollment_field, None)
        if value:
            setattr(user, user_field, value)
    user.save()


def _assign_role(user, role_code):
    try:
        role = Role.objects.select_related("group").get(code=role_code)
    except Role.DoesNotExist:
        logger.error(
            "Role '%s' not found — user %s has no role assigned", role_code, user.email
        )
        return
    user.groups.add(role.group)


def _get_or_create_user(*, email, role_code, created_by=None, **fields):
    """
    Try to find an existing user by email (including soft-deleted).
    If soft-deleted, restore and update. If not found, create via UserManager.
    Users created from enrollments are inactive (no password)
    until activated through an invite/password-reset flow.
    Returns (user, created) tuple.
    """
    # Check all_objects to handle soft-deleted users
    try:
        user = User.all_objects.get(email=email)
        if user.is_deleted:
            user.restore()
        return user, False
    except User.DoesNotExist:
        user = User.objects.create_user(
            email=email,
            password=None,
            created_by=created_by,
            is_active=False,
            **fields,
        )
        _assign_role(user, role_code)
        return user, True


@transaction.atomic
def approve_enrollment(*, enrollment, updated_by=None):
    """
    Approve an enrollment:
    - Validate the transition
    - NEW: create student and parent Users via UserManager
    - RENEWAL: find existing Users and update their data from the snapshot
    - Link both to the enrollment
    - Send activation emails (after transaction commits)
    """
    enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
    _validate_transition(enrollment, EnrollmentStatus.APPROVED)

    is_renewal = enrollment.enrollment_type == EnrollmentType.RENEWAL

    # --- Parent user ---
    name_parts = enrollment.parent_name.split() if enrollment.parent_name else [""]
    parent_user, parent_created = _get_or_create_user(
        email=enrollment.parent_email,
        role_code="parent",
        created_by=updated_by,
        first_name=name_parts[0],
        last_name=" ".join(name_parts[1:]),
        phone=enrollment.parent_phone,
        phone_country_code=enrollment.parent_phone_country_code,
    )

    if is_renewal and not parent_created:
        _update_user_from_enrollment(
            parent_user,
            enrollment,
            {
                "parent_phone": "phone",
                "parent_phone_country_code": "phone_country_code",
            },
        )

    # --- Student user ---
    name_parts = enrollment.student_name.split() if enrollment.student_name else [""]
    student_user, student_created = _get_or_create_user(
        email=enrollment.student_email,
        role_code="student",
        created_by=updated_by,
        first_name=name_parts[0],
        last_name=" ".join(name_parts[1:]),
        date_of_birth=enrollment.student_date_of_birth,
        nif=enrollment.student_nif,
        nationality=enrollment.student_nationality,
        document_number=enrollment.student_document_number,
        document_expiry=enrollment.student_document_expiry,
        address=enrollment.address,
        postal_code=enrollment.postal_code,
        parent=parent_user,
    )

    if is_renewal and not student_created:
        _update_user_from_enrollment(
            student_user,
            enrollment,
            {
                "student_nif": "nif",
                "student_nationality": "nationality",
                "student_document_number": "document_number",
                "student_document_expiry": "document_expiry",
                "address": "address",
                "postal_code": "postal_code",
            },
        )

    if not parent_created:
        _assign_role(parent_user, "parent")
    if not student_created:
        _assign_role(student_user, "student")

    # --- Link to enrollment ---
    enrollment.student = student_user
    enrollment.parent = parent_user
    enrollment.status = EnrollmentStatus.APPROVED
    enrollment.updated_by = updated_by
    enrollment.save()

    # --- Send activation emails after transaction commits ---
    from accounts.tasks import send_activation_email_task

    if parent_created:
        transaction.on_commit(
            lambda uid=parent_user.pk: send_activation_email_task.delay(uid)
        )
    if student_created:
        transaction.on_commit(
            lambda uid=student_user.pk: send_activation_email_task.delay(uid)
        )

    return enrollment


@transaction.atomic
def reject_enrollment(*, enrollment, updated_by=None):
    """Reject an enrollment. No user creation."""
    enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
    _validate_transition(enrollment, EnrollmentStatus.REJECTED)

    enrollment.status = EnrollmentStatus.REJECTED
    enrollment.updated_by = updated_by
    enrollment.save()

    return enrollment


@transaction.atomic
def cancel_enrollment(*, enrollment, updated_by=None):
    """Cancel an enrollment. No user creation."""
    enrollment = Enrollment.objects.select_for_update().get(pk=enrollment.pk)
    _validate_transition(enrollment, EnrollmentStatus.CANCELLED)

    enrollment.status = EnrollmentStatus.CANCELLED
    enrollment.updated_by = updated_by
    enrollment.save()

    return enrollment


# ---------------------------------------------------------------------------
# Payments (direction-managed)
# ---------------------------------------------------------------------------


def create_payment(*, enrollment, created_by=None, **data):
    """Direction creates a payment record for an enrollment."""
    payment = EnrollmentPayment(enrollment=enrollment, created_by=created_by, **data)
    payment.full_clean()
    payment.save()
    return payment


@transaction.atomic
def confirm_payment_for_enrollment(
    *,
    enrollment_pk,
    payment_pk,
    confirmed_by=None,
):
    """Load payment by id scoped to enrollment, then confirm."""
    try:
        payment = EnrollmentPayment.objects.select_for_update().get(
            pk=payment_pk,
            enrollment_id=enrollment_pk,
        )
    except EnrollmentPayment.DoesNotExist:
        raise AppNotFound("EnrollmentPaymentNotFound")
    if payment.status == PaymentStatus.CONFIRMED:
        raise ValidationError({"messages": ["PaymentAlreadyConfirmed"]})
    payment.status = PaymentStatus.CONFIRMED
    payment.confirmed_by = confirmed_by
    payment.updated_by = confirmed_by
    payment.save()
    return payment


def list_payments(*, enrollment):
    return enrollment.payments.all()
