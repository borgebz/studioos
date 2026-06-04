# Bug Report — 2026-04-30

**Method:** Automated live E2E testing via MCP + concurrent HTTP  
**Tester:** Claude Code  
**Total tests run:** ~120  
**Bugs confirmed:** 8  

---

## BUG-001 — CRITICAL: Teacher schedule conflict not atomic (race condition)

**Severity:** Critical  
**Component:** `coachings/services.py` — conflict detection

**Description:**  
When 5 concurrent requests create a coaching for the same teacher at the same timeslot, **all 5 succeed**. Coachings 25–29 were all created simultaneously for `teacher@test.com` at `2026-08-01T10:00–11:00Z`.

The `TeacherScheduleConflict` check reads existing coachings to detect overlap, but this is not protected by a DB-level lock (`SELECT FOR UPDATE`). All concurrent requests pass the check before any of them commits the insert — a classic TOCTOU race.

**Reproduce:**
```bash
for i in 1 2 3 4 5; do
  curl -X POST /api/coachings/scheduled/ \
    -d '{"teacher_id":20,"modality_id":23,"studio_id":2,"total_price":"30.00",
         "start_datetime":"2026-08-01T10:00:00Z","end_datetime":"2026-08-01T11:00:00Z"}' &
done
wait
# Result: 5 coachings created for same teacher/slot
```

**Expected:** Only 1 succeeds, others get `TeacherScheduleConflict` (400).

**Fix direction:** Wrap the conflict check + insert in a `select_for_update()` on the teacher's scheduled coachings, or use a DB unique constraint / advisory lock.

---

## BUG-002 — CRITICAL: Enrollment period end_date < start_date causes 500

**Severity:** Critical  
**Component:** `enrollments/views.py` + `enrollments/models.py`

**Description:**  
Sending `end_date < start_date` when creating an enrollment period returns an **HTTP 500 Internal Server Error** with full Django debug traceback (including env vars, DB config).

The `EnrollmentPeriod.clean()` raises `ValidationError("PeriodEndBeforeStart")`, but the `create_period` service calls `period.full_clean()` which works. The issue is the serializer (`EnrollmentPeriodSerializer` is a `ModelSerializer`) is not calling `full_clean()` before the service receives the data, so the validation exception escapes unhandled and crashes the view.

**Reproduce:**
```bash
curl -X POST /api/enrollments/periods/create/ \
  -d '{"academic_year":"2027/2028","period_type":"both","start_date":"2027-06-30","end_date":"2027-01-01"}'
# Result: HTTP 500 + full Django debug page
```

**Expected:** HTTP 400 with `{"errors": {"end_date": ["PeriodEndBeforeStart"]}}`.

**Fix direction:** Add a `validate()` method to `EnrollmentPeriodSerializer` that checks `end_date >= start_date`, or call `instance.full_clean()` inside the serializer's `validate()`.

---

## BUG-003 — HIGH: Coaching total_price accepts negative values

**Severity:** High  
**Component:** `coachings/serializers.py` — `CoachingDirectScheduleSerializer`

**Description:**  
A coaching can be created with `total_price = "-10.00"` and is stored and returned with a negative price. No minimum value validation exists on the `total_price` field.

**Reproduce:**
```bash
curl -X POST /api/coachings/scheduled/ \
  -d '{"teacher_id":20,"modality_id":23,"studio_id":2,"total_price":"-10.00",...}'
# Result: HTTP 201, coaching created with total_price="-10.00"
```

**Expected:** HTTP 400 — price must be ≥ 0.

**Fix direction:** Add `min_value=Decimal("0")` to the `total_price` `DecimalField` in `CoachingDirectScheduleSerializer` and `CoachingApproveSerializer`.

---

## BUG-004 — HIGH: Enrollment payment accepts zero and negative amounts

**Severity:** High  
**Component:** `enrollments/serializers.py` — `EnrollmentPaymentCreateSerializer`

**Description:**  
Creating an enrollment payment with `amount = "0.00"` or `amount = "-50.00"` returns HTTP 201. Both values are persisted. The `amount` field on `EnrollmentPaymentCreateSerializer` has no minimum value validation.

**Reproduce:**
```bash
curl -X POST /api/enrollments/3/payments/ \
  -d '{"payment_type":"enrollment_fee","amount":"0.00"}'
# Result: HTTP 201, payment created with amount=0.00

curl -X POST /api/enrollments/3/payments/ \
  -d '{"payment_type":"enrollment_fee","amount":"-50.00"}'
# Result: HTTP 201, payment created with amount=-50.00
```

**Expected:** HTTP 400 — amount must be > 0.

**Fix direction:** Add `min_value=Decimal("0.01")` to the `amount` field in `EnrollmentPaymentCreateSerializer`.

---

## BUG-005 — HIGH: Payment confirmation has no idempotency guard (race condition)

**Severity:** High  
**Component:** `enrollments/services.py` — payment confirmation

**Description:**  
An already-confirmed payment can be confirmed again (HTTP 200). Under concurrent load, two simultaneous confirm requests **both succeed** with HTTP 200. There is no guard checking `if payment.status == "confirmed": raise error`.

**Reproduce:**
```bash
# Single: re-confirm already confirmed payment → 200 (expected 400)
curl -X POST /api/enrollments/3/payments/2/confirm/
# Again: → 200

# Concurrent:
curl -X POST /api/enrollments/3/payments/2/confirm/ &
curl -X POST /api/enrollments/3/payments/2/confirm/ &
wait
# Both return HTTP 200
```

**Expected:** Only the first confirmation succeeds (200). All subsequent attempts return 400 with `PaymentAlreadyConfirmed`.

**Fix direction:** In the confirm service, check `if payment.status != PaymentStatus.PENDING: raise ValidationError("PaymentAlreadyConfirmed")` before updating. Use `select_for_update()` to prevent the concurrent race.

---

## BUG-006 — HIGH: Concurrent enrollment state transitions are not atomic (race condition)

**Severity:** High  
**Component:** `enrollments/services.py` — status transitions

**Description:**  
Two simultaneous `POST /api/enrollments/{id}/start-review/` calls on the same enrollment both return HTTP 200 with `status: under_review`. The status check (read) and status update (write) are not protected by a DB lock, allowing the TOCTOU race.

This affects all status transitions: `start-review`, `approve`, `reject`, `cancel`.

**Reproduce:**
```bash
curl -X POST /api/enrollments/8/start-review/ &
curl -X POST /api/enrollments/8/start-review/ &
wait
# Both return: {"status": "under_review"}
```

**Expected:** One succeeds (200), one fails (400 with `InvalidStatusTransition`).

**Fix direction:** Use `select_for_update()` when fetching the enrollment before any status transition. Pattern:
```python
enrollment = Enrollment.objects.select_for_update().get(pk=pk)
```

---

## BUG-007 — MEDIUM: Student date of birth accepts future dates

**Severity:** Medium  
**Component:** `enrollments/serializers.py` — `EnrollmentSubmitSerializer`

**Description:**  
An enrollment can be submitted with `student_date_of_birth = "2035-01-01"` (the future) and is accepted and stored (HTTP 201). There is no validation that the date of birth must be in the past.

**Reproduce:**
```bash
curl -X POST /api/enrollments/ \
  -d '{"student_date_of_birth":"2035-01-01",...}'
# Result: HTTP 201, enrollment 7 created with dob=2035-01-01
```

**Expected:** HTTP 400 — date of birth must be in the past.

**Fix direction:** Add a custom `validate_student_date_of_birth` method to `EnrollmentSubmitSerializer`:
```python
def validate_student_date_of_birth(self, value):
    if value >= date.today():
        raise serializers.ValidationError("DateOfBirthMustBeInPast")
    return value
```

---

## BUG-008 — LOW/DESIGN: Enrollment `period` field in request body is silently ignored

**Severity:** Low (design issue)  
**Component:** `enrollments/services.py` — `submit_enrollment`, `_get_open_period`

**Description:**  
The enrollment submission endpoint ignores any `period` or `period_id` sent in the request body. The service always calls `_get_open_period(enrollment_type=...)` to find the currently-open period automatically. Sending `"period": 2` (a closed period) results in the enrollment being created under period 1 (the open one) with no warning or error.

This means:
- There is no way to submit to a specific period — the system always picks the open one
- Clients supplying a `period` field get silent incorrect behaviour
- The MCP tool's `period_id` parameter is misleading

**Reproduce:**
```bash
curl -X POST /api/enrollments/ -d '{"period":2,...}'  # period 2 is closed
# Result: HTTP 201, enrollment created under period 1 (open) — period=2 ignored
```

**Expected:** Either accept `period_id` and validate it, or document + reject unknown fields (`additionalProperties: false` in serializer).

---

## Summary Table

| ID | Severity | Component | Title |
|---|---|---|---|
| BUG-001 | 🔴 Critical | coachings/services | Concurrent coaching creation — no atomic conflict check |
| BUG-002 | 🔴 Critical | enrollments/views | Period end_date < start_date → HTTP 500 |
| BUG-003 | 🟠 High | coachings/serializers | Coaching total_price accepts negative values |
| BUG-004 | 🟠 High | enrollments/serializers | Payment amount accepts zero and negative |
| BUG-005 | 🟠 High | enrollments/services | Payment confirm has no idempotency guard |
| BUG-006 | 🟠 High | enrollments/services | Concurrent state transitions not atomic |
| BUG-007 | 🟡 Medium | enrollments/serializers | Student DOB accepts future dates |
| BUG-008 | 🔵 Low | enrollments/services | `period` field in enrollment submit silently ignored |

---

## What is NOT a bug

- **Student GET /users/{id}/ → 405**: `UserDetailView` doesn't implement GET — 405 is correct (resource exists, method not allowed on this view).
- **SQL injection query param → 400**: `IntegerField` rejects non-integer input. ORM parameterization handles SQL injection at the DB level.
- **Non-existent modality → 404**: Returning 404 when a referenced resource doesn't exist is valid REST semantics.
- **Student billing access → 200 (empty list)**: Students have `billing.view_billingentry` by role design. The service filters to their own entries.
- **XSS in studio name stored raw**: The API is JSON-only — no HTML rendering server-side. XSS would be a frontend concern.
