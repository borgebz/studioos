from django.utils import timezone
from rest_framework import serializers

from events.models import Event, EventComment, EventInterest, EventPost

class EventSerializer(serializers.ModelSerializer):
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
            "publication_scheduled_at",
            "published_at",
            "created_at",
            "updated_at",
        ]

class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "title",
            "description",
            "body",
            "cover_photo_url",
            "location",
            "event_date",
            "contact_info",
        ]

class EventUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "title",
            "description",
            "body",
            "cover_photo_url",
            "location",
            "event_date",
            "contact_info",
        ]

class EventPublishSerializer(serializers.Serializer):
    send_notification = serializers.BooleanField(required=False, default=False)

class EventSchedulePublicationSerializer(serializers.Serializer):
    publication_scheduled_at = serializers.DateTimeField()
    send_notification = serializers.BooleanField(required=False, default=False)

    def validate_publication_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("PublicationDateMustBeInFuture")
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
    class Meta:
        model = EventComment
        fields = [
            "id",
            "event",
            "owner",
            "body",
            "parent_comment",
            "created_at",
            "updated_at",
        ]

class EventCommentCreateSerializer(serializers.Serializer):
    body = serializers.CharField()
    parent_comment_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError("HtmlNotAllowed")
        return value
    
class EventCommentUpdateSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value):
        if "<" in value or ">" in value:
            raise serializers.ValidationError("HtmlNotAllowed")
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
    send_notification = serializers.BooleanField(required=False, default=False)

class EventPostSchedulePublicationSerializer(serializers.Serializer):
    publication_scheduled_at = serializers.DateTimeField()
    send_notification = serializers.BooleanField(required=False, default=False)

    def validate_publication_scheduled_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("PublicationDateMustBeInFuture")
        return value