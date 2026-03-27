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
