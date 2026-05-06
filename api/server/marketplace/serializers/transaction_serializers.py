from rest_framework import serializers

from marketplace.models import ProductTransaction


class TransactionRequestSerializer(serializers.Serializer):
    listing_id = serializers.IntegerField()
    start_at = serializers.DateTimeField(required=False, allow_null=True)
    end_at = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class TransactionDetailSerializer(serializers.ModelSerializer):
    requester_display = serializers.SerializerMethodField()
    owner_display = serializers.SerializerMethodField()
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    variant_sku = serializers.CharField(source="variant.sku", read_only=True)
    product_name = serializers.CharField(
        source="variant.product.name", read_only=True
    )

    class Meta:
        model = ProductTransaction
        fields = [
            "id",
            "listing_id",
            "variant_id",
            "transaction_type",
            "status",
            "requester_display",
            "owner_display",
            "agreed_price",
            "start_at",
            "end_at",
            "notes",
            "listing_title",
            "variant_sku",
            "product_name",
            "created_at",
            "updated_at",
        ]

    def get_requester_display(self, obj):
        profile = getattr(obj.requester, "profile", None)
        return {
            "id": obj.requester_id,
            "display_name": profile.display_name if profile else None,
        }

    def get_owner_display(self, obj):
        profile = getattr(obj.owner, "profile", None)
        return {
            "id": obj.owner_id,
            "display_name": profile.display_name if profile else None,
        }
