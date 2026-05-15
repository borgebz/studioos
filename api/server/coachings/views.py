from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework import serializers
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
    TeacherConfirmCoachingSerializer,
)
from core.decorators import require_any_perm, require_perm
from core.guardian import resolve_acting_student
from core.pagination import paginated_response
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema


class CoachingCollectionView(APIView):
    """
    ``GET /api/coachings/`` — list coachings.

    ``POST /api/coachings/`` — direct coordination scheduling (timetable / scheduled coaching).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="GetAllCoachings",
        parameters=[CoachingListQuerySerializer],
        responses={200: paginated_list_schema(name="ListCoachingClasses", results_serializer=CoachingClassSerializer), **DEFAULT_ERROR_RESPONSES},
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
        data = dict(serializer.validated_data)
        on_behalf_of = data.pop("on_behalf_of", None)
        student = resolve_acting_student(request, on_behalf_of)
        coaching = services.create_coaching_request(
            requesting_user=request.user,
            student=student if on_behalf_of else None,
            **data,
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
        is_requester = (
            coaching.requested_by_id is not None
            and request.user.id == coaching.requested_by_id
        )
        is_parent_of_participant = any(
            p.student.parent_id == request.user.id
            for p in coaching.participants.all()
            if p.student.parent_id is not None
        )
        is_party = (
            request.user.id == coaching.teacher_id
            or is_requester
            or is_parent_of_participant
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
            coaching = services.get_coaching_for_update(pk=pk)

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


class ParticipantAcceptInviteSerializer(serializers.Serializer):
    on_behalf_of = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Student user ID when a parent accepts on behalf of their child.",
    )


class ParticipantAcceptInviteView(APIView):
    """POST — invited student (or parent on their behalf) confirms attendance."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ParticipantAcceptInviteSerializer,
        responses={200: CoachingParticipantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_any_perm(
        "accounts.can_participate_in_coaching",
        "coachings.add_coachingclass",
    )
    def post(self, request, coaching_id):
        ser = ParticipantAcceptInviteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        on_behalf_of = ser.validated_data.get("on_behalf_of")
        student = resolve_acting_student(request, on_behalf_of)
        participant = services.student_accept_coaching_invitation(
            coaching_class_id=coaching_id,
            user=request.user,
            student=student if on_behalf_of else None,
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
        "coachings.add_coachingclass",
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
