"""Map Django model ``ValidationError`` from ``full_clean()`` to DRF shape."""

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError


def raise_drf_from_model_validation(exc: DjangoValidationError) -> None:
    messages = []
    if hasattr(exc, "error_dict"):
        for errs in exc.error_dict.values():
            for item in errs:
                messages.append(str(item))
    elif hasattr(exc, "error_list"):
        for item in exc.error_list:
            messages.append(str(item))
    else:
        messages.append(str(exc))
    raise DRFValidationError({"messages": messages or ["ValidationError"]})
