# Messaging — Manual Test Guide

**Environment:** Local Docker Compose (`localhost:8000`)  
**Prerequisites:** Server running, Redis up, two users with known credentials

---

## Setup

You need two users. Use any existing seeded accounts or create them via the invite flow. This guide uses:

| Label | Email | Password |
|---|---|---|
| User A | `direction@test.com` | `Test1234!` |
| User B | `teacher@test.com` | `Test1234!` |

---

## Step 1 — Authenticate both users

**User A login**
```
POST /api/accounts/auth/login/
Content-Type: application/json

{
  "email": "direction@test.com",
  "password": "Test1234!"
}
```
Save the `access` token → `TOKEN_A`

**User B login**
```
POST /api/accounts/auth/login/
Content-Type: application/json

{
  "email": "teacher@test.com",
  "password": "Test1234!"
}
```
Save the `access` token → `TOKEN_B`

---

## Step 2 — Get user IDs

```
GET /api/accounts/users/
Authorization: Bearer TOKEN_A
```

Find User B's `id` in the response. Save it as `USER_B_ID`.

---

## Step 3 — Create a conversation (User A)

```
POST /api/messaging/conversations/
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "user_id": USER_B_ID
}
```

Expected response — `200 OK`:
```json
{
  "id": 1,
  "participant_ids": [1, 2],
  "studio_id": null,
  "last_message": null,
  "updated_at": "2026-05-04T10:00:00Z"
}
```

Save the conversation `id` → `CONV_ID`.

**Repeat the same request.** Expected: same `200 OK` with the same `id` — the endpoint is idempotent, it does not create a duplicate.

---

## Step 4 — List conversations (both users)

**User A**
```
GET /api/messaging/conversations/
Authorization: Bearer TOKEN_A
```
Expected: array containing the conversation created in step 3.

**User B**
```
GET /api/messaging/conversations/
Authorization: Bearer TOKEN_B
```
Expected: same conversation appears — both participants see it.

---

## Step 5 — REST: send and read messages

REST handles message history (GET) and **file uploads** (POST as `multipart/form-data`). Text-only sends usually go through the WebSocket (step 6) for realtime delivery, but the REST POST also accepts them.

**Fetch messages as User A (empty so far)**
```
GET /api/messaging/conversations/CONV_ID/messages/
Authorization: Bearer TOKEN_A
```
Expected — `200 OK`, empty array `[]`.

**Send a message via REST (multipart-only)**
```
POST /api/messaging/conversations/CONV_ID/messages/
Authorization: Bearer TOKEN_A
Content-Type: multipart/form-data

Form fields:
  data = {"body": "Hello via REST"}   # JSON-encoded payload (optional if file is sent)
  file = <binary>                     # optional attachment
```
Expected — `201 Created` with the created message. At least one of `data.body` or `file` is required (`MessageBodyOrFileRequired` otherwise).

**Fetch messages as an outsider (no access)**

Log in as a third user who is not a participant and call:
```
GET /api/messaging/conversations/CONV_ID/messages/
Authorization: Bearer TOKEN_OUTSIDER
```
Expected — `404 Not Found`.

---

## Step 6 — WebSocket real-time messaging

Use a WebSocket client (e.g. Postman, `wscat`, or browser DevTools).

### 6.1 Connect User A

```
ws://localhost:8000/ws/conversations/CONV_ID/?token=TOKEN_A
```

Expected: connection accepted (101 Switching Protocols).

### 6.2 Connect User B in a second client

```
ws://localhost:8000/ws/conversations/CONV_ID/?token=TOKEN_B
```

Expected: connection accepted.

### 6.3 User A sends a message

With User A's WebSocket connection open, send:
```json
{ "body": "Hey, are you free Thursday?" }
```

Expected on **both** User A and User B connections:
```json
{
  "id": 1,
  "sender_id": <user_a_id>,
  "body": "Hey, are you free Thursday?",
  "created_at": "2026-05-04T10:01:00Z"
}
```

### 6.4 User B replies

With User B's connection, send:
```json
{ "body": "Yes, what time works for you?" }
```

Expected on both connections:
```json
{
  "id": 2,
  "sender_id": <user_b_id>,
  "body": "Yes, what time works for you?",
  "created_at": "2026-05-04T10:01:05Z"
}
```

### 6.5 Connect with invalid token

```
ws://localhost:8000/ws/conversations/CONV_ID/?token=INVALID
```
Expected: connection closed immediately (authentication fails).

### 6.6 Connect as non-participant

```
ws://localhost:8000/ws/conversations/CONV_ID/?token=TOKEN_OUTSIDER
```
Expected: connection closed immediately (participant check fails).

---

## Step 7 — Verify message history via REST

After the WebSocket exchange, fetch history:

```
GET /api/messaging/conversations/CONV_ID/messages/
Authorization: Bearer TOKEN_A
```

Expected — `200 OK`, two messages in chronological order:
```json
[
  { "id": 1, "sender_id": <user_a_id>, "body": "Hey, are you free Thursday?", "created_at": "..." },
  { "id": 2, "sender_id": <user_b_id>, "body": "Yes, what time works for you?", "created_at": "..." }
]
```

Fetching marks all unread messages as read for User A.

---

## Step 8 — Edit and delete a message

### 8.1 Edit own message (within 15 min)

As the **original sender** (e.g. User A for message id `1`):
```
PATCH /api/messaging/messages/1/
Authorization: Bearer TOKEN_A
Content-Type: application/json

{"body": "Hey, are you free Friday instead?"}
```
Expected — `200 OK`, message returned with `edited_at` populated (non-null).

If WebSocket clients are connected, both User A and User B receive:
```json
{"type": "message.edited", "id": 1, "body": "Hey, are you free Friday instead?", "edited_at": "..."}
```

### 8.2 Edit someone else's message → 403

As User B, attempt to edit message id `1` (sent by User A):
```
PATCH /api/messaging/messages/1/
Authorization: Bearer TOKEN_B

{"body": "I'm changing User A's message"}
```
Expected — `403 Forbidden`, `{"errors": {"messages": ["NotMessageSender"]}}`.

### 8.3 Edit window expired

Edit a message older than `MESSAGE_EDIT_WINDOW_MINUTES` (default 15 min). Expected — `400` with `{"errors": {"messages": ["MessageEditWindowExpired"]}}`.

### 8.4 Edit with empty body → 400

```
PATCH /api/messaging/messages/1/
Authorization: Bearer TOKEN_A

{"body": "   "}
```
Expected — `400` with `{"errors": {"body": ["MessageBodyRequired"]}}`.

### 8.5 Delete own message

```
DELETE /api/messaging/messages/1/
Authorization: Bearer TOKEN_A
```
Expected — `204 No Content`.

WebSocket clients receive:
```json
{"type": "message.deleted", "id": 1}
```

### 8.6 Verify tombstone in history

```
GET /api/messaging/conversations/CONV_ID/messages/
Authorization: Bearer TOKEN_A
```
Expected — the deleted message is still present but with `body=""`, `file_url=null`, `original_filename=""`, and `deleted_at` populated. The client renders it as "This message was deleted".

### 8.7 Re-edit / re-delete a deleted message → 400

```
PATCH /api/messaging/messages/1/   # or DELETE
```
Expected — `400` with `{"errors": {"messages": ["MessageAlreadyDeleted"]}}`.

---

## Step 9 — Reactions

### 9.1 Add a reaction

As User B (a conversation participant), react to message id `2` with a thumbs-up:
```
POST /api/messaging/messages/2/reactions/
Authorization: Bearer TOKEN_B
Content-Type: application/json

{"emoji": "👍"}
```
Expected — `201 Created` with the full message; `reactions` field now contains:
```json
[{"emoji": "👍", "count": 1, "user_ids": [<user_b_id>]}]
```

WebSocket clients receive:
```json
{"type": "reaction.added", "message_id": 2, "user_id": <user_b_id>, "emoji": "👍"}
```

### 9.2 Re-add same reaction → idempotent

Same request again. Expected — `201` with the same `reactions` array (count still 1). No duplicate row created.

### 9.3 Multiple users react with the same emoji

As User A, react to the same message with `👍`. Expected — `reactions: [{"emoji": "👍", "count": 2, "user_ids": [<user_a_id>, <user_b_id>]}]`.

### 9.4 Different emojis aggregate separately

As User A, react with `❤️`. Expected — two groups in `reactions`:
```json
[
  {"emoji": "👍", "count": 2, "user_ids": [...]},
  {"emoji": "❤️", "count": 1, "user_ids": [<user_a_id>]}
]
```

### 9.5 Remove a reaction

```
DELETE /api/messaging/messages/2/reactions/
Authorization: Bearer TOKEN_B
Content-Type: application/json

{"emoji": "👍"}
```
Expected — `200 OK` with updated message. `reactions["👍"].user_ids` no longer includes User B.

WebSocket: `{"type": "reaction.removed", "message_id": 2, "user_id": <user_b_id>, "emoji": "👍"}`.

### 9.6 Remove a reaction that doesn't exist → no-op

Same request again. Expected — `200 OK`, no change, no broadcast.

### 9.7 React to a tombstoned message → 400

After deleting message id `1`, attempt to react:
```
POST /api/messaging/messages/1/reactions/
{"emoji": "👍"}
```
Expected — `400` with `{"errors": {"messages": ["MessageAlreadyDeleted"]}}`.

### 9.8 React as non-participant → 404

Expected — `404 MessageNotFound` (same as PATCH/DELETE behavior).

### 9.9 Empty / oversized emoji → 400

- `{"emoji": ""}` → `400` (DRF blank-not-allowed).
- `{"emoji": "<17+ chars>"}` → `400` `EmojiTooLong`.

---

## Step 10 — Pin / unpin

Any conversation participant can pin or unpin any message in the conversation. No permission gate beyond participation.

### 10.1 Pin a message

```
POST /api/messaging/messages/2/pin/
Authorization: Bearer TOKEN_A
```
Expected — `200 OK` with the message; `pinned_at` populated, `pinned_by_id` = User A's id.

WebSocket clients receive:
```json
{"type": "message.pinned", "id": 2, "pinned_by_id": <user_a_id>, "pinned_at": "..."}
```

### 10.2 Re-pin → no-op

Same request again. Expected — `200 OK`, `pinned_at` unchanged, no new broadcast.

### 10.3 Conversation surface lists pinned ids

```
GET /api/messaging/conversations/
Authorization: Bearer TOKEN_A
```
Expected — the conversation entry now contains `pinned_message_ids: [2]` (newest pin first).

### 10.4 Unpin

```
POST /api/messaging/messages/2/unpin/
Authorization: Bearer TOKEN_A
```
Expected — `200 OK`, `pinned_at: null`, `pinned_by_id: null`.

WebSocket: `{"type": "message.unpinned", "id": 2}`.

### 10.5 Unpin an unpinned message → no-op

Same request again. Expected — `200 OK`, no change, no broadcast.

### 10.6 Pin a tombstoned message → 400

After deleting message id `1`, attempt:
```
POST /api/messaging/messages/1/pin/
```
Expected — `400` with `{"errors": {"messages": ["MessageAlreadyDeleted"]}}`.

### 10.7 Pin as non-participant → 404

Expected — `404 MessageNotFound`.

### 10.8 Either participant can unpin

User A pins message `2`. User B (the other participant, not the pinner) calls unpin. Expected — `200 OK`, unpinned. No ownership constraint on the pin action.

### 10.9 Deleting a pinned message auto-unpins

User A pins message `2`, then deletes it. Expected:
- `204 No Content` on the DELETE.
- The conversation's `pinned_message_ids` no longer contains `2`.
- WebSocket clients receive **two** events in order: `{"type": "message.unpinned", "id": 2}` then `{"type": "message.deleted", "id": 2}`.

---

## Step 11 — Conversation `updated_at` reflects last message

```
GET /api/messaging/conversations/
Authorization: Bearer TOKEN_A
```

The conversation's `updated_at` must be newer than the timestamp from step 3, and `last_message` must show message id 2.

---

## Edge cases checklist

| # | Scenario | Expected |
|---|---|---|
| E1 | `POST /api/messaging/conversations/` without `user_id` | `400` with `{"user_id": ["This field is required."]}` |
| E2 | `POST` with a `user_id` that does not exist | `400` with `{"user_id": ["User not found."]}` |
| E3 | `POST` with a `studio_id` that does not exist | `400` with `{"studio_id": ["Studio not found."]}` |
| E4 | WebSocket send with empty `body` | Message silently dropped — no broadcast, nothing persisted |
| E5 | WebSocket send with malformed JSON | Message silently dropped |
| E6 | Two `POST /conversations/` calls between the same pair | Returns the same conversation both times (`id` identical) |
| E7 | `PATCH` a message you didn't send | `403 NotMessageSender` |
| E8 | `PATCH` a message older than 15 min | `400 MessageEditWindowExpired` |
| E9 | `PATCH` with empty body | `400 MessageBodyRequired` |
| E10 | `DELETE` a message you didn't send | `403 NotMessageSender` |
| E11 | `PATCH`/`DELETE` on an already-deleted message | `400 MessageAlreadyDeleted` |
| E12 | `PATCH`/`DELETE` as a non-participant | `404 MessageNotFound` |
| E13 | Re-react with same emoji | `201`, idempotent (no duplicate row) |
| E14 | Remove a reaction that doesn't exist | `200`, no-op, no broadcast |
| E15 | React on a tombstoned message | `400 MessageAlreadyDeleted` |
| E16 | React as non-participant | `404 MessageNotFound` |
| E17 | Re-pin an already-pinned message | `200`, no-op, no broadcast |
| E18 | Unpin a message that wasn't pinned | `200`, no-op, no broadcast |
| E19 | Pin a tombstoned message | `400 MessageAlreadyDeleted` |
| E20 | Pin/unpin as non-participant | `404 MessageNotFound` |

---

## wscat quick reference

If you have `wscat` installed (`npm i -g wscat`):

```bash
# Connect
wscat -c "ws://localhost:8000/ws/conversations/1/?token=YOUR_TOKEN"

# Send a message (once connected)
> {"body": "Hello!"}
```
