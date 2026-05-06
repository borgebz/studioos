from pathlib import Path

from rest_framework import serializers

ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024


def validate_inventory_image_upload(value, *, field_label="image"):
    if value is None:
        return value
    ext = Path(getattr(value, "name", "") or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise serializers.ValidationError({field_label: ["FileTypeNotSupported"]})
    size = getattr(value, "size", None)
    if size is not None and size > MAX_IMAGE_UPLOAD_BYTES:
        raise serializers.ValidationError({field_label: ["FileSizeExceeds10MB"]})
    return value
