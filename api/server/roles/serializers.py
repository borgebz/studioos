from django.contrib.auth.models import Group, Permission
from rest_framework import serializers

from accounts.models import Role


class PermissionSerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)

    class Meta:
        model = Permission
        fields = ["id", "codename", "app_label", "name"]


class RoleListSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="group.name", read_only=True)
    permission_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = ["code", "name", "description", "permission_count"]


class RoleDetailSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="group.name", read_only=True)
    permissions = PermissionSerializer(
        source="group.permissions",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Role
        fields = ["code", "name", "description", "permissions"]


class CreateRoleSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=150)
    description = serializers.CharField()

    def validate_code(self, value):
        if Role.all_objects.filter(code=value).exists():
            raise serializers.ValidationError("RoleCodeAlreadyExists")
        return value

    def validate_name(self, value):
        if Group.objects.filter(name=value).exists():
            raise serializers.ValidationError("RoleNameAlreadyExists")
        return value


class UpdateRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ["description"]


class SetRolePermissionsSerializer(serializers.Serializer):
    permission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True,
    )
