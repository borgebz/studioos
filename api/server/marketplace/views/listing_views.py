import json

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
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
    for key in ["search", "listing_type", "category_id", "size_id", "color_id", "condition"]:
        if q.get(key):
            out[key] = q.get(key)
    return out or None


class ListingListCreateView(APIView):
    """Public listings — only ACTIVE + is_public."""

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
    """Detail view with authorization: public listings visible to anyone authenticated,
    otherwise only owner or user with view_productlisting permission."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    def get(self, request, listing_id):
        listing = services.get_listing(listing_id=listing_id)
        # Public + active listings are visible to any authenticated user
        if not (
            listing.status == "active" and listing.is_public
        ):
            # Not public — must be owner or have admin perm
            is_owner = listing.created_by_id == request.user.id
            has_admin_perm = request.user.has_perm(
                "marketplace.view_productlisting"
            )
            if not is_owner and not has_admin_perm:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied()
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
    """Returns the current user's own listings regardless of status."""

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
    @require_perm("marketplace.view_own_listings")
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
    parser_classes = [MultiPartParser]

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
        qs = services.list_school_listings()
        return paginated_response(
            request=request,
            items=qs,
            serializer_class=ListingListSerializer,
        )

    @extend_schema(
        request={
            "multipart/form-data": inline_serializer(
                name="SchoolListingCreateMultipart",
                fields={
                    "payload": serializers.CharField(
                        help_text=(
                            "JSON-encoded ListingCreate payload. "
                            "Files for product.media[i].image are sent as "
                            "separate form fields named media_0, media_1, ..., "
                            "matching the index of each media entry."
                        ),
                    ),
                    "media_0": serializers.ImageField(required=False),
                    "media_1": serializers.ImageField(required=False),
                    "media_2": serializers.ImageField(required=False),
                    "media_3": serializers.ImageField(required=False),
                    "media_4": serializers.ImageField(required=False),
                    "media_5": serializers.ImageField(required=False),
                    "media_6": serializers.ImageField(required=False),
                    "media_7": serializers.ImageField(required=False),
                    "media_8": serializers.ImageField(required=False),
                    "media_9": serializers.ImageField(required=False),
                },
            ),
        },
        responses={201: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("marketplace.manage_school_listings")
    def post(self, request):
        payload_raw = request.data.get("payload")
        if not payload_raw:
            raise ValidationError({"payload": ["This field is required."]})
        try:
            payload = json.loads(payload_raw)
        except (TypeError, json.JSONDecodeError):
            raise ValidationError({"payload": ["Invalid JSON."]})

        product = payload.get("product")
        if isinstance(product, dict) and isinstance(product.get("media"), list):
            for i, media_item in enumerate(product["media"]):
                if not isinstance(media_item, dict):
                    continue
                uploaded = request.FILES.get(f"media_{i}")
                if uploaded is not None:
                    media_item["image"] = uploaded
                else:
                    media_item.pop("image", None)

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

    @extend_schema(responses={200: ListingDetailSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("marketplace.manage_school_listings")
    def get(self, request, listing_id):
        listing = services.get_listing(listing_id=listing_id)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

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
