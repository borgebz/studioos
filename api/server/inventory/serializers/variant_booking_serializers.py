from rest_framework import serializers

from inventory.models import VariantBooking


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
