# Email Simulation — How to Run

Sends one real email per scenario into **Mailpit** (http://localhost:8025) so you can visually inspect every template in both PT and EN before deploying.

## Prerequisites

- Docker stack running (`docker compose up -d`)
- Mailpit running on port 8025
- Seed users in the database (see below)

### Required seed users

| email | language | role |
|---|---|---|
| `teacher@teste.com` | `pt` | teacher |
| `student@teste.com` | `pt` | student |
| `teacher@test.com` | `en` | teacher |
| `student@test.com` | `en` | student |

To check / fix user languages:

```bash
docker compose exec api uv run python manage.py shell -c "
from accounts.models import User
for email in ['teacher@teste.com','student@teste.com','teacher@test.com','student@test.com']:
    u = User.objects.get(email=email)
    print(u.email, u.language)
"
```

To set them:

```bash
docker compose exec api uv run python manage.py shell -c "
from accounts.models import User
User.objects.filter(email__endswith='@teste.com').update(language='pt')
User.objects.filter(email__endswith='@test.com').update(language='en')
"
```

---

## Run the simulation

```bash
docker compose exec api uv run python manage.py shell -c "
from accounts.models import User
from coachings.models import CoachingClass, CoachingStatus
from modality.models import Modality
from studios.models import Studio
from datetime import timedelta
from django.utils import timezone
from accounts.emails import send_activation_email, send_invite_email, send_password_reset_email
from coachings.emails import (
    send_new_coaching_request_notification,
    send_coaching_approved_notification,
    send_coaching_cancelled_notification,
    send_coaching_completed_notification,
    send_coordination_coaching_created_notification,
    send_participant_cancelled_notification,
    send_waiting_confirmation_reminder,
    send_attendance_confirmation_reminder,
)
from messaging.services import get_or_create_direct_conversation, send_message as send_messaging_message
from messaging.emails import send_unread_messages_digest

teacher_pt = User.objects.get(email='teacher@teste.com')
teacher_en = User.objects.get(email='teacher@test.com')
student_pt = User.objects.get(email='student@teste.com')
student_en = User.objects.get(email='student@test.com')
modality = Modality.objects.first()
studio = Studio.objects.first()
start = timezone.now() + timedelta(days=3)

def mk(teacher, status=CoachingStatus.REQUESTED):
    return CoachingClass.objects.create(
        teacher=teacher, modality=modality,
        start_datetime=start, end_datetime=start + timedelta(hours=1),
        studio=studio, status=status,
    )

# ── accounts: activation ──────────────────────────────────────────────────────
send_activation_email(student_pt);                                         print('activation PT OK')
send_activation_email(student_en);                                         print('activation EN OK')

# ── accounts: password reset ──────────────────────────────────────────────────
send_password_reset_email(student_pt);                                     print('password_reset PT OK')
send_password_reset_email(student_en);                                     print('password_reset EN OK')

# ── accounts: invite ─────────────────────────────────────────────────────────
send_invite_email(user=student_pt, token='00000000-0000-0000-0000-000000000000'); print('invite PT OK')
send_invite_email(user=student_en, token='00000000-0000-0000-0000-000000000000'); print('invite EN OK')

# ── coaching: new request ──────────────────────────────────────────────────────
c = mk(teacher_pt)
send_new_coaching_request_notification(coaching=c, teacher=teacher_pt);    print('new_request PT OK')
c = mk(teacher_en)
send_new_coaching_request_notification(coaching=c, teacher=teacher_en);    print('new_request EN OK')

# ── coaching: approved (sent to teacher + student) ─────────────────────────────
c = mk(teacher_pt, CoachingStatus.SCHEDULED)
send_coaching_approved_notification(coaching=c, recipient=teacher_pt);     print('approved PT (teacher) OK')
send_coaching_approved_notification(coaching=c, recipient=student_pt);     print('approved PT (student) OK')
c = mk(teacher_en, CoachingStatus.SCHEDULED)
send_coaching_approved_notification(coaching=c, recipient=teacher_en);     print('approved EN (teacher) OK')
send_coaching_approved_notification(coaching=c, recipient=student_en);     print('approved EN (student) OK')

# ── coaching: cancelled (sent to teacher + student) ────────────────────────────
c = mk(teacher_pt, CoachingStatus.CANCELLED)
send_coaching_cancelled_notification(coaching=c, recipient=teacher_pt);    print('cancelled PT (teacher) OK')
send_coaching_cancelled_notification(coaching=c, recipient=student_pt);    print('cancelled PT (student) OK')
c = mk(teacher_en, CoachingStatus.CANCELLED)
send_coaching_cancelled_notification(coaching=c, recipient=teacher_en);    print('cancelled EN (teacher) OK')
send_coaching_cancelled_notification(coaching=c, recipient=student_en);    print('cancelled EN (student) OK')

# ── coaching: completed (sent to teacher + student) ──────────────────────────
c = mk(teacher_pt, CoachingStatus.COMPLETED)
send_coaching_completed_notification(coaching=c, recipient=teacher_pt);    print('completed PT (teacher) OK')
send_coaching_completed_notification(coaching=c, recipient=student_pt);    print('completed PT (student) OK')
c = mk(teacher_en, CoachingStatus.COMPLETED)
send_coaching_completed_notification(coaching=c, recipient=teacher_en);    print('completed EN (teacher) OK')
send_coaching_completed_notification(coaching=c, recipient=student_en);    print('completed EN (student) OK')

# ── participant cancelled: normal ──────────────────────────────────────────────
c = mk(teacher_pt)
send_participant_cancelled_notification(coaching=c, teacher=teacher_pt, student=student_pt, is_late_cancelled=False, cancellation_reason='Indisponibilidade'); print('participant_cancelled normal PT OK')
c = mk(teacher_en)
send_participant_cancelled_notification(coaching=c, teacher=teacher_en, student=student_en, is_late_cancelled=False, cancellation_reason='Unavailable');     print('participant_cancelled normal EN OK')

# ── participant cancelled: late ────────────────────────────────────────────────
c = mk(teacher_pt)
send_participant_cancelled_notification(coaching=c, teacher=teacher_pt, student=student_pt, is_late_cancelled=True, cancellation_reason=None);               print('participant_cancelled late PT OK')
c = mk(teacher_en)
send_participant_cancelled_notification(coaching=c, teacher=teacher_en, student=student_en, is_late_cancelled=True, cancellation_reason=None);               print('participant_cancelled late EN OK')

# ── waiting confirmation reminder: normal + final ──────────────────────────────
c = mk(teacher_pt)
send_waiting_confirmation_reminder(coaching=c, teacher=teacher_pt, is_final_reminder=False); print('waiting_confirmation normal PT OK')
c = mk(teacher_en)
send_waiting_confirmation_reminder(coaching=c, teacher=teacher_en, is_final_reminder=False); print('waiting_confirmation normal EN OK')
c = mk(teacher_pt)
send_waiting_confirmation_reminder(coaching=c, teacher=teacher_pt, is_final_reminder=True);  print('waiting_confirmation final PT OK')
c = mk(teacher_en)
send_waiting_confirmation_reminder(coaching=c, teacher=teacher_en, is_final_reminder=True);  print('waiting_confirmation final EN OK')

# ── attendance confirmation reminder: normal + final ───────────────────────────
c = mk(teacher_pt)
send_attendance_confirmation_reminder(coaching=c, recipient=student_pt, is_final_reminder=False); print('attendance_confirmation normal PT OK')
c = mk(teacher_en)
send_attendance_confirmation_reminder(coaching=c, recipient=student_en, is_final_reminder=False); print('attendance_confirmation normal EN OK')
c = mk(teacher_pt)
send_attendance_confirmation_reminder(coaching=c, recipient=student_pt, is_final_reminder=True);  print('attendance_confirmation final PT OK')
c = mk(teacher_en)
send_attendance_confirmation_reminder(coaching=c, recipient=student_en, is_final_reminder=True);  print('attendance_confirmation final EN OK')

# ── coordination coaching created: scheduled (non-recurring) ──────────────────
c = mk(teacher_pt, CoachingStatus.SCHEDULED)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_pt, is_scheduled=True);   print('coordination_created scheduled PT (teacher) OK')
send_coordination_coaching_created_notification(coaching=c, recipient=student_pt, is_scheduled=True);   print('coordination_created scheduled PT (student) OK')
c = mk(teacher_en, CoachingStatus.SCHEDULED)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_en, is_scheduled=True);   print('coordination_created scheduled EN (teacher) OK')
send_coordination_coaching_created_notification(coaching=c, recipient=student_en, is_scheduled=True);   print('coordination_created scheduled EN (student) OK')

# ── coordination coaching created: not scheduled (pending) ────────────────────
c = mk(teacher_pt)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_pt, is_scheduled=False);  print('coordination_created pending PT (teacher) OK')
c = mk(teacher_en)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_en, is_scheduled=False);  print('coordination_created pending EN (teacher) OK')

# ── coordination coaching created: recurring ──────────────────────────────────
c = mk(teacher_pt, CoachingStatus.SCHEDULED)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_pt, is_scheduled=True, is_recurring=True, total_sessions=12);  print('coordination_created recurring PT (teacher) OK')
c = mk(teacher_en, CoachingStatus.SCHEDULED)
send_coordination_coaching_created_notification(coaching=c, recipient=teacher_en, is_scheduled=True, is_recurring=True, total_sessions=12);  print('coordination_created recurring EN (teacher) OK')

# ── messaging: unread messages digest (sent to whichever user has unread msgs) ─
conv_pt, _ = get_or_create_direct_conversation(user_a=teacher_pt, user_b=student_pt, created_by=teacher_pt)
m1_pt = send_messaging_message(conversation=conv_pt, sender=teacher_pt, body='Olá! Confirma a aula de amanhã?')
m2_pt = send_messaging_message(conversation=conv_pt, sender=teacher_pt, body='Trago a coreografia nova.')
send_unread_messages_digest(recipient=student_pt, messages=[m1_pt, m2_pt]);   print('unread_digest PT OK')

conv_en, _ = get_or_create_direct_conversation(user_a=teacher_en, user_b=student_en, created_by=teacher_en)
m1_en = send_messaging_message(conversation=conv_en, sender=teacher_en, body='Hi! Confirming tomorrow\'s class?')
m2_en = send_messaging_message(conversation=conv_en, sender=teacher_en, body='I\'ll bring the new choreography.')
send_unread_messages_digest(recipient=student_en, messages=[m1_en, m2_en]);   print('unread_digest EN OK')

print('ALL DONE — open http://localhost:8025 to review')
"
```

---

## Expected output

Every line prints `… OK`. Any template rendering error surfaces as a Python traceback instead.

## What gets sent (44 emails)

| Template | PT | EN | Variants |
|---|---|---|---|
| `activation` | ✓ | ✓ | — |
| `password_reset` | ✓ | ✓ | — |
| `invite` | ✓ | ✓ | — |
| `coaching_new_request` | ✓ | ✓ | — |
| `coaching_approved` | ✓ ✓ | ✓ ✓ | teacher + student |
| `coaching_cancelled` | ✓ ✓ | ✓ ✓ | teacher + student |
| `coaching_completed` | ✓ ✓ | ✓ ✓ | teacher + student |
| `participant_cancelled` | ✓ | ✓ | normal + late = ×2 each |
| `waiting_confirmation_reminder` | ✓ | ✓ | normal + final = ×2 each |
| `attendance_confirmation_reminder` | ✓ | ✓ | normal + final = ×2 each |
| `coaching_coordination_created` | ✓ ✓ ✓ ✓ | ✓ ✓ ✓ ✓ | scheduled (teacher+student) + pending (teacher) + recurring (teacher) |
| `unread_messages_digest` | ✓ | ✓ | 2 messages per recipient |
