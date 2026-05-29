from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import VariantBooking
from inventory.serializers.product_variant_serializers import (
    ColorSerializer,
    VariantSizeSerializer,
)


class VariantBookingSerializer(serializers.ModelSerializer):
    booking_type = serializers.ChoiceField(choices=VariantBooking.BookingType.choices)
    status = serializers.ChoiceField(choices=VariantBooking.Status.choices)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    listing_id = serializers.PrimaryKeyRelatedField(source="listing", read_only=True)

    class Meta:
        model = VariantBooking
        fields = [
            "id",
            "variant",
            "booking_type",
            "status",
            "listing_id",
            "start_at",
            "end_at",
            "actual_start_at",
            "actual_end_at",
            "approved_by_user",
            "title",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "variant",
            "listing_id",
            "created_by",
            "created_at",
            "updated_at",
        ]


class SchoolBookingVariantSummarySerializer(serializers.Serializer):
    """
    Compact variant summary embedded in school-bookings rows so the
    back-office UI can render a one-line "Product · size · color"
    description without N+1 round-trips to fetch each variant.
    """

    id = serializers.IntegerField()
    sku = serializers.CharField(allow_null=True, required=False)
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    size = VariantSizeSerializer(allow_null=True)
    colors = ColorSerializer(many=True)


class SchoolBookingRowSerializer(serializers.ModelSerializer):
    """Row shape returned by the school-wide bookings list endpoint."""

    booking_type = serializers.ChoiceField(choices=VariantBooking.BookingType.choices)
    status = serializers.ChoiceField(choices=VariantBooking.Status.choices)
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    listing_id = serializers.PrimaryKeyRelatedField(source="listing", read_only=True)
    variant_detail = serializers.SerializerMethodField()

    class Meta:
        model = VariantBooking
        fields = [
            "id",
            "variant",
            "variant_detail",
            "booking_type",
            "status",
            "listing_id",
            "start_at",
            "end_at",
            "actual_start_at",
            "actual_end_at",
            "approved_by_user",
            "title",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(SchoolBookingVariantSummarySerializer())
    def get_variant_detail(self, obj):
        v = obj.variant
        product = v.product
        return SchoolBookingVariantSummarySerializer(
            {
                "id": v.id,
                "sku": v.sku,
                "product_id": product.id,
                "product_name": product.name,
                "size": v.size,
                "colors": [vc.color for vc in v.colors.all()],
            }
        ).data


class SchoolBookingQuerySerializer(serializers.Serializer):
    """Query parameters for the school-wide bookings list."""

    booking_type = serializers.ChoiceField(
        choices=VariantBooking.BookingType.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=VariantBooking.Status.choices, required=False
    )
    start_at = serializers.DateTimeField(required=False)
    end_at = serializers.DateTimeField(required=False)
    include_cancelled = serializers.BooleanField(required=False)


class VariantBookingWriteSerializer(serializers.ModelSerializer):
    """Create/update payload (variant comes from URL)."""

    booking_type = serializers.ChoiceField(choices=VariantBooking.BookingType.choices)
    status = serializers.ChoiceField(
        choices=VariantBooking.Status.choices, required=False
    )

    class Meta:
        model = VariantBooking
        fields = [
            "booking_type",
            "status",
            "start_at",
            "end_at",
            "actual_start_at",
            "actual_end_at",
            "title",
            "notes",
        ]
