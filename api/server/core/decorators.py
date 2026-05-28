from functools import wraps
from rest_framework.exceptions import PermissionDenied


def require_perm(perm_code):
    def decorator(method):
        @wraps(method)
        def wrapper(self, request, *args, **kwargs):
            if not request.user.has_perm(perm_code):
                raise PermissionDenied(f"PermissionDenied: {perm_code}")
            return method(self, request, *args, **kwargs)

        return wrapper

    return decorator


def require_any_perm(*perm_codes):
    """OR semantics — user must have at least one of the listed permissions."""

    def decorator(method):
        @wraps(method)
        def wrapper(self, request, *args, **kwargs):
            if not any(request.user.has_perm(c) for c in perm_codes):
                raise PermissionDenied(f"PermissionDenied: one of {list(perm_codes)!r}")
            return method(self, request, *args, **kwargs)

        return wrapper

    return decorator
