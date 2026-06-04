# Feature — Enrollment (Matrícula)

Enrollment is how a student officially joins the school for an academic year. A parent or guardian fills in the student's details, selects the modalities they want to enroll in, attaches proof of payment, and gives explicit consent for data processing. The school then reviews the submission, confirms the payment, and approves.

The enrollment record is an immutable snapshot of the student and guardian data at the time of submission. It exists independently of the user account — the school may receive an enrollment before the family has a system account, and the historical data should always reflect what was submitted, even if details change later.

Enrollment periods define when submissions are open. Each period has a start date, end date, and academic year. Outside a period, enrollment submission is not available. The pricing for the matrícula fee and insurance is tied to the period, so it can change year to year without affecting historical records.

The process has multiple parties involved. The parent submits. Staff reviews, potentially requests more information, and then approves or rejects. Payment is tracked separately — it can be recorded and confirmed in steps, reflecting the reality that bank transfers are confirmed manually.

GDPR consent is captured with full audit metadata: which consent types were accepted, when, from which IP address, and with which user agent. This is a legal requirement and must not be skipped or faked.

The file upload flow handles multipart submissions where both structured data (JSON) and file attachments (payment proof, identity documents) are sent together. The frontend sends JSON as a string field alongside the files, and the backend unpacks both.

There is currently no age validation against modality constraints at submission time — a student can enroll in Baby Class I regardless of age. This is a known gap (PBI #239).
