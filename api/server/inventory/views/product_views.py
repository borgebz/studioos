from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema

from inventory import services
from inventory.serializers.product_serializers import (
    ProductCreateSerializer,
    ProductDetailSerializer,
    ProductListQuerySerializer,
    ProductUpdateSerializer,
    SchoolProductCreateSerializer,
    SchoolProductUpdateSerializer,
)


def _validated_product_filters(request):
    """Parse and validate product query params via serializer."""
    q = ProductListQuerySerializer(data=request.query_params)
    q.is_valid(raise_exception=True)
    vd = q.validated_data
    return vd or None


class ProductListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[ProductListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="InventoryMemberProductList",
                results_serializer=ProductDetailSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("inventory.view_product")
    def get(self, request):
        filters = _validated_product_filters(request)
        products = services.list_products(user=request.user, filters=filters)
        return paginated_response(
            request=request,
            items=products,
            serializer_class=ProductDetailSerializer,
        )

    @extend_schema(
        request=ProductCreateSerializer,
        responses={201: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_product")
    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.create_product(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ProductDetailSerializer(product).data, status=status.HTTP_201_CREATED
        )


class ProductDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_product")
    def get(self, request, pk):
        product = services.get_product(pk=pk, user=request.user)
        return Response(ProductDetailSerializer(product).data)

    @extend_schema(
        request=ProductUpdateSerializer,
        responses={200: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_product")
    def patch(self, request, pk):
        serializer = ProductUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        product = services.update_product(
            pk=pk, user=request.user, **serializer.validated_data
        )
        return Response(ProductDetailSerializer(product).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.delete_product")
    def delete(self, request, pk):
        services.delete_product(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolProductListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[ProductListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="InventorySchoolProductList",
                results_serializer=ProductDetailSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("inventory.view_school_product")
    def get(self, request):
        filters = _validated_product_filters(request)
        products = services.list_school_products(user=request.user, filters=filters)
        return paginated_response(
            request=request,
            items=products,
            serializer_class=ProductDetailSerializer,
        )

    @extend_schema(
        request=SchoolProductCreateSerializer,
        responses={201: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_school_product")
    def post(self, request):
        serializer = SchoolProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.create_school_product(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ProductDetailSerializer(product).data, status=status.HTTP_201_CREATED
        )


class SchoolProductDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_school_product")
    def get(self, request, pk):
        product = services.get_school_product(pk=pk, user=request.user)
        return Response(ProductDetailSerializer(product).data)

    @extend_schema(
        request=SchoolProductUpdateSerializer,
        responses={200: ProductDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_school_product")
    def patch(self, request, pk):
        serializer = SchoolProductUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        product = services.update_school_product(
            pk=pk, user=request.user, **serializer.validated_data
        )
        return Response(ProductDetailSerializer(product).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.delete_school_product")
    def delete(self, request, pk):
        services.delete_school_product(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
