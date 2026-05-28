from django.db import models

from core.models import BaseModel
from modality.models import Modality


class Studio(BaseModel):
    """
    A physical room / studio in the school where classes take place.
    """

    name = models.CharField(max_length=255, unique=True)
    max_capacity = models.PositiveIntegerField(
        help_text="Maximum number of people allowed in this studio.",
    )
    description = models.TextField(blank=True, default="")
    modalities = models.ManyToManyField(
        Modality,
        through="StudioModality",
        related_name="studios",
        blank=True,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class StudioModality(BaseModel):
    """
    Links a studio to the modalities it supports.
    A coaching / class can only be booked in a studio compatible with its modality.
    """

    studio = models.ForeignKey(
        Studio,
        on_delete=models.CASCADE,
        related_name="studio_modalities",
    )
    modality = models.ForeignKey(
        Modality,
        on_delete=models.CASCADE,
        related_name="studio_modalities",
    )

    class Meta:
        verbose_name_plural = "studio modalities"
        ordering = ["studio", "modality"]
        constraints = [
            models.UniqueConstraint(
                fields=["studio", "modality"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_studio_modality",
            ),
        ]

    def __str__(self):
        return f"{self.studio.name} — {self.modality.name}"
