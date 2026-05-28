from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models

from core.models import BaseModel
from modality.models import Modality
from studios.models import Studio


class CoachingStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    SCHEDULED = "scheduled", "Scheduled"
    WAITING_CONFIRMATION = "waiting_confirmation", "Waiting Confirmation"
    PENDING_COMPLETION_APPROVAL = (
        "pending_completion_approval",
        "Pending Completion Approval",
    )
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"


class CoachingParticipantStatus(models.TextChoices):
    INVITED = "invited", "Invited"
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    PENDING_COMPLETION = "pending_completion", "Pending Completion"
    ATTENDED = "attended", "Attended"
    ABSENT = "absent", "Absent"
    CANCELLED = "cancelled", "Cancelled"
    LATE_CANCELLED = "late_cancelled", "Late Cancelled"


class RecurrenceType(models.TextChoices):
    DAILY = "daily", "Daily"
    WEEKLY = "weekly", "Weekly"
    BIWEEKLY = "biweekly", "Biweekly"
    MONTHLY = "monthly", "Monthly"


class CoachingClass(BaseModel):
    """
    A single coaching session — either a regular timetable entry (scheduled directly
    by coordination) or an extra coaching requested by a student/parent.
    Status drives the lifecycle. Only `scheduled` blocks time for conflict detection.
    """

    status = models.CharField(
        max_length=30,
        choices=CoachingStatus.choices,
        default=CoachingStatus.REQUESTED,
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="coaching_classes_as_teacher",
    )
    modality = models.ForeignKey(
        Modality,
        on_delete=models.PROTECT,
        related_name="coaching_classes",
    )
    studio = models.ForeignKey(
        Studio,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="coaching_classes",
    )

    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)

    is_billable = models.BooleanField(
        default=True,
        help_text=(
            "If False, complete_coaching does not generate billing entries. "
            "Only set or changed for coordination-scheduled coachings (no requester); "
            "student-requested coachings keep billing defaults from workflow."
        ),
    )

    total_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Set by coordination at approval.",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="coaching_classes_requested",
    )

    rejection_reason = models.TextField(blank=True, default="")
    rejected_at = models.DateTimeField(null=True, blank=True)

    cancellation_reason = models.TextField(blank=True, default="")
    cancelled_at = models.DateTimeField(null=True, blank=True)

    teacher_notes = models.TextField(blank=True, default="")
    teacher_confirmed_at = models.DateTimeField(null=True, blank=True)
    teacher_confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="coaching_classes_teacher_confirmed",
    )

    notes = models.TextField(blank=True, default="")

    classe = models.ForeignKey(
        "classes.Classe",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="coaching_classes",
    )

    recurring_coaching = models.ForeignKey(
        "coachings.RecurringCoaching",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sessions",
        help_text="Links this session to a recurrence series.",
    )

    class Meta:
        db_table = "coaching_classes"
        ordering = ["start_datetime"]
        permissions = [
            (
                "can_accept_coaching_as_teacher",
                "Can accept coaching requests as the assigned teacher",
            ),
            (
                "can_reject_coaching_as_teacher",
                "Can reject coaching requests as the assigned teacher",
            ),
            (
                "can_schedule_coaching",
                "Can create coachings via coordination scheduling (direct schedule)",
            ),
        ]

    def __str__(self):
        return f"{self.teacher_id} | {self.modality_id} | {self.start_datetime}"


class CoachingParticipant(BaseModel):
    """
    A student enrolled in a coaching class.
    individual_price is computed (total_price / participant_count) —
    stored on the billing entry at completion, not here.
    """

    coaching_class = models.ForeignKey(
        CoachingClass,
        on_delete=models.CASCADE,
        related_name="participants",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="coaching_participations",
    )

    status = models.CharField(
        max_length=30,
        choices=CoachingParticipantStatus.choices,
        default=CoachingParticipantStatus.PENDING,
    )
    invited_by_staff = models.BooleanField(
        default=False,
        help_text=(
            "True when a coordination/direction user invited this student "
            "(invite → accept becomes active without a pending approval step)."
        ),
    )

    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, default="")

    class Meta:
        db_table = "coaching_participants"
        ordering = ["created_at"]
        permissions = [
            (
                "can_confirm_dependent_coaching_attendance",
                "Can confirm attendance for a dependent participant",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["coaching_class", "student"],
                condition=models.Q(deleted_at__isnull=True)
                & ~models.Q(
                    status__in=[
                        CoachingParticipantStatus.CANCELLED,
                        CoachingParticipantStatus.LATE_CANCELLED,
                    ]
                ),
                name="unique_active_coaching_participant",
            )
        ]

    def __str__(self):
        return f"{self.student_id} in coaching {self.coaching_class_id}"


class RecurringCoaching(BaseModel):
    """
    Recurrence pattern. The first session’s time window lives on
    :class:`CoachingClass` that references this row via ``recurring_coaching``.
    """

    recurrence_type = models.CharField(
        max_length=20,
        choices=RecurrenceType.choices,
    )
    recurrence_interval = models.PositiveIntegerField(
        default=1,
        help_text="Repeat every N periods (e.g. 2 = every other week when type is weekly).",
    )

    days_of_week = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text='For weekly patterns: comma-separated weekday codes, e.g. "MO,WE".',
    )
    end_date = models.DateField(null=True, blank=True)
    occurrences_count = models.PositiveIntegerField(null=True, blank=True)

    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "recurring_coachings"
        ordering = ["id"]

    def clean(self):
        super().clean()
        if self.end_date and self.occurrences_count:
            raise DjangoValidationError(
                {"occurrences_count": ["RecurringEndDateAndOccurrencesExclusive"]}
            )
