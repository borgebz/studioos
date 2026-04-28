from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from inventory.services.variant_booking_services import (
    create_booking,
    list_bookings,
    get_booking,
    update_booking,
    delete_booking
)

from inventory.serializers.variant_booking_serializers import VariantBookingSerializer


class BookingListCreateView(APIView):

    def get(self, request, variant_id):
        try:
            bookings = list_bookings(variant_id, request.user, request.query_params)
            serializer = VariantBookingSerializer(bookings, many=True)
            return Response(serializer.data)
        except ValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, variant_id):
        try:
            booking = create_booking(variant_id, request.user, **request.data)
            serializer = VariantBookingSerializer(booking)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

class BookingDetailView(APIView):

     def get(self, request, booking_id):
            try:
                booking = get_booking(booking_id, request.user)
                return Response(VariantBookingSerializer(booking).data)
            except ValidationError as e:
                return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

     def put(self, request, booking_id):
            try:
                booking = update_booking(booking_id, request.user, **request.data)
                return Response(VariantBookingSerializer(booking).data)
            except ValidationError as e:
                return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)

     def delete(self, request, booking_id):
            try:
                delete_booking(booking_id, request.user)
                return Response({"detail": "Booking cancelado"}, status=status.HTTP_200_OK)
            except ValidationError as e:
                return Response({"detail": e.messages}, status=status.HTTP_400_BAD_REQUEST)