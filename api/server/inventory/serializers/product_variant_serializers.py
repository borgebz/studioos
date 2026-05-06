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


class ProductVariantSerializer(serializers.ModelSerializer):

    # READ
    size = VariantSizeSerializer(read_only=True)

    colors = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    # Explicit ChoiceFields for enum fields
    condition = serializers.ChoiceField(
        choices=ProductVariant.Condition.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=ProductVariant.Status.choices, required=False
    )
    acquisition_type = serializers.ChoiceField(
        choices=ProductVariant.AcquisitionType.choices, required=False
    )

    # WRITE
    size_id = serializers.IntegerField(write_only=True, required=False)
    color_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    media_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    media_upload = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = ProductVariant
        extra_kwargs = {
            "sku": {"required": False, "allow_null": True, "allow_blank": True},
        }
        fields = [
            "id",

            # core
            "sku",
            "condition",
            "status",
            "acquisition_type",
            "acquired_at",

            # notes
            "internal_notes",
            "public_notes",

            # size
            "size",
            "size_id",

            # colors/media
            "colors",
            "color_ids",
            "media",
            "availability",
            "media_ids",
            "media_upload",
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
        active_statuses = (
            VariantBooking.Status.PENDING,
            VariantBooking.Status.CONFIRMED,
            VariantBooking.Status.ACTIVE,
        )
        return {
            "status": obj.status,
            "has_active_booking": obj.bookings.filter(status__in=active_statuses).exists(),
        }

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
