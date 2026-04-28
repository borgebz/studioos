from rest_framework import serializers

from inventory.models import (
    ProductVariant,
    VariantColor,
    VariantMedia,
    Color,
    ProductMedia,
    Size,
)


# ===============================
# AUX SERIALIZERS
# ===============================

class SizeSerializer(serializers.ModelSerializer):
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


# ===============================
# MAIN SERIALIZER
# ===============================

class ProductVariantSerializer(serializers.ModelSerializer):

    # READ
    size = SizeSerializer(read_only=True)

    colors = serializers.SerializerMethodField()
    media = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()

    # WRITE
    size_id = serializers.IntegerField(write_only=True, required=False)
    color_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    media_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    media_upload = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = ProductVariant
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

    # ===============================
    # GETTERS (READ)
    # ===============================

    def get_colors(self, obj):
        return [
            {
                "id": vc.color.id,
                "name": vc.color.name,
                "hex_code": vc.color.hex_code,
            }
            for vc in obj.colors.all()
        ]

    def get_media(self, obj):
        return [
            {
                "id": vm.product_media.id,
                "image": vm.product_media.image.url,
                "is_primary": vm.product_media.is_primary,
                "sort_order": vm.product_media.sort_order,
            }
            for vm in obj.media_links.all()
        ]

    def get_availability(self, obj):
        return {
            "status": obj.status,
            "has_active_booking": obj.bookings.filter(
                status__in=["pending", "confirmed", "active"]
            ).exists()
        }

    def validate(self, data):
        if not data.get("sku"):
            raise serializers.ValidationError("SKU é obrigatório.")
        return data