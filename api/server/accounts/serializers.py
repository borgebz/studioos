from rest_framework import serializers
from accounts.models import User


class CreateUserSerializer(serializers.Serializer):
    """Input serializer for creating a new user."""

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role_code = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20, required=False, default="")
    phone_country_code = serializers.CharField(max_length=5, required=False, default="")

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("EmailAlreadyExists")
        return value.lower()

class UserResponseSerializer(serializers.ModelSerializer):
    """Output serializer for user data in API responses."""

    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "phone_country_code",
            "is_active",
            "role",
            "created_at",
        ]

    def get_role(self, obj):
        group = obj.groups.first()
        if group and hasattr(group, "role"):
            return {"code": group.role.code, "name": group.name}
        return None

class LoginSerializer(serializers.Serializer):
    """Input serializer for login."""

    email = serializers.EmailField()
    password = serializers.CharField()