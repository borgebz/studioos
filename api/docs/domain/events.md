# Domain — Events

App: `events`  
Status: **Models fully implemented. API layer (views/endpoints) status: in progress (PBI #241, Committed).**

---

## Business context

StudioOS holds school events — end-of-year shows, open days, recitals, competitions. The events app manages the full lifecycle of an event from draft to archived, including internal updates (posts), community interest, comments, and file attachments. There is **no ticket selling** — that is out of scope for now.

---

## Dual state machine

Events have two orthogonal states:

### `EventVisibilityState`

| Value | Meaning |
|-------|---------|
| `draft` | Internal only — not visible to community |
| `scheduled` | Publication scheduled for a future date |
| `published` | Publicly visible |
| `archived` | No longer active |

### `EventState`

| Value | Meaning |
|-------|---------|
| `planned` | Event is planned with a known date |
| `date_tbd` | Event is confirmed but date not yet set |
| `cancelled` | Event cancelled |
| `completed` | Event has taken place |

---

## Models

### `Event`

```python
class Event(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    body = models.TextField(blank=True)           # Rich text / HTML
    cover_photo = models.ImageField(...)
    location = models.CharField(max_length=255, blank=True)
    event_date = models.DateTimeField(null=True, blank=True)

    event_state = models.CharField(choices=EventState.choices, default="planned")
    visibility_state = models.CharField(choices=EventVisibilityState.choices, default="draft")

    contact_info = models.TextField(blank=True)
    publication_scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
```

Custom permissions:
- `can_view_unpublished_event` — see drafts/scheduled events
- `can_publish_event` — transition to published
- `can_schedule_event_publication` — set `publication_scheduled_at`
- `can_archive_event`, `can_cancel_event`, `can_complete_event`

### `EventFile`

File attachments per event (PDFs, images, etc.).

```python
event = FK(Event), file = FileField, file_name = CharField
```

### `EventComment`

Threaded comments on an event.

```python
event = FK(Event), owner = FK(User),
body = TextField,
parent_comment = self-FK (nullable — null = top-level)
```

Custom permission: `can_moderate_eventcomment`

### `EventInterest`

Tracks which users have expressed interest in an event ("Tenho Interesse").

```python
event = FK(Event), user = FK(User)
# Unique: (event, user) where deleted_at IS NULL
```

### `EventPost`

Sub-posts / updates published under an event (e.g. "rehearsal update", "new info").

```python
event = FK(Event), title = CharField, body = TextField,
publication_scheduled_at, published_at
```

Custom permissions: `can_view_unpublished_eventpost`, `can_publish_eventpost`, `can_schedule_eventpost_publication`

---

## Planned endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events/` | List published events (public); drafts with perm |
| POST | `/api/events/` | Create event (direction/coordination) |
| GET | `/api/events/<pk>/` | Detail |
| PATCH | `/api/events/<pk>/` | Update event |
| POST | `/api/events/<pk>/publish/` | Publish |
| POST | `/api/events/<pk>/archive/` | Archive |
| POST | `/api/events/<pk>/cancel/` | Cancel event |
| POST | `/api/events/<pk>/complete/` | Mark completed |
| GET/POST | `/api/events/<pk>/files/` | List / upload file |
| DELETE | `/api/events/<pk>/files/<id>/` | Delete file |
| GET/POST | `/api/events/<pk>/posts/` | List / create post |
| PATCH | `/api/events/<pk>/posts/<id>/` | Update post |
| POST | `/api/events/<pk>/posts/<id>/publish/` | Publish post |
| GET/POST | `/api/events/<pk>/comments/` | List / create comment |
| DELETE | `/api/events/<pk>/comments/<id>/` | Delete / moderate comment |
| POST | `/api/events/<pk>/interest/` | Toggle interest |

---

## Notes

- `published_at` is set when `visibility_state` transitions to `published`.
- `publication_scheduled_at` + Celery task handles scheduled publication.
- No ticket selling — events are informational/community only.
