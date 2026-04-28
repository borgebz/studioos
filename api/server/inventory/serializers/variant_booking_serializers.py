from rest_framework import serializers
from inventory.models import VariantBooking


class VariantBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariantBooking
        fields = "__all__"
        read_only_fields = ["id", "variant", "created_by_user"]