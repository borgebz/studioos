from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.schemas import DEFAULT_ERROR_RESPONSES
from marketplace.serializers.comment_serializers import (
    ListingCommentCreateSerializer,
    ListingCommentSerializer,
    ListingCommentUpdateSerializer,
)
from marketplace.services import comment_services
from marketplace.services.listing_services import get_listing


class ListingCommentListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @extend_schema(
        responses={200: ListingCommentSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    def get(self, request, listing_id):
        listing = get_listing(listing_id=listing_id)
        roots, children_map = comment_services.list_comments(listing=listing)
        serializer = ListingCommentSerializer(
            roots,
            many=True,
            context={
                "request": request,
                "children_map": children_map,
            },
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        request=ListingCommentCreateSerializer,
        responses={201: ListingCommentSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def post(self, request, listing_id):
        listing = get_listing(listing_id=listing_id)

        serializer = ListingCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = comment_services.create_comment(
            listing=listing,
            user=request.user,
            body=serializer.validated_data["body"],
            parent_comment_id=serializer.validated_data.get("parent_comment_id"),
        )
        comment = comment_services.get_listing_comment(
            listing=listing, comment_id=comment.pk
        )
        return Response(
            ListingCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ListingCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ListingCommentUpdateSerializer,
        responses={200: ListingCommentSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    def put(self, request, listing_id, comment_id):
        listing = get_listing(listing_id=listing_id)
        comment = comment_services.get_listing_comment(
            listing=listing, comment_id=comment_id
        )

        serializer = ListingCommentUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = comment_services.update_comment(
            comment=comment,
            user=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(
            ListingCommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    def delete(self, request, listing_id, comment_id):
        listing = get_listing(listing_id=listing_id)
        comment = comment_services.get_listing_comment(
            listing=listing, comment_id=comment_id
        )

        comment_services.delete_comment(comment=comment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
