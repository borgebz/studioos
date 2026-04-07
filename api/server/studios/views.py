from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from studios.serializers import (
    StudioSerializer,
    StudioSubmitSerializer,
    StudioUpdateSerializer,
)
from studios import services


class StudioListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: StudioSerializer(many=True), **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("studios.view_studio")
    def get(self, request):
        studios = services.get_all_studios()
        return Response(StudioSerializer(studios, many=True).data)

    @extend_schema(
        request=StudioSubmitSerializer,
        responses={201: StudioSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("studios.add_studio")
    def post(self, request):
        serializer = StudioSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        studio = services.create_studio(**serializer.validated_data, user=request.user)
        return Response(StudioSerializer(studio).data, status=status.HTTP_201_CREATED)


class StudioRetrieveUpdateDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: StudioSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("studios.view_studio")
    def get(self, request, pk):
        studio = services.get_studio(pk=pk)
        return Response(StudioSerializer(studio).data)

    @extend_schema(
        request=StudioUpdateSerializer,
        responses={200: StudioSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("studios.change_studio")
    def patch(self, request, pk):
        serializer = StudioUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        studio = services.update_studio(
            pk=pk, **serializer.validated_data, user=request.user
        )
        return Response(StudioSerializer(studio).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("studios.delete_studio")
    def delete(self, request, pk):
        services.delete_studio(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
