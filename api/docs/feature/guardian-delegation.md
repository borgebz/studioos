# Feature — Guardian Delegation (Parent Acting on Behalf of Child)

Parents (guardians) can perform coaching actions on behalf of their children. The system uses the existing `User.parent` foreign key to verify the relationship. A parent can have multiple children, and each action explicitly targets a specific child via the `on_behalf_of` parameter.

## How It Works

### Core Utility: `resolve_acting_student`

Located at `server/core/guardian.py`. Every endpoint that supports delegation calls this utility:

```python
from core.guardian import resolve_acting_student

student = resolve_acting_student(request, on_behalf_of_id)
```

- If `on_behalf_of_id` is `None` → returns `request.user` (backward-compatible, no behavior change)
- If `on_behalf_of_id` is set → verifies `child.parent_id == request.user.id` and returns the child
- Raises `PermissionDenied("NotGuardianOfStudent")` if the relationship doesn't exist

### Data Model

The guardian relationship is a self-referential FK on the `User` model:

```python
class User(AbstractUser):
    parent = models.ForeignKey("self", null=True, related_name="children")
```

- A user with `parent_id = NULL` has no guardian (adult student, teacher, staff, etc.)
- A user with `parent_id = 42` is a child of user 42
- User 42 can query their children via `user.children.all()`

### Audit Trail

When a parent acts on behalf of a child:
- `requested_by` / `created_by` / `updated_by` fields always store the **parent** (the actual authenticated user)
- The **child** is added as the participant or target of the action

This preserves a clear audit trail: "parent X requested coaching Y, and child Z was enrolled as the participant."

---

## Affected Endpoints

### 1. Request a Coaching — `POST /api/coachings/request/`

**New field:** `on_behalf_of` (integer, optional, nullable) — the student user ID.

**Behavior:**
- Without `on_behalf_of`: current behavior, `request.user` is both the requester and the first participant
- With `on_behalf_of`: the parent is the requester (`requested_by`), the child is added as the PENDING participant

**Example — parent requesting for their child:**
```json
{
    "teacher_id": 5,
    "modality_id": 2,
    "start_datetime": "2026-06-01T10:00:00Z",
    "end_datetime": "2026-06-01T11:00:00Z",
    "on_behalf_of": 12
}
```

**Permission required:** `coachings.add_coachingclass` (same as student request).

---

### 2. Accept Coaching Invitation — `POST /api/coachings/{coaching_id}/participants/accept/`

**New field in body:** `on_behalf_of` (integer, optional, nullable).

**Behavior:**
- Without `on_behalf_of`: current behavior, the calling user accepts their own invitation
- With `on_behalf_of`: the parent accepts the child's invitation (looks up the child's participant row)

**Example:**
```json
{
    "on_behalf_of": 12
}
```

**Permission required:** `accounts.can_participate_in_coaching` OR `coachings.add_coachingclass`.

---

### 3. Cancel Participant — `POST /api/coachings/{coaching_id}/participants/{pk}/cancel/`

**No new fields needed.** The guardian check is built into the service layer.

**Behavior:**
- A parent can cancel their child's participation without needing `coachings.change_coachingparticipant`
- The service checks: is the requesting user the participant themselves OR their parent?
- Late cancellation rules apply the same way regardless of who cancels

**Permission required:** `accounts.can_participate_in_coaching` OR `coachings.change_coachingparticipant` OR `coachings.add_coachingclass`.

---

### 4. Confirm Attendance — `POST /api/coachings/{coaching_id}/participants/{pk}/confirm-attendance/`

**Already supported.** No changes needed — the service already checks `student.parent_id == user.id`.

---

### 5. List Coachings — `GET /api/coachings/`

**New query parameter:** `participant_id` (integer, optional) — filter coachings where a specific user is a participant.

**Usage for parents:** The frontend queries with the child's user ID to see their coaching history:

```
GET /api/coachings/?participant_id=12
```

This can be combined with other filters:
```
GET /api/coachings/?participant_id=12&status=scheduled&date_from=2026-06-01T00:00:00Z
```

---

### 6. View/Edit Coaching — `GET/PATCH /api/coachings/{pk}/`

**No new fields.** Parents who are a guardian of any participant in the coaching are treated as a "party" and can view/edit the coaching (same access level as the requester or teacher).

---

## What Is NOT Affected

These endpoints require no changes for parent delegation:

- **Coordination endpoints** (`POST /api/coachings/`, approve, reject, complete, cancel coaching) — staff already has full access via role permissions
- **Teacher endpoints** (accept, reject, confirm) — teachers act as themselves
- **Staff participant management** (add participant, staff approve) — staff uses `student_id` already
- **Teacher availability** — unrelated to student actions

---

## Frontend Implementation Guide

### Parent with Multiple Children

When a parent has multiple children, the frontend should:

1. **Fetch the parent's children** via the user profile/account endpoint (the parent's user object includes `children` via the relationship)
2. **Show a child selector** in the UI when the parent performs student-facing actions
3. **Pass the selected child's ID** as `on_behalf_of` in the request body

### Child Selector UX

Recommended approach: a persistent child switcher in the sidebar or header when the logged-in user has the parent role. This sets the "active child" context for the session, and all subsequent student-facing actions use that child's ID.

**Key screens that need the child context:**

| Screen | How to use `on_behalf_of` |
|--------|--------------------------|
| Coaching request form | Add `on_behalf_of` to the POST body |
| Coaching invitation card (accept) | Add `on_behalf_of` to the accept POST body |
| Coaching list / calendar | Use `participant_id` query param with child's ID |
| Coaching detail (view/edit) | No extra param needed — access is automatic |
| Cancel participation button | No extra param needed — guardian check is automatic |
| Attendance confirmation | No extra param needed — already supported |

### API Responses

The coaching response includes `requested_by` (the parent) and `participants` (which includes the child). The frontend can use this to display:
- "Requested by: Maria Silva" (the parent)
- "Participant: João Silva" (the child)

### Error Handling

| Error code | Meaning |
|-----------|---------|
| `NotGuardianOfStudent` | The `on_behalf_of` user is not a child of the authenticated user |
| `CannotCancelAnotherParticipantsRegistration` | User is not the participant, their parent, or staff |

### Permission Requirements for Parent Role

The parent role needs these permissions to manage their children's coachings:

- `coachings.add_coachingclass` — request coachings
- `coachings.view_coachingclass` — view coaching details and list
- `coachings.view_coachingparticipant` — view participant roster
- `accounts.can_participate_in_coaching` — accept invitations (alternatively, `coachings.add_coachingclass` also works)

---

## Extending to Other Domains

The `resolve_acting_student` utility is domain-agnostic. If guardian delegation is needed for other modules in the future (enrollments, events, etc.), the same pattern applies:

1. Add `on_behalf_of` to the request serializer
2. Call `resolve_acting_student(request, on_behalf_of)` in the view
3. Pass the resolved student to the service layer
4. Keep `requesting_user` as the parent for audit trail

The guardian check is always: `child.parent_id == request.user.id`. No extra tables, no configuration.
