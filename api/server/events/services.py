import json
import logging
from collections import defaultdict

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

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
from utils.files import django_field_file_sha256, file_content_hash

logger = logging.getLogger(__name__)


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
        raise NotFound()


def get_event_post(*, event, post_id):
    try:
        return EventPost.objects.select_related("event").get(event=event, pk=post_id)
    except EventPost.DoesNotExist:
        raise NotFound()


def get_event_comment(*, event, comment_id):
    try:
        return EventComment.objects.get(event=event, pk=comment_id)
    except EventComment.DoesNotExist:
        raise NotFound()


def get_event_file(*, event, file_id):
    try:
        return EventFile.objects.get(event=event, pk=file_id)
    except EventFile.DoesNotExist:
        raise NotFound()


def _validate_event_class_targets_for_publish(*, event):
    if event.notification_target != NotificationTarget.CLASSES:
        return
    if not EventClassTarget.objects.filter(event=event).exists():
        raise ValidationError(
            {"messages": ["EventClassTargetRequiredWhenTargetIsClasses"]}
        )


def create_event(*, created_by=None, **data):
    event_date = data.get("event_date")

    event_state = EventState.PLANNED if event_date else EventState.DATE_TBD

    event = Event(
        visibility_state=EventVisibilityState.DRAFT,
        event_state=event_state,
        created_by=created_by,
        **data,
    )

    event.full_clean()
    event.save()
    return event


def list_events(*, user):
    if user.is_authenticated and user.has_perm("events.can_view_unpublished_event"):
        return Event.objects.all()

    return Event.objects.filter(visibility_state=EventVisibilityState.PUBLISHED)


def update_event(*, event, updated_by=None, **data):
    new_cover = data.get("cover_photo")
    if new_cover is not None and event.cover_photo:
        if file_content_hash(new_cover) == django_field_file_sha256(event.cover_photo):
            data = {k: v for k, v in data.items() if k != "cover_photo"}

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

    exists = EventInterest.objects.filter(event=event, user=user).exists()
    if exists:
        raise ValidationError({"messages": ["InterestAlreadyExists"]})

    interest = EventInterest(
        event=event,
        user=user,
        created_by=user,
    )

    interest.full_clean()
    interest.save()
    return interest


def delete_my_interest(*, event, user):
    try:
        interest = EventInterest.objects.get(event=event, user=user)
    except EventInterest.DoesNotExist:
        raise NotFound()

    interest.delete(deleted_by=user)


def list_comments(*, event, user):
    if event.visibility_state != EventVisibilityState.PUBLISHED:
        if not (
            user.is_authenticated and user.has_perm("events.can_view_unpublished_event")
        ):
            raise NotFound()

    qs = (
        EventComment.objects.filter(event=event)
        .select_related("owner")
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
    name = (file_name or getattr(file, "name", "") or "")[:255]
    ef = EventFile(
        event=event,
        file=file,
        file_name=name,
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

    if (
        not desired
        and event.visibility_state == EventVisibilityState.PUBLISHED
        and event.notification_target == NotificationTarget.CLASSES
    ):
        raise ValidationError(
            {"messages": ["CannotClearClassTargetsOnPublishedEvent"]}
        )

    if desired:
        found = set(
            Classe.objects.filter(pk__in=desired).values_list("pk", flat=True)
        )
        if found != desired:
            raise ValidationError(
                {"class_target_classe_ids": ["InvalidClassTargetIds"]}
            )

    current = set(
        EventClassTarget.objects.filter(event=event).values_list(
            "classe_id", flat=True
        )
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
