# Feature — User Invitation & Onboarding

**ADO PBI:** #254 — Not yet implemented

When a teacher, staff member, or parent needs to be brought into the system, direction or coordination issues an invite. The invitee receives an email with a time-limited link. They follow the link, complete their profile, set a password, and their account becomes active. Until that moment, the account exists in the system but cannot be used.

Direction can invite anyone below their level. Coordination can invite staff, teachers, parents, and students — but not other coordination or direction. The hierarchy is enforced in the service layer, not just via permissions.

The invite token lives only in Redis. It has a 7-day TTL and is consumed on successful onboarding — after that, the link stops working. If a token expires or is lost, a new invite can be resent, which invalidates the old token and issues a fresh one. Resending to an already-active user is rejected.

Bulk onboarding is also supported: direction or coordination uploads an Excel file with a list of emails and roles. Every row is validated before any account is created — if a single row fails, the entire batch is rejected with a per-row error report. This all-or-nothing behaviour prevents partial state.

This feature replaces the current `POST /api/accounts/users/` endpoint, which exists only for testing and must not be used in production.

# PBI — User Invite & Onboarding

## Context

The platform currently has no way for direction or coordination to bring new users in. The existing `POST /api/accounts/users/`endpoint was built for development convenience only and must not be used in production flows. This PBI introduces the full invite lifecycle: single invite, bulk invite via Excel, token-based onboarding, and resend for expired links.

The key design principle is that **no user is created with a usable account until they complete onboarding themselves**. Direction and coordination trigger the invite; the user owns the rest.

---

## Actors

- **Direction** — can invite all roles below direction (coordination, staff, teacher, parent, student)
- **Coordination** — can invite all roles below coordination (staff, teacher, parent, student)
- **Invitee** — the person receiving the invite email, completing onboarding

---

## Token Model

When an invite is issued, a short-lived token is created and stored in Redis with a 7-day TTL:

- Key: `invite:{token}` (token is a cryptographically random UUID)
- Value: the invited user's primary key
- TTL: 7 days from issuance
- On resend: the old token is deleted from Redis and a new one is created
- On successful onboarding: the token is deleted from Redis immediately

The token is included in the invite email as part of a frontend URL: `{FRONTEND_URL}/onboard/{token}/`. The frontend is responsible for presenting the onboarding form; the backend only validates and processes the submission.

---

## Rules

1.  Only users with `direction` or `coordination` roles may issue invites or resend links.
2.  Direction may invite: coordination, staff, teacher, parent, student.
3.  Coordination may invite: staff, teacher, parent, student.
4.  Neither role may invite a role at the same level or above.
5.  The invite email and role are the only fields required at invite time.
6.  If an active or inactive user already exists with the given email, the invite must be rejected.
7.  The invitee is created as an inactive user at invite time. The account becomes active only after successful onboarding.
8.  The onboarding form must collect all fields required to complete the user record: first name, last name, password, phone, phone country code, and date of birth.
9.  Additional fields (NIF, nationality, document number, document expiry, address, postal code) are optional at onboarding and may be completed later via profile update.
10. After successful onboarding, the user is automatically authenticated — the response must include a valid JWT access and refresh token pair.
11. A token is valid for 7 days. After expiry, the onboarding link no longer works. Direction or coordination must resend a new invite.
12. Resending an invite issues a new token and invalidates the previous one. If no previous token exists (e.g. was already used or expired naturally), a new one is issued regardless.
13. Resend is only permitted for users who are still inactive. Resending to an already active user must be rejected.

---

## Endpoints

### 1. Single Invite

`POST /api/accounts/invites/`

**Permission:** `accounts.can_invite_user`

**Request body:**

    {
      "email": "teacher@example.com",
      "role": "teacher"
    }

**Logic:**

- Validate role is one the requesting user is permitted to invite.
- Reject if a user with that email already exists (active or inactive).
- Create inactive user with email and role assigned.
- Generate Redis token with 7-day TTL.
- Dispatch `send_invite_email_task.delay(user_id, token)` via Celery.
- Return 201 with the created user summary.

---

### 2. Bulk Invite via Excel

`POST /api/accounts/invites/bulk/`

**Permission:** `accounts.can_invite_user`

**Request:** multipart form, single `.xlsx` file.

**Excel format:** two columns — `email`, `role`. Header row required. No other columns are read.

**Logic:**

1.  Parse the file. If the file is malformed or unreadable, reject with a file-level error.
2.  Validate every row before creating anything:
    - Email is present and a valid email address.
    - Role is present and is a valid role code.
    - Role is one the requesting user is permitted to invite.
    - No user with that email already exists.
    - No duplicate emails within the file itself.
3.  If **any** row fails validation, reject the entire request with a per-row error report. No users are created.
4.  If all rows are valid, create all users atomically and dispatch one `send_invite_email_task` per user via Celery.
5.  Return 201 with the list of created user summaries and a count.

**Error response shape (validation failure):**

    {
      "errors": {
        "messages": ["BulkInviteValidationFailed"],
        "rows": [
          { "row": 2, "email": "bad-email", "errors": ["InvalidEmail"] },
          { "row": 5, "email": "existing@example.com", "errors": ["EmailAlreadyExists"] }
        ]
      }
    }

---

### 3. Validate Onboarding Token

`GET /api/accounts/onboard/{token}/`

**Permission:** public (no authentication required).

**Logic:**

- Look up `invite:{token}` in Redis.
- If not found or expired, return 404 with `InvalidOrExpiredInviteToken`.
- If found, return the invited user's email and role so the frontend can pre-fill and display context.

**Response:**

    {
      "data": {
        "email": "teacher@example.com",
        "role": "teacher"
      }
    }

---

### 4. Complete Onboarding

`POST /api/accounts/onboard/{token}/`

**Permission:** public (no authentication required).

**Request body:**

    {
      "first_name": "Ana",
      "last_name": "Silva",
      "password": "securepassword",
      "phone": "912345678",
      "phone_country_code": "+351",
      "date_of_birth": "1990-05-15"
    }

**Logic:**

- Look up `invite:{token}` in Redis. If not found or expired, return 400 with `InvalidOrExpiredInviteToken`.
- Load the inactive user by the stored user ID.
- If user is already active, return 400 with `AccountAlreadyActive`.
- Set first name, last name, phone, phone country code, date of birth.
- Set and hash the password.
- Mark user as active.
- Delete `invite:{token}` from Redis.
- Issue JWT access and refresh token pair.
- Return 200 with the token pair.

**Response:**

    {
      "data": {
        "access": "...",
        "refresh": "..."
      }
    }

---

### 5. Resend Invite

`POST /api/accounts/users/{pk}/resend-invite/`

**Permission:** `accounts.can_invite_user` + same role hierarchy rules as invite.

**Logic:**

- Load user by pk.
- If user is already active, return 400 with `AccountAlreadyActive`.
- Scan Redis for any existing `invite:*` token pointing to this user and delete it.
- Generate a new token, store in Redis with 7-day TTL.
- Dispatch `send_invite_email_task.delay(user_id, token)`.
- Return 200.

---

## Email

A new email template `invite` is required in both `pt` and `en` (html + txt). The template receives:

- `invitee_email` — the email address being invited
- `role_display` — human-readable role name
- `onboarding_url` — the full frontend URL including the token
- `expires_days` — always 7

The email must make clear that the link expires in 7 days and is single-use.

---

## Celery Task

`send_invite_email_task(user_id, token)` in `accounts/tasks.py`:

- Fetches the user by ID.
- Guards: if user is already active, logs a warning and skips.
- Constructs the onboarding URL from `FRONTEND_URL` + token.
- Calls the invite email function.
- Retries up to 3 times with 60s delay on failure.

---

## Permissions

Two new permission codes are required:

Code

Description

`accounts.can_invite_user`

Can issue single and bulk invites

Role assignments:

- Direction: `can_invite_user` ✓
- Coordination: `can_invite_user` ✓
- All other roles: no

The role hierarchy check (direction cannot invite direction, coordination cannot invite direction or coordination) is enforced in the service layer, not via a permission code — it is contextual logic dependent on the requesting user's role.

---

## Tasks

#

Task

Notes

1

Add `can_invite_user` permission to seed and role assignment

Update `seed_permissions` and `seed_roles` management commands

2

Implement `invite_user` service

Single user creation + Redis token + Celery dispatch

3

Implement `resend_invite` service

Token invalidation + new token + Celery dispatch

4

Implement `complete_onboarding` service

Token validation + user activation + JWT issuance

5

Implement `bulk_invite` service

Excel parsing, all-or-nothing validation, atomic creation

6

Create `POST /api/accounts/invites/` view

Single invite endpoint

7

Create `POST /api/accounts/invites/bulk/` view

Bulk invite endpoint

8

Create `GET /api/accounts/onboard/{token}/` view

Token validation endpoint

9

Create `POST /api/accounts/onboard/{token}/` view

Onboarding completion endpoint

10

Create `POST /api/accounts/users/{pk}/resend-invite/` view

Resend endpoint

11

Create `send_invite_email_task` in `accounts/tasks.py`

Celery task with guard + retry

12

Create invite email templates — pt/en html + txt

4 template files

13

Add `openpyxl` dependency for Excel parsing

`uv add openpyxl`

14

Unit tests for all service functions

Token creation, validation, expiry, hierarchy rules, bulk validation

15

Integration tests for all endpoints

Happy path + error cases per endpoint
