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


def _filters_dict(query_params):
    if isinstance(query_params, QueryDict):
        return {k: query_params.get(k) for k in query_params.keys()}
    return dict(query_params)


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
        bookings = list_bookings(
            variant_id=variant_id,
            user=request.user,
            filters=_filters_dict(request.query_params),
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
