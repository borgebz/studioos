from django.shortcuts import render
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from billing import services
from billing.serializers import (
    CoachingBillingEntrySerializer,
    FineSerializer,
    FineCreateSerializer,
    FineUpdateSerializer
)
from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

class CoachingBillingListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: CoachingBillingEntrySerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("billing.view_coachingbillingentry")
    def get(self, request):
        bills = services.list_coaching_bills()
        return Response(CoachingBillingEntrySerializer(bills, many=True).data)

class FineListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: FineSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("billing.view_fine")
    def get(self, request):
        fines = services.list_fines()
        return Response(FineSerializer(fines, many=True).data)

    @extend_schema(
        request=FineCreateSerializer,
        responses={201: FineSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("billing.add_fine")
    def post(self, request):
        serializer = FineCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fine = services.create_fine(created_by=request.user, **serializer.validated_data)
        # Re-fetch for relations
        fine = services.get_fine(pk=fine.pk)
        return Response(FineSerializer(fine).data, status=status.HTTP_201_CREATED)

class FineDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: FineSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("billing.view_fine")
    def get(self, request, pk):
        fine = services.get_fine(pk=pk)
        return Response(FineSerializer(fine).data)

    @extend_schema(
        request=FineUpdateSerializer,
        responses={200: FineSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("billing.change_fine")
    def patch(self, request, pk):
        fine = services.get_fine(pk=pk)
        serializer = FineUpdateSerializer(fine, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        fine = services.update_fine(fine=fine, updated_by=request.user, **serializer.validated_data)
        return Response(FineSerializer(fine).data)
