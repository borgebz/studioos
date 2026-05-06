import logging

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from core.schemas import DEFAULT_ERROR_RESPONSES

from . import services
from .serializers import (
    CreateRoleSerializer,
    PermissionSerializer,
    RoleDetailSerializer,
    RoleListSerializer,
    SetRolePermissionsSerializer,
    UpdateRoleSerializer,
)

logger = logging.getLogger(__name__)


class RoleListView(APIView):
    """
    GET  /api/roles/ — list roles.
    POST /api/roles/ — create role.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: RoleListSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.view_role")
    def get(self, request):
        roles = services.list_roles()
        return Response(RoleListSerializer(roles, many=True).data)

    @extend_schema(
        request=CreateRoleSerializer,
        responses={
            201: RoleDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.add_role")
    def post(self, request):
        serializer = CreateRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = services.create_role(
            **serializer.validated_data,
            created_by=request.user,
        )
        logger.info("Role created: %s", role.code)
        return Response(
            RoleDetailSerializer(role).data,
            status=status.HTTP_201_CREATED,
        )


class RoleDetailView(APIView):
    """
    GET    /api/roles/<code>/ — retrieve role.
    PATCH  /api/roles/<code>/ — update description.
    DELETE /api/roles/<code>/ — delete role.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: RoleDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.view_role")
    def get(self, request, code):
        role = services.get_role_by_code(code=code)
        return Response(RoleDetailSerializer(role).data)

    @extend_schema(
        request=UpdateRoleSerializer,
        responses={
            200: RoleDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.change_role")
    def patch(self, request, code):
        role = services.get_role_by_code(code=code)
        serializer = UpdateRoleSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        role = services.update_role(
            role=role,
            updated_by=request.user,
            **serializer.validated_data,
        )
        role = services.get_role_by_code(code=role.code)
        return Response(RoleDetailSerializer(role).data)

    @extend_schema(responses={204: None, **DEFAULT_ERROR_RESPONSES})
    @require_perm("accounts.change_role")
    def delete(self, request, code):
        role = services.get_role_by_code(code=code)
        services.delete_role(role=role, deleted_by=request.user)
        logger.info("Role deleted: %s", code)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RolePermissionsView(APIView):
    """
    PUT /api/roles/<code>/permissions/ — replace permission set.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=SetRolePermissionsSerializer,
        responses={
            200: RoleDetailSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.change_role")
    def put(self, request, code):
        role = services.get_role_by_code(code=code)
        serializer = SetRolePermissionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = services.set_role_permissions(
            role=role,
            permission_ids=serializer.validated_data["permission_ids"],
            updated_by=request.user,
        )
        logger.info("Role permissions updated: %s", code)
        return Response(RoleDetailSerializer(role).data)


class AvailablePermissionsView(APIView):
    """
    GET /api/roles/permissions/available/ — list Django permissions.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: PermissionSerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.view_role")
    def get(self, request):
        perms = services.list_available_permissions()
        return Response(PermissionSerializer(perms, many=True).data)
