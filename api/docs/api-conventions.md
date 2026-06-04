# API Conventions

## Response contract

### Success (2xx)

```json
{"data": {"id": 1, "name": "Example"}}
```

`DataEnvelopeAutoSchema` auto-wraps 2xx — no manual wrapping in views.

### Errors

```json
{"errors": {"messages": ["PascalCaseErrorCode"]}}           // non-field
{"errors": {"email": ["InvalidEmailFormat"]}}                // field-level
{"errors": {"messages": ["X"], "field": ["Y"]}}             // mixed
```

All error codes are **PascalCase i18n keys** — never human-readable strings.  
Global handler in `core/exceptions.py` shapes all errors — views always `raise`, never hand-build.

HTTP status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`.

---

## drf-spectacular rules

```python
@extend_schema(
    summary="List coaching classes",
    parameters=[OpenApiParameter("status", str)],
    responses={200: CoachingResponseSerializer, **DEFAULT_ERROR_RESPONSES},
)
def get(self, request): ...

@extend_schema(
    summary="Create a coaching request",
    request=CoachingCreateSerializer,
    responses={201: CoachingResponseSerializer, **DEFAULT_ERROR_RESPONSES},
)
@require_perm("coachings.add_coachingclass")
def post(self, request): ...
```

- `**DEFAULT_ERROR_RESPONSES` on every `responses={}`.
- `@extend_schema_field` on every `SerializerMethodField`.
- `inline_serializer` names must be **globally unique** across the whole project.
- Always use serializer classes in `@extend_schema`, never raw JSON dicts.
- Decorator order: `@extend_schema` first, `@require_perm` second.

---

## URL conventions

| Pattern | Example |
|---------|---------|
| Resource list/create | `/api/<app>/<resource>/` |
| Resource detail | `/api/<app>/<resource>/<pk>/` |
| State transition | `/api/<app>/<resource>/<pk>/<action>/` |
| Sub-resource | `/api/<app>/<resource>/<pk>/<sub>/` |

---

## Authentication

```
Authorization: Bearer <access_token>
```

All views default to `IsAuthenticated`. Public endpoints need explicit `permission_classes = [AllowAny]`.

---

## Common error codes

| Code | When |
|------|------|
| `InvalidStatusTransition` | State machine transition not allowed |
| `NotTheAssignedTeacher` | Teacher acting on another's coaching |
| `StudioModalityIncompatible` | Studio doesn't support the coaching modality |
| `TeacherScheduleConflict` | Teacher has a SCHEDULED coaching at that time |
| `StudioScheduleConflict` | Studio booked at that time |
| `CoachingNotEditable` | Edit attempted in a terminal state |
| `CoachingMissingTotalPrice` | `total_price` is null at completion |
| `CoachingTotalPriceRequired` | `total_price` required for approval |
| `UserCannotTeach` | User lacks `can_teach` permission |
| `EntryNotCancellable` | Billing entry not in `pending` state |
| `CancellationNotesRequired` | Notes empty or whitespace-only on cancel |
| `InvalidDateRange` | `start_datetime >= end_datetime` |
| `InvalidFileExtension` | Disallowed file extension |
| `FileTooLarge` | File exceeds max size |

---

## File uploads

- Allowed: `jpg`, `jpeg`, `png`, `webp`, `pdf` (varies by endpoint).
- Max size: 5 MB (10 MB for enrollment proof).
- Paths: UUID-based, never original filename on disk.
- `original_filename` stored in DB for display.

---

## Multipart + JSON (enrollment pattern)

For endpoints needing both file upload and nested structured data:

```python
parser_classes = [MultiPartParser, FormParser, JSONParser]
```

Frontend sends multipart with `data` field as a JSON string. Backend:

```python
data = json.loads(request.data["data"])
files = request.FILES
```

---

## Frontend client generation

```bash
npx swagger-typescript-api -p http://localhost:8000/api/schema/ -o ./src/api --axios
```

`@extend_schema` coverage is mandatory — missing annotations break the generated TypeScript client.
