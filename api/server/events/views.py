from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import NotFound

from events import services
from events.models import EventVisibilityState
from events.serializers import (
    EventCommentCreateSerializer,
    EventCommentSerializer,
    EventCommentUpdateSerializer,
    EventCreateSerializer,
    EventInterestSerializer,
    EventPostCreateSerializer,
    EventPostPublishSerializer,
    EventPostSchedulePublicationSerializer,
    EventPostSerializer,
    EventPostUpdateSerializer,
    EventPublishSerializer,
    EventSchedulePublicationSerializer,
    EventSerializer,
    EventUpdateSerializer,
)

class EventListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request):
        events = services.list_events(user=request.user)
        serializer = EventSerializer(events, many=True)
        return Response({"data": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.create_event(
            **serializer.validated_data,
            created_by=request.user,
        )
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_201_CREATED)
    
class EventDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        event = services.get_event(pk=pk)

        if event.visibility_state != EventVisibilityState.PUBLISHED:
            if not (
                request.user.is_authenticated
                and request.user.has_perm("events.can_view_unpublished_event")
            ):
                raise NotFound()

        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)

    def put(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.update_event(
            event=event,
            updated_by=request.user,
            **serializer.validated_data,
        )
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        event = services.get_event(pk=pk)
        services.delete_event(event=event, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class EventPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.publish_event(
            event=event,
            updated_by=request.user,
            send_notification=serializer.validated_data["send_notification"],
        )
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)
    
class EventSchedulePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = services.get_event(pk=pk)

        serializer = EventSchedulePublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = services.schedule_event_publication(
            event=event,
            publication_scheduled_at=serializer.validated_data["publication_scheduled_at"],
            updated_by=request.user,
            send_notification=serializer.validated_data["send_notification"],
        )
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)

class EventArchiveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.archive_event(event=event, updated_by=request.user)
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)
    
class EventCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.cancel_event(event=event, updated_by=request.user)
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)
    
class EventCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = services.get_event(pk=pk)
        event = services.complete_event(event=event, updated_by=request.user)
        return Response({"data": EventSerializer(event).data}, status=status.HTTP_200_OK)
    
class EventInterestCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id):
        event = services.get_event(pk=event_id)
        interest = services.create_interest(event=event, user=request.user)
        return Response({"data": EventInterestSerializer(interest).data}, status=status.HTTP_201_CREATED)

class MyEventInterestDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, event_id):
        event = services.get_event(pk=event_id)
        services.delete_my_interest(event=event, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class EventCommentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    def get(self, request, event_id):
        event = services.get_event(pk=event_id)
        comments = services.list_comments(event=event, user=request.user)
        return Response(
            {"data": EventCommentSerializer(comments, many=True).data},
            status=status.HTTP_200_OK,
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
        return Response(
            {"data": EventCommentSerializer(comment).data},
            status=status.HTTP_201_CREATED,
        )

class EventCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

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
            {"data": EventCommentSerializer(comment).data},
            status=status.HTTP_200_OK,
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

    def get(self, request, event_id):
        event = services.get_event(pk=event_id)
        posts = services.list_posts(event=event, user=request.user)
        return Response(
            {"data": EventPostSerializer(posts, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request, event_id):
        event = services.get_event(pk=event_id)

        serializer = EventPostCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.create_post(
            event=event,
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            {"data": EventPostSerializer(post).data},
            status=status.HTTP_201_CREATED,
        )

class EventPostDetailView(APIView):
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        if post.published_at is None:
            if not (
                request.user.is_authenticated
                and request.user.has_perm("events.can_view_unpublished_eventpost")
            ):
                raise NotFound()

        return Response({"data": EventPostSerializer(post).data}, status=status.HTTP_200_OK)

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
        return Response({"data": EventPostSerializer(post).data}, status=status.HTTP_200_OK)

    def delete(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        services.delete_post(post=post, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

class EventPostPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        serializer = EventPostPublishSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.publish_post(
            post=post,
            updated_by=request.user,
            send_notification=serializer.validated_data["send_notification"],
        )
        return Response({"data": EventPostSerializer(post).data}, status=status.HTTP_200_OK)
    
class EventPostSchedulePublicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, event_id, post_id):
        event = services.get_event(pk=event_id)
        post = services.get_event_post(event=event, post_id=post_id)

        serializer = EventPostSchedulePublicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        post = services.schedule_post_publication(
            post=post,
            publication_scheduled_at=serializer.validated_data["publication_scheduled_at"],
            updated_by=request.user,
            send_notification=serializer.validated_data["send_notification"],
        )
        return Response({"data": EventPostSerializer(post).data}, status=status.HTTP_200_OK)