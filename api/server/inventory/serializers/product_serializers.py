from rest_framework import serializers

from inventory.models import Product, ProductMedia
from inventory.validators import validate_inventory_image_upload


class SchoolProductDetailsSerializer(serializers.Serializer):
    inventory_code = serializers.CharField(required=False, default="")
    storage_location = serializers.CharField(required=False, default="")
    notes = serializers.CharField(required=False, default="")


class ProductMediaInputSerializer(serializers.Serializer):
    image = serializers.ImageField(required=False)
    file = serializers.ImageField(required=False)
    is_primary = serializers.BooleanField(required=False, default=False)
    sort_order = serializers.IntegerField(required=False, default=0)

    def validate(self, data):
        for key in ("image", "file"):
            f = data.get(key)
            if f is not None:
                validate_inventory_image_upload(f, field_label=key)
        return data


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ["id", "image", "is_primary", "sort_order"]


class ProductCreateSerializer(serializers.Serializer):
    name = serializers.CharField()
    description = serializers.CharField(required=False, default="")
    category_id = serializers.IntegerField(required=False)
    target_gender = serializers.CharField(required=False, allow_null=True)
    brand = serializers.CharField(required=False, allow_null=True)
    material = serializers.CharField(required=False, allow_null=True)
    status = serializers.ChoiceField(
        choices=Product.Status.choices, required=False, default=Product.Status.ACTIVE
    )
    media = ProductMediaInputSerializer(many=True, required=False)
    variants = serializers.ListField(child=serializers.DictField(), required=False)


class SchoolProductCreateSerializer(ProductCreateSerializer):
    school_details = SchoolProductDetailsSerializer(required=False)


class ProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    target_gender = serializers.CharField(required=False, allow_null=True)
    brand = serializers.CharField(required=False, allow_null=True)
    material = serializers.CharField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Product.Status.choices, required=False)
    media = ProductMediaInputSerializer(many=True, required=False)


class SchoolProductUpdateSerializer(ProductUpdateSerializer):
    school_details = SchoolProductDetailsSerializer(required=False)


class ProductDetailSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=Product.Status.choices, read_only=True)
    owner_type = serializers.ChoiceField(choices=Product.OwnerType.choices, read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "owner_type",
            "owner",
            "category",
            "name",
            "description",
            "target_gender",
            "brand",
            "material",
            "status",
            "media",
            "created_at",
            "updated_at",
        ]
