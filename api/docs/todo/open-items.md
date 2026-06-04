# Open Backlog Items

Sourced from Azure DevOps. All items below are state=New and not yet implemented.

---

## App / feature work

### #239 — Age validation on enrollment modalities
Validate that the student's age is within `min_age_months` / `max_age_months` for each modality selected at enrollment submission. Return an explicit error if not valid.

### #241 — Events app API layer *(Committed)*
Models are done. Views, serializers, services, and URLs still needed for all event endpoints (list, detail, publish, archive, cancel, complete, files, posts, comments, interests).

### #249 — Billing app API layer *(New)*
BillingEntry and Fine models + services are done (see `feature/billing.md`). Remaining: list/detail/cancel endpoints for BillingEntry, list/detail/approve/waive endpoints for Fine, plus `@extend_schema` coverage and tests.

### #254 — User invitation & onboarding *(New)*
Full spec in PBI and `feature/user-invitation.md`. Not started.

### #272 — Permissions CRUD endpoints
Expose permission listing and role-permission management via API so the frontend can display and edit permission assignments.

### #274 — Coaching request by parent
Enforce that a parent can create coaching requests on behalf of their dependent student (via `parent_id`). Currently the flow is not parent-aware.

### #275 — Total price suggestion for a coaching
`CoachingSettings` stores a teacher's `private_lesson_price`. The system should suggest a price when a coordination user is approving a coaching (surface the teacher's rate, allow override). Show suggested price in the approve response/UI.

---

## Maintenance & quality

### #240 — Dev database seed script *(New)*
Create a seed script to run after DB restore in dev. Goal: same baseline dataset for the whole team. Should include users with different roles, known credentials, and data covering the main business flows. Also: remove `POST /api/accounts/users/` endpoint (test-only — replaced by invite flow).

### #257 — DB index review
Review indexes across all tables for query optimisation. Ensure the most common filters (status, date ranges, FK lookups) are indexed.

### #258 — Sort order PUT endpoint
Tables with `sort_order` (e.g. `ItemSize`) need a dedicated endpoint to update ordering without touching other fields.

### #259 — Log on PermissionDenied
Add logging when `@require_perm` raises a 403. Useful for detecting frontend issues where a button is shown when it shouldn't be.

### #260 — Permission enforcement inside services *(partially done)*
Audit all service calls that assume a user has a capability (e.g. assigning a teacher to a coaching) and ensure the appropriate permission is checked. `can_teach` is done. Also create `GET /api/accounts/teachers/` — users with `can_teach` permission.

### #269 — Replace `NotFound()` with `AppNotFound("xxx")`
Audit all uses of bare `NotFound()` and replace with `AppNotFound("EntityNotFound")` for consistent PascalCase error codes throughout.

### #270 — Bruno collection for Modalities
Add Bruno HTTP requests for the modality endpoints to the team's Bruno collection.

### #271 — Query param error handling
Confirm error format when invalid query params are passed (e.g. a status value that doesn't exist in the TextChoices). Ensure the global exception handler shapes these correctly.

### #273 — Light serializers
Current serializers return deeply nested data (e.g. GET coaching returns full studio with all modalities, full teacher with roles, full modality with all studios). Create lightweight nested serializers containing only essential FK fields for all list/detail endpoints.

### #276 — Photo URL on PATCH
When PATCH is called with the same photo, a new file is created with a different UUID name. Fix: compare the incoming file to the stored one; only save/replace if it actually changed.

### #277 — Annual coachings review *(partially resolved)*
Annual classes are covered by `is_billable=False` flag. Verify the flag is correctly set by default for `create_scheduled_coaching` and that the distinction is visible in the coaching list response. See `domain/coachings.md` for full context.

### #283 — Email templates
Current emails are plain text. Create proper HTML + text templates with consistent header, body, and footer following StudioOS brand guidelines. Templates live in `server/templates/emails/`.

### #233 — Documentation update *(New)*
Update existing documentation artifacts (wiki, specification) to reflect implementation decisions made during development.

### #284 — Maintenance *(New)*
General maintenance sprint. Specific tasks TBD.

---

## Open design decisions

See `open-questions.md` for: re-enrollment flow, student enrollment validity enforcement, and any other unresolved questions.
