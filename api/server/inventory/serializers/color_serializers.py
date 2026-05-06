from rest_framework import serializers
from inventory.models import Color


class CreateColorSerializer(serializers.Serializer):
    name = serializers.CharField()
    hex_code = serializers.CharField()
    is_active = serializers.BooleanField(required=False, default=True)


class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = [
            "id",
            "name",
            "hex_code",
            "is_active",
        ]
