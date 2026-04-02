from rest_framework import serializers
from .models import Studio, Modality


class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = ["id", "name", "max_capacity", "description"]


class ModalitySerializer(serializers.ModelSerializer):
    allowed_studio_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
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
            "allowed_studio_ids",
            "studios",
        ]
