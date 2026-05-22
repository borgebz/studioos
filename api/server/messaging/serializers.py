from pathlib import Path

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Conversation, Message

ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov"]
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


class ReactionGroupSerializer(serializers.Serializer):
    emoji = serializers.CharField()
    count = serializers.IntegerField()
    user_ids = serializers.ListField(child=serializers.IntegerField())


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source="sender.id", read_only=True)
    file_url = serializers.SerializerMethodField()
    body = serializers.SerializerMethodField()
    original_filename = serializers.SerializerMethodField()
    mime_type = serializers.SerializerMethodField()
    deleted_at = serializers.DateTimeField(read_only=True)
    reactions = serializers.SerializerMethodField()
    pinned_at = serializers.DateTimeField(read_only=True)
    pinned_by_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_id",
            "body",
            "file_url",
            "original_filename",
            "mime_type",
            "edited_at",
            "deleted_at",
            "reactions",
            "pinned_at",
            "pinned_by_id",
            "created_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_file_url(self, obj):
        if obj.deleted_at is not None or not obj.file:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_body(self, obj):
        if obj.deleted_at is not None:
            return ""
        return obj.body

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_original_filename(self, obj):
        if obj.deleted_at is not None:
            return ""
        return obj.original_filename

    @extend_schema_field(serializers.CharField(allow_blank=True))
    def get_mime_type(self, obj):
        if obj.deleted_at is not None:
            return ""
        return obj.mime_type

    @extend_schema_field(ReactionGroupSerializer(many=True))
    def get_reactions(self, obj):
        if obj.deleted_at is not None:
            return []
        groups = {}
        for r in obj.reactions.all():
            g = groups.setdefault(r.emoji, {"emoji": r.emoji, "user_ids": []})
            g["user_ids"].append(r.user_id)
        return [
            {"emoji": g["emoji"], "count": len(g["user_ids"]), "user_ids": g["user_ids"]}
            for g in groups.values()
        ]


class ConversationSerializer(serializers.ModelSerializer):
    participant_ids = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    pinned_message_ids = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "participant_ids",
            "coaching_id",
            "recurring_coaching_id",
            "last_message",
            "pinned_message_ids",
            "updated_at",
        ]

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_participant_ids(self, obj):
        return list(obj.participants.values_list("id", flat=True))

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_pinned_message_ids(self, obj):
        return list(
            obj.messages.filter(pinned_at__isnull=False)
            .order_by("-pinned_at")
            .values_list("id", flat=True)
        )

    @extend_schema_field(MessageSerializer(allow_null=True))
    def get_last_message(self, obj):
        msgs = list(obj.messages.all())  # uses prefetch cache, no extra query
        if msgs:
            return MessageSerializer(msgs[-1], context=self.context).data
        return None


class CreateConversationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class UnreadCountSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    by_conversation = serializers.DictField(child=serializers.IntegerField())


class EditMessageSerializer(serializers.Serializer):
    body = serializers.CharField(required=True, allow_blank=False)


class ReactionInputSerializer(serializers.Serializer):
    emoji = serializers.CharField(required=True, max_length=16, allow_blank=False)


class SendMessageSerializer(serializers.Serializer):
    body = serializers.CharField(required=False, allow_blank=True, default="")
    file = serializers.FileField(required=False, allow_null=True)
    original_filename = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    mime_type = serializers.CharField(
        max_length=100, required=False, allow_blank=True, default=""
    )

    def validate_file(self, value):
        if value is None:
            return value
        ext = Path(value.name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("FileTypeNotSupported")
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError("FileSizeExceeds20MB")
        return value

    def validate(self, data):
        if not data.get("body") and not data.get("file"):
            raise serializers.ValidationError(
                {"messages": ["MessageBodyOrFileRequired"]}
            )
        if data.get("file") and not data.get("original_filename"):
            data["original_filename"] = data["file"].name
        return data
