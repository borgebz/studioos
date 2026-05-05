from django.conf import settings
from django.db import models
from django.db.models import Q

from core.models import BaseModel


class BillingEntrySourceType(models.TextChoices):
    COACHING = "coaching", "Coaching"
    FINE = "fine", "Fine"


class BillingEntryStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    EXPORTED = "exported", "Exported"
    CANCELLED = "cancelled", "Cancelled"


class BillingEntry(BaseModel):
    """
    Generic accounting row for student charges.
    Today: coaching attendance and approved fines. Future: events, etc.
    """

    source_type = models.CharField(
        max_length=30,
        choices=BillingEntrySourceType.choices,
    )
    coaching_class = models.ForeignKey(
        "coachings.CoachingClass",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="billing_entries",
    )
    coaching_participant = models.ForeignKey(
        "coachings.CoachingParticipant",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="billing_entries",
    )
    fine = models.ForeignKey(
        "billing.Fine",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="billing_entries",
        help_text="Set when source_type=fine. Generated on Fine approval.",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="billing_entries",
    )
    amount_due = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text=(
            "Single-line, human-readable description shown to the student and on "
            "accounting exports. Generated at creation time, not editable afterwards."
        ),
    )
    status = models.CharField(
        max_length=30,
        choices=BillingEntryStatus.choices,
        default=BillingEntryStatus.PENDING,
    )
    exported_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "billing_entries"
        ordering = ["-created_at"]
        permissions = [
            (
                "can_cancel_billingentry",
                "Can cancel a pending billing entry",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    ~Q(source_type=BillingEntrySourceType.COACHING)
                    | (
                        Q(coaching_class_id__isnull=False)
                        & Q(coaching_participant_id__isnull=False)
                    )
                ),
                name="billing_entry_coaching_source_has_fks",
            ),
            models.CheckConstraint(
                condition=(
                    ~Q(source_type=BillingEntrySourceType.FINE)
                    | Q(fine_id__isnull=False)
                ),
                name="billing_entry_fine_source_has_fk",
            ),
            models.CheckConstraint(
                condition=Q(amount_due__gte=0),
                name="billing_entry_amount_non_negative",
            ),
            models.UniqueConstraint(
                fields=("coaching_class", "student"),
                condition=Q(deleted_at__isnull=True)
                & Q(source_type=BillingEntrySourceType.COACHING),
                name="uniq_coaching_billing_entry_per_student",
            ),
            models.UniqueConstraint(
                fields=("fine",),
                condition=Q(deleted_at__isnull=True)
                & Q(source_type=BillingEntrySourceType.FINE),
                name="uniq_fine_billing_entry",
            ),
        ]
        indexes = [
            models.Index(
                fields=["student", "status"], name="billing_ent_student_c5361b_idx"
            ),
            models.Index(
                fields=["status", "created_at"], name="billing_ent_status_cedba5_idx"
            ),
            models.Index(
                fields=["coaching_class"], name="billing_ent_coachin_48bfc9_idx"
            ),
        ]

    def __str__(self):
        return f"BillingEntry {self.pk} ({self.source_type}) {self.student_id}"


class FineReason(models.TextChoices):
    ABSENCE = "absence", "Absence"
    LATE_CANCELLATION = "late_cancellation", "Late cancellation"


class FineStatus(models.TextChoices):
    PENDING_REVIEW = "pending_review", "Pending review"
    APPROVED = "approved", "Approved"
    WAIVED = "waived", "Waived"


class Fine(BaseModel):
    """
    Penalty candidate generated automatically at coaching completion for
    participants in ABSENT or LATE_CANCELLED status. Coordination reviews
    each fine and either approves it (creating a BillingEntry) or waives it.

    Lifecycle:
        pending_review → approved (with amount) → BillingEntry created
        pending_review → waived (no charge)

    Both APPROVED and WAIVED are terminal. To reverse an APPROVED fine,
    cancel the corresponding BillingEntry (Fine itself stays APPROVED).
    """

    coaching_class = models.ForeignKey(
        "coachings.CoachingClass",
        on_delete=models.PROTECT,
        related_name="fines",
    )
    coaching_participant = models.ForeignKey(
        "coachings.CoachingParticipant",
        on_delete=models.PROTECT,
        related_name="fines",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="fines",
    )

    reason = models.CharField(
        max_length=30,
        choices=FineReason.choices,
    )
    status = models.CharField(
        max_length=30,
        choices=FineStatus.choices,
        default=FineStatus.PENDING_REVIEW,
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Set on approval. Null while pending review or when waived.",
    )

    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_fines",
    )

    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "fines"
        ordering = ["-created_at"]
        permissions = [
            (
                "can_review_fine",
                "Can approve or waive fines",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__isnull=True) | Q(amount__gte=0),
                name="fine_amount_non_negative",
            ),
            # One live fine per coaching participant.
            models.UniqueConstraint(
                fields=("coaching_participant",),
                condition=Q(deleted_at__isnull=True),
                name="uniq_fine_per_coaching_participant",
            ),
        ]
        indexes = [
            models.Index(fields=["student", "status"], name="fine_student_status_idx"),
            models.Index(fields=["status", "created_at"], name="fine_status_crt_idx"),
            models.Index(fields=["coaching_class"], name="fine_coaching_class_idx"),
        ]

    def __str__(self):
        return f"Fine {self.pk} ({self.reason}) {self.student_id}"
