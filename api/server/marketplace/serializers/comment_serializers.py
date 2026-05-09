from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from marketplace.models import ListingComment


class ListingCommentSerializer(serializers.ModelSerializer):
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ListingComment
        fields = [
            "id",
            "listing",
            "owner",
            "body",
            "parent_comment",
            "replies",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.JSONField()))
    def get_replies(self, obj):
        children_map = self.context.get("children_map") or {}
        children = children_map.get(obj.pk, [])
        return ListingCommentSerializer(children, many=True, context=self.context).data


class ListingCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
    parent_comment_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError(["HtmlNotAllowed"])
        return value


class ListingCommentUpdateSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError(["HtmlNotAllowed"])
        return value
