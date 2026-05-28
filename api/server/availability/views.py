from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from availability import services
from availability.serializers import (
    AvailabilityQuerySerializer,
    AvailabilitySerializer,
    AvailabilitySubmitSerializer,
    AvailabilityUpdateSerializer,
    ExpandedSlotSerializer,
)
from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES


def _ensure_availability_calendar_access(request, user_id):
    if request.user.id == user_id:
        return
    if not request.user.has_perm(
        "availability.can_manage_teacher_availability_for_others"
    ):
        raise PermissionDenied()


class AvailabilityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[AvailabilityQuerySerializer],
        responses={
            200: ExpandedSlotSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("availability.view_teacheravailability")
    def get(self, request, user_id):
        _ensure_availability_calendar_access(request, user_id)
        q = AvailabilityQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        slots = services.list_availability(
            teacher_id=user_id,
            **q.validated_data,
        )
        return Response(ExpandedSlotSerializer(slots, many=True).data)

    @extend_schema(
        request=AvailabilitySubmitSerializer,
        responses={201: AvailabilitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("availability.add_teacheravailability")
    def post(self, request, user_id):
        _ensure_availability_calendar_access(request, user_id)
        serializer = AvailabilitySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = services.create_availability(
            teacher_id=user_id,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(
            AvailabilitySerializer(block).data,
            status=status.HTTP_201_CREATED,
        )


class AvailabilityDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: AvailabilitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("availability.view_teacheravailability")
    def get(self, request, user_id, pk):
        _ensure_availability_calendar_access(request, user_id)
        block = services.get_availability(teacher_id=user_id, pk=pk)
        return Response(AvailabilitySerializer(block).data)

    @extend_schema(
        request=AvailabilityUpdateSerializer,
        responses={200: AvailabilitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("availability.change_teacheravailability")
    def patch(self, request, user_id, pk):
        _ensure_availability_calendar_access(request, user_id)
        serializer = AvailabilityUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        block = services.update_availability(
            teacher_id=user_id,
            pk=pk,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(AvailabilitySerializer(block).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("availability.delete_teacheravailability")
    def delete(self, request, user_id, pk):
        _ensure_availability_calendar_access(request, user_id)
        services.delete_availability(
            teacher_id=user_id,
            pk=pk,
            requesting_user=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
