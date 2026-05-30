import json
import logging
from collections import defaultdict

from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from core.exceptions import AppNotFound
from events.models import (
    Event,
    EventClassTarget,
    EventComment,
    EventFile,
    EventInterest,
    EventPost,
    EventState,
    EventVisibilityState,
    NotificationDelivery,
    NotificationTarget,
)
from utils.files import file_content_hash

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Visibility state machine
# ---------------------------------------------------------------------------

_VALID_VISIBILITY_TRANSITIONS = {
    EventVisibilityState.DRAFT: [
        EventVisibilityState.PUBLISHED,
        EventVisibilityState.SCHEDULED,
        EventVisibilityState.ARCHIVED,
    ],
    EventVisibilityState.SCHEDULED: [
        # Self-transition allowed: rescheduling a Scheduled event hits the
        # same endpoint, just with a new publication_scheduled_at. The Beat
        # task is replaced atomically below.
        EventVisibilityState.SCHEDULED,
        EventVisibilityState.PUBLISHED,
        EventVisibilityState.DRAFT,
        EventVisibilityState.ARCHIVED,
    ],
    EventVisibilityState.PUBLISHED: [
        EventVisibilityState.ARCHIVED,
    ],
    EventVisibilityState.ARCHIVED: [],
}


def _validate_visibility_transition(event, target_state):
    allowed = _VALID_VISIBILITY_TRANSITIONS.get(event.visibility_state, [])
    if target_state not in allowed:
        raise ValidationError({"messages": ["InvalidVisibilityTransition"]})


# ---------------------------------------------------------------------------
# Beat schedule helpers
# ---------------------------------------------------------------------------


def _beat_task_name_for_event(event_id):
    return f"schedule_event_publication_{event_id}"


def _beat_task_name_for_post(post_id):
    return f"schedule_post_publication_{post_id}"


def _register_beat_publication(*, task_name, task_path, scheduled_at, args):
    """
    Create (or replace) a one-off ClockedSchedule + PeriodicTask for a scheduled publication.
    Runs inside the caller's transaction — Beat entry is only committed if the whole
    service call succeeds.
    """
    from django_celery_beat.models import ClockedSchedule, PeriodicTask

    # Remove any existing entry for this entity first (reschedule case).
    PeriodicTask.objects.filter(name=task_name).delete()

    clocked, _ = ClockedSchedule.objects.get_or_create(clocked_time=scheduled_at)
    PeriodicTask.objects.create(
        name=task_name,
        task=task_path,
        clocked=clocked,
        one_off=True,
        args=json.dumps(args),
        enabled=True,
    )
    logger.info("Beat entry registered: %s at %s", task_name, scheduled_at)


def _cancel_beat_publication(*, task_name):
    """Delete a pending Beat publication entry if it exists."""
    from django_celery_beat.models import PeriodicTask

    deleted, _ = PeriodicTask.objects.filter(name=task_name).delete()
    if deleted:
        logger.info("Beat entry cancelled: %s", task_name)


# ---------------------------------------------------------------------------


def get_event(*, pk):
    try:
        return Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        raise AppNotFound("EventNotFound")


def get_event_for_read(*, pk, user):
    """
    Read-side fetch: returns the event only if `user` is part of its audience
    (or has the staff bypass perm). 404 — never 403 — for non-audience users
    so we don't leak the existence of restricted events.
    """
    event = get_event(pk=pk)
    if not _user_can_see_event(event=event, user=user):
        raise AppNotFound("EventNotFound")
    return event


def get_event_post(*, event, post_id):
    try:
        return EventPost.objects.select_related("event").get(event=event, pk=post_id)
    except EventPost.DoesNotExist:
        raise AppNotFound("EventPostNotFound")


def get_event_comment(*, event, comment_id):
    try:
        return EventComment.objects.select_related(
            "owner", "owner__profile"
        ).get(event=event, pk=comment_id)
    except EventComment.DoesNotExist:
        raise AppNotFound("EventCommentNotFound")


def get_event_file(*, event, file_id):
    try:
        return EventFile.objects.get(event=event, pk=file_id)
    except EventFile.DoesNotExist:
        raise AppNotFound("EventFileNotFound")


def _validate_event_class_targets_for_publish(*, event):
    if event.notification_target != NotificationTarget.CLASSES:
        return
    if not EventClassTarget.objects.filter(event=event).exists():
        raise ValidationError(
            {"messages": ["EventClassTargetRequiredWhenTargetIsClasses"]}
        )


def _audience_is_locked(event):
    """
    Audience (notification_target + class_target_classe_ids) cannot be edited
    once the event is in a terminal-ish state: published, completed, or
    cancelled. Scheduled and Draft events remain editable.
    """
    if event.visibility_state == EventVisibilityState.PUBLISHED:
        return True
    if event.event_state in (EventState.COMPLETED, EventState.CANCELLED):
        return True
    return False


def _user_can_see_event(*, event, user):
    """
    Read-side audience visibility check. Mirrors the email recipient logic in
    events/emails.py: when notification_target is "classes", only members of
    the targeted classes can see the event (plus staff with the
    can_view_unpublished_event permission, which doubles as the
    can-see-anything-anywhere bypass for the management UI).
    """
    if event.notification_target != NotificationTarget.CLASSES:
        return True
    if user.is_authenticated and user.has_perm("events.can_view_unpublished_event"):
        return True
    if not user.is_authenticated:
        return False

    from classes.models import ClasseMember

    target_class_ids = EventClassTarget.objects.filter(event=event).values_list(
        "classe_id", flat=True
    )
    return ClasseMember.objects.filter(
        classe_id__in=list(target_class_ids),
        student=user,
        deleted_at__isnull=True,
    ).exists()


def _audience_filter_qs(qs, *, user):
    """
    Restrict a queryset of Events so class-restricted events are only included
    when the user is a member of any targeted class. Staff with
    can_view_unpublished_event are excluded from this filter (they see
    everything).
    """
    if user.is_authenticated and user.has_perm("events.can_view_unpublished_event"):
        return qs

    if not user.is_authenticated:
        # Anonymous: hide every class-restricted event.
        return qs.exclude(notification_target=NotificationTarget.CLASSES)

    from classes.models import ClasseMember

    membership_class_ids = ClasseMember.objects.filter(
        student=user, deleted_at__isnull=True
    ).values_list("classe_id", flat=True)

    # Event is visible if either:
    #   - it is not class-restricted, OR
    #   - the user is a member of one of its targeted classes.
    return qs.filter(
        Q(notification_target=NotificationTarget.ALL)
        | Q(
            notification_target=NotificationTarget.CLASSES,
            class_targets__classe_id__in=list(membership_class_ids),
            class_targets__deleted_at__isnull=True,
        )
    ).distinct()


def create_event(*, created_by=None, **data):
    event_date = data.get("event_date")

    event_state = EventState.PLANNED if event_date else EventState.DATE_TBD

    cover_photo = data.get("cover_photo")
    if cover_photo:
        data["cover_photo_hash"] = file_content_hash(cover_photo)

    event = Event(
        visibility_state=EventVisibilityState.DRAFT,
        event_state=event_state,
        created_by=created_by,
        **data,
    )

    event.full_clean()
    event.save()
    return event


def _annotate_event_qs_for_user(qs, *, user):
    qs = qs.annotate(
        interest_count=Count(
            "interests",
            filter=Q(interests__deleted_at__isnull=True),
            distinct=True,
        ),
    )
    if user.is_authenticated:
        qs = qs.annotate(
            interested=Exists(
                EventInterest.objects.filter(
                    event=OuterRef("pk"),
                    user=user,
                )
            ),
        )
    return qs


def list_events(*, user):
    qs = Event.objects.prefetch_related("class_targets")
    qs = _annotate_event_qs_for_user(qs, user=user)

    if user.is_authenticated and user.has_perm("events.can_view_unpublished_event"):
        return qs.all()

    # Non-staff: only published events, and only those in the user's audience.
    qs = qs.filter(visibility_state=EventVisibilityState.PUBLISHED)
    return _audience_filter_qs(qs, user=user)


def update_event(*, event, updated_by=None, **data):
    new_cover = data.get("cover_photo")
    if new_cover is not None:
        new_cover_hash = file_content_hash(new_cover)
        if event.cover_photo and new_cover_hash == event.cover_photo_hash:
            data = {k: v for k, v in data.items() if k != "cover_photo"}
        else:
            data["cover_photo_hash"] = new_cover_hash

    # Lock audience changes once the event is published/completed/cancelled.
    # Class-target lockdown is enforced in replace_event_class_targets; we
    # mirror the same rule here for notification_target so a payload like
    # `{notification_target: "classes"}` is rejected before we touch the row.
    if (
        "notification_target" in data
        and data["notification_target"] != event.notification_target
        and _audience_is_locked(event)
    ):
        raise ValidationError({"messages": ["EventAudienceLocked"]})

    terminal_states = frozenset(
        {
            EventState.CANCELLED,
            EventState.COMPLETED,
        }
    )

    for field, value in data.items():
        setattr(event, field, value)

    if event.event_state not in terminal_states:
        if event.event_date is None:
            event.event_state = EventState.DATE_TBD
        elif event.event_state == EventState.DATE_TBD:
            event.event_state = EventState.PLANNED

    event.updated_by = updated_by
    event.full_clean()
    event.save()

    # Enforce the invariant: "everyone" events cannot carry class targets.
    # When notification_target is (or becomes) ALL we wipe any class targets
    # the event still has, so the two fields can never drift apart. The same
    # check inside replace_event_class_targets covers the view's explicit
    # path; this branch covers the case where the view only sends
    # notification_target and never calls the replace helper.
    if event.notification_target == NotificationTarget.ALL:
        for ect in EventClassTarget.objects.filter(event=event):
            ect.delete(deleted_by=updated_by)

    return event


def delete_event(*, event, deleted_by=None):
    _cancel_beat_publication(task_name=_beat_task_name_for_event(event.pk))
    event.delete(deleted_by=deleted_by)


def publish_event(
    *,
    event,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    _validate_visibility_transition(event, EventVisibilityState.PUBLISHED)
    _validate_event_class_targets_for_publish(event=event)

    # Cancel any pending scheduled publication Beat entry.
    _cancel_beat_publication(task_name=_beat_task_name_for_event(event.pk))

    event.visibility_state = EventVisibilityState.PUBLISHED
    event.published_at = timezone.now()
    event.updated_by = updated_by

    event.full_clean()
    event.save()

    if notification != NotificationDelivery.NONE:
        from events.tasks import send_event_notification_emails_task

        transaction.on_commit(
            lambda eid=event.pk, uid=(
                updated_by.pk if updated_by else None
            ), mode=notification: send_event_notification_emails_task.delay(
                eid, uid, mode
            )
        )

    return event


def schedule_event_publication(
    *,
    event,
    publication_scheduled_at,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    _validate_visibility_transition(event, EventVisibilityState.SCHEDULED)
    _validate_event_class_targets_for_publish(event=event)

    if publication_scheduled_at <= timezone.now():
        raise ValidationError(
            {"publication_scheduled_at": ["PublicationDateMustBeInFuture"]}
        )

    event.visibility_state = EventVisibilityState.SCHEDULED
    event.publication_scheduled_at = publication_scheduled_at
    event.updated_by = updated_by

    event.full_clean()
    event.save()

    _register_beat_publication(
        task_name=_beat_task_name_for_event(event.pk),
        task_path="events.tasks.publish_scheduled_event",
        scheduled_at=publication_scheduled_at,
        args=[event.pk, notification, updated_by.pk if updated_by else None],
    )

    return event


def archive_event(*, event, updated_by=None):
    _validate_visibility_transition(event, EventVisibilityState.ARCHIVED)
    _cancel_beat_publication(task_name=_beat_task_name_for_event(event.pk))
    event.visibility_state = EventVisibilityState.ARCHIVED
    event.updated_by = updated_by
    event.full_clean()
    event.save()
    return event


def cancel_event(*, event, updated_by=None):
    _cancel_beat_publication(task_name=_beat_task_name_for_event(event.pk))
    event.event_state = EventState.CANCELLED
    event.updated_by = updated_by
    event.full_clean()
    event.save()
    return event


def complete_event(*, event, updated_by=None):
    if event.event_date is None:
        raise ValidationError({"messages": ["CompletedEventRequiresDate"]})

    event.event_state = EventState.COMPLETED
    event.updated_by = updated_by
    event.full_clean()
    event.save()
    return event


def create_interest(*, event, user):
    if event.visibility_state != EventVisibilityState.PUBLISHED and not user.has_perm(
        "events.can_view_unpublished_event"
    ):
        raise ValidationError({"messages": ["EventNotPublished"]})

    # Idempotent: if the user already has an active interest, return it as-is.
    existing = EventInterest.objects.filter(event=event, user=user).first()
    if existing is not None:
        return existing

    interest = EventInterest(
        event=event,
        user=user,
        created_by=user,
    )

    interest.full_clean()
    try:
        interest.save()
    except IntegrityError:
        # Race condition: another request created the interest between the
        # check above and the save. Treat as idempotent success.
        existing = EventInterest.objects.filter(event=event, user=user).first()
        if existing is not None:
            return existing
        raise ValidationError({"messages": ["InterestAlreadyExists"]})
    return interest


def delete_my_interest(*, event, user):
    interest = EventInterest.objects.filter(event=event, user=user).first()
    if interest is None:
        # Idempotent: nothing to delete is a successful no-op.
        return

    interest.delete(deleted_by=user)


def list_comments(*, event, user):
    if event.visibility_state != EventVisibilityState.PUBLISHED:
        if not (
            user.is_authenticated and user.has_perm("events.can_view_unpublished_event")
        ):
            raise NotFound()

    qs = (
        EventComment.objects.filter(event=event)
        .select_related("owner", "owner__profile")
        .order_by("created_at")
    )
    comments = list(qs)
    children_map = defaultdict(list)
    for c in comments:
        children_map[c.parent_comment_id].append(c)
    roots = children_map[None]
    return roots, dict(children_map)


def create_comment(*, event, user, body, parent_comment_id=None):
    if event.visibility_state != EventVisibilityState.PUBLISHED and not user.has_perm(
        "events.can_view_unpublished_event"
    ):
        raise ValidationError({"messages": ["EventNotPublished"]})

    # Posting is gated on having a profile — read-only browsers without a
    # profile can still see the conversation but cannot contribute. Mirrors
    # the messaging app's NoProfileGate pattern.
    if not (hasattr(user, "profile") and user.profile is not None):
        raise ValidationError({"messages": ["ProfileRequiredToComment"]})

    parent_comment = None

    if parent_comment_id:
        try:
            parent_comment = EventComment.objects.get(
                pk=parent_comment_id, event_id=event.id
            )
        except EventComment.DoesNotExist:
            raise ValidationError({"parent_comment_id": ["ParentCommentNotFound"]})

    comment = EventComment(
        event=event,
        owner=user,
        body=body,
        parent_comment=parent_comment,
        created_by=user,
    )

    comment.full_clean()
    comment.save()
    return comment


def update_comment(*, comment, user, body):
    if comment.owner_id != user.id and not user.has_perm(
        "events.can_moderate_eventcomment"
    ):
        raise ValidationError({"messages": ["CommentEditNotAllowed"]})

    comment.body = body
    comment.updated_by = user
    comment.full_clean()
    comment.save()
    return comment


def delete_comment(*, comment, user):
    if comment.owner_id != user.id and not user.has_perm(
        "events.can_moderate_eventcomment"
    ):
        raise ValidationError({"messages": ["CommentDeleteNotAllowed"]})

    comment.delete(deleted_by=user)


def list_posts(*, event, user):
    if user.is_authenticated and user.has_perm("events.can_view_unpublished_eventpost"):
        return EventPost.objects.filter(event=event)

    return EventPost.objects.filter(event=event, published_at__isnull=False)


def create_post(*, event, created_by=None, **data):
    post = EventPost(
        event=event,
        created_by=created_by,
        **data,
    )

    post.full_clean()
    post.save()
    return post


def update_post(*, post, updated_by=None, **data):
    for field, value in data.items():
        setattr(post, field, value)

    post.updated_by = updated_by
    post.full_clean()
    post.save()
    return post


def delete_post(*, post, deleted_by=None):
    _cancel_beat_publication(task_name=_beat_task_name_for_post(post.pk))
    post.delete(deleted_by=deleted_by)


def publish_post(
    *,
    post,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    # Cancel any pending scheduled publication Beat entry.
    _cancel_beat_publication(task_name=_beat_task_name_for_post(post.pk))

    post.published_at = timezone.now()
    post.publication_scheduled_at = None
    post.updated_by = updated_by
    post.full_clean()
    post.save()

    if notification != NotificationDelivery.NONE:
        from events.tasks import send_event_post_notification_emails_task

        transaction.on_commit(
            lambda pid=post.pk, uid=(
                updated_by.pk if updated_by else None
            ), mode=notification: send_event_post_notification_emails_task.delay(
                pid, uid, mode
            )
        )

    return post


def schedule_post_publication(
    *,
    post,
    publication_scheduled_at,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    if publication_scheduled_at <= timezone.now():
        raise ValidationError(
            {"publication_scheduled_at": ["PublicationDateMustBeInFuture"]}
        )

    post.publication_scheduled_at = publication_scheduled_at
    post.updated_by = updated_by
    post.full_clean()
    post.save()

    _register_beat_publication(
        task_name=_beat_task_name_for_post(post.pk),
        task_path="events.tasks.publish_scheduled_post",
        scheduled_at=publication_scheduled_at,
        args=[post.pk, notification, updated_by.pk if updated_by else None],
    )

    return post


def list_event_files(*, event, user):
    if event.visibility_state != EventVisibilityState.PUBLISHED:
        if not (
            user.is_authenticated and user.has_perm("events.can_view_unpublished_event")
        ):
            raise NotFound()
    return EventFile.objects.filter(event=event)


def create_event_file(*, event, file, file_name=None, created_by=None):
    content_hash = file_content_hash(file)
    if EventFile.objects.filter(event=event, content_hash=content_hash).exists():
        raise ValidationError({"messages": ["DuplicateEventFile"]})

    name = (file_name or getattr(file, "name", "") or "")[:255]
    ef = EventFile(
        event=event,
        file=file,
        file_name=name,
        content_hash=content_hash,
        created_by=created_by,
    )
    ef.full_clean()
    ef.save()
    return ef


def delete_event_file(*, event_file, deleted_by=None):
    event_file.delete(deleted_by=deleted_by)


@transaction.atomic
def replace_event_class_targets(
    *,
    event,
    classe_ids,
    created_by=None,
    updated_by=None,
):
    """
    Sync active EventClassTarget rows to exactly match ``classe_ids`` (order ignored).
    """
    from classes.models import Classe

    unique_ids = list(dict.fromkeys(classe_ids))
    desired = set(unique_ids)

    # Invariant: when the event is broadcasting to everyone we never keep any
    # class targets. The frontend already clears the list when the user flips
    # the toggle, but we don't trust it — and a stale/race payload would
    # otherwise leave inconsistent rows behind.
    if event.notification_target == NotificationTarget.ALL:
        desired = set()

    current = set(
        EventClassTarget.objects.filter(event=event).values_list("classe_id", flat=True)
    )

    # Lock audience changes once the event is published/completed/cancelled.
    # The legacy CannotClearClassTargetsOnPublishedEvent path remains for the
    # narrower "published + clearing while target=classes" race that pre-dated
    # the broader lockdown, so existing clients see the same error code.
    if desired != current and _audience_is_locked(event):
        raise ValidationError({"messages": ["EventAudienceLocked"]})

    if (
        not desired
        and event.visibility_state == EventVisibilityState.PUBLISHED
        and event.notification_target == NotificationTarget.CLASSES
    ):
        raise ValidationError({"messages": ["CannotClearClassTargetsOnPublishedEvent"]})

    if desired:
        found = set(Classe.objects.filter(pk__in=desired).values_list("pk", flat=True))
        if found != desired:
            raise ValidationError(
                {"class_target_classe_ids": ["InvalidClassTargetIds"]}
            )

    current = set(
        EventClassTarget.objects.filter(event=event).values_list("classe_id", flat=True)
    )

    actor = updated_by if updated_by is not None else created_by

    for cid in current - desired:
        ect = EventClassTarget.objects.get(event=event, classe_id=cid)
        ect.delete(deleted_by=actor)

    for cid in desired - current:
        classe = Classe.objects.get(pk=cid)
        ect = EventClassTarget(
            event=event,
            classe=classe,
            created_by=created_by or updated_by,
        )
        ect.full_clean()
        try:
            ect.save()
        except IntegrityError:
            raise ValidationError({"messages": ["ClassTargetAlreadyExists"]})
