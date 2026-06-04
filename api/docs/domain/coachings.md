# Domain — Coachings

App: `coachings`  
**Core business module — highest priority.**

---

## Business context

8 studios, 18:00–21:00, sessions 30–120 min. Formats: private, duet, trio, ensemble (4–8). Not every modality fits every studio. Currently managed entirely in Excel. StudioOS replaces it with an automated flow from request → scheduling → post-lesson validation → billing.

### Annual classes vs. ad-hoc coachings

Both are `CoachingClass` records. The distinction:

- **Ad-hoc coachings** (private lessons): go through the full `REQUESTED → PENDING_APPROVAL → SCHEDULED` flow.
- **Annual scheduled classes** (regular timetable): created directly with `status=SCHEDULED` by coordination via `create_direct_coordination_coaching`, bypassing the request/accept flow. These typically have `is_billable=False`.

The `is_billable` flag controls whether completing a coaching generates billing entries. Direction/coordination set this via PATCH while the coaching is in an editable state.

---

## Models

### `CoachingStatus` (TextChoices)

| Value | Meaning |
|-------|---------|
| `requested` | Student/parent requested a session |
| `pending_approval` | Teacher accepted — awaiting coordination approval |
| `scheduled` | Coordination approved, studio and price assigned |
| `waiting_confirmation` | Session ended — awaiting teacher + participant confirmations |
| `pending_completion_approval` | All confirmations in — awaiting coordination to complete |
| `completed` | Session completed, billing entries and fines created |
| `cancelled` | Cancelled at any point |
| `rejected` | Rejected by teacher or coordination |

### `CoachingParticipantStatus` (TextChoices)

| Value | Meaning |
|-------|---------|
| `invited` | Added by staff or peer — awaiting student acceptance |
| `pending` | Student enrolled — awaiting coordination approval |
| `active` | Confirmed in the session |
| `pending_completion` | Session ended, awaiting attendance confirmation from this participant |
| `attended` | Attended — generates billing entry |
| `absent` | Did not attend — generates fine candidate |
| `cancelled` | Cancelled with sufficient notice |
| `late_cancelled` | Cancelled within 48h — generates fine candidate |

### `CoachingClass`

Key fields beyond the base:
```python
status, teacher, modality, studio, start_datetime, end_datetime, completed_at,
is_billable, total_price, requested_by,
rejection_reason, rejected_at,
cancellation_reason, cancelled_at,
teacher_notes, teacher_confirmed_at, teacher_confirmed_by,
notes, classe, recurring_coaching
```

### `CoachingParticipant`

Key fields:
```python
coaching_class, student, status,
invited_by_staff,  # True when staff added the student
cancelled_at, cancellation_reason
```

Constraint: unique `(coaching_class, student)` for active non-cancelled rows.

### `RecurringCoaching`

Recurrence pattern for a series of coaching sessions. One `RecurringCoaching` row links to multiple `CoachingClass` rows via `recurring_coaching` FK.

Key fields:
```python
recurrence_type,        # daily, weekly, biweekly, monthly
recurrence_interval,    # repeat every N periods (default 1)
days_of_week,           # comma-separated weekday codes for weekly/biweekly, e.g. "MO,WE"
end_date,               # end condition: date limit (exclusive with occurrences_count)
occurrences_count,      # end condition: max sessions (exclusive with end_date)
notes
```

Validation: exactly one of `end_date` or `occurrences_count` must be set. Safety cap: `MAX_RECURRING_SESSIONS = 200`.

### `TeacherAvailability`

Informational only — not a booking gate. Records teacher availability windows per modality.

---

## Full status machine

```
REQUESTED ────────────────────────────────────────────► REJECTED  (teacher or coordination)
    │                                                  ► CANCELLED
    ▼ teacher_accept_coaching
PENDING_APPROVAL ─────────────────────────────────────► REJECTED  (coordination)
    │                                                  ► CANCELLED
    ▼ approve_coaching (assigns studio + price, activates PENDING participants)
SCHEDULED ────────────────────────────────────────────► CANCELLED
    │
    ▼ Celery task (end_datetime passed; ACTIVE participants → PENDING_COMPLETION)
WAITING_CONFIRMATION
    │
    ▼ teacher_confirm_coaching + confirm_participant_attendance (all PENDING_COMPLETION resolved)
    │  → auto-advances via _maybe_advance_to_pending_completion_approval
PENDING_COMPLETION_APPROVAL
    │
    ▼ complete_coaching (creates billing entries + fines)
COMPLETED
```

Annual classes enter directly at `SCHEDULED`.

---

## Key services

### `create_coaching_request`
Creates with `status=REQUESTED`. No conflict check. Auto-adds requester as participant if they have `can_participate_in_coaching`. Dispatches `notify_new_coaching_request` task on commit.

### `create_direct_coordination_coaching`
Coordination creates a coaching directly (with or without `SCHEDULED` status). Full conflict check with `select_for_update()`. Supports optional `recurring_data` — when provided, generates all recurring sessions in the same transaction (conflict checks for all dates upfront). Bulk-rosters participants from approved enrollments or a specific classe. Dispatches `notify_coordination_coaching_created` on commit (once per series, not per session).

### `teacher_accept_coaching`
User must be the assigned teacher. `REQUESTED → PENDING_APPROVAL`.

### `teacher_reject_coaching`
User must be the assigned teacher. `REQUESTED → REJECTED`.

### `approve_coaching`
Coordination approves. Uses `select_for_update()`. Validates studio–modality compatibility and no schedule conflict. Activates all `PENDING` participants → `ACTIVE`. Dispatches `notify_coaching_approved` on commit.

### `reject_coaching_coordination`
Coordination rejects `PENDING_APPROVAL` → `REJECTED`.

### `advance_scheduled_to_waiting_confirmation_batch`
Celery periodic task. Moves all `SCHEDULED` coachings past `end_datetime` → `WAITING_CONFIRMATION`. Transitions all `ACTIVE` participants to `PENDING_COMPLETION` at the same time. Each coaching in its own transaction — one failure doesn't block the batch.

### `teacher_confirm_coaching`
Assigned teacher confirms the session happened (`WAITING_CONFIRMATION` only). Idempotent guard — second call fails. Sets `teacher_confirmed_at`. Auto-advances to `PENDING_COMPLETION_APPROVAL` if all roster attendance is also resolved.

### `confirm_participant_attendance`
Student or their parent marks `ATTENDED` / `ABSENT` for a roster row in `PENDING_COMPLETION` status (transitioned from `ACTIVE` when the coaching moved to `WAITING_CONFIRMATION`). Auto-advances coaching to `PENDING_COMPLETION_APPROVAL` once teacher + all roster rows are resolved.

### `cancel_recurring_series`
Cancels all future (or all, with `cancel_past=True`) sessions in a recurring series. Iterates sessions individually — each gets its own `cancel_coaching` call with notification dispatch. Non-cancellable sessions are skipped.

### `complete_coaching`
Coordination completes. Validates all roster rows are in a final state (ATTENDED/ABSENT). Creates billing entries and fines in the same transaction. Rolls back entirely on failure.

### `cancel_coaching`
Valid from `REQUESTED`, `PENDING_APPROVAL`, `SCHEDULED`, `WAITING_CONFIRMATION`, `PENDING_COMPLETION_APPROVAL`. Dispatches `notify_coaching_cancelled` on commit.

### `update_coaching`
PATCH. Editable in `REQUESTED`, `PENDING_APPROVAL`, `SCHEDULED`. Blocked in terminal states. If `SCHEDULED` and schedule/teacher/studio change → re-runs conflict check with `select_for_update()`.

### `add_participant`
Adds a student to a coaching roster. Checks `can_participate_in_coaching` permission. Enforces modality `max_capacity`. Handles revival of previously cancelled rows. Uses `invited_by_staff` flag to set initial status (ACTIVE vs INVITED/PENDING).

### `student_accept_coaching_invitation`
Student accepts their `INVITED` row. Staff-invited: `INVITED → ACTIVE`. Peer-invited: `INVITED → PENDING`.

### `staff_approve_pending_participant`
Coordination approves a `PENDING` participant on a `SCHEDULED` coaching → `ACTIVE`.

### `cancel_coaching_participant`
Cancels a participant's enrollment. Checks notice window against `COACHING_LATE_CANCELLATION_HOURS` (env, default 48h). Sets `CANCELLED` or `LATE_CANCELLED`. Dispatches `notify_participant_cancelled` on commit. LATE_CANCELLED participants generate fine candidates at coaching completion.

---

## Conflict detection

```python
start_datetime__lt=end_datetime_of_new,
end_datetime__gt=start_datetime_of_new,
```
Applied for teacher and studio. Only `SCHEDULED` coachings block time.

---

## Notification tasks (Celery, `coachings/tasks.py`)

- `notify_new_coaching_request` — fired on student coaching request creation
- `notify_coordination_coaching_created` — fired on coordination coaching creation (once per recurring series)
- `notify_coaching_approved` — fired on coordination approve
- `notify_coaching_cancelled` — fired on cancellation
- `notify_coaching_completed` — fired on coaching completion
- `notify_participant_cancelled` — fired on participant cancel (includes `is_late_cancelled` flag)
- `send_waiting_confirmation_reminders` — periodic, sends reminders at configurable windows after session end

---

## Environment config

| Setting | Default | Notes |
|---------|---------|-------|
| `COACHING_LATE_CANCELLATION_HOURS` | `48` | Hours before start; cancellation inside this window = LATE_CANCELLED |
| `COACHING_REMINDER_WINDOWS` | `24:0,42:1` | Comma-separated `hours:is_final` pairs for confirmation reminders after session end |
| `COACHING_FINE_DEFAULT_AMOUNT` | `25.00` | Default fine amount (EUR) for absent/late-cancelled participants |

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/coachings/` | List (filters: teacher, status, studio, requested_by, recurring_coaching_id, date range) |
| POST | `/api/coachings/` | Create coordination coaching (direct scheduling, supports recurring) |
| POST | `/api/coachings/request/` | Create coaching request (student/parent flow) |
| GET | `/api/coachings/<pk>/` | Detail |
| PATCH | `/api/coachings/<pk>/` | Edit coaching |
| POST | `/api/coachings/<pk>/accept/` | Teacher accepts |
| POST | `/api/coachings/<pk>/reject/` | Teacher or coordination rejects |
| POST | `/api/coachings/<pk>/approve/` | Coordination approves (assigns studio + price) |
| POST | `/api/coachings/<pk>/complete/` | Coordination completes |
| POST | `/api/coachings/<pk>/cancel/` | Cancel |
| POST | `/api/coachings/<pk>/teacher-confirm/` | Teacher confirms session happened |
| POST | `/api/coachings/recurring/<id>/cancel/` | Bulk cancel all (future) sessions in a recurring series |
| GET/POST | `/api/coachings/<pk>/participants/` | List / add participant |
| POST | `/api/coachings/<pk>/participants/<id>/accept-invite/` | Student accepts invitation |
| POST | `/api/coachings/<pk>/participants/<id>/approve/` | Staff approves pending participant |
| POST | `/api/coachings/<pk>/participants/<id>/cancel/` | Cancel participant enrollment |
| POST | `/api/coachings/<pk>/participants/<id>/confirm-attendance/` | Student/parent marks attendance |
| GET/POST | `/api/coachings/availability/` | Teacher availability blocks |
| PATCH | `/api/coachings/availability/<pk>/` | Update availability block |
| DELETE | `/api/coachings/availability/<pk>/` | Delete availability block |

---

## Known issues

*(none currently tracked)*
