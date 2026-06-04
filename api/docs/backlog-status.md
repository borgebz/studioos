# Backlog & Implementation Status

_Last updated: April 2026 — cross-referenced against ADO sprints and actual codebase_

---

## Built and reviewed ✅

| Module | ADO | Notes |
|--------|-----|-------|
| `core` — BaseModel, AuditMixin, SoftDeleteMixin | — | |
| `core` — `@require_perm`, DataEnvelopeAutoSchema, exception handler | — | |
| `core` — `emails.py` | — | Must not re-raise on failure |
| `accounts` — User, Role, Profile models | #188, #184 | |
| `accounts` — JWT auth endpoints (obtain, refresh, blacklist) | #188 | |
| `accounts` — `/me/` bootstrap endpoint | — | |
| `accounts` — Photo upload + `PhotoUrlMixin` | — | |
| `accounts` — `seed_roles`, `seed_permissions` | — | |
| `accounts` — `bootstrap_user` management command | — | Dev only |
| `accounts` — User modalities (`UserModality`, CRUD, `can_teach` guard) | #209 | |
| `studios` — Studio, Modality, StudioModality models | #189 | |
| `studios` — `seed_modalities` (21 modalities with age constraints) | #189 | |
| `studios` — Full CRUD API + soft-delete cascade on studio delete | #205 | |
| `enrollments` — Full model set (period, enrollment, modalities, files, consent, payment) | #196 | |
| `enrollments` — Submit endpoint (multipart Option B), GDPR consent capture | #184 | |
| `enrollments` — Period management + open/close | #196 | |
| `enrollments` — State machine + approve/reject/cancel | #196 | |
| `enrollments` — Payment recording + confirmation | #196 | |
| `coachings` — All models (CoachingClass, CoachingParticipant, TeacherAvailability) | — | |
| `coachings` — Full status machine (8 statuses, full participant status machine) | — | |
| `coachings` — All coaching services (request, accept, approve, reject, complete, cancel, update) | — | |
| `coachings` — Teacher confirm + participant attendance confirmation | — | WAITING_CONFIRMATION flow |
| `coachings` — Participant management (add, invite, accept-invite, staff-approve, cancel) | — | |
| `coachings` — Late cancellation detection (env: 48h) | — | |
| `coachings` — Celery Beat task: SCHEDULED → WAITING_CONFIRMATION | — | Every 5 min |
| `coachings` — Notification Celery tasks (new request, approved, cancelled, participant cancelled) | — | |
| `coachings` — TeacherAvailability CRUD | — | Informational only |
| `billing` — BillingEntry model (polymorphic: coaching + fine sources) | #249 (partial) | |
| `billing` — Split algorithm + `create_billing_entries_for_coaching` | #249 (partial) | |
| `billing` — Description builder (coaching + fine) | #249 (partial) | |
| `billing` — Fine model + `create_fines_for_coaching` (auto on completion) | — | |
| `billing` — `approve_fine`, `waive_fine` services | — | |
| `billing` — `cancel_billing_entry` service | — | |
| `billing` — List/detail/filter services (entries + fines) | — | Scoped by staff vs student |
| `inventory` — Models, services, views, serializers, seeds, validators (7 resource modules) | #222 | 17 test files, 130+ test cases |
| `marketplace` — Models, services, views, serializers (Listing + Transaction) | #222 | |
| `events` — All models (Event, EventFile, EventComment, EventInterest, EventPost) | #241 (partial) | Models done; API pending |
| Docker — Full stack (api, db, redis, worker, beat, mailpit) | — | |
| Architecture layer tests (`test_architecture_layers.py`) | — | |

---

## In progress / partially done ⚠️

| Item | ADO | Notes |
|------|-----|-------|
| `billing` — API endpoints (BillingEntry list/detail/cancel, Fine list/detail/approve/waive) | #249 | Services done; views/URLs pending |
| `events` — Views, serializers, services, URLs | #241 | Models done; full API pending |
| `coachings` — Light serializers | #273 | Current serializers over-fetch nested data |
| `CoachingRejectView` double-fetch | — | View + service both fetch the coaching |
| `MeSerializer` vs `UserResponseSerializer` role shape inconsistency | — | One returns list, other returns object |
| Architecture layer tests missing `billing` + `events` apps | — | Add to `test_architecture_layers.py` |

---

## Planned — not yet started ❌

### Features

| Item | ADO | Priority | Notes |
|------|-----|----------|-------|
| User invitation & onboarding flow (invite, bulk, onboard, resend) | #254 | High | Full spec in `feature/user-invitation.md` |
| ~~`inventory` / `marketplace` — Full model set + API~~ | #222 | — | **Implemented.** See "Built and reviewed" section |
| Age validation on enrollment modalities | #239 | Medium | Validate student age against `min/max_age_months` |
| `total_price` suggestion from `CoachingSettings` | #275 | Medium | Surface teacher rate at approve time |
| Coaching creation by parent on behalf of dependent | #274 | Medium | `parent_id` FK exists; flow not enforced |
| Permissions CRUD API | #272 | Medium | Role/permission management UI |
| Dev database seed script | #240 | Medium | Uniform baseline data for whole team |
| File storage migration: local → Cloudflare R2 | — | Medium | Required before production |
| Password reset flow (existing active users) | — | Medium | Distinct from onboarding |
| Pagination on all list endpoints | — | Medium | Not universally applied |
| Student enrollment validity enforcement | — | Medium | No check that student has active enrollment |
| Re-enrollment flow | — | Medium | Annual renewal not yet designed |

### Quality & maintenance

| Item | ADO | Notes |
|------|-----|-------|
| `NotFound()` → `AppNotFound("xxx")` audit | #269 | PascalCase codes everywhere |
| Light serializers across all endpoints | #273 | Reduce nested data / N+1 |
| Log on PermissionDenied (403) | #259 | Help debug frontend access issues |
| Query param error format standardisation | #271 | Invalid enum values in query strings |
| Bruno collection for Modalities | #270 | |
| Photo URL unchanged on PATCH | #276 | |
| DB index review | #257 | |
| Sort order PUT endpoint | #258 | |
| Email HTML templates | #283 | Current emails are plain |
| `POST /api/accounts/users/` removal | #240 | Replace with invite flow |

### Automated tests

`inventory` has 17 test files with 130+ test cases (comprehensive, end-to-end, per-resource, permissions, soft-delete, seed data, media rules). Other apps still lack automated tests — required for Phase 2 (vBeta).

### Future / deferred

| Item | Notes |
|------|-------|
| ASGI migration (Daphne + Django Channels) | **Required for marketplace WebSocket chat — plan before building messaging** |
| Lost & found module | Simple CRUD: title, description, image, date, location, status |
| Internal notification system | In-app + email alerts — architecture not defined |
| Educabiz export (billing entries → Excel/CSV) | Replaces manual Excel; drives `exported` status |
| Per-academic-year system settings | |
| Group chats per modality/class | |
| Comments on inventory listings | |
| Redis as cache layer | Currently broker only |
| Educabiz API integration (direct) | Phase 4+ |

---

## Academic milestone status

| Milestone | Target | Status |
|-----------|--------|--------|
| Phase 1 — Requirements + Modeling | March 13 | ✅ Delivered |
| Phase 2 — vBeta | Group-defined | ⚠️ In progress |
| Phase 3 — vRTW | May 9 | ❌ Not started |
