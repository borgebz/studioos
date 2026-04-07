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
