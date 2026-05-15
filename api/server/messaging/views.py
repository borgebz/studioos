import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
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
    MessageSerializer,
    SendMessageSerializer,
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
        request=SendMessageSerializer,
        responses={201: MessageSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("messaging.can_send_message")
    def post(self, request, conversation_id):
        conversation = services.get_conversation(
            conversation_id=conversation_id, user=request.user
        )

        if "data" in request.data and isinstance(request.data["data"], str):
            import json

            payload = json.loads(request.data["data"])
        else:
            payload = request.data

        data = {**payload}
        if "file" in request.FILES:
            data["file"] = request.FILES["file"]

        serializer = SendMessageSerializer(data=data)
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
