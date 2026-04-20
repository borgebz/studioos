import json
import logging

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from drf_spectacular.utils import extend_schema
from enrollments import services
from enrollments.serializers import (
    EnrollmentListQuerySerializer,
    EnrollmentPaymentCreateSerializer,
    EnrollmentPaymentReadSerializer,
    EnrollmentPeriodSerializer,
    EnrollmentReadSerializer,
    EnrollmentSubmitSerializer,
    EnrollmentUpdateSerializer,
    FileUploadSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enrollment Period
# ---------------------------------------------------------------------------


class EnrollmentPeriodListView(APIView):
    """
    GET /api/enrollments/periods/
    Public — no authentication required.
    Used by the enrollment form to display the open period and its fees.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        responses={
            200: EnrollmentPeriodSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request):
        periods = services.list_periods()
        return Response(EnrollmentPeriodSerializer(periods, many=True).data)


class EnrollmentPeriodCreateView(APIView):
    """
    POST /api/enrollments/periods/create/
    Direction only. Creates a new enrollment period.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=EnrollmentPeriodSerializer,
        responses={
            201: EnrollmentPeriodSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_manage_periods")
    def post(self, request):
        serializer = EnrollmentPeriodSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        period = services.create_period(
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            EnrollmentPeriodSerializer(period).data,
            status=status.HTTP_201_CREATED,
        )


class EnrollmentPeriodDetailView(APIView):
    """
    GET   /api/enrollments/periods/<pk>/ — public, no auth required
    PATCH /api/enrollments/periods/<pk>/ — direction only
    """

    def get_permissions(self):
        # get_permissions() is used here because GET and PATCH share the same URL+pk
        # and cannot be split into separate view classes. This is the only accepted
        # use of method-based permission dispatch in this codebase.
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    @extend_schema(
        responses={
            200: EnrollmentPeriodSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request, pk):
        period = services.get_period(pk=pk)
        return Response(EnrollmentPeriodSerializer(period).data)

    @extend_schema(
        request=EnrollmentPeriodSerializer,
        responses={
            200: EnrollmentPeriodSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_manage_periods")
    def patch(self, request, pk):
        period = services.get_period(pk=pk)
        serializer = EnrollmentPeriodSerializer(
            period,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        period = services.update_period(
            period=period,
            updated_by=request.user,
            **serializer.validated_data,
        )
        return Response(EnrollmentPeriodSerializer(period).data)


class EnrollmentPeriodOpenView(APIView):
    """POST /api/enrollments/periods/<pk>/open/  — open a enrollment period window"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: EnrollmentPeriodSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_manage_periods")
    def post(self, request, pk):
        period = services.get_period(pk=pk)
        period = services.open_period(period=period, updated_by=request.user)
        return Response(EnrollmentPeriodSerializer(period).data)


class EnrollmentPeriodCloseView(APIView):
    """POST /api/enrollments/periods/<pk>/close/ — close a period"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: EnrollmentPeriodSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_manage_periods")
    def post(self, request, pk):
        period = services.get_period(pk=pk)
        period = services.close_period(period=period, updated_by=request.user)
        return Response(EnrollmentPeriodSerializer(period).data)


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------


class EnrollmentSubmitView(APIView):
    """
    POST /api/enrollments/ — submit a new enrollment (public)

    Accepts multipart/form-data with either:
    - `data`: JSON string containing enrollment fields, modality_ids, and consents; or
    - flat form fields (same keys as the submit serializer), including optional
      `consent_rgpd` and `consent_internal_regulation` booleans instead of a
      `consents` JSON array when not using the `data` field.
    Plus one or more file uploads (e.g. payment proof) as usual.

    Also accepts pure application/json (without files).
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        request=EnrollmentSubmitSerializer,
        responses={
            201: EnrollmentReadSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request):
        # --- Parse enrollment data ---
        # If multipart: enrollment data comes as a JSON string in the "data" field
        # If JSON: enrollment data comes directly in request.data
        if "data" in request.data and isinstance(request.data["data"], str):
            try:
                enrollment_payload = json.loads(request.data["data"])
            except json.JSONDecodeError:
                raise ValidationError({"messages": ["InvalidJsonInDataField"]})

        else:
            enrollment_payload = request.data

        serializer = EnrollmentSubmitSerializer(data=enrollment_payload)
        serializer.is_valid(raise_exception=True)

        # --- Handle files (multipart) ---
        uploaded_files = None
        if request.FILES:
            files_data = []
            for key, file_obj in request.FILES.items():
                file_serializer = FileUploadSerializer(
                    data={
                        "file": file_obj,
                        "original_filename": file_obj.name,
                        "mime_type": file_obj.content_type or "",
                    }
                )
                file_serializer.is_valid(raise_exception=True)
                files_data.append(file_serializer.validated_data)
            uploaded_files = files_data

        # --- Build consent dicts with request metadata ---
        consents = []
        for consent in serializer.validated_data["consents"]:
            consents.append(
                {
                    "consent_type": consent["consent_type"],
                    "accepted": consent["accepted"],
                    "ip_address": self._get_client_ip(request),
                    "user_agent": request.META.get("HTTP_USER_AGENT", ""),
                }
            )

        enrollment = services.submit_enrollment(
            enrollment_data=serializer.get_enrollment_data(),
            modality_ids=serializer.validated_data["modality_ids"],
            consents=consents,
            files=uploaded_files,
            created_by=request.user if request.user.is_authenticated else None,
        )

        # Re-fetch with prefetch to avoid N+1 queries in serializer
        enrollment = services.get_enrollment(pk=enrollment.pk)

        return Response(
            EnrollmentReadSerializer(enrollment).data,
            status=status.HTTP_201_CREATED,
        )

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class EnrollmentListView(APIView):
    """
    GET /api/enrollments/list/ — list enrollments (staff only)
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[EnrollmentListQuerySerializer],
        responses={
            200: EnrollmentReadSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_review_enrollment")
    def get(self, request):
        q = EnrollmentListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        filters = {}
        if "status" in q.validated_data:
            filters["status"] = q.validated_data["status"]
        if "academic_year" in q.validated_data:
            filters["period__academic_year"] = q.validated_data["academic_year"]
        if "enrollment_type" in q.validated_data:
            filters["enrollment_type"] = q.validated_data["enrollment_type"]

        enrollments = services.list_enrollments(filters=filters or None)
        serializer = EnrollmentReadSerializer(enrollments, many=True)
        return Response(serializer.data)


class EnrollmentDetailView(APIView):
    """
    GET   /api/enrollments/<pk>/          — retrieve an enrollment
    PATCH /api/enrollments/<pk>/          — update snapshot data (no status changes)
    """

    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return services.get_enrollment(pk=pk)

    @extend_schema(
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_review_enrollment")
    def get(self, request, pk):
        enrollment = self.get_object(pk)
        return Response(EnrollmentReadSerializer(enrollment).data)

    @extend_schema(
        request=EnrollmentUpdateSerializer,
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_review_enrollment")
    def patch(self, request, pk):
        enrollment = self.get_object(pk)
        serializer = EnrollmentUpdateSerializer(
            enrollment,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        enrollment = services.update_enrollment(
            enrollment=enrollment,
            updated_by=request.user,
            **serializer.validated_data,
        )
        return Response(EnrollmentReadSerializer(enrollment).data)


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------


class EnrollmentStartReviewView(APIView):
    """POST /api/enrollments/<pk>/start-review/"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_review_enrollment")
    def post(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        enrollment = services.start_review(
            enrollment=enrollment,
            updated_by=request.user,
        )
        return Response(EnrollmentReadSerializer(enrollment).data)


class EnrollmentApproveView(APIView):
    """POST /api/enrollments/<pk>/approve/ — approve and create users"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_approve_enrollment")
    def post(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        enrollment = services.approve_enrollment(
            enrollment=enrollment,
            updated_by=request.user,
        )
        return Response(EnrollmentReadSerializer(enrollment).data)


class EnrollmentRejectView(APIView):
    """POST /api/enrollments/<pk>/reject/"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_reject_enrollment")
    def post(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        enrollment = services.reject_enrollment(
            enrollment=enrollment,
            updated_by=request.user,
        )
        return Response(EnrollmentReadSerializer(enrollment).data)


class EnrollmentCancelView(APIView):
    """POST /api/enrollments/<pk>/cancel/"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EnrollmentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_cancel_enrollment")
    def post(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        enrollment = services.cancel_enrollment(
            enrollment=enrollment,
            updated_by=request.user,
        )
        return Response(EnrollmentReadSerializer(enrollment).data)


# ---------------------------------------------------------------------------
# Payments (direction-managed)
# ---------------------------------------------------------------------------


class EnrollmentPaymentListCreateView(APIView):
    """
    GET  /api/enrollments/<pk>/payments/  — list payments for an enrollment
    POST /api/enrollments/<pk>/payments/  — create a payment record
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: EnrollmentPaymentReadSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("enrollments.can_manage_enrollment_payments")
    def get(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        payments = services.list_payments(enrollment=enrollment)
        serializer = EnrollmentPaymentReadSerializer(payments, many=True)
        return Response(serializer.data)

    @extend_schema(
        request=EnrollmentPaymentCreateSerializer,
        responses={201: EnrollmentPaymentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_manage_enrollment_payments")
    def post(self, request, pk):
        enrollment = services.get_enrollment(pk=pk)
        serializer = EnrollmentPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.create_payment(
            enrollment=enrollment,
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(
            EnrollmentPaymentReadSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )


class EnrollmentPaymentConfirmView(APIView):
    """POST /api/enrollments/<pk>/payments/<payment_pk>/confirm/"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: EnrollmentPaymentReadSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("enrollments.can_manage_enrollment_payments")
    def post(self, request, pk, payment_pk):
        payment = services.confirm_payment_for_enrollment(
            enrollment_pk=pk,
            payment_pk=payment_pk,
            confirmed_by=request.user,
        )
        return Response(EnrollmentPaymentReadSerializer(payment).data)
