import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from core.models import BaseModel


def event_file_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"events/files/{uuid.uuid4()}{ext}"


def event_cover_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"events/covers/{uuid.uuid4()}{ext}"


class EventVisibilityState(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled", "Scheduled"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class EventState(models.TextChoices):
    PLANNED = "planned", "Planned"
    DATE_TBD = "date_tbd", "Date TBD"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"


class NotificationDelivery(models.TextChoices):
    NONE = "none", "None"
    NOTIFICATION_TEST = "notification_test", "Notification test"
    NOTIFICATION = "notification", "Notification"


class NotificationTarget(models.TextChoices):
    ALL = "all", "All"
    CLASSES = "classes", "Classes"


class Event(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    body = models.TextField(blank=True)

    cover_photo = models.ImageField(
        upload_to=event_cover_path,
        blank=True,
    )
    location = models.CharField(max_length=255, blank=True)
    event_date = models.DateTimeField(null=True, blank=True)

    event_state = models.CharField(
        max_length=20,
        choices=EventState.choices,
        default=EventState.PLANNED,
    )
    visibility_state = models.CharField(
        max_length=20,
        choices=EventVisibilityState.choices,
        default=EventVisibilityState.DRAFT,
    )
    contact_info = models.TextField(blank=True)
    publication_scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    notification_target = models.CharField(
        max_length=20,
        choices=NotificationTarget.choices,
        default=NotificationTarget.ALL,
    )

    class Meta:
        permissions = [
            ("can_view_unpublished_event", "Can view unpublished event"),
            ("can_publish_event", "Can publish event"),
            ("can_schedule_event_publication", "Can schedule event publication"),
            ("can_archive_event", "Can archive event"),
            ("can_cancel_event", "Can cancel event"),
            ("can_complete_event", "Can complete event"),
        ]

    def __str__(self):
        return self.title


class EventClassTarget(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="class_targets",
    )
    classe = models.ForeignKey(
        "classes.Classe",
        on_delete=models.PROTECT,
        related_name="event_targets",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "classe"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_event_class_target",
            ),
        ]

    def __str__(self):
        return f"Event {self.event_id} → classe {self.classe_id}"


class EventFile(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="files",
    )
    file = models.FileField(upload_to=event_file_path)
    file_name = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.file_name or f"File #{self.pk}"


class EventComment(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_comments",
    )
    body = models.TextField()
    parent_comment = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )

    class Meta:
        permissions = [
            ("can_moderate_eventcomment", "Can moderate event comment"),
        ]

    def __str__(self):
        return f"Comment #{self.pk}"


class EventInterest(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="interests",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="event_interests",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["event", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_event_interest_per_user",
            ),
        ]

    def __str__(self):
        return f"Interest #{self.pk}"


class EventPost(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    title = models.CharField(max_length=255)
    body = models.TextField()

    publication_scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        permissions = [
            ("can_view_unpublished_eventpost", "Can view unpublished post"),
            ("can_publish_eventpost", "Can publish event post"),
            (
                "can_schedule_eventpost_publication",
                "Can schedule event post publication",
            ),
        ]

    def __str__(self):
        return self.title
