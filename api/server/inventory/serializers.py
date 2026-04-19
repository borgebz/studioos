from rest_framework import serializers
from django.db import transaction
from .models import SizeSystem, Size, Category, ProductVariant


class SizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Size
        fields = ["id", "name", "sort_order"]


class SizeSystemSerializer(serializers.ModelSerializer):
    sizes = SizeSerializer(many=True, required=False)

    class Meta:
        model = SizeSystem
        fields = ["id", "name", "is_active", "sizes"]

    def validate_name(self, value):
        normalized = value.strip().lower()

        qs = SizeSystem.objects.filter(name__iexact=normalized)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.exists():
            raise serializers.ValidationError(
                "Já existe um sistema de tamanhos com este nome"
            )

        return value

    def validate_sizes(self, value):
        names = [s["name"].strip().lower() for s in value]

        if len(names) != len(set(names)):
            raise serializers.ValidationError("Existem tamanhos duplicados no pedido")

        return value

    @transaction.atomic
    def create(self, validated_data):
        sizes_data = validated_data.pop("sizes", [])

        size_system = SizeSystem.objects.create(**validated_data)

        for size in sizes_data:
            Size.objects.create(size_system=size_system, **size)

        return size_system

    @transaction.atomic
    def update(self, instance, validated_data):
        sizes_data = validated_data.pop("sizes", None)

        instance.name = validated_data.get("name", instance.name)
        instance.save()

        # Opcional: atualizar sizes (se quiseres permitir)
        if sizes_data is not None:
            for size in sizes_data:
                if "id" in size:
                    s = Size.objects.get(id=size["id"])

                    if s.size_system_id != instance.id:
                        raise serializers.ValidationError(
                            "Não é permitido alterar sizes de outro sistema"
                        )

                    s.name = size.get("name", s.name)
                    s.sort_order = size.get("sort_order", s.sort_order)
                    s.save()
                else:
                    Size.objects.create(size_system=instance, **size)

        return instance
