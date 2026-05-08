from datetime import datetime

from django.http import QueryDict
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema
from inventory.serializers.variant_booking_serializers import (
    VariantBookingSerializer,
    VariantBookingWriteSerializer,
)
from inventory.services.variant_booking_services import (
    create_booking,
    delete_booking,
    get_booking,
    list_bookings,
    update_booking,
)

_PAGINATION_PARAMS = {"page", "page_size"}


def _filters_dict(query_params):
    """Build a validated filter dict, excluding pagination keys and checking dates."""
    if isinstance(query_params, QueryDict):
        raw = {k: query_params.get(k) for k in query_params.keys()}
    else:
        raw = dict(query_params)

    # Strip pagination params
    filters = {k: v for k, v in raw.items() if k not in _PAGINATION_PARAMS}

    # Validate date strings
    for date_key in ("start_at", "end_at"):
        val = filters.get(date_key)
        if val:
            try:
                datetime.fromisoformat(val)
            except (ValueError, TypeError):
                return None, Response(
                    {date_key: ["Must be a valid ISO 8601 datetime string."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

    return filters, None


class BookingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="InventoryVariantBookingList",
                results_serializer=VariantBookingSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("inventory.view_product")
    def get(self, request, variant_id):
        include_cancelled = request.query_params.get(
            "include_cancelled", ""
        ).lower() in ("true", "1")

        filters, err = _filters_dict(request.query_params)
        if err is not None:
            return err

        bookings = list_bookings(
            variant_id=variant_id,
            user=request.user,
            filters=filters,
            include_cancelled=include_cancelled,
        )
        return paginated_response(
            request=request,
            items=bookings,
            serializer_class=VariantBookingSerializer,
        )

    @extend_schema(
        request=VariantBookingWriteSerializer,
        responses={201: VariantBookingSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.can_manage_variant_bookings")
    def post(self, request, variant_id):
        serializer = VariantBookingWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = create_booking(
            variant_id=variant_id,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(
            VariantBookingSerializer(booking).data,
            status=status.HTTP_201_CREATED,
        )


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: VariantBookingSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.view_product")
    def get(self, request, booking_id):
        booking = get_booking(booking_id=booking_id, user=request.user)
        return Response(VariantBookingSerializer(booking).data)

    @extend_schema(
        request=VariantBookingWriteSerializer,
        responses={200: VariantBookingSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("inventory.can_manage_variant_bookings")
    def patch(self, request, booking_id):
        serializer = VariantBookingWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        booking = update_booking(
            booking_id=booking_id,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(VariantBookingSerializer(booking).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("inventory.can_manage_variant_bookings")
    def delete(self, request, booking_id):
        delete_booking(booking_id=booking_id, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
