from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema

from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

from inventory.services import category_services as services
from inventory.serializers.category_serializers import (
    CreateCategorySerializer,
    UpdateCategorySerializer,
    CategorySerializer,
)


def _optional_bool(raw):
    if raw is None:
        return None
    if isinstance(raw, bool):
        return raw
    s = str(raw).strip().lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None


class CategoryView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CreateCategorySerializer,
        responses={201: CategorySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_category")
    def post(self, request):
        serializer = CreateCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category = services.create_category(
            **serializer.validated_data, created_by=request.user
        )

        return Response(CategorySerializer(category).data, status=201)

    @extend_schema(
        responses={200: CategorySerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_category")
    def get(self, request):
        raw_active = request.query_params.get("is_active")
        categories = services.list_categories(
            parent_category_id=request.query_params.get("parent_category_id"),
            is_active=_optional_bool(raw_active),
            size_system_id=request.query_params.get("size_system_id"),
        )

        return Response(CategorySerializer(categories, many=True).data)


class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=UpdateCategorySerializer,
        responses={200: CategorySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_category")
    def patch(self, request, category_id):
        serializer = UpdateCategorySerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        category = services.get_category(pk=category_id)

        category = services.update_category(
            category=category, **serializer.validated_data, updated_by=request.user
        )

        return Response(CategorySerializer(category).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.delete_category")
    def delete(self, request, category_id):
        category = services.get_category(pk=category_id)

        services.delete_category(category=category, deleted_by=request.user)

        return Response(status=204)


class CategoryActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CategorySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_category")
    def post(self, request, category_id):
        category = services.get_category(pk=category_id)
        category = services.activate_category(category=category, updated_by=request.user)

        return Response(CategorySerializer(category).data)


class CategoryDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CategorySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_category")
    def post(self, request, category_id):
        category = services.get_category(pk=category_id)
        category = services.deactivate_category(category=category, updated_by=request.user)

        return Response(CategorySerializer(category).data)
