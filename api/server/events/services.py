from collections import defaultdict

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from events.models import (
    Event,
    EventComment,
    EventFile,
    EventInterest,
    EventPost,
    EventState,
    EventVisibilityState,
    NotificationDelivery,
)


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
    event.delete(deleted_by=deleted_by)


def publish_event(
    *,
    event,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    event.visibility_state = EventVisibilityState.PUBLISHED
    event.published_at = timezone.now()
    event.updated_by = updated_by

    event.full_clean()
    event.save()

    if notification != NotificationDelivery.NONE:

        def _notify(ev=event, user=updated_by, mode=notification):
            from events import emails

            emails.send_event_notification_emails(
                event=ev,
                requesting_user=user,
                delivery=mode,
            )

        transaction.on_commit(_notify)

    return event


def schedule_event_publication(
    *,
    event,
    publication_scheduled_at,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    if publication_scheduled_at <= timezone.now():
        raise ValidationError(
            {"publication_scheduled_at": ["PublicationDateMustBeInFuture"]}
        )

    event.visibility_state = EventVisibilityState.SCHEDULED
    event.publication_scheduled_at = publication_scheduled_at
    event.updated_by = updated_by

    event.full_clean()
    event.save()

    if notification != NotificationDelivery.NONE:

        def _notify(ev=event, user=updated_by, mode=notification):
            from events import emails

            emails.send_event_notification_emails(
                event=ev,
                requesting_user=user,
                delivery=mode,
            )

        transaction.on_commit(_notify)

    return event


def archive_event(*, event, updated_by=None):
    event.visibility_state = EventVisibilityState.ARCHIVED
    event.updated_by = updated_by
    event.full_clean()
    event.save()
    return event


def cancel_event(*, event, updated_by=None):
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
            user.is_authenticated
            and user.has_perm("events.can_view_unpublished_event")
        ):
            raise NotFound()

    qs = EventComment.objects.filter(event=event).select_related("owner").order_by(
        "created_at"
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
    if user.is_authenticated and user.has_perm(
        "events.can_view_unpublished_eventpost"
    ):
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
    post.delete(deleted_by=deleted_by)


def publish_post(
    *,
    post,
    updated_by=None,
    notification=NotificationDelivery.NONE,
):
    post.published_at = timezone.now()
    post.publication_scheduled_at = None
    post.updated_by = updated_by
    post.full_clean()
    post.save()

    if notification != NotificationDelivery.NONE:

        def _notify(p=post, user=updated_by, mode=notification):
            from events import emails

            emails.send_event_post_notification_emails(
                post=p,
                requesting_user=user,
                delivery=mode,
            )

        transaction.on_commit(_notify)

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

    if notification != NotificationDelivery.NONE:

        def _notify(p=post, user=updated_by, mode=notification):
            from events import emails

            emails.send_event_post_notification_emails(
                post=p,
                requesting_user=user,
                delivery=mode,
            )

        transaction.on_commit(_notify)

    return post


def list_event_files(*, event, user):
    if event.visibility_state != EventVisibilityState.PUBLISHED:
        if not (
            user.is_authenticated
            and user.has_perm("events.can_view_unpublished_event")
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
