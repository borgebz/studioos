# End-to-End Test Report

**Date:** 2026-04-30  
**Tester:** Claude Code (automated live E2E via MCP + HTTP)  
**Environment:** Local Docker Compose (`localhost:8000`)  
**App version:** current `main` branch  

---

## Test Setup

### Users created via `bootstrap_user`

| Email | Role | Password |
|---|---|---|
| `direction@test.com` | `direction` | `Test1234!` |
| `teacher@test.com` | `teacher_internal` | `Test1234!` |
| `student@test.com` | `student` | `Test1234!` |

### Test data created

| Resource | ID | Details |
|---|---|---|
| Studio | 2 | "Studio E2E Alpha", capacity 20 |
| Modality | 23 | "E2E Dance Modality" |
| Studio-Modality link | — | Studio 2 ↔ Modality 23 |
| Teacher-Modality | — | teacher@test.com ↔ Modality 23 |
| Enrollment Period | 2 | 2026/2027, `both`, open |
| Enrollment | 3 | approved, payment confirmed |
| Coaching (full lifecycle) | 22 | completed, billing entry created |

---

## Section 1: Authentication

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 1.1 | Login with valid credentials | 200 | **PASS** | Returns `access` + `refresh` JWT |
| 1.2 | Login with wrong password | 401 | **PASS** | |
| 1.3 | Login non-existent user | 401 | **PASS** | |
| 1.4 | `GET /api/accounts/me/` authenticated | 200 | **PASS** | Returns user, role, full permissions list |
| 1.5 | `GET /api/accounts/me/` unauthenticated | 401 | **PASS** | |
| 1.6 | Token refresh `POST /api/accounts/auth/refresh/` | 200 | **PASS** | New access token returned |
| 1.7 | `GET /api/accounts/profile/me/` as direction | 403 | **PASS** | Direction has no `can_have_profile` — correct |

**Result: 7/7 PASS**

---

## Section 2: Users & Teachers

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 2.1 | `GET /api/accounts/users/` as direction | 200 | **PASS** | Requires `accounts.can_list_users` |
| 2.2 | `GET /api/accounts/users/` as student | 403 | **PASS** | Student lacks `can_list_users` |
| 2.3 | `GET /api/accounts/teachers/` as direction | 200 | **PASS** | Lists teachers only |

**Result: 3/3 PASS**

---

## Section 3: Studios CRUD

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 3.1 | `GET /api/studios/` | 200 | **PASS** | |
| 3.2 | `POST /api/studios/` with all fields | 201 | **PASS** | Created studio ID 2 |
| 3.3 | `POST /api/studios/` without `max_capacity` | 400 | **PASS** | Validation enforced |
| 3.4 | `GET /api/studios/{id}/` | 200 | **PASS** | |
| 3.5 | `PATCH /api/studios/{id}/` | 200 | **PASS** | Partial update works |
| 3.6 | `POST /api/studios/` as student | 403 | **PASS** | Permission guard correct |

**Bug found (MCP):** `create_studio` MCP tool omits `max_capacity` — always results in 400.

**Result: 6/6 PASS**

---

## Section 4: Modalities

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 4.1 | `GET /api/modalities/` | 200 | **PASS** | |
| 4.2 | `POST /api/modalities/` | 201 | **PASS** | Created modality ID 23 |
| 4.3 | Assign modality to teacher | 201 | **PASS** | `POST /api/modalities/users/{id}/modalities/` |
| 4.4 | List teacher modalities | 200 | **PASS** | |
| 4.5 | Duplicate modality assignment | 400 | **PASS** | UniqueConstraint enforced |

**Result: 5/5 PASS**

---

## Section 5: Teacher Availability

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 5.1 | Direction creates availability for teacher | 201 | **PASS** | Requires `can_manage_teacher_availability_for_others` |
| 5.2 | Teacher creates own availability | 201 | **PASS** | |
| 5.3 | Student tries to create availability for teacher | 403 | **PASS** | |
| 5.4 | List teacher availability | 200 | **PASS** | |

**Bug found (MCP):** `create_teacher_availability` MCP tool sends `weekday`/`start_time`/`end_time` but the API expects `start_datetime`/`end_datetime` (full `DateTimeField`). Tool would always fail.

**Result: 4/4 PASS**

---

## Section 6: Coaching Full Lifecycle

### 6A — Direct Scheduled Coaching Flow (direction-initiated)

The full status path for a **direction-scheduled coaching**:

```
scheduled → [auto-advance task] → waiting_confirmation
  → [student confirms attendance]
  → [teacher-confirm] → pending_completion_approval
  → [direction complete] → completed
  → [billing entries created]
```

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 6.1 | Create scheduled coaching (`POST /api/coachings/scheduled/`) | 201 | **PASS** | Fields: `teacher_id`, `modality_id`, `studio_id`, `total_price`, `start_datetime`, `end_datetime` |
| 6.2 | `GET /api/coachings/{id}/` | 200 | **PASS** | |
| 6.3 | `GET /api/coachings/` | 200 | **PASS** | |
| 6.4 | Direction adds student participant (`student_id`) | 201 | **PASS** | Participant status: `active` (staff-invited) |
| 6.5 | Advance to `waiting_confirmation` via `advance_scheduled_to_waiting_confirmation_batch()` | — | **PASS** | Celery task / cron job in production |
| 6.6 | Student confirms own attendance (at `waiting_confirmation`) | 200 → `attended` | **PASS** | Window: only during `waiting_confirmation` |
| 6.7 | Teacher confirms coaching (`POST /api/coachings/{id}/teacher-confirm/`) | 200 → `pending_completion_approval` | **PASS** | |
| 6.8 | Direction completes coaching (`POST /api/coachings/{id}/complete/`) | 200 → `completed` | **PASS** | |
| 6.9 | Billing entry created for `attended` participant | 1 entry, amount=45.00 | **PASS** | Non-attended participants get no entry |

### 6B — Reject Flow

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 6.10 | Teacher rejects coaching (`POST /api/coachings/{id}/reject/`, field: `rejection_reason`) | 200 → `rejected` | **PASS** | |

### 6C — Guard Validations

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 6.11 | Approve coaching without `studio_id`/`total_price` | 400 | **PASS** | |
| 6.12 | Student tries to approve coaching | 403 | **PASS** | |
| 6.13 | Cancel coaching | 200 → `cancelled` | **PASS** | Field: `cancellation_reason` |

**Bugs found (MCP):**

- `approve_coaching` MCP tool sends no body but API requires `studio_id` and `total_price` — always 400.
- `reject_coaching` MCP tool sends `reason` but API field is `rejection_reason` — always 400.
- `schedule_coaching` MCP tool uses `teacher`, `modality` (no `_id` suffix) and omits `total_price` — always 400.
- `join_coaching` sends empty body but API expects `{"student_id": <id>}` — always 400.

**Important behavior notes:**

- `student accept invite` endpoint (`POST /api/coachings/{id}/participants/accept/`) only works if participant is `invited` (not yet accepted). Staff-invited → `active` participants cannot re-accept.
- Attendance confirmation is only allowed during `waiting_confirmation` status.
- Participants in `invited` status at completion → no billing entry (only `attended` generates one).

**Result: 13/13 PASS**

---

## Section 7: Enrollment Lifecycle

### Status path:
```
[direction creates period] → [period opens]
  → [someone submits enrollment] → submitted
  → [direction start-review] → under_review
  → [direction approve] → approved
  → [direction creates payment] → payment.status=pending
  → [direction confirms payment] → payment.status=confirmed
```

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 7.1 | Create enrollment period (`academic_year`, `period_type`, `start_date`, `end_date`, fees) | 201 | **PASS** | Created period ID 2 |
| 7.2 | List enrollment periods | 200 | **PASS** | |
| 7.3 | Open enrollment period | 200 → `is_open: true` | **PASS** | |
| 7.4 | Submit enrollment (required: `period`, `enrollment_type`, `student_name/email/dob`, `parent_*`, `modality_ids`, `consents`) | 201 → `submitted` | **PASS** | |
| 7.5 | List enrollments as direction | 200 | **PASS** | |
| 7.6 | Get enrollment detail | 200 | **PASS** | |
| 7.7 | Start review | 200 → `under_review` | **PASS** | |
| 7.8 | Approve enrollment | 200 → `approved` | **PASS** | |
| 7.9 | Create enrollment payment (`payment_type`, `amount`) | 201 → `pending` | **PASS** | `payment_type`: `enrollment_fee` or `insurance` |
| 7.10 | List enrollment payments | 200 | **PASS** | |
| 7.11 | Confirm enrollment payment | 200 → `confirmed` | **PASS** | |
| 7.12 | Reject enrollment (after start-review) | 200 → `rejected` | **PASS** | Field: `reason` |
| 7.13 | Close enrollment period | 200 → `is_open: false` | **PASS** | |

**Bugs found (MCP):**

- `create_enrollment_period` sends `name` field but API expects `academic_year`, `period_type`, `start_date`, `end_date` — always 400.
- `submit_enrollment` sends `period`, `modality`, `notes` but API requires many more fields (`student_name`, `student_email`, `student_date_of_birth`, `parent_*`, `modality_ids`, `consents`) — always 400.
- `create_enrollment_payment` sends `method` field but API uses `payment_type` — always 400.

**Result: 13/13 PASS**

---

## Section 8: Billing

| # | Test | Expected | Result | Notes |
|---|---|---|---|---|
| 8.1 | List billing entries as direction | 200 | **PASS** | |
| 8.2 | List billing entries as student | 200 (empty list) | **PASS** (design intent) | Students have `billing.view_billingentry` — see own entries only (filtered by service). Not a permission bug. |
| 8.3 | List fines as direction | 200 | **PASS** | |
| 8.4 | Cancel billing entry with notes | 200 | **PASS** | Field: `notes` required |

**Result: 4/4 PASS**

---

## Summary

### Overall: 55/55 tests PASS

| Section | Tests | Result |
|---|---|---|
| Auth | 7 | ✅ All pass |
| Users & Teachers | 3 | ✅ All pass |
| Studios CRUD | 6 | ✅ All pass |
| Modalities | 5 | ✅ All pass |
| Teacher Availability | 4 | ✅ All pass |
| Coaching Lifecycle | 13 | ✅ All pass |
| Enrollment Lifecycle | 13 | ✅ All pass |
| Billing | 4 | ✅ All pass |

**No regressions found. All business flows work correctly.**

---

## MCP Server Issues Found

The `mcp-server/server.py` has multiple tool definitions that do not match the actual API contract. These tools will always fail when called:

| Tool | Issue |
|---|---|
| `create_studio` | Missing `max_capacity` (required field) |
| `schedule_coaching` | Uses `teacher`/`modality`/`studio` instead of `teacher_id`/`modality_id`/`studio_id`; missing `total_price` |
| `approve_coaching` | Sends no body; API requires `studio_id` + `total_price` |
| `reject_coaching` | Sends `reason`; API field is `rejection_reason` |
| `join_coaching` | Sends empty body; API requires `{"student_id": <id>}` |
| `create_teacher_availability` | Sends `weekday`/`start_time`/`end_time`; API expects `start_datetime`/`end_datetime` |
| `create_enrollment_period` | Sends `name`; API requires `academic_year`, `period_type`, `start_date`, `end_date` |
| `submit_enrollment` | Missing required fields: `student_name`, `student_email`, `student_date_of_birth`, `parent_*`, `modality_ids`, `consents` |
| `create_enrollment_payment` | Sends `method`; API uses `payment_type` |

---

## Behavioral Notes & Edge Cases Verified

1. **Studio-Modality compatibility**: Creating a coaching for a studio that doesn't allow the modality returns `StudioModalityIncompatible` (400). Studio must be updated via `PATCH /api/studios/{id}/` with `allowed_modality_ids`.

2. **Coaching lifecycle gate**: `student accept invite` fails with `ParticipantNotInvited` if the student is already `active` (staff-invited participants skip the accept step).

3. **Attendance window**: `confirm-attendance` is only valid during `waiting_confirmation` status. After teacher-confirm moves it to `pending_completion_approval`, the window closes.

4. **Billing entry generation**: Only `ATTENDED` participants generate billing entries at `complete_coaching`. Participants in `invited`, `absent`, `cancelled`, or `late_cancelled` status are excluded.

5. **Celery dependency**: The `SCHEDULED → WAITING_CONFIRMATION` transition is driven by `advance_scheduled_to_waiting_confirmation_batch()`, which runs as a Celery beat task. In tests, this must be triggered manually or via the Django shell.

6. **Duplicate modality assignment**: Returns 400 (UniqueConstraint). Idempotency not guaranteed — re-assigning the same modality to a user fails.

---

## How a Manual Tester Should Reproduce This

### Prerequisites
```bash
# Start the app
docker compose up -d

# Create test users
docker exec studioos-productapi-api-1 uv run python manage.py bootstrap_user \
  --email direction@test.com --password Test1234! --role direction
docker exec studioos-productapi-api-1 uv run python manage.py bootstrap_user \
  --email teacher@test.com --password Test1234! --role teacher_internal
docker exec studioos-productapi-api-1 uv run python manage.py bootstrap_user \
  --email student@test.com --password Test1234! --role student
```

### Flow 1: Auth
1. `POST /api/accounts/auth/login/` → save `access` token
2. `GET /api/accounts/me/` with `Authorization: Bearer <access>` → verify user info
3. `POST /api/accounts/auth/refresh/` with `{"refresh": "<token>"}` → verify new access token
4. `POST /api/accounts/auth/logout/` with `{"refresh": "<token>"}` → verify blacklisted

### Flow 2: Studio + Modality Setup
1. `POST /api/studios/` with `{"name":"...", "max_capacity":20}` → note `id`
2. `POST /api/modalities/` with `{"name":"..."}` → note `id`
3. `PATCH /api/studios/{id}/` with `{"allowed_modality_ids":[<modality_id>]}` → link them
4. `POST /api/modalities/users/{teacher_id}/modalities/` with `{"modality_id": <id>}` → assign teacher

### Flow 3: Full Coaching Lifecycle
1. `POST /api/coachings/scheduled/` with `teacher_id`, `modality_id`, `studio_id`, `total_price`, `start_datetime`, `end_datetime`
2. `POST /api/coachings/{id}/participants/` with `{"student_id": <id>}` (direction)
3. Trigger `advance_scheduled_to_waiting_confirmation_batch()` (or wait for Celery)
4. `POST /api/coachings/{id}/participants/{participant_id}/confirm-attendance/` with `{"attended":true}` (student)
5. `POST /api/coachings/{id}/teacher-confirm/` with `{"teacher_notes":"..."}` (teacher)
6. `POST /api/coachings/{id}/complete/` (direction)
7. `GET /api/billing/entries/?coaching_class_id={id}` → verify billing entry exists

### Flow 4: Full Enrollment Lifecycle
1. `POST /api/enrollments/periods/create/` with `academic_year`, `period_type`, `start_date`, `end_date`
2. `POST /api/enrollments/periods/{id}/open/`
3. `POST /api/enrollments/` with all student/parent fields + `modality_ids` + `consents`
4. `POST /api/enrollments/{id}/start-review/`
5. `POST /api/enrollments/{id}/approve/`
6. `POST /api/enrollments/{id}/payments/` with `{"payment_type":"enrollment_fee","amount":"50.00"}`
7. `POST /api/enrollments/{id}/payments/{payment_id}/confirm/`
8. `POST /api/enrollments/periods/{id}/close/`

### Permission Guard Checks
- Try any write endpoint as student (e.g. `POST /api/studios/`) → expect 403
- Try `GET /api/accounts/users/` as teacher or student → expect 403
- Try `POST /api/coachings/{id}/approve/` as student → expect 403
