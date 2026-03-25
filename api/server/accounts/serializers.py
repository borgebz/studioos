from rest_framework import serializers
from accounts.models import User
from accounts.models import Profile
from pathlib import Path

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


class ProfileSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["display_name", "photo_url"]


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()

    def get_role(self, obj):
        roles = []
        for group in obj.groups.select_related("role").all():
            role = getattr(group, "role", None)
            if role:
                roles.append(role.code)
        return roles

    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())

    def get_profile(self, obj):
        profile = getattr(obj, "profile", None)
        if profile is None:
            return None
        return ProfileSummarySerializer(profile).data
    

class ProfileSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
 
    class Meta:
        model = Profile
        fields = ["display_name", "bio", "photo", "photo_url", "is_public"]
        extra_kwargs = {
            # write-only — clients upload the file, never get the raw path back
            "photo": {"write_only": True, "required": False},
        }
 
    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url

    def validate_photo(self, value):
        valid_extensions = [".jpg", ".jpeg", ".png", ".webp"]
        ext = Path(value.name).suffix.lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError("FileTypeNotSupported.")
        if value.size > 0 * 1024 * 1024:
            raise serializers.ValidationError("FileSizeExceeds5MB")
        return value