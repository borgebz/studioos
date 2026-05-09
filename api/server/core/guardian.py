from rest_framework.exceptions import PermissionDenied

from accounts.services import get_user_by_pk


def resolve_acting_student(request, on_behalf_of_id=None):
    """
    Resolve who the action targets: the requester themselves or a child they are guardian of.

    When ``on_behalf_of_id`` is ``None``, returns ``request.user`` (backward-compatible).
    When set, verifies the guardian relationship and returns the child user.
    """
    if on_behalf_of_id is None:
        return request.user

    child = get_user_by_pk(pk=on_behalf_of_id)
    if child.parent_id is None or child.parent_id != request.user.id:
        raise PermissionDenied("NotGuardianOfStudent")
    return child
