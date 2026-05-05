from django.conf import settings
from django.db import models

from core.models import BaseModel


class Classe(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "classes"
        ordering = ["name"]
        permissions = [
            ("can_manage_classes", "Can create, edit, and delete classes"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_classe_name",
            ),
        ]

    def __str__(self):
        return self.name


class ClasseMember(BaseModel):
    classe = models.ForeignKey(
        Classe,
        on_delete=models.CASCADE,
        related_name="members",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="classe_memberships",
    )

    class Meta:
        db_table = "classe_members"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["classe", "student"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_classe_member",
            ),
        ]

    def __str__(self):
        return f"{self.student_id} in classe {self.classe_id}"
