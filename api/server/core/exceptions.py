# core/exceptions.py
from rest_framework import exceptions
from rest_framework.views import exception_handler

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


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return None

    # Replace human strings with codes for known DRF exceptions
    code = EXCEPTION_CODES.get(type(exc))
    if code:
        response.data = {"errors": {"messages": [code]}}
    else:
        response.data = {"errors": _normalize_errors(response.data)}

    return response
