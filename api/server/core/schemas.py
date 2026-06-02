# core/schemas.py
from drf_spectacular.utils import inline_serializer
from rest_framework import serializers

ErrorResponseSerializer = inline_serializer(
    name="ErrorResponse",
    fields={
        "errors": inline_serializer(
            name="ErrorDetail",
            fields={
                # Non-field errors — auth, permission, business rule violations
                "messages": serializers.ListField(
                    child=serializers.CharField(),
                    required=False,
                    help_text="Non-field errors such as authentication, permission, or business rule violations.",
                ),
                # Field-level validation errors — keyed by field name
                # e.g. {"email": ["EmailAlreadyInUse"], "photo": ["FileSizeExceeds5MB"]}
                "field_name": serializers.ListField(
                    child=serializers.CharField(),
                    required=False,
                    help_text="Field-level validation errors keyed by field name.",
                ),
            },
        )
    },
)

DEFAULT_ERROR_RESPONSES = {
    400: ErrorResponseSerializer,  # Bad request — validation errors, invalid input
    401: ErrorResponseSerializer,  # Unauthenticated — missing or invalid token
    403: ErrorResponseSerializer,  # Forbidden — authenticated but lacks permission
    404: ErrorResponseSerializer,  # Not found — resource does not exist
}


MEDIA_MULTIPART_MAX_FILES = 10


def media_multipart_request(name, *, max_files=MEDIA_MULTIPART_MAX_FILES):
    """OpenAPI request body for multipart create endpoints that accept media.

    The client sends a JSON-encoded ``payload`` field plus one image field per
    media entry (``media_0``, ``media_1``, ...) matching the index of each media
    item inside the payload. Use with ``parser_classes = [MultiPartParser]`` and
    the ``core.utils.parse_multipart_payload`` / ``attach_media_files`` helpers.
    """
    fields = {
        "payload": serializers.CharField(
            help_text=(
                "JSON-encoded payload. Files for media[i].image are sent as "
                "separate form fields named media_0, media_1, ..., matching the "
                "index of each media entry."
            ),
        ),
    }
    for i in range(max_files):
        fields[f"media_{i}"] = serializers.ImageField(required=False)
    return {"multipart/form-data": inline_serializer(name=name, fields=fields)}


def paginated_list_schema(*, name, results_serializer):
    """OpenAPI shape for ``PageNumberPagination`` list responses."""
    return inline_serializer(
        name=name,
        fields={
            "count": serializers.IntegerField(),
            "next": serializers.URLField(allow_null=True, required=False),
            "previous": serializers.URLField(allow_null=True, required=False),
            "results": results_serializer(many=True),
        },
    )
