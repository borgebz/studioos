import logging
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.decorators import require_perm
from .serializers import (
    CreateUserSerializer,
    UserResponseSerializer,
    MeSerializer,
    ProfileSerializer,
    LoginSerializer,
    TokenPairSerializer,
    ActivateAccountSerializer,
)
from .services import (
    activate_account,
    create_profile_for_user,
    create_user,
    get_profile_for_user,
    update_profile_for_user,
)
from core.schemas import DEFAULT_ERROR_RESPONSES
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)
logger = logging.getLogger(__name__)


class LoginView(TokenObtainPairView):
    """
    POST /api/accounts/auth/login/
    Accepts email + password, returns access and refresh tokens.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: TokenPairSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        logger.info("User logged in: %s", request.data.get("email"))
        return response


class RefreshView(TokenRefreshView):
    """
    POST /api/accounts/auth/refresh/
    Accepts refresh token, returns new access and rotated refresh tokens.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=inline_serializer(
            name="RefreshParam",
            fields={
                "refresh": serializers.CharField(),
            },
        ),
        responses={
            200: TokenPairSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class LogoutView(TokenBlacklistView):
    """
    POST /api/accounts/auth/logout/
    Blacklists the provided refresh token. Token is invalid after this call.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=inline_serializer(
            name="LogoutParam",
            fields={
                "refresh": serializers.CharField(),
            },
        ),
        responses={
            204: None,  # No content on successful logout
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, *args, **kwargs):
        super().post(request, *args, **kwargs)
        logger.info("User logged out")
        return Response(status=204)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=CreateUserSerializer,
        responses={
            201: UserResponseSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.add_user")
    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = create_user(**serializer.validated_data, created_by=request.user)

        return Response(
            UserResponseSerializer(user).data, status=status.HTTP_201_CREATED
        )


class MeView(APIView):
    """
    GET /auth/me/
    Returns authenticated user data, role, permissions and profile.
    Used by the frontend to bootstrap session state and drive RBAC.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer, **DEFAULT_ERROR_RESPONSES})
    def get(self, request):
        serializer = MeSerializer(request.user, context={"request": request})
        return Response(serializer.data)


class MyProfileView(APIView):
    """
    GET  /api/accounts/profile/me/ — retrieve own profile
    POST /api/accounts/profile/me/ - creates profile
    PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
    """

    permission_classes = [IsAuthenticated]
    # MultiPartParser and FormParser needed for file uploads
    # JSONParser kept for non-file updates
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(responses={200: ProfileSerializer, **DEFAULT_ERROR_RESPONSES})
    @require_perm("accounts.can_have_profile")
    def get(self, request):
        profile = get_profile_for_user(user=request.user)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    @extend_schema(
        request=ProfileSerializer,
        responses={201: ProfileSerializer, **DEFAULT_ERROR_RESPONSES},
    )
    @require_perm("accounts.can_have_profile")
    def post(self, request):
        serializer = ProfileSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        profile = create_profile_for_user(
            user=request.user,
            created_by=request.user,
            **serializer.validated_data,
        )
        logger.info("Profile created for user %s", request.user.email)
        out = ProfileSerializer(profile, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=ProfileSerializer,
        responses={
            200: ProfileSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_have_profile")
    def patch(self, request):
        profile = get_profile_for_user(user=request.user)
        serializer = ProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        profile = update_profile_for_user(
            profile=profile,
            updated_by=request.user,
            **serializer.validated_data,
        )
        logger.info("Profile updated for user %s", request.user.email)
        return Response(ProfileSerializer(profile, context={"request": request}).data)


class ActivateAccountView(APIView):
    """
    POST /api/accounts/activate/
    Verifies the activation token, sets the password, and activates the user.
    Public endpoint — the user isn't authenticated yet.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=ActivateAccountSerializer,
        responses={
            200: inline_serializer(
                name="ActivationSuccess",
                fields={"message": serializers.CharField()},
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request):
        serializer = ActivateAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        activate_account(**serializer.validated_data)
        return Response({"message": "AccountActivated"})