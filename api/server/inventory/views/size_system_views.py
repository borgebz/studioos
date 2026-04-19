from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema

from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

from inventory.services import size_system_services as services
from inventory.serializers.size_system_serializers import (
    CreateSizeSystemSerializer,
    SizeSystemSerializer,
    UpdateSizeSystemSerializer,
)


# SizeSystem View (Create + List)
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
        size_systems = services.list_size_systems()

        return Response(SizeSystemSerializer(size_systems, many=True).data)


# SizeSystem Detail (Update + Delete)
class SizeSystemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UpdateSizeSystemSerializer,
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def put(self, request, sizeSystemId):
        serializer = UpdateSizeSystemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        size_system = services.get_size_system(pk=sizeSystemId)

        size_system = services.update_size_system(
            size_system=size_system,
            **serializer.validated_data,
            updated_by=request.user
        )

        return Response(SizeSystemSerializer(size_system).data)

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.delete_sizesystem")
    def delete(self, request, sizeSystemId):
        size_system = services.get_size_system(pk=sizeSystemId)

        services.delete_size_system(size_system=size_system, deleted_by=request.user)

        return Response(status=status.HTTP_204_NO_CONTENT)


# Activate SizeSystem
class SizeSystemActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def post(self, request, sizeSystemId):
        size_system = services.get_size_system(pk=sizeSystemId)

        size_system = services.activate_size_system(
            size_system=size_system, updated_by=request.user
        )

        return Response(SizeSystemSerializer(size_system).data)


# Deactivate SizeSystem
class SizeSystemDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: SizeSystemSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_sizesystem")
    def post(self, request, sizeSystemId):
        size_system = services.get_size_system(pk=sizeSystemId)

        size_system = services.deactivate_size_system(
            size_system=size_system, updated_by=request.user
        )

        return Response(SizeSystemSerializer(size_system).data)
