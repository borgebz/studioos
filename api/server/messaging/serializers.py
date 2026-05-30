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
            "kind",
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
            {
                "emoji": g["emoji"],
                "count": len(g["user_ids"]),
                "user_ids": g["user_ids"],
            }
            for g in groups.values()
        ]


class ConversationParticipantSummarySerializer(serializers.Serializer):
    """Lightweight participant info embedded inside every Conversation.

    Identity is derived from the Profile, which is the user's opt-in to
    being discoverable for messaging. If a participant has no profile yet
    we expose only their numeric id + ``has_profile=False`` and the client
    renders an "Anonymous user" placeholder — we never leak first_name /
    last_name / email through this surface.
    """

    id = serializers.IntegerField()
    has_profile = serializers.BooleanField()
    display_name = serializers.CharField(allow_null=True)
    photo_url = serializers.CharField(allow_null=True)


class ConversationSerializer(serializers.ModelSerializer):
    participant_ids = serializers.SerializerMethodField()
    participants = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    pinned_message_ids = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    created_by_id = serializers.IntegerField(read_only=True, allow_null=True)
    listing_id = serializers.IntegerField(read_only=True, allow_null=True)
    variant_id = serializers.IntegerField(read_only=True, allow_null=True)
    listing_title = serializers.SerializerMethodField()
    variant_photo_url = serializers.SerializerMethodField()
    listing_offer = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "kind",
            "name",
            "participant_ids",
            "participants",
            "is_admin",
            "created_by_id",
            "coaching_id",
            "recurring_coaching_id",
            "listing_id",
            "variant_id",
            "listing_title",
            "variant_photo_url",
            "listing_offer",
            "last_message",
            "pinned_message_ids",
            "updated_at",
        ]

    @extend_schema_field(serializers.BooleanField())
    def get_is_admin(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return False
        # Only meaningful on GROUP conversations; for DMs/coaching/listing
        # it's always False (no member-management surface).
        from .models import ConversationKind, ConversationParticipant

        if obj.kind != ConversationKind.GROUP:
            return False
        cp = ConversationParticipant.objects.filter(
            conversation=obj, user=request.user
        ).first()
        return bool(cp and cp.is_admin)

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_participant_ids(self, obj):
        # Active participants only — soft-deleted rows linger in the M2M
        # through table for audit purposes but must not show in the UI.
        return list(
            obj.conversation_participants.filter(deleted_at__isnull=True).values_list(
                "user_id", flat=True
            )
        )

    @extend_schema_field(ConversationParticipantSummarySerializer(many=True))
    def get_participants(self, obj):
        request = self.context.get("request")
        # Use the through manager so we can scope to active rows. Without
        # this, removed-then-re-added users would double-count.
        active_user_ids = list(
            obj.conversation_participants.filter(deleted_at__isnull=True).values_list(
                "user_id", flat=True
            )
        )
        users = obj.participants.filter(pk__in=active_user_ids).select_related(
            "profile"
        )
        out = []
        for u in users:
            profile = getattr(u, "profile", None)
            has_profile = profile is not None
            if has_profile:
                photo_url = None
                if profile.photo:
                    url = profile.photo.url
                    photo_url = request.build_absolute_uri(url) if request else url
                out.append(
                    {
                        "id": u.id,
                        "has_profile": True,
                        "display_name": profile.display_name,
                        "photo_url": photo_url,
                    }
                )
            else:
                # Profileless users appear as anonymous placeholders. The
                # client renders a localized "Anonymous user" label.
                out.append(
                    {
                        "id": u.id,
                        "has_profile": False,
                        "display_name": None,
                        "photo_url": None,
                    }
                )
        return out

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

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_listing_title(self, obj):
        if obj.name:
            return obj.name
        if obj.listing_id and hasattr(obj, "listing") and obj.listing:
            return obj.listing.title
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_variant_photo_url(self, obj):
        from marketplace.services.offer_services import get_listing_conversation_photo_url

        request = self.context.get("request")
        return get_listing_conversation_photo_url(conversation=obj, request=request)

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_listing_offer(self, obj):
        from marketplace.models import ListingOffer

        try:
            offer = obj.listing_offer
        except ListingOffer.DoesNotExist:
            return None
        from marketplace.serializers.offer_serializers import (
            ListingOfferSummarySerializer,
        )

        return ListingOfferSummarySerializer(
            offer, context=self.context
        ).data


class CreateConversationSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class UnreadCountSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    by_conversation = serializers.DictField(child=serializers.IntegerField())


class EditMessageSerializer(serializers.Serializer):
    body = serializers.CharField(required=True, allow_blank=False)


class ReactionInputSerializer(serializers.Serializer):
    emoji = serializers.CharField(required=True, max_length=16, allow_blank=False)


class CreateGroupConversationSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=120, allow_blank=False)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )


class RenameConversationSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=120, allow_blank=False)


class AddParticipantsSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
    )


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
