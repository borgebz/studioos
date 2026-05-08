from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from core.utils import optional_bool as _optional_bool

from inventory.serializers.color_serializers import (
    ColorSerializer,
    CreateColorSerializer,
)
from inventory.services import color_services as services


class ColorListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ColorSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_color")
    def get(self, request):
        raw = request.query_params.get("is_active")
        is_active = _optional_bool(raw)
        colors = services.list_colors(is_active=is_active)
        return Response(ColorSerializer(colors, many=True).data)

    @extend_schema(
        request=CreateColorSerializer,
        responses={201: ColorSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_color")
    def post(self, request):
        serializer = CreateColorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        color = services.create_color(
            **serializer.validated_data, created_by=request.user
        )
        return Response(ColorSerializer(color).data, status=status.HTTP_201_CREATED)


class ColorDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ColorSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_color")
    def get(self, request, color_id):
        color = services.get_color(pk=color_id)
        return Response(ColorSerializer(color).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.delete_color")
    def delete(self, request, color_id):
        color = services.get_color(pk=color_id)
        services.delete_color(color=color, deleted_by=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ColorActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ColorSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.change_color")
    def post(self, request, color_id):
        color = services.get_color(pk=color_id)
        color = services.activate_color(color=color, updated_by=request.user)
        return Response(ColorSerializer(color).data)


class ColorDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ColorSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.change_color")
    def post(self, request, color_id):
        color = services.get_color(pk=color_id)
        color = services.deactivate_color(color=color, updated_by=request.user)
        return Response(ColorSerializer(color).data)
