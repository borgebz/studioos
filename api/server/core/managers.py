from django.db import models


class SoftDeleteQuerySet(models.QuerySet):
    """QuerySet that filters out soft-deleted records by default."""

    def delete(self):
        """Soft delete all records in the queryset."""
        return self.update(deleted_at=models.functions.Now())

    def hard_delete(self):
        """Permanently delete all records in the queryset."""
        return super().delete()

    def alive(self):
        """Return only non-deleted records."""
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        """Return only soft-deleted records."""
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    """Default manager that excludes soft-deleted records."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()


class AllObjectsManager(models.Manager):
    """Manager that includes soft-deleted records."""

    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db)