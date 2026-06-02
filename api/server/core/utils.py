import json

from rest_framework.exceptions import ValidationError


def parse_multipart_payload(request):
    """Decode the JSON ``payload`` field of a multipart create request.

    Raises ``ValidationError`` if the field is missing or not valid JSON.
    """
    payload_raw = request.data.get("payload")
    if not payload_raw:
        raise ValidationError({"payload": ["This field is required."]})
    try:
        return json.loads(payload_raw)
    except (TypeError, json.JSONDecodeError):
        raise ValidationError({"payload": ["Invalid JSON."]})


def attach_media_files(media_list, files):
    """Remap uploaded ``media_<i>`` files onto each media dict's ``image`` key.

    ``media_list`` is the list of media dicts parsed from the JSON payload;
    ``files`` is ``request.FILES``. Entries without a matching uploaded file get
    their ``image`` key stripped so stray values can't reach the serializer.
    """
    if not isinstance(media_list, list):
        return
    for i, media_item in enumerate(media_list):
        if not isinstance(media_item, dict):
            continue
        uploaded = files.get(f"media_{i}")
        if uploaded is not None:
            media_item["image"] = uploaded
        else:
            media_item.pop("image", None)


def optional_bool(raw):
    """
    Coerce a query-parameter value to ``bool | None``.

    Accepts common truthy/falsy strings (``"true"``, ``"1"``, ``"yes"`` / ``"false"``,
    ``"0"``, ``"no"``), native ``bool``, or ``None``.
    """
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    s = str(raw).strip().lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None
