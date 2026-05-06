# core/exceptions.py
from django.utils.encoding import force_str
from rest_framework import exceptions
from rest_framework.views import exception_handler
from rest_framework_simplejwt.exceptions import (
    AuthenticationFailed as SimpleJWTAuthenticationFailed,
    InvalidToken,
)

# When raising non-field ValidationErrors, always use "messages" as the key:
# raise ValidationError({"messages": ["SomeErrorCode"]})

EXCEPTION_CODES = {
    exceptions.NotAuthenticated: "NotAuthenticated",
    exceptions.AuthenticationFailed: "AuthenticationFailed",
    exceptions.PermissionDenied: "PermissionDenied",
    exceptions.NotFound: "NotFound",
    exceptions.MethodNotAllowed: "MethodNotAllowed",
    exceptions.Throttled: "RequestThrottled",
    exceptions.ValidationError: None,  # handled field by field below
}


class AppNotFound(exceptions.NotFound):
    """Use when the API should return a specific error code in ``errors.messages`` (not generic ``NotFound``)."""

    pass


def _detail_to_message_list(detail):
    """Flatten DRF ``APIException.detail`` to plain strings."""
    if detail is None:
        return []
    if isinstance(detail, (list, tuple)):
        return [force_str(x) for x in detail]
    if isinstance(detail, dict):
        nested = _normalize_errors(detail)
        return nested.get("messages", [])
    return [force_str(detail)]


def _normalize_errors(data):
    """
    Normalize DRF's inconsistent error shapes into:
    {"field": ["ErrorCode"], "messages": ["ErrorCode"]}
    """
    errors = {}

    if isinstance(data, dict):
        for key, value in data.items():
            if key in ("detail", "non_field_errors"):
                errors["messages"] = value if isinstance(value, list) else [str(value)]
            else:
                errors[key] = value if isinstance(value, list) else [str(value)]
    elif isinstance(data, list):
        errors["messages"] = data
    else:
        errors["messages"] = [str(data)]

    return errors


def _simplejwt_error_code(exc):
    """
    SimpleJWT raises InvalidToken / its own AuthenticationFailed subclasses.
    EXCEPTION_CODES uses exact type() match, so those bypass the simple branch
    and would otherwise serialize pyjwt's nested token error dicts.
    """
    if isinstance(exc, InvalidToken):
        detail = getattr(exc, "detail", None)
        if isinstance(detail, dict):
            for item in detail.get("messages") or []:
                if (
                    isinstance(item, dict)
                    and "expired" in (item.get("message") or "").lower()
                ):
                    return "TokenExpired"
        return "TokenNotValid"
    if isinstance(exc, SimpleJWTAuthenticationFailed):
        return "AuthenticationFailed"
    return None


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return None

    jwt_code = _simplejwt_error_code(exc)
    if jwt_code:
        response.data = {"errors": {"messages": [jwt_code]}}
        return response

    if isinstance(exc, AppNotFound):
        default_text = force_str(exceptions.NotFound.default_detail)
        messages = _detail_to_message_list(exc.detail)
        messages = [m for m in messages if m != default_text]
        if messages:
            response.data = {"errors": {"messages": messages}}
        else:
            response.data = {"errors": {"messages": ["NotFound"]}}
        return response

    # Replace human strings with codes for known DRF exceptions
    code = EXCEPTION_CODES.get(type(exc))
    if code:
        response.data = {"errors": {"messages": [code]}}
    else:
        response.data = {"errors": _normalize_errors(response.data)}

    return response
