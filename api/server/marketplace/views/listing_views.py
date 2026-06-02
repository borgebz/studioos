from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import paginated_response
from core.permissions import require_perm
from core.schemas import (
    DEFAULT_ERROR_RESPONSES,
    media_multipart_request,
    paginated_list_schema,
)
from core.utils import attach_media_files, parse_multipart_payload
from marketplace import services
from marketplace.serializers import (
    ListingCreateSerializer,
    ListingDetailSerializer,
    ListingListQuerySerializer,
    ListingListSerializer,
    ListingUpdateSerializer,
)


def _validated_listing_filters(request):
    """Parse and validate listing query params via serializer."""
    q = ListingListQuerySerializer(data=request.query_params)
    q.is_valid(raise_exception=True)
    vd = q.validated_data
    return vd or None


class ListingListCreateView(APIView):
    """Public listings — only ACTIVE + is_public."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(
        parameters=[ListingListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="MarketplaceListingList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request):
        listings = services.list_listings(
            user=request.user, filters=_validated_listing_filters(request)
        )
        return paginated_response(
            request=request,
            items=listings,
            serializer_class=ListingListSerializer,
        )

    @extend_schema(
        request=media_multipart_request("ListingCreateMultipart"),
        responses={201: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request):
        payload = parse_multipart_payload(request)
        product = payload.get("product")
        if isinstance(product, dict):
            attach_media_files(product.get("media"), request.FILES)

        serializer = ListingCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(
            user=request.user, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingDetailView(APIView):
    """Detail view with authorization: public listings visible to anyone authenticated,
    otherwise only owner or user with view_productlisting permission."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    def get(self, request, listing_id):
        listing = services.get_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

    @extend_schema(
        request=media_multipart_request("ListingUpdateMultipart"),
        responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def patch(self, request, listing_id):
        payload = parse_multipart_payload(request)
        product = payload.get("product")
        if isinstance(product, dict):
            attach_media_files(product.get("media"), request.FILES)
        serializer = ListingUpdateSerializer(data=payload, partial=True)
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
    """Returns the current user's own listings regardless of status."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[ListingListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="MyListingsList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("marketplace.view_own_listings")
    def get(self, request):
        listings = services.list_my_listings(
            user=request.user, filters=_validated_listing_filters(request)
        )
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
    parser_classes = [MultiPartParser]

    @extend_schema(
        parameters=[ListingListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="SchoolListingList",
                results_serializer=ListingListSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("marketplace.manage_school_listings")
    def get(self, request):
        qs = services.list_school_listings(
            user=request.user, filters=_validated_listing_filters(request)
        )
        return paginated_response(
            request=request,
            items=qs,
            serializer_class=ListingListSerializer,
        )

    @extend_schema(
        request=media_multipart_request("SchoolListingCreateMultipart"),
        responses={201: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request):
        payload = parse_multipart_payload(request)
        product = payload.get("product")
        if isinstance(product, dict):
            attach_media_files(product.get("media"), request.FILES)

        serializer = ListingCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        listing = services.create_listing(
            user=request.user, school_only=True, **serializer.validated_data
        )
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class SchoolListingDetailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("marketplace.manage_school_listings")
    def get(self, request, listing_id):
        listing = services.get_listing(listing_id=listing_id, user=request.user)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

    @extend_schema(
        request=media_multipart_request("SchoolListingUpdateMultipart"),
        responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("marketplace.manage_school_listings")
    def patch(self, request, listing_id):
        payload = parse_multipart_payload(request)
        product = payload.get("product")
        if isinstance(product, dict):
            attach_media_files(product.get("media"), request.FILES)
        serializer = ListingUpdateSerializer(data=payload, partial=True)
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
