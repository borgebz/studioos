from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import Category, SizeSystem


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "parent",
            "size_system",
            "sort_order",
            "is_active",
            "subcategories",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_subcategories(self, obj):
        children = obj.children.all().order_by("sort_order", "name")
        return CategorySerializer(children, many=True).data


class CreateCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    parent_category_id = serializers.IntegerField(required=False)
    size_system_id = serializers.IntegerField(required=False)
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)
    subcategories = serializers.ListField(required=False)

    def validate(self, data):
        parent_id = data.get("parent_category_id")
        size_system_id = data.get("size_system_id")
        name = data["name"].strip().lower()

        if parent_id:
            if not Category.objects.filter(pk=parent_id).exists():
                raise serializers.ValidationError({"parent_category_id": ["NotFound"]})

        if size_system_id:
            qs = SizeSystem.objects.filter(pk=size_system_id, is_active=True)
            if not qs.exists():
                raise serializers.ValidationError(
                    {"size_system_id": ["InvalidOrInactive"]}
                )

        if Category.objects.filter(name__iexact=name, parent_id=parent_id).exists():
            raise serializers.ValidationError({"messages": ["CategoryAlreadyExists"]})

        return data


class UpdateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    parent_category_id = serializers.IntegerField(required=False, allow_null=True)
    size_system_id = serializers.IntegerField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, data):
        if "parent_category_id" in data:
            pid = data["parent_category_id"]
            if pid is not None and not Category.objects.filter(pk=pid).exists():
                raise serializers.ValidationError({"parent_category_id": ["NotFound"]})

        if "size_system_id" in data:
            ssid = data["size_system_id"]
            if ssid is not None:
                qs = SizeSystem.objects.filter(pk=ssid, is_active=True)
                if not qs.exists():
                    raise serializers.ValidationError(
                        {"size_system_id": ["InvalidOrInactive"]}
                    )

        return data
