from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import Category, SizeSystem


class SizeSystemBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeSystem
        fields = ["id", "name"]


class CategorySerializer(serializers.ModelSerializer):
    size_systems = serializers.SerializerMethodField()
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "parent",
            "size_systems",
            "sort_order",
            "is_active",
            "subcategories",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_size_systems(self, obj):
        css = obj.size_systems.all()  # uses prefetch cache
        result = []
        for cs in css:
            ss = cs.size_system
            sizes = [
                {"id": s.id, "name": s.name, "sort_order": s.sort_order}
                for s in ss.sizes.all()
                if s.deleted_at is None and s.is_active
            ]
            sizes.sort(key=lambda s: (s["sort_order"], s["id"]))
            result.append({"id": ss.id, "name": ss.name, "sizes": sizes})
        return result

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_subcategories(self, obj):
        depth = self.context.get("_category_depth", 0)
        if depth >= 3:
            return []
        children = obj.children.filter(deleted_at__isnull=True).order_by(
            "sort_order", "name"
        )
        return CategorySerializer(
            children, many=True, context={**self.context, "_category_depth": depth + 1}
        ).data


class CreateCategorySerializer(serializers.Serializer):
    name = serializers.CharField()
    parent_category_id = serializers.IntegerField(required=False)
    size_system_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)
    subcategories = serializers.ListField(required=False)

    def validate(self, data):
        parent_id = data.get("parent_category_id")
        size_system_ids = data.get("size_system_ids") or []
        name = data["name"].strip().lower()

        if parent_id:
            if not Category.objects.filter(pk=parent_id).exists():
                raise serializers.ValidationError({"parent_category_id": ["NotFound"]})

        if size_system_ids:
            count = SizeSystem.objects.filter(
                pk__in=size_system_ids, is_active=True
            ).count()
            if count != len(size_system_ids):
                raise serializers.ValidationError(
                    {"size_system_ids": ["InvalidOrInactive"]}
                )

        if Category.objects.filter(name__iexact=name, parent_id=parent_id).exists():
            raise serializers.ValidationError({"messages": ["CategoryAlreadyExists"]})

        return data


class UpdateCategorySerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    parent_category_id = serializers.IntegerField(required=False, allow_null=True)
    size_system_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_null=True
    )
    sort_order = serializers.IntegerField(required=False)
    is_active = serializers.BooleanField(required=False)

    def validate(self, data):
        if "parent_category_id" in data:
            pid = data["parent_category_id"]
            if pid is not None and not Category.objects.filter(pk=pid).exists():
                raise serializers.ValidationError({"parent_category_id": ["NotFound"]})

        if "size_system_ids" in data:
            ids = data["size_system_ids"] or []
            if ids:
                count = SizeSystem.objects.filter(pk__in=ids, is_active=True).count()
                if count != len(ids):
                    raise serializers.ValidationError(
                        {"size_system_ids": ["InvalidOrInactive"]}
                    )

        return data
