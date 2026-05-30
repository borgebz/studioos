from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import (
    ProductVariant,
    Color,
    ProductMedia,
    Size,
    VariantBooking,
)
from inventory.validators import validate_inventory_image_upload


class VariantSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name"]


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = ["id", "name", "hex_code"]


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ["id", "image", "is_primary", "sort_order"]


class ProductVariantReadSerializer(serializers.ModelSerializer):
    """Read-only serializer used for GET responses."""

    size = VariantSizeSerializer(read_only=True)

    colors = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    condition = serializers.ChoiceField(
        choices=ProductVariant.Condition.choices, read_only=True
    )
    status = serializers.ChoiceField(
        choices=ProductVariant.Status.choices, read_only=True
    )
    acquisition_type = serializers.ChoiceField(
        choices=ProductVariant.AcquisitionType.choices, read_only=True
    )

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "condition",
            "status",
            "acquisition_type",
            "acquired_at",
            "asking_price",
            "internal_notes",
            "public_notes",
            "size",
            "colors",
            "media",
            "availability",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_colors(self, obj):
        return [
            {
                "id": vc.color.id,
                "name": vc.color.name,
                "hex_code": vc.color.hex_code,
            }
            for vc in obj.colors.all()
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_media(self, obj):
        return [
            {
                "id": vm.product_media.id,
                "image": vm.product_media.image.url if vm.product_media.image else None,
                "is_primary": vm.product_media.is_primary,
                "sort_order": vm.product_media.sort_order,
            }
            for vm in obj.media_links.all()
        ]

    @extend_schema_field(serializers.DictField())
    def get_availability(self, obj):
        return {
            "status": obj.status,
            "has_active_booking": any(
                b.status in VariantBooking.ACTIVE_HOLD_STATUSES
                for b in obj.bookings.all()
            ),
        }


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    """Write serializer used for POST/PATCH."""

    condition = serializers.ChoiceField(
        choices=ProductVariant.Condition.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=ProductVariant.Status.choices, required=False
    )
    acquisition_type = serializers.ChoiceField(
        choices=ProductVariant.AcquisitionType.choices, required=False
    )

    size_id = serializers.IntegerField(required=False, allow_null=True)
    color_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    media_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    media_upload = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
    )

    class Meta:
        model = ProductVariant
        extra_kwargs = {
            "sku": {"required": False, "allow_null": True, "allow_blank": True},
            "asking_price": {"required": False, "allow_null": True},
        }
        fields = [
            "sku",
            "condition",
            "status",
            "acquisition_type",
            "asking_price",
            "internal_notes",
            "public_notes",
            "size_id",
            "color_ids",
            "media_ids",
            "media_upload",
        ]

    def validate_media_upload(self, value):
        if not value:
            return value
        for f in value:
            validate_inventory_image_upload(f, field_label="media_upload")
        return value

    def validate(self, data):
        if not self.partial:
            data.setdefault("condition", ProductVariant.Condition.GOOD)
            data.setdefault("status", ProductVariant.Status.AVAILABLE)
            data.setdefault("acquisition_type", ProductVariant.AcquisitionType.OTHER)
        return data


# Backward-compatible alias so existing imports keep working.
ProductVariantSerializer = ProductVariantReadSerializer
