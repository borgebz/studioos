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
