from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
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


# Base View
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

        category = services.create_category(**serializer.validated_data)

        return Response(CategorySerializer(category).data, status=201)

    @extend_schema(
        responses={200: CategorySerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_category")
    def get(self, request):
        categories = services.list_categories(
            parent_category_id=request.query_params.get("parent_category_id"),
            is_active=request.query_params.get("is_active"),
            size_system_id=request.query_params.get("size_system_id"),
        )

        return Response(CategorySerializer(categories, many=True).data)


# Detail View
class CategoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @require_perm("inventory.change_category")
    def put(self, request, categoryId):
        serializer = UpdateCategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        category = services.get_category(pk=categoryId)

        category = services.update_category(
            category=category, **serializer.validated_data
        )

        return Response(CategorySerializer(category).data)

    @require_perm("inventory.delete_category")
    def delete(self, request, categoryId):
        category = services.get_category(pk=categoryId)

        services.delete_category(category=category)

        return Response(status=204)


# Activate/Deactivate View
class CategoryActivateView(APIView):
    permission_classes = [IsAuthenticated]

    @require_perm("inventory.change_category")
    def post(self, request, categoryId):
        category = services.get_category(pk=categoryId)
        category = services.activate_category(category=category)

        return Response(CategorySerializer(category).data)


class CategoryDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    @require_perm("inventory.change_category")
    def post(self, request, categoryId):
        category = services.get_category(pk=categoryId)
        category = services.deactivate_category(category=category)

        return Response(CategorySerializer(category).data)
