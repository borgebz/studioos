from rest_framework import serializers
from inventory.models import Size, SizeSystem


class CreateSizeSerializer(serializers.Serializer):
    name = serializers.CharField()
    size_system_id = serializers.IntegerField()
    is_active = serializers.BooleanField(required=False)

    def validate(self, data):
        name = data["name"].strip().lower()
        size_system_id = data["size_system_id"]

        # validar se existe SizeSystem
        if not SizeSystem.objects.filter(pk=size_system_id).exists():
            raise serializers.ValidationError({"size_system_id": ["SizeSystemNotFound"]})

        # validar duplicados
        if Size.objects.filter(
            name__iexact=name,
            size_system_id=size_system_id
        ).exists():
            raise serializers.ValidationError({"messages": ["SizeAlreadyExists"]})

        return data


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name", "size_system", "sort_order", "is_active"]