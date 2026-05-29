from pathlib import Path

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from events.models import (
    Event,
    EventComment,
    EventFile,
    EventInterest,
    EventPost,
    NotificationDelivery,
    NotificationTarget,
)

MAX_EVENT_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EVENT_FILE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
ALLOWED_COVER_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]


def event_cover_photo_absolute_url(*, serializer, obj):
    if not obj.cover_photo:
        return ""
    request = serializer.context.get("request")
    url = obj.cover_photo.url
    if request:
        return request.build_absolute_uri(url)
    return url


def _resolve_interest_count(obj):
    annotated = getattr(obj, "interest_count", None)
    if annotated is not None:
        return annotated
    return obj.interests.count()


def _resolve_interested(obj, request):
    if request is None or not request.user.is_authenticated:
        return False
    annotated = getattr(obj, "interested", None)
    if annotated is not None:
        return bool(annotated)
    return obj.interests.filter(user=request.user).exists()


class EventListSerializer(serializers.ModelSerializer):
    """Compact shape for GET /events/ list responses."""

    cover_photo_url = serializers.SerializerMethodField()
    interest_count = serializers.SerializerMethodField()
    interested = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "cover_photo_url",
            "location",
            "event_date",
            "event_state",
            "interest_count",
            "interested",
        ]

    @extend_schema_field(serializers.URLField(allow_blank=True))
    def get_cover_photo_url(self, obj):
        return event_cover_photo_absolute_url(serializer=self, obj=obj)

    @extend_schema_field(serializers.IntegerField())
    def get_interest_count(self, obj):
        return _resolve_interest_count(obj)

    @extend_schema_field(serializers.BooleanField())
    def get_interested(self, obj):
        return _resolve_interested(obj, self.context.get("request"))


class EventSerializer(serializers.ModelSerializer):
    cover_photo_url = serializers.SerializerMethodField()
    notification_target = serializers.ChoiceField(
        choices=NotificationTarget.choices,
        read_only=True,
    )
    class_target_classe_ids = serializers.SerializerMethodField()
    interest_count = serializers.SerializerMethodField()
    interested = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "body",
            "cover_photo_url",
            "location",
            "event_date",
            "event_state",
            "visibility_state",
            "contact_info",
            "notification_target",
            "class_target_classe_ids",
            "publication_scheduled_at",
            "published_at",
            "interest_count",
            "interested",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.URLField(allow_blank=True))
    def get_cover_photo_url(self, obj):
        return event_cover_photo_absolute_url(serializer=self, obj=obj)

    @extend_schema_field(serializers.ListField(child=serializers.IntegerField()))
    def get_class_target_classe_ids(self, obj):
        return sorted(ct.classe_id for ct in obj.class_targets.all())

    @extend_schema_field(serializers.IntegerField())
    def get_interest_count(self, obj):
        return _resolve_interest_count(obj)

    @extend_schema_field(serializers.BooleanField())
    def get_interested(self, obj):
        return _resolve_interested(obj, self.context.get("request"))


def _validate_cover_image(value):
    ext = Path(value.name).suffix.lower()
    if ext not in ALLOWED_COVER_EXTENSIONS:
        raise serializers.ValidationError(["FileTypeNotSupported"])
    if value.size > MAX_EVENT_FILE_SIZE:
        raise serializers.ValidationError(["FileSizeExceeds10MB"])
    return value


class EventCreateSerializer(serializers.ModelSerializer):
    notification_target = serializers.ChoiceField(
        choices=NotificationTarget.choices,
        required=False,
        default=NotificationTarget.ALL,
    )
    class_target_classe_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
    )

    class Meta:
        model = Event
        fields = [
            "title",
            "description",
            "body",
            "cover_photo",
            "location",
            "event_date",
            "contact_info",
            "notification_target",
            "class_target_classe_ids",
        ]
        extra_kwargs = {
            "cover_photo": {"required": False, "write_only": True},
        }

    def validate_cover_photo(self, value):
        if value is None:
            return value
        return _validate_cover_image(value)


class EventUpdateSerializer(serializers.ModelSerializer):
    notification_target = serializers.ChoiceField(
        choices=NotificationTarget.choices,
        required=False,
    )
    class_target_classe_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
    )

    class Meta:
        model = Event
        fields = [
            "title",
            "description",
            "body",
            "cover_photo",
            "location",
            "event_date",
            "contact_info",
            "notification_target",
            "class_target_classe_ids",
        ]
        extra_kwargs = {
            "cover_photo": {"required": False, "write_only": True},
        }

    def validate_cover_photo(self, value):
        if value is None:
            return value
        return _validate_cover_image(value)


class EventPublishSerializer(serializers.Serializer):
    notification = serializers.ChoiceField(
        choices=NotificationDelivery.choices,
        required=False,
        default=NotificationDelivery.NONE,
    )


class EventSchedulePublicationSerializer(serializers.Serializer):
    publication_scheduled_at = serializers.DateTimeField()
    notification = serializers.ChoiceField(
        choices=NotificationDelivery.choices,
        required=False,
        default=NotificationDelivery.NONE,
    )

    def validate_publication_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(["PublicationDateMustBeInFuture"])
        return value


class EventInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventInterest
        fields = [
            "id",
            "event",
            "user",
            "created_at",
        ]


class EventCommentSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    owner_photo_url = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = EventComment
        fields = [
            "id",
            "event",
            "owner",
            "owner_name",
            "owner_photo_url",
            "body",
            "parent_comment",
            "replies",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_owner_name(self, obj):
        profile = getattr(obj.owner, "profile", None)
        if profile and profile.display_name:
            return profile.display_name
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_owner_photo_url(self, obj):
        profile = getattr(obj.owner, "profile", None)
        if not profile or not profile.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(profile.photo.url)
        return profile.photo.url

    @extend_schema_field(serializers.ListField(child=serializers.JSONField()))
    def get_replies(self, obj):
        children_map = self.context.get("children_map") or {}
        children = children_map.get(obj.pk, [])
        return EventCommentSerializer(children, many=True, context=self.context).data


class EventCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
    parent_comment_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError(["HtmlNotAllowed"])
        return value


class EventCommentUpdateSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError(["HtmlNotAllowed"])
        return value


class EventPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPost
        fields = [
            "id",
            "event",
            "title",
            "body",
            "publication_scheduled_at",
            "published_at",
            "created_at",
            "updated_at",
        ]


class EventPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPost
        fields = [
            "title",
            "body",
        ]


class EventPostUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPost
        fields = [
            "title",
            "body",
        ]


class EventPostPublishSerializer(serializers.Serializer):
    notification = serializers.ChoiceField(
        choices=NotificationDelivery.choices,
        required=False,
        default=NotificationDelivery.NONE,
    )


class EventPostSchedulePublicationSerializer(serializers.Serializer):
    publication_scheduled_at = serializers.DateTimeField()
    notification = serializers.ChoiceField(
        choices=NotificationDelivery.choices,
        required=False,
        default=NotificationDelivery.NONE,
    )

    def validate_publication_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(["PublicationDateMustBeInFuture"])
        return value


class EventFileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = EventFile
        fields = [
            "id",
            "event",
            "file_url",
            "file_name",
            "created_at",
            "updated_at",
        ]

    @extend_schema_field(serializers.URLField(allow_null=True))
    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        url = obj.file.url
        if request:
            return request.build_absolute_uri(url)
        return url


class EventFileCreateSerializer(serializers.Serializer):
    file = serializers.FileField()
    file_name = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_file(self, value):
        ext = Path(value.name).suffix.lower()
        if ext not in ALLOWED_EVENT_FILE_EXTENSIONS:
            raise serializers.ValidationError(["FileTypeNotSupported"])
        if value.size > MAX_EVENT_FILE_SIZE:
            raise serializers.ValidationError(["FileSizeExceeds10MB"])
        return value
