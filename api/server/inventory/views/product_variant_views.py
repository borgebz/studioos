from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

from inventory.services.product_variant_services import (
    list_variants,
    get_variant,
    create_variant,
    update_variant,
    delete_variant,
)

from inventory.serializers.product_variant_serializers import (
    ProductVariantSerializer,
)


class ProductVariantListCreateView(APIView):

    def get(self, request, product_id):
        try:
            variants = list_variants(product_id, request.user)
            serializer = ProductVariantSerializer(variants, many=True)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

    def post(self, request, product_id):
        try:
            variant = create_variant(product_id, request.user, **request.data)
            serializer = ProductVariantSerializer(variant)
            return Response(serializer.data, status=201)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)


class ProductVariantDetailView(APIView):

    def get(self, request, variant_id):
        try:
            variant = get_variant(variant_id, request.user)
            serializer = ProductVariantSerializer(variant)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

    def put(self, request, variant_id):
        try:
            variant = update_variant(variant_id, request.user, **request.data)
            serializer = ProductVariantSerializer(variant)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)

    def delete(self, request, variant_id):
        try:
            delete_variant(variant_id, request.user)
            return Response({"message": "Variante arquivada com sucesso"})
        except ValidationError as e:
            return Response({"error": str(e)}, status=400)