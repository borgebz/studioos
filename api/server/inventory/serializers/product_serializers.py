from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import Product, ProductMedia
from inventory.validators import validate_inventory_image_upload


class SchoolProductDetailsSerializer(serializers.Serializer):
    inventory_code = serializers.CharField(required=False, default="")
    storage_location = serializers.CharField(required=False, default="")
    notes = serializers.CharField(required=False, default="")


class ProductMediaInputSerializer(serializers.Serializer):
    # On update, an existing media item is kept by sending its ``id`` (no image).
    # New media omit ``id`` and carry an uploaded ``image``.
    id = serializers.IntegerField(required=False)
    # Client-stable key used to associate variants with media in the same
    # request (variant.media_keys references these). Not persisted.
    key = serializers.CharField(required=False, allow_blank=True)
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
    status = serializers.CharField(required=False)
    acquisition_type = serializers.CharField(required=False)
    acquired_at = serializers.DateField(required=False, allow_null=True)
    asking_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    color_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    # Client keys of the product media this variant is associated with. Resolved
    # against ProductMediaInputSerializer.key (new uploads) or str(id) (existing).
    media_keys = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    public_notes = serializers.CharField(
        required=False, allow_blank=True, default=""
    )
    internal_notes = serializers.CharField(
        required=False, allow_blank=True, default=""
    )


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


class VariantUpsertSerializer(InlineVariantSerializer):
    # Existing variants carry their ``id`` (updated in place); new variants omit
    # it (created). Existing variants absent from the submitted list are removed.
    id = serializers.IntegerField(required=False)


class ProductUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    target_gender = serializers.CharField(required=False, allow_null=True)
    brand = serializers.CharField(required=False, allow_null=True)
    material = serializers.CharField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=Product.Status.choices, required=False)
    media = ProductMediaInputSerializer(many=True, required=False)
    variants = VariantUpsertSerializer(many=True, required=False)


class SchoolProductUpdateSerializer(ProductUpdateSerializer):
    school_details = SchoolProductDetailsSerializer(required=False)


class ProductDetailSerializer(serializers.ModelSerializer):
    status = serializers.ChoiceField(choices=Product.Status.choices, read_only=True)
    owner_type = serializers.ChoiceField(
        choices=Product.OwnerType.choices, read_only=True
    )
    media = ProductMediaSerializer(many=True, read_only=True)
    school_details = SchoolProductDetailsSerializer(read_only=True)
    listing = serializers.SerializerMethodField()

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
            "listing",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_listing(self, obj):
        """The marketplace listing wrapping this product, if any (OneToOne)."""
        from django.core.exceptions import ObjectDoesNotExist

        try:
            listing = obj.listing
        except ObjectDoesNotExist:
            return None
        if listing is None or listing.deleted_at is not None:
            return None
        return {
            "id": listing.id,
            "listing_type": listing.listing_type,
            "status": listing.status,
            "is_public": listing.is_public,
        }
