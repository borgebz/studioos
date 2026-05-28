from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema

from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from core.utils import optional_bool as _optional_bool

from inventory.services import size_system_services as services
from inventory.serializers.size_system_serializers import (
    CreateSizeSystemSerializer,
    SizeSystemSerializer,
    UpdateSizeSystemSerializer,
)


class SizeSystemView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CreateSizeSystemSerializer,
        responses={201: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_sizesystem")
    def post(self, request):
        serializer = CreateSizeSystemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        size_system = services.create_size_system(
            **serializer.validated_data, created_by=request.user
        )

        return Response(
            SizeSystemSerializer(size_system).data, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        responses={200: SizeSystemSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_sizesystem")
    def get(self, request):
        raw_active = request.query_params.get("is_active")
        is_active = _optional_bool(raw_active)

        # Default to active-only for users without management permission
        if is_active is None and not request.user.has_perm(
            "inventory.change_sizesystem"
        ):
            is_active = True

        size_systems = services.list_size_systems(is_active=is_active)

        return Response(SizeSystemSerializer(size_systems, many=True).data)


class SizeSystemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UpdateSizeSystemSerializer,
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def patch(self, request, size_system_id):
        size_system = services.get_size_system(pk=size_system_id)
        serializer = UpdateSizeSystemSerializer(
            data=request.data, partial=True, size_system=size_system
        )
        serializer.is_valid(raise_exception=True)

        size_system = services.update_size_system(
            size_system=size_system,
            **serializer.validated_data,
            updated_by=request.user,
        )

        return Response(SizeSystemSerializer(size_system).data)

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.delete_sizesystem")
    def delete(self, request, size_system_id):
        size_system = services.get_size_system(pk=size_system_id)

        services.delete_size_system(size_system=size_system, deleted_by=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class SizeSystemActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def post(self, request, size_system_id):
        size_system = services.get_size_system(pk=size_system_id)

        size_system = services.activate_size_system(
            size_system=size_system, updated_by=request.user
        )

        return Response(SizeSystemSerializer(size_system).data)


class SizeSystemDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def post(self, request, size_system_id):
        size_system = services.get_size_system(pk=size_system_id)

        size_system = services.deactivate_size_system(
            size_system=size_system, updated_by=request.user
        )

        return Response(SizeSystemSerializer(size_system).data)
