# Permission enforcement audit — functional roles vs `accounts.can_teach` / `accounts.can_participate_in_coaching`

Audit date: aligned with PBI completion for permission-based authorization (not role-based capability).

## Scope

Apps reviewed: `accounts`, `classes`, `coachings`, `modality`, `enrollments`, `events`, `studios`, `billing`.

Functional assignments checked:

- **Teacher** — user assigned as instructor (`CoachingClass.teacher`, teacher availability, modality assignment for teaching).
- **Coaching participant / classe member student** — user rostered as student participant (`CoachingParticipant.student`, `ClasseMember.student`).
- **Responsible / parent** — linking users as legal guardian (`User.parent`, enrollment `student`/`parent` FKs from approval flow). These are account/linking concerns; no `can_teach` / `can_participate_in_coaching` gate was required beyond existing enrollment and PATCH rules.

## Findings

### `accounts`

| Location | Status |
| -------- | ------ |
| `get_teacher_user_by_pk`, `assert_user_can_teach`, `list_teachers` | OK — canonical checks for teaching. |
| Invites (`invite_user`, `bulk_invite_users`) | Role assignment only; permissions come from `seed_permissions` / groups — out of scope for per-assignment checks. |

**Change:** Added `user_can_participate_in_coaching`, `assert_user_can_participate_in_coaching`, and `assert_user_ids_can_participate_in_coaching` to mirror the teaching helpers and support bulk roster validation.

### `classes`

| Location | Status |
| -------- | ------ |
| `add_classe_member` | OK — must use shared `assert_user_can_participate_in_coaching` (refactored from inline `has_perm`). |

### `coachings`

| Location | Status |
| -------- | ------ |
| `create_coaching_request`, `create_direct_coordination_coaching`, `update_coaching` (teacher change), teacher availability CRUD | OK — `_get_teacher_user` → `get_teacher_user_by_pk`. |
| `add_participant` | OK — uses `assert_user_can_participate_in_coaching`. |
| `_bulk_roster_direct_coordination` | **Gap (fixed):** With `classe_id`, roster IDs came from `get_student_ids_for_classe` without re-checking `accounts.can_participate_in_coaching`. Historic or raw `ClasseMember` rows could bypass eligibility. Now calls `assert_user_ids_can_participate_in_coaching` after resolving `student_ids`. Modality-based roster already filtered via `_student_ids_for_modality_roster`; bulk assertion applies to both paths for consistency. |

### `modality`

| Location | Status |
| -------- | ------ |
| `add_user_modality` | **Alignment:** Replaced `get_user_by_pk` + `has_perm("accounts.can_teach")` with `get_teacher_user_by_pk` so teacher eligibility and not-found behaviour match other teacher assignments (`TeacherNotFound` when pk missing). |

### `enrollments`

| Location | Status |
| -------- | ------ |
| `approve_enrollment` | Creates/links `student` and `parent` users by workflow — not an operational “assign this user as session teacher/participant” path. No change. |

### `events`

| Location | Status |
| -------- | ------ |
| Event CRUD, class targets | No FK assigning a user as teacher or coaching participant. No change. |

### `studios`

| Location | Status |
| -------- | ------ |
| Studio CRUD / modality links | No user functional-role assignment. No change. |

### `billing`

| Location | Status |
| -------- | ------ |
| Billing entries / fines | References students from existing coaching participants; no new user-role assignment. No change. |

## Summary

- One enforcement gap was corrected: **bulk classe roster** in coachings.
- **Participant** checks are centralized in `accounts.services` for reuse and tests.
- **Modality teacher assignment** aligned with **`get_teacher_user_by_pk`**.
