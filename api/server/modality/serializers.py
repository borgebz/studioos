from rest_framework import serializers

from modality.models import Modality
from studios.serializers import StudioSerializer


class ModalitySubmitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    max_capacity = serializers.IntegerField(
        required=False, min_value=1, allow_null=True
    )
    min_age_months = serializers.IntegerField(
        required=False, min_value=0, allow_null=True
    )
    max_age_months = serializers.IntegerField(
        required=False, min_value=0, allow_null=True
    )
    allowed_studio_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )


class ModalityUpdateSerializer(ModalitySubmitSerializer):
    name = serializers.CharField(max_length=255, required=False)


class ModalitySerializer(serializers.ModelSerializer):
    studios = StudioSerializer(many=True, read_only=True)

    class Meta:
        model = Modality
        fields = [
            "id",
            "name",
            "description",
            "max_capacity",
            "min_age_months",
            "max_age_months",
            "studios",
        ]
