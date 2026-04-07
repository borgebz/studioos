from rest_framework import serializers

from studios.models import Studio


class StudioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = ["id", "name", "max_capacity", "description"]


class StudioSubmitSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    max_capacity = serializers.IntegerField(min_value=1)
    description = serializers.CharField(required=False, allow_blank=True)


class StudioUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    max_capacity = serializers.IntegerField(min_value=1, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
