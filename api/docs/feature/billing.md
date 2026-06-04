# Feature — Billing

**ADO PBI:** #249 — Models and services done; API endpoints pending

Billing in StudioOS tracks what each student owes the school. Every charge is a `BillingEntry` — a single line item for a specific student, with an amount, a human-readable description, and a source that explains where it came from. Currently there are two sources: coaching attendance and approved fines.

**Coaching entries** are created automatically when coordination completes a coaching session. There is one entry per attended participant. The amount is each participant's share of the total coaching price — split equally, with any residual cent going to the first participant in the roster. The description is generated from the session data (modality, date, teacher, format) and is meant to be readable on an invoice or accounting export without any manual editing.

**Fine entries** are created when coordination approves a fine. Fines start as pending candidates — the system creates them automatically at coaching completion for absent and late-cancelled participants — and only become a billing entry after a human reviews and approves them. Coordination can waive a fine instead, in which case no billing entry is created and a justification note is recorded for the audit trail.

Once an entry exists, it is `pending` until it is either exported to the accounting system or manually cancelled. Cancelling an entry requires a non-empty note explaining why. Exported entries cannot be cancelled — if an error is found after export, it must be handled in Educabiz.

The export to Educabiz is a future feature. When it runs, it will mark the relevant entries as `exported` and record when this happened. The goal is to eliminate the monthly manual Excel reconciliation that currently happens outside the system.

Staff can see all entries across all students and filter by student, coaching session, status, source type, or date range. Students only see their own entries.
