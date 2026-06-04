# Testing

## Setup

- **Framework:** pytest + pytest-django
- **Location:** `tests/` at project root (not inside app folders)
- **DB tests:** mark with `@pytest.mark.django_db`
- **Fixtures:** `tests/conftest.py`
- **Architecture tests:** `tests/test_architecture_layers.py`
- **Run:** `docker compose exec api uv run pytest`

---

## Architecture layer tests

`tests/test_architecture_layers.py` enforces:
- Views don't import from services of other apps
- Services don't import from views
- Models don't contain business logic

**Every new app must be added to this file.**

---

## Testing strategy

### Prefer service tests over HTTP tests

```python
@pytest.mark.django_db
def test_approve_coaching_sets_scheduled(user_direction, coaching_requested, studio):
    coaching = approve_coaching(
        pk=coaching_requested.pk,
        studio_id=studio.pk,
        total_price=Decimal("30.00"),
        user=user_direction,
    )
    assert coaching.status == CoachingStatus.SCHEDULED
    assert coaching.studio == studio
```

Service tests are cheaper, faster, and more focused than HTTP tests.

### View / endpoint tests (integration)

```python
@pytest.mark.django_db
def test_approve_coaching_endpoint(api_client, user_direction, coaching_pending_approval):
    api_client.force_authenticate(user=user_direction)
    response = api_client.post(f"/api/coachings/{coaching_pending_approval.pk}/approve/", {...})
    assert response.status_code == 200
```

---

## Test plans (defined, not yet written)

### Billing split algorithm (pure, no DB) — `tests/billing/test_split.py`

| Input | Expected |
|-------|---------|
| total=30.00, n=1 | [30.00] |
| total=30.00, n=2 | [15.00, 15.00] |
| total=10.00, n=3 | [3.34, 3.33, 3.33] (first absorbs cent) |
| total=10.01, n=3 | [3.35, 3.33, 3.33] |
| total=0.01, n=3 | [0.01, 0.00, 0.00] |
| n=0 | [] |
| invariant | `sum(split(total, n)) == total` for many pairs |

### Billing entries creation — `tests/billing/test_create_entries.py`

- Happy path N=1: one entry, `amount_due = total_price`, `status=pending`
- Happy path N=2 exact split
- Happy path N=3 with cent remainder, deterministic order by `created_at`
- Only `ATTENDED` generates entry; `ABSENT`, `CANCELLED`, `LATE_CANCELLED` ignored
- Zero `ATTENDED` → empty list, no exception
- `is_billable=False` → empty list
- `total_price=0` → empty list
- `total_price=None` → `ValidationError("CoachingMissingTotalPrice")`
- Duplicate call → `IntegrityError` from unique constraint

### Billing integration with `complete_coaching` — `tests/coachings/test_complete_coaching_billing.py`

- Billable completion creates expected entries
- `is_billable=False` completes without entries
- Billing failure → rollback of completion (coaching stays in `PENDING_COMPLETION_APPROVAL`)
- Zero `ATTENDED` → completes without entries

### Coaching approve guards — `tests/coachings/test_approve_coaching.py`

- `total_price=None` → `ValidationError("CoachingTotalPriceRequired")`, no transition
- `total_price=0` → approve succeeds, status = `SCHEDULED`
- Studio-modality incompatible → `ValidationError("StudioModalityIncompatible")`
- Teacher conflict → `ValidationError("TeacherScheduleConflict")`
- Studio conflict → `ValidationError("StudioScheduleConflict")`

### Billing entry cancellation — `tests/billing/test_cancel_entry.py`

- Cancel `pending` with valid notes → `status=cancelled`, `cancelled_at` set
- Cancel `exported` → `ValidationError("EntryNotCancellable")`
- Cancel already `cancelled` → same
- Empty/whitespace notes → `ValidationError("CancellationNotesRequired")`
- Without permission → 403

---

## Academic requirements

| Phase | Requirement |
|-------|-------------|
| Phase 2 (vBeta) | Manual + automated test evidence; unit + integration tests |
| Phase 3 (vRTW) | Full automated coverage of **all business processes**; no known or unknown bugs |

Business processes requiring full automated coverage by Phase 3:
1. Coaching booking → teacher accept → coordination approve → completion → billing
2. Enrollment submission → review → approval
3. Inventory listing → interest → transaction → return
4. (User onboarding via invite — if implemented)

---

## Fixtures skeleton

```python
# tests/conftest.py

@pytest.fixture
def user_direction(db):
    return create_user(email="dir@test.com", role_code="direction", ...)

@pytest.fixture
def user_teacher(db):
    return create_user(email="teacher@test.com", role_code="teacher_internal", ...)

@pytest.fixture
def coaching_requested(db, user_teacher, modality):
    return CoachingClass.objects.create(status="requested", teacher=user_teacher, ...)

@pytest.fixture
def coaching_pending_approval(coaching_requested):
    coaching_requested.status = "pending_approval"
    coaching_requested.save()
    return coaching_requested
```

---

## What NOT to test

- Django internals (that `.save()` persists a field).
- Logic tested via HTTP when a direct service call covers the same thing.
- Don't skip architecture layer tests when adding new apps.
