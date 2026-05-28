from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema

from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from core.utils import optional_bool as _optional_bool

from inventory.services import size_services as services
from inventory.serializers.size_serializers import (
    CreateSizeSerializer,
    SizeSerializer,
)


class SizeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CreateSizeSerializer,
        responses={201: SizeSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_size")
    def post(self, request):
        serializer = CreateSizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        size = services.create_size(
            **serializer.validated_data, created_by=request.user
        )

        return Response(SizeSerializer(size).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: SizeSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_size")
    def get(self, request):
        raw_system_id = request.query_params.get("size_system_id")
        try:
            size_system_id = int(raw_system_id) if raw_system_id else None
        except (ValueError, TypeError):
            return Response(
                {"size_system_id": ["Must be a valid integer."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_active = request.query_params.get("is_active")
        is_active = _optional_bool(raw_active)

        # Default to active-only for users without management permission
        if is_active is None and not request.user.has_perm("inventory.change_size"):
            is_active = True

        sizes = services.list_sizes(size_system_id=size_system_id, is_active=is_active)

        return Response(SizeSerializer(sizes, many=True).data)


class SizeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_size")
    def get(self, request, size_id):
        size = services.get_size(pk=size_id)
        return Response(SizeSerializer(size).data)

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.delete_size")
    def delete(self, request, size_id):
        size = services.get_size(pk=size_id)

        services.delete_size(size=size, deleted_by=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


class SizeActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_size")
    def post(self, request, size_id):
        size = services.get_size(pk=size_id)

        size = services.activate_size(size=size, updated_by=request.user)

        return Response(SizeSerializer(size).data)


class SizeDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_size")
    def post(self, request, size_id):
        size = services.get_size(pk=size_id)

        size = services.deactivate_size(size=size, updated_by=request.user)

        return Response(SizeSerializer(size).data)
