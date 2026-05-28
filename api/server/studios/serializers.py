from rest_framework import serializers

from modality.models import Modality
from studios.models import Studio


class ModalitySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Modality
        fields = ["id", "name"]


class StudioSerializer(serializers.ModelSerializer):
    modalities = ModalitySummarySerializer(many=True, read_only=True)

    class Meta:
        model = Studio
        fields = ["id", "name", "max_capacity", "description", "modalities"]


class StudioSubmitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    max_capacity = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True)
    allowed_modality_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )


class StudioUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    max_capacity = serializers.IntegerField(min_value=1, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    allowed_modality_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
