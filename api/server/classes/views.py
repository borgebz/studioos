from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from classes import services
from classes.serializers import (
    ClasseDetailSerializer,
    ClasseListSerializer,
    ClasseMemberSerializer,
    ClasseMemberSubmitSerializer,
    ClasseSerializer,
    ClasseSubmitSerializer,
    ClasseUpdateSerializer,
)
from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES


class ClasseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ClasseListSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.view_classe")
    def get(self, request):
        classes = services.list_classes(requesting_user=request.user)
        return Response(ClasseListSerializer(classes, many=True).data)

    @extend_schema(
        request=ClasseSubmitSerializer,
        responses={201: ClasseSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.can_manage_classes")
    def post(self, request):
        serializer = ClasseSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        classe = services.create_classe(
            created_by=request.user,
            **serializer.validated_data,
        )
        return Response(ClasseSerializer(classe).data, status=status.HTTP_201_CREATED)


class ClasseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ClasseDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.view_classe")
    def get(self, request, pk):
        classe = services.get_classe(pk=pk)
        return Response(ClasseDetailSerializer(classe).data)

    @extend_schema(
        request=ClasseUpdateSerializer,
        responses={200: ClasseDetailSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.can_manage_classes")
    def patch(self, request, pk):
        serializer = ClasseUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        classe = services.update_classe(
            pk=pk,
            requesting_user=request.user,
            **serializer.validated_data,
        )
        return Response(ClasseDetailSerializer(classe).data)

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.can_manage_classes")
    def delete(self, request, pk):
        services.delete_classe(pk=pk, requesting_user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClasseMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: ClasseMemberSerializer(many=True), **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.view_classemember")
    def get(self, request, classe_id):
        members = services.list_classe_members(classe_id=classe_id)
        return Response(ClasseMemberSerializer(members, many=True).data)

    @extend_schema(
        request=ClasseMemberSubmitSerializer,
        responses={201: ClasseMemberSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.can_manage_classes")
    def post(self, request, classe_id):
        serializer = ClasseMemberSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        member = services.add_classe_member(
            classe_id=classe_id,
            student_id=serializer.validated_data["student_id"],
            created_by=request.user,
        )
        return Response(
            ClasseMemberSerializer(member).data, status=status.HTTP_201_CREATED
        )


class ClasseMemberRemoveView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={204: None, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("classes.can_manage_classes")
    def delete(self, request, classe_id, pk):
        services.remove_classe_member(
            classe_id=classe_id,
            member_pk=pk,
            requesting_user=request.user,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
