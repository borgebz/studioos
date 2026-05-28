from django.conf import settings
from django.db import models

from core.models import BaseModel


class Modality(BaseModel):
    """
    A dance modality / discipline offered by the school.
    Examples: Ballet Clássico, Hip-Hop, Dança Contemporânea.
    """

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, default="")
    max_capacity = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of students for this modality, if applicable.",
    )
    min_age_months = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Minimum student age in months for eligibility.",
    )
    max_age_months = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Maximum student age in months for eligibility.",
    )

    class Meta:
        db_table = "modality"
        verbose_name_plural = "modalities"
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserModality(BaseModel):
    """
    Links a user (typically a teacher) to a modality they teach.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_modalities",
    )
    modality = models.ForeignKey(
        Modality,
        on_delete=models.CASCADE,
        related_name="user_modalities",
    )

    class Meta:
        db_table = "user_modalities"
        ordering = ["modality__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "modality"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_user_modality",
            ),
        ]

    def __str__(self):
        return f"{self.user_id} — {self.modality.name}"
