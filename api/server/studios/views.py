# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from .serializers import (
    StudioSerializer,
    StudioSubmitSerializer,
    StudioUpdateSerializer,
    ModalitySerializer,
    ModalitySubmitSerializer,
    ModalityUpdateSerializer,
)
from . import services


# Studio
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


# Modality
class ModalityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ModalitySerializer(many=True), **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("studios.view_modality")
    def get(self, request):
        modalities = services.get_all_modalities()
        return Response(ModalitySerializer(modalities, many=True).data)

    @extend_schema(
        request=ModalitySubmitSerializer,
        responses={201: ModalitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("studios.add_modality")
    def post(self, request):
        serializer = ModalitySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modality = services.create_modality(
            **serializer.validated_data, user=request.user
        )

        # Re-fetch to prevent N+1 queries and load nested studios correctly
        modality = services.get_modality(pk=modality.pk)
        return Response(
            ModalitySerializer(modality).data, status=status.HTTP_201_CREATED
        )


class ModalityRetrieveUpdateDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ModalitySerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("studios.view_modality")
    def get(self, request, pk):
        modality = services.get_modality(pk=pk)
        return Response(ModalitySerializer(modality).data)

    @extend_schema(
        request=ModalityUpdateSerializer,
        responses={200: ModalitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("studios.change_modality")
    def patch(self, request, pk):
        serializer = ModalityUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        modality = services.update_modality(
            pk=pk, **serializer.validated_data, user=request.user
        )

        # Re-fetch to prevent N+1 queries and load nested studios correctly
        modality = services.get_modality(pk=modality.pk)
        return Response(ModalitySerializer(modality).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("studios.delete_modality")
    def delete(self, request, pk):
        services.delete_modality(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
