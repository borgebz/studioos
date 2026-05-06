from rest_framework.exceptions import PermissionDenied


def require_perm(permission):
    def decorator(view_func):
        def _wrapped(view, request, *args, **kwargs):
            if not request.user.has_perm(permission):
                raise PermissionDenied("PermissionDenied")
            return view_func(view, request, *args, **kwargs)

        return _wrapped

    return decorator
