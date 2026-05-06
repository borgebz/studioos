from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema
from inventory.serializers.product_variant_serializers import ProductVariantSerializer
from inventory.services.product_variant_services import (
    create_variant,
    delete_variant,
    get_variant,
    list_variants,
    update_variant,
)


class ProductVariantListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="InventoryProductVariantList",
                results_serializer=ProductVariantSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("inventory.view_product")
    def get(self, request, product_id):
        variants = list_variants(product_id=product_id, user=request.user)
        return paginated_response(
            request=request,
            items=variants,
            serializer_class=ProductVariantSerializer,
        )

    @extend_schema(
        request=ProductVariantSerializer,
        responses={201: ProductVariantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.add_product")
    def post(self, request, product_id):
        serializer = ProductVariantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = create_variant(
            product_id=product_id,
            user=request.user,
            **serializer.validated_data,
        )
        variant = get_variant(variant_id=variant.id, user=request.user)
        return Response(
            ProductVariantSerializer(variant).data,
            status=status.HTTP_201_CREATED,
        )


class ProductVariantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ProductVariantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_product")
    def get(self, request, variant_id):
        variant = get_variant(variant_id=variant_id, user=request.user)
        return Response(ProductVariantSerializer(variant).data)

    @extend_schema(
        request=ProductVariantSerializer,
        responses={200: ProductVariantSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.change_product")
    def patch(self, request, variant_id):
        serializer = ProductVariantSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        variant = update_variant(
            variant_id=variant_id,
            user=request.user,
            **serializer.validated_data,
        )
        variant = get_variant(variant_id=variant.id, user=request.user)
        return Response(ProductVariantSerializer(variant).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.delete_productvariant")
    def delete(self, request, variant_id):
        delete_variant(variant_id=variant_id, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
