from rest_framework import serializers

from inventory.models import Product, ProductMedia
from inventory.validators import validate_inventory_image_upload


class SchoolProductDetailsSerializer(serializers.Serializer):
    inventory_code = serializers.CharField(required=False, default="")
    storage_location = serializers.CharField(required=False, default="")
    notes = serializers.CharField(required=False, default="")


class ProductMediaInputSerializer(serializers.Serializer):
    image = serializers.ImageField(required=False)
    is_primary = serializers.BooleanField(required=False, default=False)
    sort_order = serializers.IntegerField(required=False, default=0)

    def validate(self, data):
        f = data.get("image")
        if f is not None:
            validate_inventory_image_upload(f, field_label="image")
        return data


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ["id", "image", "is_primary", "sort_order"]


class InlineVariantSerializer(serializers.Serializer):
    size_id = serializers.IntegerField(required=False, allow_null=True)
    sku = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    condition = serializers.CharField(required=False)
    acquisition_type = serializers.CharField(required=False)
    color_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")


_PRODUCT_ORDERING_CHOICES = [
    ("-updated_at", "Recently updated"),
    ("updated_at", "Oldest updated"),
    ("name", "Name A-Z"),
    ("-name", "Name Z-A"),
]


class ProductListQuerySerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    status = serializers.ChoiceField(choices=Product.Status.choices, required=False)
    category_id = serializers.IntegerField(required=False)
    ordering = serializers.ChoiceField(
        choices=_PRODUCT_ORDERING_CHOICES, required=False
    )


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
    variants = InlineVariantSerializer(many=True, required=False, default=list)


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
    owner_type = serializers.ChoiceField(
        choices=Product.OwnerType.choices, read_only=True
    )
    media = ProductMediaSerializer(many=True, read_only=True)
    school_details = SchoolProductDetailsSerializer(read_only=True)

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
            "school_details",
            "created_at",
            "updated_at",
        ]
