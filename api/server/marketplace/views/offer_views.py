from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.schemas import DEFAULT_ERROR_RESPONSES
from marketplace import services
from marketplace.serializers import (
    ListingOfferCreateSerializer,
    ListingOfferSerializer,
    ListingOfferUpdateSerializer,
)


class ListingOfferCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ListingOfferCreateSerializer,
        responses={201: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, listing_id):
        serializer = ListingOfferCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        offer = services.create_listing_offer(
            user=request.user,
            listing_id=listing_id,
            **serializer.validated_data,
        )
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingOfferDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, offer_id):
        offer = services.get_listing_offer(offer_id=offer_id, user=request.user)
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data
        )

    @extend_schema(
        request=ListingOfferUpdateSerializer,
        responses={200: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def patch(self, request, offer_id):
        serializer = ListingOfferUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        offer = services.update_listing_offer(
            offer_id=offer_id,
            user=request.user,
            **serializer.validated_data,
        )
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data
        )


class ListingOfferCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, offer_id):
        offer = services.complete_listing_offer(
            offer_id=offer_id, user=request.user
        )
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data
        )


class ListingOfferRejectView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, offer_id):
        offer = services.reject_listing_offer(
            offer_id=offer_id, user=request.user
        )
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data
        )


class ListingOfferCancelView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ListingOfferSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, offer_id):
        offer = services.cancel_listing_offer(
            offer_id=offer_id, user=request.user
        )
        return Response(
            ListingOfferSerializer(offer, context={"request": request}).data
        )
