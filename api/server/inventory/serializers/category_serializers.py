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

        # validar parent
        if parent_id:
            if not Category.objects.filter(pk=parent_id).exists():
                raise serializers.ValidationError({"parent_category_id": ["NotFound"]})

        # validar size system
        if size_system_id:
            qs = SizeSystem.objects.filter(pk=size_system_id, is_active=True)
            if not qs.exists():
                raise serializers.ValidationError({"size_system_id": ["InvalidOrInactive"]})

        # validar duplicados no mesmo nível
        if Category.objects.filter(
                name__iexact=name,
                parent_id=parent_id
        ).exists():
            raise serializers.ValidationError({"messages": ["CategoryAlreadyExists"]})

        return data


class UpdateCategorySerializer(CreateCategorySerializer):
    pass