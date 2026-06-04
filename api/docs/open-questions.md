# Open Questions & Resolved Decisions

---

## ✅ Resolved

### Q1, Q2, Q3 — Events / Tickets

**Events app does not handle ticket selling.** It is a promotional module only — lists events, shows details, no reservations, no payments. Ticket selling is out of scope for now.

---

### Q4 — Annual re-enrollment flow

No enforcement currently exists to check whether a student has a valid active enrollment before they can book a coaching or access the system. This is a known gap — student enrollment validity is not yet enforced at the coaching or access level.

Re-enrollment flow for the following year is not yet designed.

---

### Q5 — Annual classes vs. extra coachings

Annual scheduled classes can be created directly in `SCHEDULED` status (coordination bypasses the request/accept flow). They carry `is_billable=False` by default — superior actors (direction/coordination) decide whether to flip it to `True` for billing. No approval flow needed for classes that are part of the regular timetable.

---

### Q6 — Late-cancellation threshold

**Defined in the `.env` file.** Default: **48 hours** before class start.

---

### Q7 — Fine amount

**Defined in the `.env` file.** Default: **25 EUR** fixed amount.

---

### Q8 — Fine generation

**Mix of automatic + manual approval:**
- System creates fines automatically (Celery task detects `late_cancelled` participants).
- Coordination reviews and approves fines before they are billed.

Fine lifecycle: `pending` → `approved` (by coordination) → billed / `waived`.

---

### Q9 — Invite link flow

Planned design confirmed:
- Coordination creates an invite (email + role) → token stored in Redis with TTL → email with link sent.
- User follows link → completes onboarding (sets password) → account activated.
- Audit metadata in DB; actual token only in Redis.
- Reverse index `invite_user:{user_id}` → token for the resend flow.

Not yet implemented.

---

### Q10 — Real-time messaging

**WebSockets** — requires ASGI migration (Daphne or Uvicorn + Django Channels). Must be planned before building the marketplace chat. This is a breaking change to the Docker setup and the `CMD` in the Dockerfile.

---

### Q11 — `exported` status management

Entries transition to `exported` only when the Educabiz export feature runs. Not a manual status — it is set automatically by the export job (future feature).

---

### Q12 — Notification on fine issuance

**Yes** — parents should receive an automatic notification when a fine is issued. Requires the notification system to be at least partially implemented first.

---

## ❓ Still open

### Q-A — Student enrollment validity enforcement

Currently there is no check that a student has an active `Enrollment` before they can book coachings or access the system. Needs a decision on:
- Where is the check enforced? (coaching request creation? login? user activation?)
- What is a "valid" enrollment? (status=`APPROVED` for the current academic year?)

#### TODO: Coaching participation gates

Two validations should be added to the coaching participation flow (`request_coaching`, `add_participant`, `student_accept_coaching_invitation`):

1. **Enrollment check** — only students with an `Enrollment` in `APPROVED` status for the relevant `EnrollmentPeriod` (matching the coaching date) should be allowed to participate. Suggested query:
   ```python
   Enrollment.objects.filter(
       student=user,
       status=EnrollmentStatus.APPROVED,
       period__start_date__lte=coaching_date,
       period__end_date__gte=coaching_date,
   ).exists()
   ```

2. **Pending fines check** — students with unpaid fines should be blocked from participating. A fine is considered unpaid when it has been `APPROVED` and the linked `BillingEntry` is still in `PENDING` status. Suggested query:
   ```python
   BillingEntry.objects.filter(
       student=user,
       status=BillingEntryStatus.PENDING,
       source_type=BillingSourceType.FINE,
   ).exists()
   ```

**Current decision:** deferred — low priority, easily handled by coordination staff manually. Revisit when the volume of coaching requests makes manual checks impractical.

**Scope note:** the enrollment check should be coaching-only, not site-wide. Blocking access to the entire platform (events, messaging, marketplace) would reduce flexibility without clear benefit.

### Q-B — Re-enrollment flow

How does a returning student enroll for the following year? Full new submission or lightweight renewal path with pre-filled data?
