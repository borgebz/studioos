from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.models import ProductVariant, VariantBooking
from inventory.serializers.product_serializers import ProductDetailSerializer
from inventory.serializers.product_variant_serializers import (
    ProductVariantReadSerializer,
)
from marketplace.models import Listing


def _listing_variants(obj):
    """Active (non-soft-deleted) variants of the listing's product."""
    return [v for v in obj.product.variants.all() if v.deleted_at is None]


class ListingListSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source="product.id", read_only=True)
    primary_media_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_category = serializers.CharField(
        source="product.category.name", read_only=True
    )
    variant_count = serializers.SerializerMethodField()
    available_count = serializers.SerializerMethodField()
    size_summary = serializers.SerializerMethodField()
    condition_summary = serializers.SerializerMethodField()
    price_from = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "product_id",
            "listing_type",
            "status",
            "title",
            "asking_price",
            "price_from",
            "primary_media_url",
            "product_name",
            "product_category",
            "variant_count",
            "available_count",
            "size_summary",
            "condition_summary",
            "created_at",
        ]

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_primary_media_url(self, obj):
        primary = (
            obj.product.media.filter(is_primary=True).first()
            or obj.product.media.first()
        )
        if primary and primary.image:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(primary.image.url)
                if request
                else primary.image.url
            )
        return None

    @extend_schema_field(serializers.IntegerField())
    def get_variant_count(self, obj):
        return len(_listing_variants(obj))

    @extend_schema_field(serializers.IntegerField())
    def get_available_count(self, obj):
        return sum(
            1
            for v in _listing_variants(obj)
            if v.status == ProductVariant.Status.AVAILABLE
        )

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_size_summary(self, obj):
        names = []
        for v in _listing_variants(obj):
            if v.size and v.size.name and v.size.name not in names:
                names.append(v.size.name)
        return ", ".join(names) if names else None

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_condition_summary(self, obj):
        conditions = []
        for v in _listing_variants(obj):
            if v.condition and v.condition not in conditions:
                conditions.append(v.condition)
        return conditions

    @extend_schema_field(
        serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    )
    def get_price_from(self, obj):
        prices = [
            v.asking_price
            for v in _listing_variants(obj)
            if v.asking_price is not None
        ]
        if obj.asking_price is not None:
            prices.append(obj.asking_price)
        return min(prices) if prices else None


class ListingVariantSerializer(ProductVariantReadSerializer):
    """Variant payload nested inside a listing detail.

    Adds the effective marketplace price (per-variant override falling back to
    the listing's asking_price) and the variant's active booking windows so the
    buyer can pick a variant and see its availability.
    """

    effective_price = serializers.SerializerMethodField()
    booking_windows = serializers.SerializerMethodField()

    class Meta(ProductVariantReadSerializer.Meta):
        fields = ProductVariantReadSerializer.Meta.fields + [
            "effective_price",
            "booking_windows",
        ]

    @extend_schema_field(
        serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    )
    def get_effective_price(self, obj):
        if obj.asking_price is not None:
            return obj.asking_price
        listing = self.context.get("listing")
        return listing.asking_price if listing else None

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_booking_windows(self, obj):
        return [
            {"start_at": b.start_at, "end_at": b.end_at}
            for b in obj.bookings.all()
            if b.status in VariantBooking.ACTIVE_HOLD_STATUSES
        ]


class ListingDetailSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    owner_display = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "listing_type",
            "status",
            "title",
            "description",
            "asking_price",
            "is_public",
            "product",
            "variants",
            "owner_display",
            "is_favorited",
            "favorites_count",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(ProductDetailSerializer)
    def get_product(self, obj):
        return ProductDetailSerializer(obj.product, context=self.context).data

    @extend_schema_field(ListingVariantSerializer(many=True))
    def get_variants(self, obj):
        variants = _listing_variants(obj)
        return ListingVariantSerializer(
            variants,
            many=True,
            context={**self.context, "listing": obj},
        ).data

    @extend_schema_field(serializers.DictField())
    def get_owner_display(self, obj):
        owner = obj.product.owner
        if not owner:
            return {"type": "school"}
        profile = getattr(owner, "profile", None)
        photo_url = None
        if profile and profile.photo:
            request = self.context.get("request")
            photo_url = (
                request.build_absolute_uri(profile.photo.url)
                if request is not None
                else profile.photo.url
            )
        return {
            "type": "member",
            "display_name": profile.display_name if profile else None,
            "photo_url": photo_url,
        }

    @extend_schema_field(serializers.BooleanField())
    def get_is_favorited(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorites.filter(user=request.user, deleted_at__isnull=True).exists()

    @extend_schema_field(serializers.IntegerField())
    def get_favorites_count(self, obj):
        return obj.favorites.filter(deleted_at__isnull=True).count()


_LISTING_ORDERING_CHOICES = [
    ("-created_at", "Newest first"),
    ("created_at", "Oldest first"),
    ("asking_price", "Price ascending"),
    ("-asking_price", "Price descending"),
]


class ListingListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False)
    listing_type = serializers.ChoiceField(
        choices=Listing.ListingType.choices, required=False
    )
    status = serializers.ChoiceField(
        choices=Listing.ListingStatus.choices, required=False
    )
    category_id = serializers.IntegerField(required=False)
    size_id = serializers.IntegerField(required=False)
    color_id = serializers.IntegerField(required=False)
    condition = serializers.CharField(required=False)
    ordering = serializers.ChoiceField(
        choices=_LISTING_ORDERING_CHOICES, required=False
    )


class ListingCreateSerializer(serializers.Serializer):
    # List an existing inventory product…
    product_id = serializers.IntegerField(required=False, allow_null=True)
    listing_type = serializers.ChoiceField(choices=Listing.ListingType.choices)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    asking_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    is_public = serializers.BooleanField(required=False, default=False)
    # …or create the product + its variants inline (when product_id is absent).
    # The dict carries product fields plus a `variants: [...]` array.
    product = serializers.DictField(required=False, allow_null=True)


class ListingUpdateSerializer(serializers.Serializer):
    listing_type = serializers.ChoiceField(
        choices=Listing.ListingType.choices, required=False
    )
    title = serializers.CharField(max_length=255, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    asking_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    is_public = serializers.BooleanField(required=False)
    # Inline product field updates + add/update/remove of variants.
    product = serializers.DictField(required=False, allow_null=True)
    variants = serializers.ListField(
        child=serializers.DictField(), required=False
    )
