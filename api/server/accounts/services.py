from accounts.models import Role, User
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken


def create_user(*, email, first_name, last_name, role_code, created_by, phone="", phone_country_code=""):
    """
    Create a new user with a role assignment.
    """
    try:
        role = Role.objects.select_related("group").get(code=role_code)
    except Role.DoesNotExist:
        raise ValueError(f"RoleNotFound '{role_code}'")

    user = User.objects.create_user(
        email=email,
        password=None,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        phone_country_code=phone_country_code,
        is_active=False,
        created_by=created_by,
    )

    user.groups.add(role.group)

    return user

def login_user(*, email, password):
    """
    Authenticate user and return JWT tokens.

    Returns:
        Dict with access and refresh tokens.

    Raises:
        ValueError: If credentials are invalid or user is inactive.
    """
    user = authenticate(email=email, password=password)

    if user is None:
        raise ValueError("EmailOrPasswordInvalid")

    if not user.is_active:
        raise ValueError("AccountDeactivated")

    refresh = RefreshToken.for_user(user)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user,
    }