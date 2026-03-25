import logging 
from rest_framework import status, serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.decorators import require_perm
from .serializers import CreateUserSerializer, UserResponseSerializer, MeSerializer, Profile, ProfileSerializer, LoginSerializer, TokenPairSerializer
from .services import create_user
from core.schemas import DEFAULT_ERROR_RESPONSES
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework.exceptions import NotFound, ValidationError
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
 
    @extend_schema(
        request=LoginSerializer,
        responses={
            200: TokenPairSerializer,
            **DEFAULT_ERROR_RESPONSES,
        }
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
 
    @extend_schema(
        request=inline_serializer(
            name="RefreshToken",
            fields={
                "refresh": serializers.CharField(),
            },
        ),
        responses={
            200: TokenPairSerializer,
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
 
 
class LogoutView(TokenBlacklistView):
    """
    POST /api/accounts/auth/logout/
    Blacklists the provided refresh token. Token is invalid after this call.
    """
 
    @extend_schema(
        request=inline_serializer(
            name="RefreshToken",
            fields={
                "refresh": serializers.CharField(),
            },
        ),
        responses={
            204: None,  # No content on successful logout
            **DEFAULT_ERROR_RESPONSES,
        }
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
        }
    )
    @require_perm("accounts.add_user")
    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = create_user(**serializer.validated_data, created_by=request.user)
        except ValueError as e:
            logger.error(e)
            raise ValidationError({"messages": ["FailedCreatingUser"]})

        return Response(UserResponseSerializer(user).data, status=status.HTTP_201_CREATED)
    
class MeView(APIView):
    """
    GET /auth/me/
    Returns authenticated user data, role, permissions and profile.
    Used by the frontend to bootstrap session state and drive RBAC.
    """
    permission_classes = [IsAuthenticated]
 
    @extend_schema(
        responses={
            200: MeSerializer,
            **DEFAULT_ERROR_RESPONSES
        }
    )
    def get(self, request):
        serializer = MeSerializer(request.user)
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
 
    @extend_schema(
        responses={
            200: ProfileSerializer,
            **DEFAULT_ERROR_RESPONSES
        }
    )
    @require_perm("accounts.can_have_profile")
    def get(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return NotFound()
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    @extend_schema(
        request=ProfileSerializer,
        responses={
            201: ProfileSerializer,
            **DEFAULT_ERROR_RESPONSES
        }
    )
    @require_perm("accounts.can_have_profile")
    def post(self, request):
        if Profile.objects.filter(user=request.user).exists():
            return ValidationError({"non_field": ["ProfileAlreadyExists"]})
        serializer = ProfileSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        logger.info("Profile created for user %s", request.user.email)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=ProfileSerializer,
        responses={
            200: ProfileSerializer,
            **DEFAULT_ERROR_RESPONSES,
        }
    )
    @require_perm("accounts.can_have_profile")
    def patch(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            raise NotFound()
        serializer = ProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info("Profile updated for user %s", request.user.email)
        return Response(serializer.data)
 