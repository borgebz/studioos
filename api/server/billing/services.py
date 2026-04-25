import logging
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, NotFound
from billing.models import CoachingBillingEntry, Fine, BillingStatus

logger = logging.getLogger(__name__)


# Coaching Billing Services


@transaction.atomic
def generate_coaching_billing(*, coaching_class, created_by):
    """
    Generates billing entries for a coaching class.
    Splits the total price equally among all active participants.
    """
    if coaching_class.total_price is None or coaching_class.total_price <= 0:
        raise ValidationError({"messages": ["InvalidCoachingPrice"]})

    # Filter participants who actually attended (using the coachings app status)
    from coachings.models import CoachingParticipantStatus

    participants = coaching_class.participants.filter(
        status=CoachingParticipantStatus.ATTENDED, deleted_at__isnull=True
    )

    count = participants.count()
    if count == 0:
        logger.info("No participants to bill for coaching %s", coaching_class.id)
        return []

    # Proportional calculation (e.g., 50% for duets)
    split_price = round(coaching_class.total_price / count, 2)

    entries = []
    for participant in participants:
        entry = CoachingBillingEntry(
            student=participant.student,
            coaching=coaching_class,
            amount=split_price,
            status=BillingStatus.PENDING,
            created_by=created_by,
        )
        entry.full_clean()
        entry.save()
        entries.append(entry)

    logger.info(
        "Generated %d billing entries for coaching %s", len(entries), coaching_class.id
    )
    return entries


def list_coaching_bills(*, filters=None):
    qs = CoachingBillingEntry.objects.select_related("student", "coaching")
    if filters:
        qs = qs.filter(**filters)
    return qs


# Fine Services


def get_fine(*, pk):
    try:
        return Fine.objects.select_related("student", "coaching", "issued_by").get(
            pk=pk
        )
    except Fine.DoesNotExist:
        raise NotFound()


def list_fines(*, filters=None):
    qs = Fine.objects.select_related("student", "coaching", "issued_by")
    if filters:
        qs = qs.filter(**filters)
    return qs


@transaction.atomic
def create_fine(*, created_by, **data):
    """Creates a new fine record for a student."""
    fine = Fine(**data, issued_by=created_by, created_by=created_by)
    fine.full_clean()
    fine.save()
    return fine


@transaction.atomic
def update_fine(*, fine, updated_by, **data):
    """Updates fine status or notes."""
    for field, value in data.items():
        setattr(fine, field, value)

    # Logic: if status changes to PAID, set resolution time
    if data.get("status") == BillingStatus.PAID:
        fine.resolved_at = timezone.now()

    fine.updated_by = updated_by
    fine.full_clean()
    fine.save()
    return fine
