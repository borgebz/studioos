# Domain — Enrollments

App: `enrollments`

## Business context

The StudioOS enrollment (matrícula) process collects student + guardian data for the school year. The school currently uses a Google Form. StudioOS replaces it with a structured digital flow.

Financial rules:
- Enrollment fee: **50 EUR** (non-refundable)
- Insurance: **15 EUR** (general), **25 EUR** (intensive)
- Cancellation: must be communicated by last day of the previous month
- After the 1st of the month invoice is issued, that month cannot be cancelled

---

## Models

### `EnrollmentPeriod`

```python
class EnrollmentPeriod(BaseModel):
    name = models.CharField(max_length=255)
    academic_year = models.CharField(max_length=20)   # e.g. "2025/2026"
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(choices=PeriodStatus.choices)
    enrollment_fee = models.DecimalField()
    insurance_fee_general = models.DecimalField()
    insurance_fee_intensive = models.DecimalField()
```

**Single-open invariant (enforced).** At most one period may be `is_open=True`
at any time, globally — regardless of `academic_year` or `period_type`. Creates
default to closed (drafts allowed). Attempting to open a second period — via
`open_period`, `update_period` flipping `is_open` False→True, or `create_period`
with `is_open=True` — raises `ValidationError("ConflictingOpenPeriod")` with
the conflicting period id attached. Workflow: close the current period, then
open the next. Edits to dates/prices on the already-open period do not retrigger
the check.

### `Enrollment`

Immutable snapshot of student + guardian data at submission time.

```python
class Enrollment(BaseModel):
    status = models.CharField(choices=EnrollmentStatus.choices)
    academic_year = models.CharField(max_length=20)
    enrollment_type = models.CharField(choices=EnrollmentType.choices)  # new | renewal
    # Student snapshot
    student_email, student_name, student_date_of_birth, student_vat,
    student_nationality, student_cc_number, student_document_validity,
    address, postal_code, historical_notes
    # Guardian snapshot
    parent_name, parent_email, parent_phone, parent_phone_country
```

### Status machine

```
SUBMITTED → UNDER_REVIEW → APPROVED
                         → REJECTED
SUBMITTED → CANCELLED
UNDER_REVIEW → CANCELLED
```

`UNDER_REVIEW` must have an explicit API transition — otherwise it's an unreachable dead state.

### `EnrollmentModality` — links enrollment to modalities

### `EnrollmentFile` — uploaded payment proof / documents

### `EnrollmentConsent` — GDPR audit record

```python
class EnrollmentConsent(BaseModel):
    enrollment = models.ForeignKey(Enrollment)
    consent_type = models.CharField()   # "rgpd", "regulamento_interno"
    accepted = models.BooleanField()
    accepted_at = models.DateTimeField()
    user_agent = models.TextField()
    ip_address = models.GenericIPAddressField()
```

### `EnrollmentPayment`

```python
class EnrollmentPayment(BaseModel):
    enrollment = models.ForeignKey(Enrollment)
    payment_type = models.CharField()    # enrollment_fee | insurance
    amount = models.DecimalField()
    regime = models.CharField()          # general | intensive
    payment_status = models.CharField()  # pending | confirmed | rejected
    confirmed_by = models.ForeignKey(User, null=True)
```

---

## File upload (Option B — JSON inside multipart)

```python
# View
parser_classes = [MultiPartParser, FormParser, JSONParser]

# Service
data = json.loads(request.data["data"])
files = request.FILES

# Consent capture
ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR"))
user_agent = request.META.get("HTTP_USER_AGENT", "")
```

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/enrollments/periods/` | **Public** | List **open** periods only |
| GET | `/api/enrollments/periods/admin/` | Auth + `can_manage_periods` | List all periods, filters: `is_open`, `period_type`, `academic_year` |
| POST | `/api/enrollments/periods/create/` | Auth + perm | Create period (defaults to closed) |
| GET | `/api/enrollments/periods/<pk>/` | Public for open / Auth + perm for closed | Detail — closed periods return `EnrollmentPeriodNotFound` to non-admin callers |
| PATCH | `/api/enrollments/periods/<pk>/` | Auth + perm | Update |
| POST | `/api/enrollments/periods/<pk>/open/` | Auth + perm | Open (enforces single-open invariant) |
| POST | `/api/enrollments/periods/<pk>/close/` | Auth + perm | Close |
| POST | `/api/enrollments/` | Auth | Submit enrollment |
| GET | `/api/enrollments/list/` | Auth + perm | List (admin) |
| GET/PATCH | `/api/enrollments/<pk>/` | Auth + perm | Detail / edit |
| POST | `/api/enrollments/<pk>/approve/` | Auth + perm | Approve |
| POST | `/api/enrollments/<pk>/reject/` | Auth + perm | Reject |
| POST | `/api/enrollments/<pk>/cancel/` | Auth + perm | Cancel |
| GET/POST | `/api/enrollments/<pk>/payments/` | Auth + perm | List / add payment |
| POST | `/api/enrollments/<pk>/payments/<id>/confirm/` | Auth + perm | Confirm payment |

> `GET /api/enrollments/periods/` must be `permission_classes = [AllowAny]` — parents need it without an account. The DRF global default is `IsAuthenticated`, so this must be explicit.

---

## Open questions

See [open-questions.md](../open-questions.md) Q4 (re-enrollment flow) and Q5 (annual classes vs. coachings).
