from django.conf import settings
from django.db import models

from core.models import BaseModel
from modality.models import Modality


class Weekday(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class TeacherAvailability(BaseModel):
    """
    A time window during which a teacher signals availability.
    Informational only — does not gate coaching requests.
    """

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="availability_blocks",
    )
    modality = models.ForeignKey(
        Modality,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="availability_blocks",
        help_text="If set, this window is specific to this modality. Null means any modality.",
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    notes = models.TextField(blank=True, default="")

    class Meta:
        db_table = "teacher_availability"
        ordering = ["start_datetime"]
        permissions = [
            (
                "can_manage_teacher_availability_for_others",
                "Can view and manage availability for any teacher",
            ),
        ]

    def __str__(self):
        return f"{self.teacher_id} | {self.start_datetime} – {self.end_datetime}"


class RecurringAvailability(BaseModel):
    """
    A recurring weekly availability rule attached to a TeacherAvailability.
    Defines a repeating pattern: weekday(s) + time window + validity period.
    """

    availability = models.OneToOneField(
        TeacherAvailability,
        on_delete=models.CASCADE,
        related_name="recurring",
    )
    days_of_week = models.CharField(
        max_length=20,
        help_text="Comma-separated weekday integers (0=Mon..6=Sun), e.g. '0,2,4' for Mon/Wed/Fri.",
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    valid_from = models.DateField(
        help_text="Inclusive start date for this recurrence to apply.",
    )
    valid_until = models.DateField(
        null=True,
        blank=True,
        help_text="Inclusive end date. Null means open-ended.",
    )

    class Meta:
        db_table = "recurring_availability"
        ordering = ["valid_from"]

    def __str__(self):
        return f"recurring for availability={self.availability_id} | days={self.days_of_week}"

    def get_weekday_list(self):
        return [int(d.strip()) for d in self.days_of_week.split(",") if d.strip()]
