import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from core.models import BaseModel

#função upload de ficheiros
def event_file_path(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"events/files/{uuid.uuid4()}{ext}"

class EventVisibilityState(models.TextChoices):
    DRAFT = "draft", "Draft"
    SCHEDULED = "scheduled","Scheduled"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"

class EventState(models.TextChoices):
    PLANNED = "planned", "Planned"
    DATE_TBD = "date_tdb", "Date TBD"
    CANCELLED = "cancelled", "Canceled"
    COMPLETED =  "completed", "Completed"

class Event(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    body = models.TextField(blank=True)

    cover_photo_url = models.URLField(blank=True)
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

    class Meta:
        permissions = [
            ("can_view_unpublished_event", "Can view unpublished event"),
            ("can_published_event", "Can publish event"),
            ("can_shedule_event_publication", "Can schedule event publication"),
            ("can_archive_event", "Can archive event"),
            ("can_cancel_event", "Can cancel event"),
            ("can_complete_event", "Can complete event"),
        ]
    def __str__(self):
        return self.title

class EventFile(BaseModel):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="files",
    )

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
                fields=["event","user"],
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
            ("can_published_eventpost", "Can publish event post"),
            ("can_schedule_eventpost_publication", "Can schedule event post publication"),
        ]

    def __str__(self):
        return self.title