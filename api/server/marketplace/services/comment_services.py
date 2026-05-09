from collections import defaultdict

from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound
from marketplace.models import Listing, ListingComment


def get_listing_comment(*, listing, comment_id):
    try:
        return ListingComment.objects.get(listing=listing, pk=comment_id)
    except ListingComment.DoesNotExist:
        raise AppNotFound("ListingCommentNotFound")


def list_comments(*, listing):
    qs = (
        ListingComment.objects.filter(listing=listing)
        .select_related("owner")
        .order_by("created_at")
    )
    comments = list(qs)
    children_map = defaultdict(list)
    for c in comments:
        children_map[c.parent_comment_id].append(c)
    roots = children_map[None]
    return roots, dict(children_map)


def create_comment(*, listing, user, body, parent_comment_id=None):
    if listing.status != Listing.ListingStatus.ACTIVE:
        raise ValidationError({"messages": ["ListingNotActive"]})

    parent_comment = None

    if parent_comment_id:
        try:
            parent_comment = ListingComment.objects.get(
                pk=parent_comment_id, listing_id=listing.id
            )
        except ListingComment.DoesNotExist:
            raise ValidationError({"parent_comment_id": ["ParentCommentNotFound"]})

    comment = ListingComment(
        listing=listing,
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
        "marketplace.can_moderate_listingcomment"
    ):
        raise ValidationError({"messages": ["CommentEditNotAllowed"]})

    comment.body = body
    comment.updated_by = user
    comment.full_clean()
    comment.save()
    return comment


def delete_comment(*, comment, user):
    if comment.owner_id != user.id and not user.has_perm(
        "marketplace.can_moderate_listingcomment"
    ):
        raise ValidationError({"messages": ["CommentDeleteNotAllowed"]})

    comment.delete(deleted_by=user)
