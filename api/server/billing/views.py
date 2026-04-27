from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from billing import services
from billing.serializers import (
    BillingEntryCancelSerializer,
    BillingEntryDetailSerializer,
    BillingEntryListQuerySerializer,
    BillingEntryListSerializer,
    FineApproveSerializer,
    FineDetailSerializer,
    FineListQuerySerializer,
    FineListSerializer,
    FineWaiveSerializer,
)
from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

# -----------------------------------------------------------------------------
# Billing entries
# -----------------------------------------------------------------------------


class BillingEntryListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[BillingEntryListQuerySerializer],
        responses={
            200: BillingEntryListSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.view_billingentry")
    def get(self, request):
        q = BillingEntryListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        vd = q.validated_data
        rows = services.list_billing_entries(
            requesting_user=request.user,
            student_id=vd.get("student_id"),
            coaching_class_id=vd.get("coaching_class_id"),
            status=vd.get("status"),
            source_type=vd.get("source_type"),
            date_from=vd.get("date_from"),
            date_to=vd.get("date_to"),
        )
        return Response(BillingEntryListSerializer(rows, many=True).data)


class BillingEntryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: BillingEntryDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.view_billingentry")
    def get(self, request, pk):
        entry = services.get_billing_entry_for_request(
            pk=pk,
            requesting_user=request.user,
        )
        return Response(BillingEntryDetailSerializer(entry).data)


class BillingEntryCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=BillingEntryCancelSerializer,
        responses={
            200: BillingEntryDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.can_cancel_billingentry")
    def post(self, request, pk):
        entry = services.get_billing_entry_for_request(
            pk=pk,
            requesting_user=request.user,
        )
        serializer = BillingEntryCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = services.cancel_billing_entry(
            entry=entry,
            notes=serializer.validated_data["notes"],
            updated_by=request.user,
        )
        entry = services.get_billing_entry_for_request(
            pk=entry.pk,
            requesting_user=request.user,
        )
        return Response(
            BillingEntryDetailSerializer(entry).data, status=status.HTTP_200_OK
        )


# -----------------------------------------------------------------------------
# Fines
# -----------------------------------------------------------------------------


class FineListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[FineListQuerySerializer],
        responses={
            200: FineListSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.view_fine")
    def get(self, request):
        q = FineListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        vd = q.validated_data
        rows = services.list_fines(
            requesting_user=request.user,
            student_id=vd.get("student_id"),
            coaching_class_id=vd.get("coaching_class_id"),
            status=vd.get("status"),
            reason=vd.get("reason"),
        )
        return Response(FineListSerializer(rows, many=True).data)


class FineDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: FineDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.view_fine")
    def get(self, request, pk):
        fine = services.get_fine_for_request(
            pk=pk,
            requesting_user=request.user,
        )
        return Response(FineDetailSerializer(fine).data)


class FineApproveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=FineApproveSerializer,
        responses={
            200: FineDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.can_review_fine")
    def post(self, request, pk):
        fine = services.get_fine_for_request(
            pk=pk,
            requesting_user=request.user,
        )
        serializer = FineApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fine = services.approve_fine(
            fine=fine,
            amount=serializer.validated_data.get("amount"),
            notes=serializer.validated_data.get("notes", ""),
            reviewed_by=request.user,
        )
        fine = services.get_fine_for_request(
            pk=fine.pk,
            requesting_user=request.user,
        )
        return Response(FineDetailSerializer(fine).data, status=status.HTTP_200_OK)


class FineWaiveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=FineWaiveSerializer,
        responses={
            200: FineDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("billing.can_review_fine")
    def post(self, request, pk):
        fine = services.get_fine_for_request(
            pk=pk,
            requesting_user=request.user,
        )
        serializer = FineWaiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fine = services.waive_fine(
            fine=fine,
            notes=serializer.validated_data["notes"],
            reviewed_by=request.user,
        )
        fine = services.get_fine_for_request(
            pk=fine.pk,
            requesting_user=request.user,
        )
        return Response(FineDetailSerializer(fine).data, status=status.HTTP_200_OK)
