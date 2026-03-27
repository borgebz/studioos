from rest_framework.exceptions import ValidationError
from accounts.models import Role, User


def create_user(
    *,
    email,
    first_name,
    last_name,
    role_code,
    created_by,
    phone="",
    phone_country_code=""
):
    """
    Create a new user with a role assignment.
    """
    try:
        role = Role.objects.select_related("group").get(code=role_code)
    except Role.DoesNotExist:
        raise ValidationError({"messages": ["RoleNotFound"]})

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
