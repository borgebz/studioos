from django.db import transaction
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
    DirectCoordinationCoachingCreateSerializer,
    ConfirmParticipantAttendanceSerializer,
    CoachingListQuerySerializer,
    CoachingParticipantSerializer,
    ParticipantCancelSerializer,
    CoachingRejectSerializer,
    CoachingRequestSerializer,
    CoachingUpdateSerializer,
    RecurringSeriesCancelSerializer,
    TeacherAvailabilityQuerySerializer,
    TeacherAvailabilitySerializer,
    TeacherAvailabilitySubmitSerializer,
    TeacherAvailabilityUpdateSerializer,
    TeacherConfirmCoachingSerializer,
)
from core.decorators import require_any_perm, require_perm
from core.pagination import paginated_response
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


class CoachingCollectionView(APIView):
    """
    ``GET /api/coachings/`` — list coachings.

    ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
    """

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
        return paginated_response(
            request=request,
            items=coachings,
            serializer_class=CoachingClassSerializer,
        )

    @extend_schema(
        request=DirectCoordinationCoachingCreateSerializer,
        responses={201: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.can_schedule_coaching")
    def post(self, request):
        serializer = DirectCoordinationCoachingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        recurring_data = data.pop("recurring_coaching", None)
        coaching = services.create_direct_coordination_coaching(
            requesting_user=request.user,
            recurring_data=recurring_data,
            **data,
        )
        coaching = services.get_coaching(pk=coaching.pk)
        return Response(
            CoachingClassSerializer(coaching).data, status=status.HTTP_201_CREATED
        )


class CoachingRequestCreateView(APIView):
    """
    ``POST /api/coachings/request/`` — student/parent (and similar) coaching requests.
    """

    permission_classes = [IsAuthenticated]

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

    @extend_schema(
        request=CoachingUpdateSerializer,
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_any_perm(
        "coachings.change_coachingclass",
        "coachings.view_coachingclass",
    )
    def patch(self, request, pk):
        coaching = services.get_coaching(pk=pk)
        can_change_all = request.user.has_perm("coachings.change_coachingclass")
        is_party = request.user.id == coaching.teacher_id or (
            coaching.requested_by_id is not None
            and request.user.id == coaching.requested_by_id
        )
        if not can_change_all and not (
            is_party and request.user.has_perm("coachings.view_coachingclass")
        ):
            raise PermissionDenied()

        serializer = CoachingUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        coaching = services.update_coaching(
            pk=pk,
            requesting_user=request.user,
            allow_teacher_change=can_change_all,
            updates=serializer.validated_data,
        )
        return Response(CoachingClassSerializer(coaching).data)


class CoachingAcceptView(APIView):
    """POST — teacher accepts the request (coaching status only; participants unchanged)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.can_accept_coaching_as_teacher")
    def post(self, request, pk):
        coaching = services.teacher_accept_coaching(pk=pk, user=request.user)
        return Response(CoachingClassSerializer(coaching).data)


class CoachingTeacherConfirmView(APIView):
    """POST — assigned teacher confirms the session took place (waiting_confirmation)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=TeacherConfirmCoachingSerializer,
        responses={200: CoachingClassSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.can_accept_coaching_as_teacher")
    def post(self, request, pk):
        serializer = TeacherConfirmCoachingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coaching = services.teacher_confirm_coaching(
            pk=pk,
            user=request.user,
            teacher_notes=serializer.validated_data.get("teacher_notes", ""),
        )
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
        serializer = CoachingRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get("rejection_reason", "")

        with transaction.atomic():
            from coachings.models import CoachingClass
            from core.exceptions import AppNotFound

            try:
                coaching = (
                    CoachingClass.objects.select_for_update(of=("self",))
                    .select_related("teacher", "modality", "studio", "requested_by")
                    .get(pk=pk)
                )
            except CoachingClass.DoesNotExist:
                raise AppNotFound("CoachingNotFound")

            if coaching.status == CoachingStatus.REQUESTED:
                if coaching.teacher_id == request.user.id and request.user.has_perm(
                    "coachings.can_reject_coaching_as_teacher"
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

        coaching = services.get_coaching(pk=pk)
        return Response(CoachingClassSerializer(coaching).data)


class CoachingApproveView(APIView):
    """POST — coordination schedules the coaching; activates ``pending`` roster rows only."""

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


class ParticipantAcceptInviteView(APIView):
    """POST — invited student confirms attendance (staff invite → active; non-staff invite → pending)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("accounts.can_participate_in_coaching")
    def post(self, request, coaching_id):
        participant = services.student_accept_coaching_invitation(
            coaching_class_id=coaching_id,
            user=request.user,
        )
        return Response(CoachingParticipantSerializer(participant).data)


class ParticipantConfirmAttendanceView(APIView):
    """POST — student or parent confirms ATTENDED / ABSENT after session end."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ConfirmParticipantAttendanceSerializer,
        responses={200: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_any_perm(
        "accounts.can_participate_in_coaching",
        "coachings.can_confirm_dependent_coaching_attendance",
    )
    def post(self, request, coaching_id, pk):
        serializer = ConfirmParticipantAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = services.confirm_participant_attendance(
            coaching_class_id=coaching_id,
            participant_pk=pk,
            user=request.user,
            attended=serializer.validated_data["attended"],
        )
        return Response(CoachingParticipantSerializer(participant).data)


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


class ParticipantStaffApproveView(APIView):
    """POST — coordination approves a peer-invited pending participant (scheduled coachings)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_coachingparticipant")
    def post(self, request, coaching_id, pk):
        participant = services.staff_approve_pending_participant(
            coaching_class_id=coaching_id,
            participant_pk=pk,
            approving_user=request.user,
        )
        return Response(CoachingParticipantSerializer(participant).data)


class ParticipantCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ParticipantCancelSerializer,
        responses={200: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_any_perm(
        "coachings.change_coachingparticipant",
        "accounts.can_participate_in_coaching",
    )
    def post(self, request, coaching_id, pk):
        can_manage = request.user.has_perm("coachings.change_coachingparticipant")
        serializer = ParticipantCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        participant = services.cancel_coaching_participant(
            coaching_class_id=coaching_id,
            participant_pk=pk,
            requesting_user=request.user,
            cancellation_reason=serializer.validated_data.get(
                "cancellation_reason", ""
            ),
            may_cancel_on_behalf_of_others=can_manage,
        )
        return Response(CoachingParticipantSerializer(participant).data)


class RecurringSeriesCancelView(APIView):
    """POST — cancel all (future) sessions in a recurring series."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=RecurringSeriesCancelSerializer,
        responses={200: CoachingClassSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("coachings.change_coachingclass")
    def post(self, request, recurring_id):
        serializer = RecurringSeriesCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cancelled_ids = services.cancel_recurring_series(
            recurring_coaching_id=recurring_id,
            user=request.user,
            cancellation_reason=serializer.validated_data.get("cancellation_reason", ""),
            cancel_past=serializer.validated_data.get("cancel_past", False),
        )
        coachings = services.list_coachings(recurring_coaching_id=recurring_id)
        return Response(CoachingClassSerializer(coachings, many=True).data)
