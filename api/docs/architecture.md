# Architecture & Development Patterns

## The golden rule

Every request follows this strict flow. No exceptions, no shortcuts.

```
URL → View (HTTP only) → Serializer (input validation) → Service (business logic) → Model (data)
```

Each layer talks only to the one below it. Business logic **never** lives in views.  
Rationale: services can be called from views, Celery tasks, management commands, and tests — without faking HTTP.

---

## Models

### Always extend `BaseModel`

```python
from core.models import BaseModel

class MyModel(BaseModel):
    name = models.CharField(max_length=100)
```

`BaseModel` provides:
- `created_at`, `updated_at`, `created_by`, `updated_by` — via `AuditMixin`
- `deleted_at`, `deleted_by` — via `SoftDeleteMixin`
- `objects` — soft-delete-filtered manager (default)
- `all_objects` — unfiltered manager (use when you need deleted records)

**Exception:** `User` extends `AbstractUser` and applies mixins directly.

### PKs

Always integer PKs. No UUID PKs on models.

### Status / enum fields

Always use `TextChoices` on the model, not separate lookup tables.

```python
class CoachingStatus(models.TextChoices):
    REQUESTED = "requested", "Requested"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    SCHEDULED = "scheduled", "Scheduled"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"
    REJECTED = "rejected", "Rejected"
```

### Soft delete

- `obj.delete(deleted_by=user)` — soft delete (sets `deleted_at`, `deleted_by`, `updated_at`)
- `MyModel.all_objects.get(pk=pk)` — fetch including deleted records
- Cascade soft-deletes must be handled **explicitly in the service layer**. Django's cascade bypasses `deleted_by`.
- `SoftDeleteQuerySet.delete()` must update `updated_at`.

### File uploads

```python
def upload_to_profile_photos(instance, filename):
    ext = filename.rsplit(".", 1)[-1]
    return f"profiles/{uuid.uuid4()}.{ext}"

photo = models.ImageField(upload_to=upload_to_profile_photos, null=True, blank=True)
original_photo_filename = models.CharField(max_length=255, blank=True, default="")
```

Store `original_filename` in DB for display. Never use the original filename in the path — UUID only on disk.

### File upload deduplication

PATCH/PUT service functions that accept image fields must skip writing a new file when the uploaded content is identical to the stored one. Compare using SHA-256 via `utils.files`:

```python
from utils.files import django_field_file_sha256, file_content_hash

def update_something(*, obj, updated_by=None, **data):
    new_file = data.get("photo")
    if new_file is not None and obj.photo:
        if file_content_hash(new_file) == django_field_file_sha256(obj.photo):
            data = {k: v for k, v in data.items() if k != "photo"}
    ...
```

| Scenario | Result |
|---|---|
| Same content re-uploaded | Existing path kept, no new file written |
| Different content uploaded | New file saved, DB path updated |
| No existing file | File always saved |

### File validation in serializers

```python
ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

def validate_photo(self, value):
    ext = value.name.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError("InvalidFileExtension")
    if value.size > MAX_SIZE_BYTES:
        raise ValidationError("FileTooLarge")
    return value
```

---

## Views

### Always `APIView`, never `ModelViewSet`

```python
class CoachingListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(...)
    def get(self, request):
        ...

    @extend_schema(...)
    @require_perm("coachings.add_coachingclass")
    def post(self, request):
        ...
```

### Auth vs. permission

- `permission_classes = [IsAuthenticated]` at class level.
- `@require_perm("app.codename")` at method level.
- **Never mix auth requirements in the same view class.** Split at distinct URLs when one method is public and another requires auth — mixing produces wrong status codes (401 vs 403).

### Decorator order

```python
@extend_schema(...)     # always first
@require_perm("...")    # always second
def post(self, request):
```

### Multipart + nested JSON

For endpoints combining file upload with structured data, use **Option B — JSON field inside multipart**:
- Frontend sends `Content-Type: multipart/form-data`
- JSON data in a `data` field (as a JSON string)
- Files as separate multipart parts
- Backend: `data = json.loads(request.data["data"])`

---

## Serializers

- Keep read and write serializers separate.
- Use `ChoiceField(choices=X.choices)` for enum fields, never `CharField`.
- Use `@extend_schema_field` on every `SerializerMethodField`.
- Use `PhotoUrlMixin` from `accounts` — never duplicate `get_photo_url`.
- Use serializer classes in `@extend_schema`, never raw JSON dicts.

---

## Services

All business logic here. Plain Python functions, keyword-only arguments throughout.

```python
@transaction.atomic
def create_coaching_request(*, teacher_id, modality_id, start_datetime, end_datetime, requesting_user, notes=""):
    ...
```

### Audit fields

```python
obj = MyModel(created_by=user, ...)   # on create
obj.updated_by = user; obj.save()     # on update
obj.delete(deleted_by=user)            # on soft delete
```

### Error handling

```python
from rest_framework.exceptions import NotFound, ValidationError

try:
    obj = MyModel.objects.get(pk=pk)
except MyModel.DoesNotExist:
    raise NotFound()

raise ValidationError({"messages": ["PascalCaseErrorCode"]})      # non-field
raise ValidationError({"field_name": ["PascalCaseErrorCode"]})    # field-level
```

Never raise `ValueError` — always DRF exceptions.  
Never catch `DoesNotExist` in views — handle in services.

### Transactions and side effects

```python
@transaction.atomic
def approve_coaching(*, pk, studio_id, total_price, user):
    coaching = CoachingClass.objects.select_for_update().get(pk=pk)
    # ... business logic ...
    coaching.save()
    transaction.on_commit(lambda cid=coaching.pk: send_approval_email.delay(cid))
    return coaching
```

- `@transaction.atomic` on all multi-step write paths.
- `transaction.on_commit` for all side effects (emails, Celery tasks).
- Never call `.delay()` directly inside a transaction.
- Always use default-argument capture in lambdas: `lambda uid=user.pk: task.delay(uid)`.

### Race conditions

Any approval checking availability must use `select_for_update()`:

```python
coaching = CoachingClass.objects.select_for_update().get(pk=pk)
```

Only `SCHEDULED` status blocks time for conflict detection.

### State machine pattern

```python
VALID_TRANSITIONS = {
    CoachingStatus.PENDING_APPROVAL: [CoachingStatus.REQUESTED],
    CoachingStatus.SCHEDULED: [CoachingStatus.PENDING_APPROVAL],
    ...
}

def _validate_status_transition(obj, target_status):
    allowed = VALID_TRANSITIONS.get(target_status, [])
    if obj.status not in allowed:
        raise ValidationError({"messages": ["InvalidStatusTransition"]})
```

Never allow bypassing intermediate states. Intermediate states must have explicit API transitions or they become unreachable dead states.

### N+1 prevention

```python
CoachingClass.objects.select_related(
    "teacher", "modality", "studio", "requested_by"
).prefetch_related("participants__student")
```

`select_related` → FK/OneToOne (JOIN). `prefetch_related` → reverse FK or M2M (separate query).

---

## Permissions

### `@require_perm`

```python
@require_perm("coachings.approve_coaching")
def post(self, request, pk):
    ...
```

Returns 403 if the user lacks the permission. Never use custom permission classes.

### Seeding

`seed_permissions` and `seed_roles` are the source of truth. Use `.set()` (replaces) not `.add()` (accumulates).

---

## Response contract

```json
{"data": {...}}                                              // success
{"errors": {"messages": ["PascalCaseCode"]}}                // non-field error
{"errors": {"field_name": ["PascalCaseCode"]}}              // field error
```

- All error codes are PascalCase i18n keys — never human strings.
- `DataEnvelopeAutoSchema` auto-wraps 2xx responses.
- `DEFAULT_ERROR_RESPONSES` must be spread into every `@extend_schema`.
- Global exception handler in `core/exceptions.py` shapes everything.

---

## Email

```python
# core/emails.py — never re-raises on failure
def send_coaching_confirmed_email(user_id, coaching_id):
    try:
        # send email
    except Exception:
        logger.exception("Failed to send email user=%s", user_id)
        # do NOT re-raise — called via on_commit
```

In dev, all emails are captured by Mailpit at `http://localhost:8025`.

---

## Logging

```python
import logging
logger = logging.getLogger(__name__)

logger.info("CoachingClass %s approved by user=%s", coaching.pk, user.pk)
```

Use placeholders, never f-strings. Use `RotatingFileHandler`, never `FileHandler`.  
Never log: passwords, tokens, NIF, document numbers.

---

## Absolute rules

- No `django.contrib.admin` or `admin.py` — API-only project.
- Never `return` an exception — always `raise`.
- Never raise `ValueError` in services — always DRF exceptions.
- Never `CORS_ALLOW_ALL_ORIGINS = True`.
- Never hardcode `SECRET_KEY`.
- Never store original filenames in upload paths — UUID only.
- Never hard delete — always soft delete.
- Never write business logic in views.
- Never duplicate `get_photo_url` — use `PhotoUrlMixin`.
- Never catch `DoesNotExist` in views — handle in services.
- Never send emails synchronously — Celery task + `transaction.on_commit`.
- Never call `.delay()` inside a transaction — always inside `on_commit`.
- Never register periodic tasks manually — always via data migration.
- Never use `CharField` for enum/choice fields — use `ChoiceField`.
- Never use `ModelViewSet` — always `APIView`.
- Never create custom permission classes — use `@require_perm`.
- Always `uv add <package>` for dependencies, keep `uv.lock` committed.
- Always run management commands via `docker compose exec api uv run python manage.py`.
