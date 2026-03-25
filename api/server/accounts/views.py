import logging 
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.decorators import require_perm
from .serializers import CreateUserSerializer, UserResponseSerializer, MeSerializer, Profile, ProfileSerializer
from .services import create_user


logger = logging.getLogger(__name__)


class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    @require_perm("accounts.add_user")
    def post(self, request):
        serializer = CreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = create_user(**serializer.validated_data, created_by=request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserResponseSerializer(user).data, status=status.HTTP_201_CREATED)
    
class MeView(APIView):
    """
    GET /auth/me/
    Returns authenticated user data, role, permissions and profile.
    Used by the frontend to bootstrap session state and drive RBAC.
    """
    permission_classes = [IsAuthenticated]
 
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
 
    def get(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ProfileSerializer(profile, context={"request": request})
        return Response(serializer.data)

    @require_perm("accounts.can_have_profile")
    def post(self, request):
        if Profile.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Profile already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ProfileSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        logger.info("Profile created for user %s", request.user.email)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
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
 