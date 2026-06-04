# Domain — Accounts

App: `accounts`

## Models

### `User` (extends `AbstractUser` + mixins directly)

| Field | Notes |
|-------|-------|
| `email` | Login identifier — no `username` |
| `first_name`, `last_name` | Required |
| `phone`, `phone_country_code` | Required |
| `date_of_birth` | Required |
| `internal_number` | School-assigned number |
| `is_active` | Soft deactivation |
| `parent_id` | Self-FK — links student to their guardian user |
| `nif`, `nationality`, `document_number`, `document_expiry` | Personal identity |
| `address`, `postal_code` | |
| `enrollment_id` | FK to `enrollments.Enrollment` |
| `language` | Preference (read-only via `/me/` currently) |

Custom permission on User model:
- `can_teach` — controls whether a user can be assigned modalities as a teacher. Enforced in `add_user_modality`.

### `Role`

```python
class Role(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)  # e.g. "direction", "teacher"
    description = models.CharField(max_length=255)
```

Maps to Django Groups. Permissions assigned via `seed_roles`.

### `Profile`

```python
class Profile(BaseModel):
    user = models.OneToOneField(User)
    display_name = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to=upload_to_profile_photos)
    original_photo_filename = models.CharField(...)
```

---

## Roles

| Code | Description |
|------|-------------|
| `direction` | Full access — school directors |
| `coordination` | Operational management — approves coachings, manages enrollments |
| `staff` | General staff |
| `teacher_internal` | Internal teacher |
| `teacher_external` | External teacher |
| `parent` | Guardian of a student |
| `student` | Active student |

---

## Key services

| Function | Notes |
|----------|-------|
| `create_user(...)` | Via `UserManager.create_user()`. Default `is_active=True`. |
| `add_user_modality(...)` | Checks `can_teach` before linking. |
| `remove_user_modality(...)` | Soft-deletes the link. |

---

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/accounts/token/` | Obtain JWT pair |
| POST | `/api/accounts/token/refresh/` | Refresh access token |
| POST | `/api/accounts/token/blacklist/` | Logout |
| GET | `/api/accounts/me/` | Bootstrap — user + profile + role + permissions |
| PATCH | `/api/accounts/me/` | Update profile |
| POST | `/api/accounts/me/photo/` | Upload photo |
| GET | `/api/accounts/users/` | List users (admin) |
| POST | `/api/accounts/users/` | Create user — **test-only** |
| GET/PATCH | `/api/accounts/users/<pk>/` | Detail / update |
| GET/POST | `/api/accounts/users/<pk>/modalities/` | List / assign modalities |
| DELETE | `/api/accounts/users/<pk>/modalities/<mid>/` | Remove modality |

> `POST /api/accounts/users/` is test-only. Production onboarding = invite link flow (not built) + enrollment flow.

---

## Auth flow

- Access token: short-lived (minutes)
- Refresh token: 7 days, rotation + blacklist on logout
- Token cleanup: `flushexpiredtokens` via Celery Beat periodic task

---

## Patterns

### `PhotoUrlMixin`

Defined in `accounts`. Provides `get_photo_url(obj, request)`. Never duplicate this — import and use it.

### `MeSerializer` vs `UserResponseSerializer`

Known inconsistency: `MeSerializer.get_role` returns a list; `UserResponseSerializer.get_role` returns a single object. Align them.

### Seeds

```bash
docker compose exec api uv run python manage.py seed_permissions
docker compose exec api uv run python manage.py seed_roles
```

Run after any change to `Meta.permissions` or role structure. Uses `.set()` internally.
