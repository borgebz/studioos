import logging

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework.exceptions import NotFound, ValidationError

from accounts.emails import account_activation_token
from accounts.models import Profile, Role, User

logger = logging.getLogger(__name__)


@transaction.atomic
def create_user(
    *,
    email,
    first_name,
    last_name,
    role_code,
    created_by,
    phone="",
    phone_country_code="",
):
    """
    Create a new user with a role assignment.
    """
    try:
        role = Role.objects.select_related("group").get(code=role_code)
    except Role.DoesNotExist:
        raise ValidationError({"messages": ["RoleNotFound"]})

    try:
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
    except ValueError:
        # UserManager.create_user raises ValueError for falsy email — not a DRF
        # exception, so it would bypass custom_exception_handler and become a 500.
        raise ValidationError({"messages": ["EmailIsMandatory"]})

    user.groups.add(role.group)

    return user


def get_profile_for_user(*, user):
    try:
        return Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        raise NotFound()


def create_profile_for_user(*, user, created_by=None, **fields):
    profile = Profile(user=user, created_by=created_by, **fields)
    try:
        profile.full_clean()
    except DjangoValidationError as exc:
        errs = getattr(exc, "error_dict", None) or {}
        if "user" in errs:
            raise ValidationError({"messages": ["ProfileAlreadyExists"]}) from exc
        raise
    try:
        profile.save()
    except IntegrityError:
        raise ValidationError({"messages": ["ProfileAlreadyExists"]})
    return profile


def update_profile_for_user(*, profile, updated_by=None, **fields):
    for key, value in fields.items():
        setattr(profile, key, value)
    profile.updated_by = updated_by
    profile.full_clean()
    profile.save()
    return profile


def activate_account(*, uid, token, password):
    User = get_user_model()
    try:
        pk = force_str(urlsafe_base64_decode(uid))
        account_user = User.objects.get(pk=pk)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({"messages": ["InvalidActivationLink"]})

    if account_user.is_active:
        raise ValidationError({"messages": ["AccountAlreadyActive"]})

    if not account_activation_token.check_token(account_user, token):
        raise ValidationError({"messages": ["InvalidOrExpiredToken"]})

    account_user.set_password(password)
    account_user.is_active = True
    account_user.save()

    logger.info("Account activated: %s", account_user.email)
    return account_user
