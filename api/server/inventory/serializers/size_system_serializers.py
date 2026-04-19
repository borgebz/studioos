from rest_framework import serializers
from inventory.models import SizeSystem, Size


# 🔹 Serializer para Size (nested)
class SizeInputSerializer(serializers.Serializer):
    name = serializers.CharField()
    sort_order = serializers.IntegerField(required=False)


# 🔹 CREATE
class CreateSizeSystemSerializer(serializers.Serializer):
    name = serializers.CharField()
    is_active = serializers.BooleanField(required=False)
    sizes = SizeInputSerializer(many=True, required=False)

    def validate_name(self, value):
        normalized = value.strip().lower()

        if SizeSystem.objects.filter(name__iexact=normalized).exists():
            raise serializers.ValidationError("SizeSystemAlreadyExists")

        return value

    def validate_sizes(self, value):
        names = [s["name"].strip().lower() for s in value]

        if len(names) != len(set(names)):
            raise serializers.ValidationError("DuplicateSizesInRequest")

        return value


# 🔹 UPDATE
class UpdateSizeSystemSerializer(serializers.Serializer):
    name = serializers.CharField()

    def validate_name(self, value):
        normalized = value.strip().lower()

        qs = SizeSystem.objects.filter(name__iexact=normalized)

        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("SizeSystemAlreadyExists")

        return value


# 🔹 OUTPUT
class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name", "sort_order", "is_active"]


class SizeSystemSerializer(serializers.ModelSerializer):
    sizes = SizeSerializer(many=True, read_only=True)

    class Meta:
        model = SizeSystem
        fields = ["id", "name", "is_active", "sizes"]