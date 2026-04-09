from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from coachings import services
from coachings.models import CoachingStatus
from coachings.serializers import (
    AddParticipantSerializer,
    CoachingApproveSerializer,
    CoachingCancelSerializer,
    CoachingClassSerializer,
    CoachingDirectScheduleSerializer,
    CoachingListQuerySerializer,
    CoachingParticipantSerializer,
    CoachingRejectSerializer,
    CoachingRequestSerializer,
    TeacherAvailabilityQuerySerializer,
    TeacherAvailabilitySerializer,
    TeacherAvailabilitySubmitSerializer,
    TeacherAvailabilityUpdateSerializer,
)
from core.decorators import require_any_perm, require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES


def _ensure_availability_calendar_access(request, user_id):
    if request.user.id == user_id:
        return
    if not request.user.has_perm(
        "coachings.can_manage_teacher_availability_for_others"
    ):
        raise PermissionDenied()


class TeacherAvailabilityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[TeacherAvailabilityQuerySerializer],
        responses={
            200: TeacherAvailabilitySerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("coachings.view_teacheravailability")
    def get(self, request, user_id):
        _ensure_availability_calendar_access(request, user_id)
        q = TeacherAvailabilityQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        blocks = services.list_teacher_availability(
            teacher_id=user_id,
            **q.validated_data,
        )
        return Response(TeacherAvailabilitySerializer(blocks, many=True).data)

    @extend_schema(
        request=TeacherAvailabilitySubmitSerializer,
        responses={201: TeacherAvailabilitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.add_teacheravailability")
    def post(self, request, user_id):
        _ensure_availability_calendar_access(request, user_id)
        serializer = TeacherAvailabilitySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = services.create_teacher_availability(
            teacher_id=user_id,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(
            TeacherAvailabilitySerializer(block).data,
            status=status.HTTP_201_CREATED,
        )


class TeacherAvailabilityDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeacherAvailabilityUpdateSerializer,
        responses={200: TeacherAvailabilitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_teacheravailability")
    def patch(self, request, user_id, pk):
        _ensure_availability_calendar_access(request, user_id)
        serializer = TeacherAvailabilityUpdateSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        block = services.update_teacher_availability(
            teacher_id=user_id,
            pk=pk,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(TeacherAvailabilitySerializer(block).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("coachings.delete_teacheravailability")
    def delete(self, request, user_id, pk):
        _ensure_availability_calendar_access(request, user_id)
        services.delete_teacher_availability(
            teacher_id=user_id,
            pk=pk,
            requesting_user=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CoachingScheduledCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CoachingDirectScheduleSerializer,
        responses={201: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.add_coachingclass")
    def post(self, request):
        serializer = CoachingDirectScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coaching = services.create_scheduled_coaching(
            requesting_user=request.user,
            **serializer.validated_data,
        )
        coaching = services.get_coaching(pk=coaching.pk)
        return Response(
            CoachingClassSerializer(coaching).data, status=status.HTTP_201_CREATED
        )


class CoachingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[CoachingListQuerySerializer],
        responses={200: CoachingClassSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.view_coachingclass")
    def get(self, request):
        q = CoachingListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        coachings = services.list_coachings(**q.validated_data)
        return Response(CoachingClassSerializer(coachings, many=True).data)

    @extend_schema(
        request=CoachingRequestSerializer,
        responses={201: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.add_coachingclass")
    def post(self, request):
        serializer = CoachingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coaching = services.create_coaching_request(
            requesting_user=request.user,
            **serializer.validated_data,
        )
        coaching = services.get_coaching(pk=coaching.pk)
        return Response(
            CoachingClassSerializer(coaching).data, status=status.HTTP_201_CREATED
        )


class CoachingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("coachings.view_coachingclass")
    def get(self, request, pk):
        coaching = services.get_coaching(pk=pk)
        return Response(CoachingClassSerializer(coaching).data)


class CoachingAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.can_accept_coaching_as_teacher")
    def post(self, request, pk):
        coaching = services.teacher_accept_coaching(pk=pk, user=request.user)
        return Response(CoachingClassSerializer(coaching).data)


class CoachingRejectView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CoachingRejectSerializer,
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_any_perm(
        "coachings.change_coachingclass",
        "coachings.can_reject_coaching_as_teacher",
    )
    def post(self, request, pk):
        coaching = services.get_coaching(pk=pk)
        serializer = CoachingRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("rejection_reason", "")

        if coaching.status == CoachingStatus.REQUESTED:
            if (
                coaching.teacher_id == request.user.id
                and request.user.has_perm("coachings.can_reject_coaching_as_teacher")
            ):
                coaching = services.teacher_reject_coaching(
                    coaching=coaching,
                    user=request.user,
                    rejection_reason=reason,
                )
            elif request.user.has_perm("coachings.change_coachingclass"):
                coaching = services.reject_coaching_coordination(
                    coaching=coaching,
                    user=request.user,
                    rejection_reason=reason,
                )
            else:
                raise PermissionDenied()
        elif coaching.status == CoachingStatus.PENDING_APPROVAL:
            if not request.user.has_perm("coachings.change_coachingclass"):
                raise PermissionDenied()
            coaching = services.reject_coaching_coordination(
                coaching=coaching,
                user=request.user,
                rejection_reason=reason,
            )
        else:
            raise ValidationError({"messages": ["InvalidStatusTransition"]})

        return Response(CoachingClassSerializer(coaching).data)


class CoachingApproveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CoachingApproveSerializer,
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_coachingclass")
    def post(self, request, pk):
        serializer = CoachingApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coaching = services.approve_coaching(
            pk=pk,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(CoachingClassSerializer(coaching).data)


class CoachingCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_coachingclass")
    def post(self, request, pk):
        coaching = services.complete_coaching(pk=pk, user=request.user)
        return Response(CoachingClassSerializer(coaching).data)


class CoachingCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CoachingCancelSerializer,
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_coachingclass")
    def post(self, request, pk):
        serializer = CoachingCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coaching = services.cancel_coaching(
            pk=pk,
            user=request.user,
            cancellation_reason=serializer.validated_data.get(
                "cancellation_reason", ""
            ),
        )
        return Response(CoachingClassSerializer(coaching).data)


class ParticipantListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: CoachingParticipantSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    @require_perm("coachings.view_coachingparticipant")
    def get(self, request, coaching_id):
        participants = services.list_participants(coaching_class_id=coaching_id)
        return Response(CoachingParticipantSerializer(participants, many=True).data)

    @extend_schema(
        request=AddParticipantSerializer,
        responses={201: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.add_coachingparticipant")
    def post(self, request, coaching_id):
        serializer = AddParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = services.add_participant(
            coaching_class_id=coaching_id,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(
            CoachingParticipantSerializer(participant).data,
            status=status.HTTP_201_CREATED,
        )


class ParticipantDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("coachings.delete_coachingparticipant")
    def delete(self, request, coaching_id, pk):
        services.remove_participant(
            coaching_class_id=coaching_id,
            pk=pk,
            requesting_user=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
