from rest_framework.views import APIView
from rest_framework.response import Response
from core.permissions import require_perm
from inventory import services

from inventory.serializers.product_serializers import (
    ProductCreateSerializer,
    ProductUpdateSerializer,
    ProductDetailSerializer,
)


# ===============================
# MEMBER
# ===============================

class ProductListCreateView(APIView):

    @require_perm("inventory.view_product")
    def get(self, request):
        products = services.list_products(user=request.user)
        serializer = ProductDetailSerializer(products, many=True)
        return Response(serializer.data)

    @require_perm("inventory.add_product")
    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.create_product(
            user=request.user,
            **serializer.validated_data
        )

        return Response(
            ProductDetailSerializer(product).data,
            status=201
        )


class ProductDetailView(APIView):

    @require_perm("inventory.view_product")
    def get(self, request, pk):
        product = services.get_product(pk=pk, user=request.user)
        return Response(ProductDetailSerializer(product).data)

    @require_perm("inventory.change_product")
    def put(self, request, pk):
        serializer = ProductUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.update_product(
            pk=pk,
            user=request.user,
            **serializer.validated_data
        )

        return Response(ProductDetailSerializer(product).data)

    @require_perm("inventory.delete_product")
    def delete(self, request, pk):
        services.delete_product(pk=pk, user=request.user)
        return Response(
            {"messages": ["ProductDeletedSuccessfully"]},
            status=200
        )


# ===============================
# SCHOOL
# ===============================

class SchoolProductListCreateView(APIView):

    @require_perm("inventory.view_school_product")
    def get(self, request):
        products = services.list_school_products(user=request.user)
        return Response(products)

    @require_perm("inventory.add_school_product")
    def post(self, request):
        serializer = ProductCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.create_school_product(
            user=request.user,
            **serializer.validated_data
        )

        return Response(
            ProductDetailSerializer(product).data,
            status=201
        )


class SchoolProductDetailView(APIView):

    @require_perm("inventory.view_school_product")
    def get(self, request, pk):
        product = services.get_school_product(pk=pk, user=request.user)
        return Response(ProductDetailSerializer(product).data)

    @require_perm("inventory.change_school_product")
    def put(self, request, pk):
        serializer = ProductUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = services.update_school_product(
            pk=pk,
            user=request.user,
            **serializer.validated_data
        )

        return Response(ProductDetailSerializer(product).data)

    @require_perm("inventory.delete_school_product")
    def delete(self, request, pk):
        services.delete_school_product(pk=pk, user=request.user)
        return Response(
            {"messages": ["ProductDeletedSuccessfully"]},
            status=200
        )