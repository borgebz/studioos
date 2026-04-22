import json

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from events import services
from events.models import EventVisibilityState
from events.serializers import (
    EventCommentCreateSerializer,
    EventCommentSerializer,
    EventCommentUpdateSerializer,
    EventCreateSerializer,
    EventFileCreateSerializer,
    EventFileSerializer,
    EventInterestSerializer,
    EventPostCreateSerializer,
    EventPostPublishSerializer,
    EventPostSchedulePublicationSerializer,
    EventPostSerializer,
    EventPostUpdateSerializer,
    EventPublishSerializer,
    EventSchedulePublicationSerializer,
    EventListSerializer,
    EventSerializer,
    EventUpdateSerializer,
)


def _event_writable_payload(request):
    """JSON body, or multipart with optional `data` JSON string + `cover_photo` file."""
    if "data" in request.data and isinstance(request.data["data"], str):
        try:
            payload = json.loads(request.data["data"])
        except json.JSONDecodeError:
            raise ValidationError({"messages": ["InvalidJsonInDataField"]})
        file_obj = request.FILES.get("cover_photo")
        if file_obj is not None:
            payload["cover_photo"] = file_obj
        return payload
    return request.data


class EventListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    @extend_schema(
        responses={200: EventListSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request):
        events = services.list_events(user=request.user)
        serializer = EventListSerializer(
            events,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=EventCreateSerializer,
        responses={201: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.add_event")
    def post(self, request):
        serializer = EventCreateSerializer(data=_event_writable_payload(request))
        serializer.is_valid(raise_exception=True)

        event = services.create_event(
            **serializer.validated_data,
            created_by=request.user,
        )
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventDetailView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    @extend_schema(
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, pk):
        event = services.get_event(pk=pk)

        if event.visibility_state != EventVisibilityState.PUBLISHED:
            if not (
                request.user.is_authenticated
                and request.user.has_perm("events.can_view_unpublished_event")
            ):
                raise NotFound()

        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=EventUpdateSerializer,
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.change_event")
    def put(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventUpdateSerializer(data=_event_writable_payload(request))
        serializer.is_valid(raise_exception=True)

        event = services.update_event(
            event=event,
            updated_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.delete_event")
    def delete(self, request, pk):
        event = services.get_event(pk=pk)
        services.delete_event(event=event, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventPublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EventPublishSerializer,
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_publish_event")
    def post(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.publish_event(
            event=event,
            updated_by=request.user,
            notification=serializer.validated_data["notification"],
        )
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EventSchedulePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EventSchedulePublicationSerializer,
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_schedule_event_publication")
    def post(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventSchedulePublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.schedule_event_publication(
            event=event,
            publication_scheduled_at=serializer.validated_data[
                "publication_scheduled_at"
            ],
            updated_by=request.user,
            notification=serializer.validated_data["notification"],
        )
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EventArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_archive_event")
    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.archive_event(event=event, updated_by=request.user)
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EventCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_cancel_event")
    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.cancel_event(event=event, updated_by=request.user)
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EventCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EventSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_complete_event")
    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.complete_event(event=event, updated_by=request.user)
        return Response(
            EventSerializer(event, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


class EventInterestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={201: EventInterestSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, event_id):
        event = services.get_event(pk=event_id)
        interest = services.create_interest(event=event, user=request.user)
        return Response(
            EventInterestSerializer(interest).data,
            status=status.HTTP_201_CREATED,
        )


class MyEventInterestDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    def delete(self, request, event_id):
        event = services.get_event(pk=event_id)
        services.delete_my_interest(event=event, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventCommentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    @extend_schema(
        responses={200: EventCommentSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, event_id):
        event = services.get_event(pk=event_id)
        roots, children_map = services.list_comments(event=event, user=request.user)
        serializer = EventCommentSerializer(
            roots,
            many=True,
            context={
                "request": request,
                "children_map": children_map,
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=EventCommentCreateSerializer,
        responses={201: EventCommentSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, event_id):
        event = services.get_event(pk=event_id)

        serializer = EventCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = services.create_comment(
            event=event,
            user=request.user,
            body=serializer.validated_data["body"],
            parent_comment_id=serializer.validated_data.get("parent_comment_id"),
        )
        comment = services.get_event_comment(event=event, comment_id=comment.pk)
        return Response(
            EventCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EventCommentUpdateSerializer,
        responses={200: EventCommentSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def put(self, request, event_id, comment_id):
        event = services.get_event(pk=event_id)
        comment = services.get_event_comment(event=event, comment_id=comment_id)

        serializer = EventCommentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = services.update_comment(
            comment=comment,
            user=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            EventCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    def delete(self, request, event_id, comment_id):
        event = services.get_event(pk=event_id)
        comment = services.get_event_comment(event=event, comment_id=comment_id)

        services.delete_comment(comment=comment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventPostListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    @extend_schema(
        responses={200: EventPostSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, event_id):
        event = services.get_event(pk=event_id)
        posts = services.list_posts(event=event, user=request.user)
        return Response(
            EventPostSerializer(posts, many=True).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=EventPostCreateSerializer,
        responses={201: EventPostSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.add_eventpost")
    def post(self, request, event_id):
        event = services.get_event(pk=event_id)

        serializer = EventPostCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.create_post(
            event=event,
            created_by=request.user,
            **serializer.validated_data,
        )
        post = services.get_event_post(event=event, post_id=post.pk)
        return Response(
            EventPostSerializer(post).data,
            status=status.HTTP_201_CREATED,
        )


class EventPostDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    @extend_schema(
        responses={200: EventPostSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        if post.published_at is None:
            if not (
                request.user.is_authenticated
                and request.user.has_perm("events.can_view_unpublished_eventpost")
            ):
                raise NotFound()

        return Response(EventPostSerializer(post).data, status=status.HTTP_200_OK)

    @extend_schema(
        request=EventPostUpdateSerializer,
        responses={200: EventPostSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.change_eventpost")
    def put(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        serializer = EventPostUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.update_post(
            post=post,
            updated_by=request.user,
            **serializer.validated_data,
        )
        post = services.get_event_post(event=event, post_id=post.pk)
        return Response(EventPostSerializer(post).data, status=status.HTTP_200_OK)

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.delete_eventpost")
    def delete(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        services.delete_post(post=post, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class EventPostPublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EventPostPublishSerializer,
        responses={200: EventPostSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_publish_eventpost")
    def post(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        serializer = EventPostPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.publish_post(
            post=post,
            updated_by=request.user,
            notification=serializer.validated_data["notification"],
        )
        post = services.get_event_post(event=event, post_id=post.pk)
        return Response(EventPostSerializer(post).data, status=status.HTTP_200_OK)


class EventPostSchedulePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EventPostSchedulePublicationSerializer,
        responses={200: EventPostSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.can_schedule_eventpost_publication")
    def post(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        serializer = EventPostSchedulePublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.schedule_post_publication(
            post=post,
            publication_scheduled_at=serializer.validated_data[
                "publication_scheduled_at"
            ],
            updated_by=request.user,
            notification=serializer.validated_data["notification"],
        )
        post = services.get_event_post(event=event, post_id=post.pk)
        return Response(EventPostSerializer(post).data, status=status.HTTP_200_OK)


class EventFileListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    @extend_schema(
        responses={200: EventFileSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, event_id):
        event = services.get_event(pk=event_id)
        files = services.list_event_files(event=event, user=request.user)
        serializer = EventFileSerializer(
            files,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=EventFileCreateSerializer,
        responses={201: EventFileSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.add_eventfile")
    def post(self, request, event_id):
        event = services.get_event(pk=event_id)

        serializer = EventFileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ef = services.create_event_file(
            event=event,
            file=serializer.validated_data["file"],
            file_name=serializer.validated_data.get("file_name") or "",
            created_by=request.user,
        )
        ef = services.get_event_file(event=event, file_id=ef.pk)
        return Response(
            EventFileSerializer(ef, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EventFileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("events.delete_eventfile")
    def delete(self, request, event_id, file_id):
        event = services.get_event(pk=event_id)
        event_file = services.get_event_file(event=event, file_id=file_id)
        services.delete_event_file(event_file=event_file, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)