from rest_framework import serializers

from inventory.models import SizeSystem, Size


class SizeInputSerializer(serializers.Serializer):
    name = serializers.CharField()
    sort_order = serializers.IntegerField(required=False)


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


class UpdateSizeSystemSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)

    def __init__(self, *args, size_system=None, **kwargs):
        super().__init__(*args, **kwargs)
        self._size_system = size_system

    def validate_name(self, value):
        if value is None:
            return value
        normalized = value.strip().lower()

        qs = SizeSystem.objects.filter(name__iexact=normalized)

        if self._size_system is not None:
            qs = qs.exclude(pk=self._size_system.pk)

        if qs.exists():
            raise serializers.ValidationError("SizeSystemAlreadyExists")

        return value.strip()


class SizeSystemSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name", "sort_order", "is_active"]


class SizeSystemSerializer(serializers.ModelSerializer):
    sizes = SizeSystemSizeSerializer(many=True, read_only=True)

    class Meta:
        model = SizeSystem
        fields = ["id", "name", "is_active", "sizes"]
