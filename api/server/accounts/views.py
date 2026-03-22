from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.decorators import require_perm
from .serializers import CreateUserSerializer, UserResponseSerializer, LoginSerializer
from .services import create_user, login_user


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
    
class LoginView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = login_user(**serializer.validated_data)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response({
            "access": result["access"],
            "refresh": result["refresh"],
            "user": UserResponseSerializer(result["user"]).data,
        })