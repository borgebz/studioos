from pathlib import Path

from drf_spectacular.utils import extend_schema_field, inline_serializer
from rest_framework import serializers

from accounts.auth_cookies import REFRESH_COOKIE_NAME
from accounts.models import Language, Profile, User

UserResponseRoleOutput = inline_serializer(
    name="UserResponseRoleOutput",
    fields={
        "code": serializers.CharField(),
        "name": serializers.CharField(),
    },
)

MeEndpointProfileOutput = inline_serializer(
    name="MeEndpointProfileOutput",
    fields={
        "display_name": serializers.CharField(
            required=False,
            allow_blank=True,
        ),
        "photo_url": serializers.CharField(allow_null=True, required=False),
    },
)


class UserCoreUpdateSerializer(serializers.Serializer):
    """Partial update of principal user fields (direction / ``accounts.change_user``)."""

    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_country_code = serializers.CharField(
        max_length=5, required=False, allow_blank=True
    )
    language = serializers.ChoiceField(choices=Language.choices, required=False)
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_parent_id(self, value):
        if value is None:
            return None
        user_pk = self.context.get("user_pk")
        if user_pk is not None and value == user_pk:
            raise serializers.ValidationError("ParentCannotBeSelf")
        if not User.objects.filter(pk=value).exists():
            raise serializers.ValidationError("ParentNotFound")
        return value

    def validate_email(self, value):
        pk = self.context.get("user_pk")
        if pk is None:
            raise serializers.ValidationError("MissingUserContext")
        if User.all_objects.filter(email=value.lower()).exclude(pk=pk).exists():
            raise serializers.ValidationError("EmailAlreadyExists")
        return value.lower()


class CreateUserSerializer(serializers.Serializer):
    """Input serializer for creating a new user."""

    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    role_code = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=20, required=False, default="")
    phone_country_code = serializers.CharField(max_length=5, required=False, default="")

    def validate_email(self, value):
        if User.all_objects.filter(email=value).exists():
            raise serializers.ValidationError("EmailAlreadyExists")
        return value.lower()


class TeacherSummarySerializer(serializers.ModelSerializer):
    """Minimal teacher row for pickers (users with ``accounts.can_teach``)."""

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone",
            "phone_country_code",
        ]


class UserResponseSerializer(serializers.ModelSerializer):
    """Output serializer for user data in API responses."""

    role = serializers.SerializerMethodField(allow_null=True)

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

    @extend_schema_field(serializers.ListField(child=UserResponseRoleOutput))
    def get_role(self, obj):
        roles = []
        for group in obj.groups.select_related("role").all():
            role = getattr(group, "role", None)
            if role:
                roles.append({"code": role.code, "name": group.name})
        return roles


class LoginSerializer(serializers.Serializer):
    """Input serializer for login."""

    email = serializers.EmailField()
    password = serializers.CharField()


class PhotoUrlMixin:
    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url


class ProfileSummarySerializer(PhotoUrlMixin, serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["display_name", "photo_url"]


class ProfileSerializer(PhotoUrlMixin, serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["display_name", "bio", "photo", "photo_url", "is_public"]
        extra_kwargs = {
            # write-only — clients upload the file, never get the raw path back
            "photo": {"write_only": True, "required": False},
        }

    def validate_photo(self, value):
        valid_extensions = [".jpg", ".jpeg", ".png", ".webp"]
        ext = Path(value.name).suffix.lower()
        if ext not in valid_extensions:
            raise serializers.ValidationError("FileTypeNotSupported.")
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("FileSizeExceeds5MB")
        return value


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    role = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()
    language = serializers.CharField()
    profile = serializers.SerializerMethodField(allow_null=True)

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_role(self, obj):
        roles = []
        for group in obj.groups.select_related("role").all():
            role = getattr(group, "role", None)
            if role:
                roles.append(role.code)
        return roles

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_permissions(self, obj):
        return sorted(obj.get_all_permissions())

    @extend_schema_field(MeEndpointProfileOutput)
    def get_profile(self, obj):
        profile = getattr(obj, "profile", None)
        if profile is None:
            return None
        return ProfileSummarySerializer(profile, context=self.context).data


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField(help_text="Short-lived access token.")
    refresh = serializers.CharField(help_text="Long-lived refresh token.")


class RefreshTokenSourceSerializer(serializers.Serializer):
    """
    Resolve refresh token from JSON ``refresh`` or httpOnly cookie ``studioos_refresh``.
    """

    refresh = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context.get("request")
        refresh = attrs.get("refresh")
        if refresh is not None:
            refresh = str(refresh).strip()
        if not refresh and request is not None:
            refresh = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if not refresh:
            raise serializers.ValidationError({"messages": ["RefreshTokenMissing"]})
        attrs["refresh"] = refresh
        return attrs


class ActivateAccountSerializer(serializers.Serializer):
    """Input for account activation — uid + token + new password."""

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)


class InviteSingleSerializer(serializers.Serializer):
    """Single invite: email + role code (see ``accounts.Role`` / seed_roles)."""

    email = serializers.EmailField()
    role = serializers.CharField(max_length=50)

    def validate_email(self, value):
        return value.strip().lower()


class CompleteOnboardingSerializer(serializers.Serializer):
    """Public onboarding completion after invite."""

    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    password = serializers.CharField(min_length=8)
    phone = serializers.CharField(max_length=20)
    phone_country_code = serializers.CharField(max_length=5)
    date_of_birth = serializers.DateField()


OnboardingPreviewInner = inline_serializer(
    name="OnboardingPreviewInner",
    fields={
        "email": serializers.EmailField(),
        "role": serializers.CharField(),
    },
)


OnboardingPreviewResponse = inline_serializer(
    name="OnboardingPreviewWrapper",
    fields={
        "data": OnboardingPreviewInner,
    },
)


class BulkInviteFileSerializer(serializers.Serializer):
    """Multipart upload for bulk invite spreadsheet."""

    file = serializers.FileField()

    def validate_file(self, value):
        ext = Path(value.name).suffix.lower()
        if ext != ".xlsx":
            raise serializers.ValidationError("BulkInviteFileInvalid")
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("BulkInviteFileInvalid")
        return value
