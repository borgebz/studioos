from django.db import models
from django.conf import settings
from django.utils import timezone

from core.managers import AllObjectsManager, SoftDeleteManager

# Create your models here.

class AuditMixin(models.Model):
    """Adds created/updated timestamps and user tracking."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """Adds soft delete support with deleted_at and deleted_by fields."""

    deleted_at = models.DateTimeField(null=True, blank=True, default=None)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False, deleted_by=None):
        """Soft delete — sets deleted_at instead of removing the record."""
        self.deleted_at = timezone.now()
        self.deleted_by = deleted_by
        self.save(update_fields=["deleted_at", "deleted_by", "updated_at"])

    def hard_delete(self, using=None, keep_parents=False):
        """Permanently delete the record from the database."""
        return super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        """Restore a soft-deleted record."""
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=["deleted_at", "deleted_by", "updated_at"])

    @property
    def is_deleted(self):
        return self.deleted_at is not None


class BaseModel(AuditMixin, SoftDeleteMixin):
    """
    Abstract base model for all StudioOS models.

    Provides:
    - created_at, updated_at (automatic timestamps)
    - created_by, updated_by (user tracking)
    - deleted_at, deleted_by (soft delete)
    - objects manager (excludes soft-deleted)
    - all_objects manager (includes soft-deleted)
    """

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True