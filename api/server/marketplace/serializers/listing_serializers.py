from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from inventory.serializers.product_serializers import ProductDetailSerializer
from inventory.serializers.product_variant_serializers import ProductVariantSerializer
from marketplace.models import Listing


class ListingListSerializer(serializers.ModelSerializer):
    primary_media_url = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    product_category = serializers.CharField(
        source="variant.product.category.name", read_only=True
    )
    variant_condition = serializers.CharField(
        source="variant.condition", read_only=True
    )
    variant_size = serializers.CharField(source="variant.size.name", read_only=True)
    variant_status = serializers.CharField(source="variant.status", read_only=True)
    available_from = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            "id",
            "listing_type",
            "status",
            "title",
            "asking_price",
            "primary_media_url",
            "product_name",
            "product_category",
            "variant_condition",
            "variant_size",
            "variant_status",
            "available_from",
            "created_at",
        ]

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_primary_media_url(self, obj):
        primary = (
            obj.variant.product.media.filter(is_primary=True).first()
            or obj.variant.product.media.first()
        )
        if primary and primary.image:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(primary.image.url)
                if request
                else primary.image.url
            )
        return None

    @extend_schema_field(serializers.DateTimeField(allow_null=True))
    def get_available_from(self, obj):
        from django.utils import timezone
        from inventory.models import VariantBooking

        last_booking = (
            VariantBooking.objects.filter(
                variant=obj.variant,
                status__in=VariantBooking.ACTIVE_HOLD_STATUSES,
            )
            .order_by("-end_at")
            .first()
        )
        if last_booking:
            return last_booking.end_at
        return timezone.now()


class ListingDetailSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    variant = serializers.SerializerMethodField()
    active_booking_windows = serializers.SerializerMethodField()
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
            "variant",
            "active_booking_windows",
            "owner_display",
            "is_favorited",
            "favorites_count",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(ProductDetailSerializer)
    def get_product(self, obj):
        return ProductDetailSerializer(obj.variant.product, context=self.context).data

    @extend_schema_field(ProductVariantSerializer)
    def get_variant(self, obj):
        return ProductVariantSerializer(obj.variant, context=self.context).data

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_active_booking_windows(self, obj):
        from inventory.models import VariantBooking

        bookings = VariantBooking.objects.filter(
            variant=obj.variant,
            status__in=VariantBooking.ACTIVE_HOLD_STATUSES,
        ).values("start_at", "end_at")
        return list(bookings)

    @extend_schema_field(serializers.DictField())
    def get_owner_display(self, obj):
        owner = obj.variant.product.owner
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
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    listing_type = serializers.ChoiceField(choices=Listing.ListingType.choices)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    asking_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    is_public = serializers.BooleanField(required=False, default=False)
    # Nested product creation — used when variant_id is not provided
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
    # Allow editing underlying product/variant fields inline
    product = serializers.DictField(required=False, allow_null=True)
    variant = serializers.DictField(required=False, allow_null=True)
