# Domain — Billing & Fines

App: `billing`  
See also: [feature/billing.md](../feature/billing.md) for the full implementation PBI.

---

## `BillingEntry` (polymorphic)

```python
class BillingEntry(BaseModel):
    source_type = CharField(choices=["coaching", "fine"])
    coaching_class = FK(CoachingClass, null=True, on_delete=PROTECT)
    coaching_participant = FK(CoachingParticipant, null=True, on_delete=PROTECT)
    fine = FK(Fine, null=True, on_delete=PROTECT)
    student = FK(User, on_delete=PROTECT)
    amount_due = DecimalField(max_digits=10, decimal_places=2)
    description = CharField(max_length=255)  # auto-generated, not editable
    status = CharField(choices=["pending", "exported", "cancelled"], default="pending")
    exported_at = DateTimeField(null=True)
    cancelled_at = DateTimeField(null=True)
    notes = TextField(blank=True)
```

DB constraints:
- coaching source requires `coaching_class` + `coaching_participant` both set
- fine source requires `fine` set
- `amount_due >= 0`
- Unique `(coaching_class, student)` where `source_type=coaching` and not soft-deleted
- Unique `fine` where `source_type=fine` and not soft-deleted

DB indexes on: `(student, status)`, `(status, created_at)`, `coaching_class`

---

## Description format

Generated at creation, stored in `description` field.

**Coaching entry:** `"Modalidade | dd/mm/yyyy HH:MM | Prof. Nome | Tipo (X de Y)"`

Where `Tipo` is: Privada (1), Dueto (2), Trio (3), Ensemble (4+).

**Fine entry:** `"Multa: Razão | Modalidade | dd/mm/yyyy HH:MM"`

---

## Split algorithm

Runs inside `complete_coaching` transaction. Attended participants ordered by `(created_at, pk)`. First participant absorbs residual cents.

```python
def _split_total_amount(*, total: Decimal, n: int) -> list[Decimal]:
    if n <= 0:
        return []
    part = (total / Decimal(n)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    amounts = [part] * n
    remainder = total - part * Decimal(n)
    amounts[0] = (amounts[0] + remainder).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    return amounts
# Invariant: sum(amounts) == total
```

---

## `create_billing_entries_for_coaching`

Called by `complete_coaching` **inside the same atomic transaction**.

No-ops (returns `[]`):
- `is_billable=False`
- `total_price <= 0`
- Zero `ATTENDED` participants (logs warning)

Error: `total_price is None` → `ValidationError("CoachingMissingTotalPrice")`

---

## `cancel_billing_entry`

- Requires `billing.can_cancel_billingentry`
- Only from `pending` → `ValidationError("EntryNotCancellable")`
- Non-empty `notes` required → `ValidationError("CancellationNotesRequired")`

---

## `Fine`

```python
class Fine(BaseModel):
    coaching_class = FK(CoachingClass, on_delete=PROTECT)
    coaching_participant = FK(CoachingParticipant, on_delete=PROTECT)
    student = FK(User, on_delete=PROTECT)
    reason = CharField(choices=["absence", "late_cancellation"])
    status = CharField(choices=["pending_review", "approved", "waived"], default="pending_review")
    amount = DecimalField(null=True)     # set on approval; null while pending/waived
    reviewed_at = DateTimeField(null=True)
    reviewed_by = FK(User, null=True)
    notes = TextField(blank=True)
```

Constraints: one live fine per `coaching_participant`; `amount >= 0`  
Permission: `billing.can_review_fine`

---

## Fine lifecycle

Auto-created at coaching completion for `ABSENT` and `LATE_CANCELLED` participants.

```
pending_review
    ├── approve_fine(amount, reviewed_by) → APPROVED + BillingEntry created
    └── waive_fine(reviewed_by, notes)   → WAIVED (no charge)
```

Both `APPROVED` and `WAIVED` are terminal. To reverse an approved fine, cancel the BillingEntry; the Fine stays `APPROVED`.

---

## `approve_fine`

- Only from `pending_review` → `ValidationError("FineNotPendingReview")`
- `amount` optional — falls back to `COACHING_FINE_DEFAULT_AMOUNT` env setting (default: 25.00 EUR)
- Creates a `BillingEntry` with `source_type=fine` in the same call
- Sets `reviewed_at`, `reviewed_by`, `amount`

## `waive_fine`

- Only from `pending_review`
- `notes` required (audit trail) → `ValidationError("WaiveNotesRequired")`

---

## Environment config

| Setting | Default | Notes |
|---------|---------|-------|
| `COACHING_FINE_DEFAULT_AMOUNT` | `25.00` | EUR — suggested amount surfaced in UI at approval time |

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/entries/` | List — staff sees all; students see own only |
| GET | `/api/billing/entries/<pk>/` | Detail — student 404s if not their own |
| POST | `/api/billing/entries/<pk>/cancel/` | Cancel (requires `can_cancel_billingentry`) |
| GET | `/api/billing/fines/` | List fines — same scoping rules |
| GET | `/api/billing/fines/<pk>/` | Fine detail |
| POST | `/api/billing/fines/<pk>/approve/` | Approve fine (requires `can_review_fine`) |
| POST | `/api/billing/fines/<pk>/waive/` | Waive fine (requires `can_review_fine`) |

List filters for entries: `student_id` (staff only), `coaching_class_id`, `status`, `source_type`, `date_from`, `date_to`  
List filters for fines: `student_id` (staff only), `coaching_class_id`, `status`, `reason`

---

## Future: Educabiz export

Export `BillingEntry` records (status=`pending`) as Excel/CSV for Educabiz. On export, entries transition to `exported` and `exported_at` is set — driven by the export job, not manual. Replaces monthly manual Excel reconciliation.
