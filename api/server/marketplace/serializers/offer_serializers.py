from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from marketplace.models import ListingOffer


class ListingOfferCreateSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    offered_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    start_at = serializers.DateTimeField(required=False, allow_null=True)
    end_at = serializers.DateTimeField(required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True, default="")
    is_inquiry = serializers.BooleanField(required=False, default=False)


class ListingOfferUpdateSerializer(serializers.Serializer):
    offered_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    start_at = serializers.DateTimeField(required=False, allow_null=True)
    end_at = serializers.DateTimeField(required=False, allow_null=True)
    message = serializers.CharField(required=False, allow_blank=True)


class ListingOfferSerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_type = serializers.CharField(source="listing.listing_type", read_only=True)
    asking_price = serializers.DecimalField(
        source="listing.asking_price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    conversation_id = serializers.IntegerField(source="conversation.id", read_only=True)
    buyer_display = serializers.SerializerMethodField()
    variant_label = serializers.SerializerMethodField()
    variant_photo_url = serializers.SerializerMethodField()
    transaction_id = serializers.IntegerField(
        source="transaction.id", read_only=True, allow_null=True
    )

    class Meta:
        model = ListingOffer
        fields = [
            "id",
            "listing_id",
            "listing_title",
            "listing_type",
            "asking_price",
            "variant_id",
            "variant_label",
            "variant_photo_url",
            "conversation_id",
            "buyer_id",
            "buyer_display",
            "offered_price",
            "start_at",
            "end_at",
            "message",
            "status",
            "is_inquiry",
            "transaction_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.DictField())
    def get_buyer_display(self, obj):
        profile = getattr(obj.buyer, "profile", None)
        return {
            "id": obj.buyer_id,
            "display_name": profile.display_name if profile else None,
        }

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_variant_label(self, obj):
        if obj.variant is None:
            return None
        parts = []
        if obj.variant.size and obj.variant.size.name:
            parts.append(obj.variant.size.name)
        if obj.variant.condition:
            parts.append(obj.variant.condition)
        return " · ".join(parts) if parts else obj.variant.sku

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_variant_photo_url(self, obj):
        from marketplace.services.offer_services import get_variant_photo_url

        request = self.context.get("request")
        return get_variant_photo_url(variant=obj.variant, request=request)


class ListingOfferSummarySerializer(serializers.ModelSerializer):
    """Compact offer payload embedded in conversation responses."""

    variant_label = serializers.SerializerMethodField()
    variant_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = ListingOffer
        fields = [
            "id",
            "variant_id",
            "variant_label",
            "variant_photo_url",
            "offered_price",
            "start_at",
            "end_at",
            "status",
            "is_inquiry",
            "transaction_id",
        ]

    transaction_id = serializers.IntegerField(
        source="transaction.id", read_only=True, allow_null=True
    )

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_variant_label(self, obj):
        if obj.variant is None:
            return None
        parts = []
        if obj.variant.size and obj.variant.size.name:
            parts.append(obj.variant.size.name)
        if obj.variant.condition:
            parts.append(obj.variant.condition)
        return " · ".join(parts) if parts else obj.variant.sku

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_variant_photo_url(self, obj):
        from marketplace.services.offer_services import get_variant_photo_url

        request = self.context.get("request")
        return get_variant_photo_url(variant=obj.variant, request=request)
