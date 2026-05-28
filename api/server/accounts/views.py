import logging
from rest_framework import status, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from core.decorators import require_perm
from .serializers import (
    ActivateAccountSerializer,
    BulkInviteFileSerializer,
    CompleteOnboardingSerializer,
    CreateUserSerializer,
    EmailExportQuerySerializer,
    InviteSingleSerializer,
    LoginSerializer,
    MeSerializer,
    OnboardingPreviewResponse,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileSerializer,
    PublicProfileSerializer,
    RefreshTokenSourceSerializer,
    TeacherSummarySerializer,
    UserCoreUpdateSerializer,
    UserListQuerySerializer,
    UserResponseSerializer,
)
from .jwt_session import blacklist_refresh_token, refresh_session_tokens
from .services import (
    activate_account,
    bulk_invite_users,
    complete_onboarding,
    complete_password_reset,
    create_profile_for_user,
    create_user,
    deactivate_user,
    get_onboarding_preview,
    get_profile_for_user,
    invite_user,
    list_emails_for_export,
    list_public_profiles,
    list_teachers,
    list_users,
    request_password_reset,
    resend_invite,
    update_profile_for_user,
    update_user_core_fields,
)
from core.pagination import paginated_response
from core.schemas import DEFAULT_ERROR_RESPONSES, paginated_list_schema
from drf_spectacular.utils import extend_schema, inline_serializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.auth_cookies import (
    set_auth_cookies,
    clear_auth_cookies,
)
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)


class LoginView(APIView):
    """
    POST /api/accounts/auth/login/
    Accepts email + password and stores JWT in httpOnly cookies.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: inline_serializer(
                name="LoginSuccess",
                fields={
                    "detail": serializers.CharField(),
                },
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(
            request,
            email=email,
            password=password,
        )

        if not user:
            return Response(
                {"errors": {"messages": ["InvalidCredentials"]}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response(
            {"detail": "Login successful"},
            status=status.HTTP_200_OK,
        )

        set_auth_cookies(
            response=response,
            access_token=str(access),
            refresh_token=str(refresh),
        )

        logger.info("User logged in: %s", email)

        return response


class RefreshView(APIView):
    """
    POST /api/accounts/auth/refresh/
    Accepts refresh token in JSON body and/or ``studioos_refresh`` cookie;
    new tokens are set as httpOnly cookies (same as login).
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=RefreshTokenSourceSerializer,
        responses={
            200: inline_serializer(
                name="RefreshSuccess",
                fields={
                    "detail": serializers.CharField(),
                },
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = RefreshTokenSourceSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        refresh_in = serializer.validated_data["refresh"]
        tokens = refresh_session_tokens(refresh_token_str=refresh_in)
        access = tokens["access"]
        refresh_out = tokens.get("refresh", refresh_in)

        response = Response(
            {"detail": "Refresh successful"},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(
            response=response,
            access_token=access,
            refresh_token=refresh_out,
        )
        return response


class LogoutView(APIView):
    """
    POST /api/accounts/auth/logout/
    Blacklists the refresh token (JSON body and/or ``studioos_refresh`` cookie)
    and clears auth cookies.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=RefreshTokenSourceSerializer,
        responses={
            204: None,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, *args, **kwargs):
        serializer = RefreshTokenSourceSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        blacklist_refresh_token(refresh_token_str=serializer.validated_data["refresh"])

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        logger.info("User logged out")
        return response


class UserListView(APIView):
    """
    GET  /api/accounts/users/ — list users (coordination & direction).
    POST /api/accounts/users/ — create user.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="ListUsers",
        parameters=[UserListQuerySerializer],
        responses={
            200: paginated_list_schema(
                name="UserList",
                results_serializer=UserResponseSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_list_users")
    def get(self, request):
        query = UserListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        users = list_users(**query.validated_data)
        return paginated_response(
            request=request,
            items=users,
            serializer_class=UserResponseSerializer,
        )

    @extend_schema(
        operation_id="CreateUser",
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
            UserResponseSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UserDetailView(APIView):
    """
    GET   /api/accounts/users/<pk>/ — fetch a single user.
    PATCH /api/accounts/users/<pk>/ — update principal fields (direction only).

    Requires ``accounts.view_user`` (GET) / ``accounts.change_user`` (PATCH).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="GetUser",
        responses={
            200: UserResponseSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.view_user")
    def get(self, request, pk):
        from accounts.services import get_user_with_roles_prefetched

        user = get_user_with_roles_prefetched(pk=int(pk))
        return Response(UserResponseSerializer(user, context={"request": request}).data)

    @extend_schema(
        operation_id="UpdateUser",
        request=UserCoreUpdateSerializer,
        responses={
            200: UserResponseSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.change_user")
    def patch(self, request, pk):
        serializer = UserCoreUpdateSerializer(
            data=request.data,
            partial=True,
            context={"user_pk": int(pk)},
        )
        serializer.is_valid(raise_exception=True)
        user = update_user_core_fields(
            pk=int(pk),
            updated_by=request.user,
            **serializer.validated_data,
        )
        return Response(UserResponseSerializer(user, context={"request": request}).data)


class TeacherListView(APIView):
    """
    GET /api/accounts/teachers/ — users with ``accounts.can_teach`` (minimal fields).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: TeacherSummarySerializer(many=True),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request):
        users = list_teachers()
        return Response(TeacherSummarySerializer(users, many=True).data)


class MeView(APIView):
    """
    GET /auth/me/
    Returns authenticated user data, role, permissions and profile.
    Used by the frontend to bootstrap session state and drive RBAC.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer, **DEFAULT_ERROR_RESPONSES})
    def get(self, request):
        from accounts.services import get_me_user

        user = get_me_user(pk=request.user.pk)
        serializer = MeSerializer(user, context={"request": request})
        return Response(serializer.data)


class PublicProfileListView(APIView):
    """
    GET /api/accounts/profiles/ — discovery list for messaging.

    Open to any authenticated user. Returns profiles only — users who haven't
    created one are intentionally invisible. The requester is excluded.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            inline_serializer(
                name="PublicProfileListQuery",
                fields={
                    "search": serializers.CharField(required=False, allow_blank=True),
                },
            ),
        ],
        responses={
            200: paginated_list_schema(
                name="PublicProfileList",
                results_serializer=PublicProfileSerializer,
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request):
        search = request.query_params.get("search") or None
        profiles = list_public_profiles(
            requesting_user=request.user,
            search=search,
        )
        return paginated_response(
            request=request,
            items=profiles,
            serializer_class=PublicProfileSerializer,
        )


class MyProfileView(APIView):
    """
    GET  /api/accounts/profile/me/ — retrieve own profile
    POST /api/accounts/profile/me/ - creates profile
    PATCH /api/accounts/profile/me/ — update own profile (including photo upload)
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

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
    throttle_classes = [AnonRateThrottle]

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


class PasswordResetRequestView(APIView):
    """
    POST /api/accounts/auth/password-reset/
    Accepts an email and enqueues a password-reset email (if the account exists).
    Always returns 200 to prevent email enumeration.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={
            200: inline_serializer(
                name="PasswordResetRequestSuccess",
                fields={"detail": serializers.CharField()},
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request_password_reset(email=serializer.validated_data["email"])
        return Response({"detail": "PasswordResetEmailSent"})


class PasswordResetConfirmView(APIView):
    """
    POST /api/accounts/auth/password-reset/confirm/
    Validates uid + token and sets the new password.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={
            200: inline_serializer(
                name="PasswordResetConfirmSuccess",
                fields={"detail": serializers.CharField()},
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        complete_password_reset(**serializer.validated_data)
        return Response({"detail": "PasswordResetComplete"})


BulkInviteUsersListSchema = inline_serializer(
    name="BulkInviteUsersListPayload",
    fields={
        "users": UserResponseSerializer(many=True),
        "count": serializers.IntegerField(),
    },
)


BulkInviteUsersWrapperSchema = inline_serializer(
    name="BulkInviteUsersWrapper",
    fields={
        "data": BulkInviteUsersListSchema,
    },
)


class InviteCreateView(APIView):
    """
    POST /api/accounts/invites/ — invite a single user (inactive until onboarding).
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=InviteSingleSerializer,
        responses={
            201: UserResponseSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_invite_user")
    def post(self, request):
        serializer = InviteSingleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = invite_user(
            email=serializer.validated_data["email"],
            role_code=serializer.validated_data["role"],
            created_by=request.user,
        )
        return Response(
            UserResponseSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class BulkInviteCreateView(APIView):
    """
    POST /api/accounts/invites/bulk/ — bulk invite from an Excel file.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    @extend_schema(
        request=BulkInviteFileSerializer,
        responses={
            201: BulkInviteUsersWrapperSchema,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_invite_user")
    def post(self, request):
        serializer = BulkInviteFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        users = bulk_invite_users(
            inviter=request.user,
            uploaded_file=serializer.validated_data["file"],
        )
        payload = UserResponseSerializer(users, many=True).data
        return Response(
            {"data": {"users": payload, "count": len(users)}},
            status=status.HTTP_201_CREATED,
        )


class OnboardingTokenView(APIView):
    """
    GET / POST /api/accounts/onboard/{token}/ — validate token / complete onboarding (public).
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        responses={
            200: OnboardingPreviewResponse,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def get(self, request, token):
        preview = get_onboarding_preview(token=str(token))
        return Response({"data": preview})

    @extend_schema(
        request=CompleteOnboardingSerializer,
        responses={
            200: inline_serializer(
                name="OnboardingCompleteSuccess",
                fields={
                    "detail": serializers.CharField(),
                },
            ),
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    def post(self, request, token):
        serializer = CompleteOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = complete_onboarding(token=str(token), **serializer.validated_data)
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response(
            {"detail": "Onboarding complete"},
            status=status.HTTP_200_OK,
        )
        set_auth_cookies(
            response=response,
            access_token=str(access),
            refresh_token=str(refresh),
        )
        return response


class ResendInviteView(APIView):
    """
    POST /api/accounts/users/{pk}/resend-invite/
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: None,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_invite_user")
    def post(self, request, pk):
        resend_invite(user_pk=int(pk), requesting_user=request.user)
        return Response(status=status.HTTP_200_OK)


class DeactivateUserView(APIView):
    """
    POST /api/accounts/users/{pk}/deactivate/

    Sets ``is_active=False`` on the user. Re-activation is handled by re-issuing an
    invite (``resend-invite``) so the user resets their password through onboarding.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="DeactivateUser",
        responses={
            200: UserResponseSerializer,
            **DEFAULT_ERROR_RESPONSES,
        },
    )
    @require_perm("accounts.can_deactivate_user")
    def post(self, request, pk):
        user = deactivate_user(pk=int(pk), deactivated_by=request.user)
        return Response(UserResponseSerializer(user, context={"request": request}).data)


class EmailExportView(APIView):
    """
    GET /api/accounts/emails/export/
    Export filtered user emails as CSV. Direction and coordination only.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[EmailExportQuerySerializer],
        responses={200: {"type": "string", "format": "binary"}},
    )
    @require_perm("accounts.can_list_users")
    def get(self, request):
        import csv
        from django.http import HttpResponse

        query = EmailExportQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        filters = query.validated_data

        users = list_emails_for_export(
            role=filters.get("role"),
            classe_ids=filters.get("classe_ids"),
            modality_ids=filters.get("modality_ids"),
            is_active=filters.get("is_active"),
        )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="emails.csv"'

        writer = csv.writer(response)
        writer.writerow(["email", "first_name", "last_name", "role", "is_active"])

        for user in users:
            role_codes = []
            for group in user.groups.all():
                role = getattr(group, "role", None)
                if role:
                    role_codes.append(role.code)
            writer.writerow(
                [
                    user.email,
                    user.first_name,
                    user.last_name,
                    ",".join(role_codes),
                    user.is_active,
                ]
            )

        return response
