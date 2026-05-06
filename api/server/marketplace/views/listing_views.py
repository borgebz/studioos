from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema
from marketplace import services
from marketplace.serializers import (
    ListingCreateSerializer,
    ListingDetailSerializer,
    ListingListSerializer,
    ListingUpdateSerializer,
)


def _listing_filters(request):
    q = request.query_params
    out = {}
    for key in ["listing_type", "category_id", "size_id", "color_id", "condition"]:
        if q.get(key):
            out[key] = q.get(key)
    return out or None


class ListingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="MarketplaceListingList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    def get(self, request):
        listings = services.list_listings(
            user=request.user, filters=_listing_filters(request)
        )
        return paginated_response(
            request=request,
            items=listings,
            serializer_class=ListingListSerializer,
        )

    @extend_schema(
        request=ListingCreateSerializer,
        responses={201: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request):
        serializer = ListingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    def get(self, request, listing_id):
        listing = services.get_listing(listing_id=listing_id)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

    @extend_schema(
        request=ListingUpdateSerializer,
        responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def patch(self, request, listing_id):
        serializer = ListingUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        listing = services.update_listing(
            listing_id=listing_id, user=request.user, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    def delete(self, request, listing_id):
        services.delete_listing(listing_id=listing_id, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListingPublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    def post(self, request, listing_id):
        listing = services.publish_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )


class ListingUnpublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    def post(self, request, listing_id):
        listing = services.unpublish_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )


class ListingFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={201: None, **DEFAULT_ERROR_RESPONSES})
    def post(self, request, listing_id):
        services.add_favorite(listing_id=listing_id, user=request.user)
        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    def delete(self, request, listing_id):
        services.remove_favorite(listing_id=listing_id, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListingAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None, **DEFAULT_ERROR_RESPONSES})
    def get(self, request, listing_id):
        windows = services.get_availability(listing_id=listing_id)
        return Response({"data": windows})


class MyListingsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="MyListingsList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    def get(self, request):
        listings = services.list_my_listings(user=request.user)
        return paginated_response(
            request=request,
            items=listings,
            serializer_class=ListingListSerializer,
        )


class FavoriteListingsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="FavoriteListingsList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    def get(self, request):
        listings = services.list_favorited_listings(user=request.user)
        return paginated_response(
            request=request,
            items=listings,
            serializer_class=ListingListSerializer,
        )


# ---------------------------------------------------------------------------
# School-scoped listing views
# ---------------------------------------------------------------------------


class SchoolListingListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: paginated_list_schema(
                name="SchoolListingList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    @require_perm("marketplace.manage_school_listings")
    def get(self, request):
        from inventory.models import Product
        from marketplace.models import Listing

        qs = Listing.objects.filter(
            variant__product__owner_type=Product.OwnerType.SCHOOL
        ).order_by("-created_at")
        return paginated_response(
            request=request,
            items=qs,
            serializer_class=ListingListSerializer,
        )

    @extend_schema(
        request=ListingCreateSerializer,
        responses={201: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request):
        serializer = ListingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class SchoolListingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ListingUpdateSerializer,
        responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("marketplace.manage_school_listings")
    def patch(self, request, listing_id):
        serializer = ListingUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        listing = services.update_listing(
            listing_id=listing_id, user=request.user, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )


class SchoolListingPublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, listing_id):
        listing = services.publish_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )


class SchoolListingUnpublishView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("marketplace.manage_school_listings")
    def post(self, request, listing_id):
        listing = services.unpublish_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )
