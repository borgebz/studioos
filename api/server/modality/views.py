from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES
from modality import services
from modality.serializers import (
    ModalitySerializer,
    ModalitySubmitSerializer,
    ModalityUpdateSerializer,
    UserModalitySerializer,
    UserModalitySubmitSerializer,
)


class ModalityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ModalitySerializer(many=True), **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("modality.view_modality")
    def get(self, request):
        modalities = services.get_all_modalities()
        return Response(ModalitySerializer(modalities, many=True).data)

    @extend_schema(
        request=ModalitySubmitSerializer,
        responses={201: ModalitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("modality.add_modality")
    def post(self, request):
        serializer = ModalitySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modality = services.create_modality(
            **serializer.validated_data, user=request.user
        )
        modality = services.get_modality(pk=modality.pk)
        return Response(
            ModalitySerializer(modality).data, status=status.HTTP_201_CREATED
        )


class ModalityRetrieveUpdateDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ModalitySerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("modality.view_modality")
    def get(self, request, pk):
        modality = services.get_modality(pk=pk)
        return Response(ModalitySerializer(modality).data)

    @extend_schema(
        request=ModalityUpdateSerializer,
        responses={200: ModalitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("modality.change_modality")
    def patch(self, request, pk):
        serializer = ModalityUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        modality = services.update_modality(
            pk=pk, **serializer.validated_data, user=request.user
        )
        modality = services.get_modality(pk=modality.pk)
        return Response(ModalitySerializer(modality).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("modality.delete_modality")
    def delete(self, request, pk):
        services.delete_modality(pk=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserModalityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserModalitySerializer(many=True), **DEFAULT_ERROR_RESPONSES}
    )
    @require_perm("modality.view_usermodality")
    def get(self, request, user_id):
        links = services.get_user_modalities(user_id=user_id)
        return Response(UserModalitySerializer(links, many=True).data)

    @extend_schema(
        request=UserModalitySubmitSerializer,
        responses={201: UserModalitySerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("modality.add_usermodality")
    def post(self, request, user_id):
        serializer = UserModalitySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        link = services.add_user_modality(
            user_id=user_id,
            modality_id=serializer.validated_data["modality_id"],
            requesting_user=request.user,
        )
        return Response(
            UserModalitySerializer(link).data, status=status.HTTP_201_CREATED
        )


class UserModalityDestroyView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("modality.delete_usermodality")
    def delete(self, request, user_id, pk):
        services.remove_user_modality(
            user_id=user_id, pk=pk, requesting_user=request.user
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
