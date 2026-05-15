import logging
from decimal import ROUND_DOWN, Decimal, InvalidOperation

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from billing.models import (
    BillingEntry,
    BillingEntrySourceType,
    BillingEntryStatus,
    Fine,
    FineReason,
    FineStatus,
)
from coachings.models import CoachingParticipantStatus

logger = logging.getLogger(__name__)

_QUANT = Decimal("0.01")


# -----------------------------------------------------------------------------
# Description builder
# -----------------------------------------------------------------------------

_FINE_REASON_LABELS_PT = {
    FineReason.ABSENCE: "Ausência",
    FineReason.LATE_CANCELLATION: "Cancelamento tardio",
}


def _format_dt_pt(dt):
    """dd/mm/yyyy HH:MM."""
    return timezone.localtime(dt).strftime("%d/%m/%Y %H:%M") if dt else ""


def _abbreviate_teacher(user):
    """Return 'Prof. First Last' (single first + single last)."""
    if user is None:
        return "Prof."
    first = (user.first_name or "").strip().split(" ")[0]
    last_parts = (user.last_name or "").strip().split(" ")
    last = last_parts[-1] if last_parts and last_parts[-1] else ""
    full = " ".join(p for p in (first, last) if p)
    return f"Prof. {full}".strip().rstrip(".") if full else "Prof."


def _coaching_format_label(n_attended):
    """Label used in coaching descriptions based on attended count."""
    if n_attended <= 1:
        return "Privada"
    if n_attended == 2:
        return "Dueto"
    if n_attended == 3:
        return "Trio"
    return "Ensemble"


def build_coaching_description(*, coaching, position_one_indexed, total_attended):
    """
    'Modalidade | dd/mm/yyyy HH:MM | Prof. Nome | Tipo (X de Y)'

    position_one_indexed is the participant's 1-based position in the attended list,
    ordered by created_at ascending. total_attended is the count of attended participants.
    """
    modality_name = coaching.modality.name if coaching.modality_id is not None else ""
    teacher_label = _abbreviate_teacher(getattr(coaching, "teacher", None))
    when = _format_dt_pt(coaching.start_datetime)
    fmt_label = _coaching_format_label(total_attended)
    desc = (
        f"{modality_name} | {when} | {teacher_label} | "
        f"{fmt_label} ({position_one_indexed} de {total_attended})"
    )
    return desc[:255]


def build_fine_description(*, fine):
    """'Multa: Razão | Modalidade | dd/mm/yyyy HH:MM'"""
    reason_label = _FINE_REASON_LABELS_PT.get(fine.reason, fine.reason)
    modality_name = (
        fine.coaching_class.modality.name
        if fine.coaching_class_id is not None
        and fine.coaching_class.modality_id is not None
        else ""
    )
    when = _format_dt_pt(fine.coaching_class.start_datetime)
    return f"Multa: {reason_label} | {modality_name} | {when}"[:255]


_MARKETPLACE_TYPE_LABELS_PT = {
    "sell": "Compra",
    "rent": "Aluguer",
    "lend": "Empréstimo",
    "donate": "Doação",
}


def build_marketplace_description(*, transaction):
    """
    'Mercado | {listing_title} | {type_label}'
    e.g. 'Mercado | Tutu Branco | Aluguer'
    """
    title = (
        transaction.listing.title
        if transaction.listing_id is not None
        else transaction.variant.product.name
    )
    type_label = _MARKETPLACE_TYPE_LABELS_PT.get(
        transaction.transaction_type, transaction.transaction_type
    )
    return f"Mercado | {title} | {type_label}"[:255]


# -----------------------------------------------------------------------------
# Split
# -----------------------------------------------------------------------------


def _split_total_amount(*, total: Decimal, n: int) -> list[Decimal]:
    """
    Split ``total`` across ``n`` slots: floor each share to 2 decimals (ROUND_DOWN),
    assign residual cents to the first slot (caller orders participants).
    """
    if n <= 0:
        return []
    part = (total / Decimal(n)).quantize(_QUANT, rounding=ROUND_DOWN)
    amounts = [part] * n
    remainder = total - part * Decimal(n)
    amounts[0] = (amounts[0] + remainder).quantize(_QUANT, rounding=ROUND_DOWN)
    return amounts


# -----------------------------------------------------------------------------
# Coaching billing entries
# -----------------------------------------------------------------------------


def create_billing_entries_for_coaching(*, coaching, user):
    """
    Create pending coaching billing rows for attended participants.
    Intended to run inside the caller's existing transaction (e.g. complete_coaching).
    """
    if not coaching.is_billable:
        logger.info(
            "Skipping billing entries for non-billable CoachingClass id=%s",
            coaching.pk,
        )
        return []

    if coaching.total_price is None:
        raise ValidationError({"messages": ["CoachingMissingTotalPrice"]})

    if coaching.total_price <= 0:
        logger.info(
            "Skipping billing entries for CoachingClass id=%s (total_price=%s)",
            coaching.pk,
            coaching.total_price,
        )
        return []

    participants = list(
        coaching.participants.filter(
            status=CoachingParticipantStatus.ATTENDED,
        ).order_by("created_at", "pk")
    )

    if not participants:
        logger.warning(
            "CoachingClass %s completed with zero attended participants — no entries created",
            coaching.pk,
        )
        return []

    total_attended = len(participants)
    shares = _split_total_amount(total=coaching.total_price, n=total_attended)
    entries = []
    for index, (participant, share) in enumerate(
        zip(participants, shares, strict=True)
    ):
        description = build_coaching_description(
            coaching=coaching,
            position_one_indexed=index + 1,
            total_attended=total_attended,
        )
        entry = BillingEntry(
            source_type=BillingEntrySourceType.COACHING,
            coaching_class=coaching,
            coaching_participant=participant,
            student_id=participant.student_id,
            amount_due=share,
            description=description,
            status=BillingEntryStatus.PENDING,
            created_by=user,
        )
        entry.full_clean()
        entries.append(entry)

    try:
        BillingEntry.objects.bulk_create(entries)
    except IntegrityError:
        raise ValidationError({"messages": ["DuplicateBillingEntry"]})

    logger.info(
        "Created %d billing entries for CoachingClass id=%s",
        len(entries),
        coaching.pk,
    )
    return entries


# -----------------------------------------------------------------------------
# Marketplace billing entries
# -----------------------------------------------------------------------------


def create_billing_entry_for_transaction(*, transaction, user):
    """
    Create a pending billing entry for a completed marketplace transaction.
    Called inside complete_transaction's atomic block.

    Skips silently if:
    - No price is set (agreed_price and asking_price both absent/zero)
    - transaction_type is donate (never charged)

    The requester is the payer (student field).
    """
    from marketplace.models import ProductTransaction

    if transaction.transaction_type == ProductTransaction.TransactionType.DONATE:
        logger.info(
            "Skipping billing entry for DONATE transaction id=%s", transaction.pk
        )
        return None

    amount = transaction.agreed_price or (
        transaction.listing.asking_price if transaction.listing_id else None
    )

    if not amount:
        logger.info(
            "Skipping billing entry for transaction id=%s — no price set",
            transaction.pk,
        )
        return None

    amount = Decimal(amount).quantize(_QUANT)

    if amount <= 0:
        logger.info(
            "Skipping billing entry for transaction id=%s — amount is zero or negative",
            transaction.pk,
        )
        return None

    description = build_marketplace_description(transaction=transaction)

    entry = BillingEntry(
        source_type=BillingEntrySourceType.MARKETPLACE,
        marketplace_transaction=transaction,
        student_id=transaction.requester_id,
        amount_due=amount,
        description=description,
        status=BillingEntryStatus.PENDING,
        created_by=user,
    )
    entry.full_clean()
    entry.save()

    logger.info(
        "BillingEntry created for marketplace transaction id=%s amount=%s",
        transaction.pk,
        amount,
    )
    return entry


# Map participant final-status → fine reason
_FINE_REASON_FROM_PARTICIPANT_STATUS = {
    CoachingParticipantStatus.ABSENT: FineReason.ABSENCE,
    CoachingParticipantStatus.LATE_CANCELLED: FineReason.LATE_CANCELLATION,
}


def create_fines_for_coaching(*, coaching, user):
    """
    Create PENDING_REVIEW fines for participants who were ABSENT or LATE_CANCELLED.
    Intended to run inside the caller's existing transaction (e.g. complete_coaching).
    Fines are independent of coaching.is_billable and coaching.total_price — coordination
    decides amount + approve/waive at review time.
    """
    candidates = list(
        coaching.participants.filter(
            status__in=list(_FINE_REASON_FROM_PARTICIPANT_STATUS.keys()),
        ).order_by("created_at", "pk")
    )
    if not candidates:
        return []

    fines = []
    for participant in candidates:
        reason = _FINE_REASON_FROM_PARTICIPANT_STATUS[participant.status]
        fine = Fine(
            coaching_class=coaching,
            coaching_participant=participant,
            student_id=participant.student_id,
            reason=reason,
            status=FineStatus.PENDING_REVIEW,
            created_by=user,
        )
        fine.full_clean()
        fines.append(fine)

    Fine.objects.bulk_create(fines)

    logger.info(
        "Created %d fines (pending_review) for CoachingClass id=%s",
        len(fines),
        coaching.pk,
    )
    return fines


def _default_fine_amount() -> Decimal:
    raw = getattr(settings, "COACHING_FINE_DEFAULT_AMOUNT", "25.00")
    try:
        return Decimal(str(raw)).quantize(_QUANT)
    except (InvalidOperation, ValueError):
        return Decimal("25.00")


def get_fine_default_amount() -> Decimal:
    """Public accessor used by the API to surface the suggested amount to the UI."""
    return _default_fine_amount()


# -----------------------------------------------------------------------------
# List / detail / scoping
# -----------------------------------------------------------------------------


def _staff_can_use_student_filters(*, user) -> bool:
    return user.has_perm("accounts.can_list_users")


def list_billing_entries(
    *,
    requesting_user,
    student_id=None,
    coaching_class_id=None,
    status=None,
    date_from=None,
    date_to=None,
    source_type=None,
):
    qs = BillingEntry.objects.select_related(
        "student",
        "coaching_class",
        "coaching_class__modality",
        "coaching_participant",
        "fine",
    )

    if student_id is not None and not _staff_can_use_student_filters(
        user=requesting_user
    ):
        raise ValidationError({"messages": ["BillingStudentFilterStaffOnly"]})

    if _staff_can_use_student_filters(user=requesting_user):
        if student_id is not None:
            qs = qs.filter(student_id=student_id)
    else:
        qs = qs.filter(student=requesting_user)

    if coaching_class_id is not None:
        qs = qs.filter(coaching_class_id=coaching_class_id)
    if status is not None:
        qs = qs.filter(status=status)
    if source_type is not None:
        qs = qs.filter(source_type=source_type)
    if date_from is not None:
        qs = qs.filter(created_at__gte=date_from)
    if date_to is not None:
        qs = qs.filter(created_at__lte=date_to)

    return qs.order_by("-created_at")


def get_billing_entry_for_request(*, pk, requesting_user):
    try:
        entry = BillingEntry.objects.select_related(
            "student",
            "coaching_class",
            "coaching_class__modality",
            "coaching_class__studio",
            "coaching_class__teacher",
            "coaching_participant",
            "fine",
        ).get(pk=pk)
    except BillingEntry.DoesNotExist:
        raise AppNotFound("BillingEntryNotFound")

    if not _staff_can_use_student_filters(user=requesting_user):
        if entry.student_id != requesting_user.pk:
            raise AppNotFound("BillingEntryNotFound")
    return entry


@transaction.atomic
def cancel_billing_entry(*, entry, notes, updated_by):
    # Re-fetch with row lock to prevent concurrent cancellation (race condition guard).
    entry = BillingEntry.objects.select_for_update().get(pk=entry.pk)

    notes_clean = (notes or "").strip()
    if not notes_clean:
        raise ValidationError({"messages": ["CancellationNotesRequired"]})

    if entry.status != BillingEntryStatus.PENDING:
        raise ValidationError({"messages": ["EntryNotCancellable"]})

    entry.status = BillingEntryStatus.CANCELLED
    entry.cancelled_at = timezone.now()
    entry.notes = notes_clean
    entry.updated_by = updated_by
    entry.full_clean()
    entry.save()
    return entry


# -----------------------------------------------------------------------------
# Fines: list / detail / approve / waive
# -----------------------------------------------------------------------------


def list_fines(
    *,
    requesting_user,
    student_id=None,
    coaching_class_id=None,
    status=None,
    reason=None,
):
    qs = Fine.objects.select_related(
        "student",
        "coaching_class",
        "coaching_class__modality",
        "coaching_class__teacher",
        "coaching_participant",
        "reviewed_by",
    ).prefetch_related("billing_entries")

    if student_id is not None and not _staff_can_use_student_filters(
        user=requesting_user
    ):
        raise ValidationError({"messages": ["FineStudentFilterStaffOnly"]})

    if _staff_can_use_student_filters(user=requesting_user):
        if student_id is not None:
            qs = qs.filter(student_id=student_id)
    else:
        qs = qs.filter(student=requesting_user)

    if coaching_class_id is not None:
        qs = qs.filter(coaching_class_id=coaching_class_id)
    if status is not None:
        qs = qs.filter(status=status)
    if reason is not None:
        qs = qs.filter(reason=reason)

    return qs.order_by("-created_at")


def get_fine_for_request(*, pk, requesting_user):
    try:
        fine = (
            Fine.objects.select_related(
                "student",
                "coaching_class",
                "coaching_class__modality",
                "coaching_class__teacher",
                "coaching_participant",
                "reviewed_by",
            )
            .prefetch_related("billing_entries")
            .get(pk=pk)
        )
    except Fine.DoesNotExist:
        raise AppNotFound("FineNotFound")

    if not _staff_can_use_student_filters(user=requesting_user):
        if fine.student_id != requesting_user.pk:
            raise AppNotFound("FineNotFound")
    return fine


def _resolve_fine_amount(amount):
    """Coerce and validate the amount used at fine approval time."""
    if amount is None:
        amount = _default_fine_amount()
    try:
        amount = Decimal(str(amount)).quantize(_QUANT)
    except (InvalidOperation, ValueError):
        raise ValidationError({"messages": ["FineAmountInvalid"]})
    if amount <= 0:
        raise ValidationError({"messages": ["FineAmountNegative"]})
    return amount


@transaction.atomic
def approve_fine(*, fine, amount, reviewed_by, notes=""):
    """
    Approve a fine (status=APPROVED) and generate the matching BillingEntry.
    `amount` is optional — when None, falls back to settings default.
    """
    # Re-fetch with row lock to prevent concurrent approve/waive (race condition guard).
    fine = Fine.objects.select_for_update().get(pk=fine.pk)

    if fine.status != FineStatus.PENDING_REVIEW:
        raise ValidationError({"messages": ["FineNotPendingReview"]})

    final_amount = _resolve_fine_amount(amount)
    notes_clean = (notes or "").strip()

    fine.status = FineStatus.APPROVED
    fine.amount = final_amount
    fine.reviewed_at = timezone.now()
    fine.reviewed_by = reviewed_by
    if notes_clean:
        fine.notes = notes_clean
    fine.updated_by = reviewed_by
    fine.full_clean()
    fine.save()

    description = build_fine_description(fine=fine)
    entry = BillingEntry(
        source_type=BillingEntrySourceType.FINE,
        fine=fine,
        student_id=fine.student_id,
        amount_due=final_amount,
        description=description,
        status=BillingEntryStatus.PENDING,
        created_by=reviewed_by,
    )
    entry.full_clean()
    entry.save()

    logger.info(
        "Fine %s approved by user=%s amount=%s billing_entry=%s",
        fine.pk,
        reviewed_by.id,
        final_amount,
        entry.pk,
    )
    return fine


@transaction.atomic
def waive_fine(*, fine, reviewed_by, notes):
    """
    Waive a pending fine — no charge generated. `notes` required for audit trail.
    """
    # Re-fetch with row lock to prevent concurrent approve/waive (race condition guard).
    fine = Fine.objects.select_for_update().get(pk=fine.pk)

    if fine.status != FineStatus.PENDING_REVIEW:
        raise ValidationError({"messages": ["FineNotPendingReview"]})

    notes_clean = (notes or "").strip()
    if not notes_clean:
        raise ValidationError({"messages": ["WaiveNotesRequired"]})

    fine.status = FineStatus.WAIVED
    fine.reviewed_at = timezone.now()
    fine.reviewed_by = reviewed_by
    fine.notes = notes_clean
    fine.updated_by = reviewed_by
    fine.full_clean()
    fine.save()

    logger.info("Fine %s waived by user=%s", fine.pk, reviewed_by.id)
    return fine
