# Feature — Teacher Availability

Teacher availability is a purely informational feature — it does not gate coaching requests or validate against any scheduling flow. Teachers use it to signal when they are open for sessions, and students/coordination can see these windows when planning.

## Design

From the teacher's perspective, availability is a single concept. A teacher creates availability blocks that are either **one-time** (a specific date/time window) or **recurring** (a weekly pattern that repeats across a date range). The recurring property is just a modifier on the same availability — not a separate entity from the user's point of view.

Under the hood, two tables support this:

- **`TeacherAvailability`** — the main record. Holds teacher, modality (optional), start/end datetime, and notes. Every availability block has one of these.
- **`RecurringAvailability`** — a OneToOne rule attached to a TeacherAvailability. Holds `days_of_week` (comma-separated weekday integers, 0=Mon..6=Sun), `start_time`/`end_time`, and a validity period (`valid_from`/`valid_until`). When present, the availability is recurring.

## API

All endpoints live under `/api/availability/teachers/<user_id>/`.

### GET (list)

Requires `date_from` and `date_to` query params. Returns a flat list of **expanded concrete time slots** sorted by `start_datetime`. One-time blocks are returned as-is. Recurring rules are expanded into individual day slots within the requested date range. Each slot carries `is_recurring` (bool) and `recurring_id` (the availability pk, or null for one-time). The client never has to compute recurrence — it renders what comes back.

### POST (create)

A single endpoint creates either type. If the payload includes a `recurring` object, a recurring rule is created alongside the availability. If `recurring` is absent, a plain one-time block is created.

### PATCH (update)

Supports three recurring behaviors via the `__unset__` sentinel pattern:

- **`recurring` not in payload** — recurring state is not touched.
- **`recurring: null`** — the recurring rule is soft-deleted, converting the entry to one-time.
- **`recurring: {...}`** — creates a new recurring rule (if one-time) or updates the existing rule (if already recurring).

### DELETE

Soft-deletes the availability block. If a recurring rule is attached, it is also soft-deleted.

## Permissions

- Teachers can manage their own availability (view/add/change/delete).
- Direction and coordination also have `can_manage_teacher_availability_for_others`, allowing them to view and manage any teacher's availability.
- Other teachers cannot see or modify another teacher's availability.

## Separate app

Availability lives in its own Django app (`availability/`) rather than inside `coachings/`. This reflects the fact that availability is informational and decoupled from coaching scheduling — it has no FK to coaching, no interaction with the coaching state machine, and no validation against coaching slots.
