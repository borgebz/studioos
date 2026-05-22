import json
import logging

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

from . import services
from .serializers import (
    ConversationSerializer,
    CreateConversationSerializer,
    EditMessageSerializer,
    MessageSerializer,
    ReactionInputSerializer,
    SendMessageSerializer,
    UnreadCountSerializer,
)

logger = logging.getLogger(__name__)


class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ConversationSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_list_conversations")
    def get(self, request):
        conversations = services.list_conversations(user=request.user)
        return Response(
            ConversationSerializer(
                conversations, many=True, context={"request": request}
            ).data
        )

    @extend_schema(
        request=CreateConversationSerializer,
        responses={200: ConversationSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request):
        serializer = CreateConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        other_user = services.get_user_for_conversation(
            user_id=serializer.validated_data["user_id"]
        )
        conversation, _ = services.get_or_create_direct_conversation(
            user_a=request.user,
            user_b=other_user,
            created_by=request.user,
        )
        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class MessageListView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(
        responses={200: MessageSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_list_conversations")
    def get(self, request, conversation_id):
        messages = services.get_messages(
            conversation_id=conversation_id, user=request.user
        )
        services.mark_read(conversation_id=conversation_id, user=request.user)
        return Response(
            MessageSerializer(messages, many=True, context={"request": request}).data
        )

    @extend_schema(
        request={
            "multipart/form-data": inline_serializer(
                name="SendMessageMultipart",
                fields={
                    "data": serializers.CharField(
                        required=False,
                        help_text=(
                            "JSON-encoded SendMessage payload "
                            "(body, original_filename, mime_type). "
                            "Optional when only a file is sent."
                        ),
                    ),
                    "file": serializers.FileField(required=False),
                },
            ),
        },
        responses={201: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request, conversation_id):
        conversation = services.get_conversation(
            conversation_id=conversation_id, user=request.user
        )

        raw = request.data.get("data")
        if raw:
            try:
                payload = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                raise ValidationError({"data": ["InvalidJSON"]})
            if not isinstance(payload, dict):
                raise ValidationError({"data": ["MustBeJSONObject"]})
        else:
            payload = {}

        if "file" in request.FILES:
            payload["file"] = request.FILES["file"]

        serializer = SendMessageSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        msg = services.send_message(
            conversation=conversation,
            sender=request.user,
            **serializer.validated_data,
        )
        msg = services.get_messages(
            conversation_id=conversation_id, user=request.user
        ).get(pk=msg.pk)
        logger.info(
            "MessageListView.post: user %s sent message %s", request.user.pk, msg.pk
        )
        return Response(
            MessageSerializer(msg, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UnreadCountSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_list_conversations")
    def get(self, request):
        data = services.get_unread_counts(user=request.user)
        return Response(UnreadCountSerializer(data).data)


class MessageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EditMessageSerializer,
        responses={200: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def patch(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        serializer = EditMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = services.edit_message(
            message=message,
            user=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            MessageSerializer(message, context={"request": request}).data
        )

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def delete(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        services.delete_message(message=message, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PinMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        message, _ = services.pin_message(message=message, user=request.user)
        message = services.get_message(message_id=message_id, user=request.user)
        return Response(
            MessageSerializer(message, context={"request": request}).data
        )


class UnpinMessageView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        message, _ = services.unpin_message(message=message, user=request.user)
        message = services.get_message(message_id=message_id, user=request.user)
        return Response(
            MessageSerializer(message, context={"request": request}).data
        )


class MessageReactionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ReactionInputSerializer,
        responses={201: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        serializer = ReactionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_reaction(
            message=message,
            user=request.user,
            emoji=serializer.validated_data["emoji"],
        )
        message = services.get_message(message_id=message_id, user=request.user)
        return Response(
            MessageSerializer(message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(
        request=ReactionInputSerializer,
        responses={200: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def delete(self, request, message_id):
        message = services.get_message(message_id=message_id, user=request.user)
        serializer = ReactionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.remove_reaction(
            message=message,
            user=request.user,
            emoji=serializer.validated_data["emoji"],
        )
        message = services.get_message(message_id=message_id, user=request.user)
        return Response(
            MessageSerializer(message, context={"request": request}).data,
        )
