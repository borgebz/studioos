import logging
from functools import lru_cache

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db.models import Prefetch, Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework.exceptions import NotFound, ValidationError

from accounts.emails import account_activation_token
from accounts.models import Profile, Role, User
from core.exceptions import AppNotFound

logger = logging.getLogger(__name__)


def get_user_by_pk(*, pk, app_not_found_code=None):
    """
    Return a user by primary key.

    If the user does not exist: raises ``NotFound()`` by default, or
    ``AppNotFound(app_not_found_code)`` when ``app_not_found_code`` is set (PascalCase i18n key).
    """
    try:
        return User.objects.get(pk=pk)
    except User.DoesNotExist:
        if app_not_found_code is not None:
            raise AppNotFound(app_not_found_code)
        raise NotFound()


def list_users():
    """
    Return all active (non–soft-deleted) users with roles prefetched for listing.
    """
    return (
        User.objects.all()
        .prefetch_related(
            Prefetch(
                "groups",
                queryset=Group.objects.select_related("role"),
            )
        )
        .order_by("email")
    )


def get_user_with_roles_prefetched(*, pk):
    """
    Return a non-deleted user by pk with ``groups`` + ``role`` prefetched
    (same shape as :func:`list_users` rows).
    """
    try:
        return (
            User.objects.all()
            .prefetch_related(
                Prefetch(
                    "groups",
                    queryset=Group.objects.select_related("role"),
                )
            )
            .get(pk=pk)
        )
    except User.DoesNotExist:
        raise NotFound()


@lru_cache(maxsize=1)
def _can_teach_permission():
    return Permission.objects.get(
        content_type__app_label="accounts",
        codename="can_teach",
    )


def _teaching_users_queryset():
    perm = _can_teach_permission()
    return User.objects.filter(
        Q(groups__permissions=perm) | Q(user_permissions=perm)
    ).distinct()


def list_teachers():
    """
    Return users who have ``accounts.can_teach`` (via group or direct permission).
    """
    return _teaching_users_queryset().order_by("email")


def user_can_teach(*, user) -> bool:
    """
    True if ``user`` has ``accounts.can_teach`` (via group or direct permission).
    Same membership rule as :func:`list_teachers`.
    """
    return _teaching_users_queryset().filter(pk=user.pk).exists()


def get_teacher_user_by_pk(*, pk):
    """
    Return a user by primary key only if they have ``accounts.can_teach``.

    Raises ``AppNotFound("TeacherNotFound")`` if the user does not exist,
    ``ValidationError`` with ``UserCannotTeach`` if they exist but cannot teach.
    Uses at most two database queries (one when the user is a valid teacher).
    """
    perm = _can_teach_permission()
    teacher = (
        User.objects.filter(pk=pk)
        .filter(Q(groups__permissions=perm) | Q(user_permissions=perm))
        .distinct()
        .first()
    )
    if teacher is not None:
        return teacher
    if User.objects.filter(pk=pk).exists():
        raise ValidationError({"messages": ["UserCannotTeach"]})
    raise AppNotFound("TeacherNotFound")


def assert_user_can_teach(*, user):
    """Raise ``ValidationError`` if the user is not allowed to act as a teacher."""
    if not user_can_teach(user=user):
        raise ValidationError({"messages": ["UserCannotTeach"]})


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


@transaction.atomic
def update_user_core_fields(*, pk, updated_by, **updates):
    """
    Partial update of principal user fields (name, contact, language, parent, address).

    Intended for callers that hold ``accounts.change_user`` (direction).
    """
    if not updates:
        return get_user_with_roles_prefetched(pk=pk)

    user = get_user_by_pk(pk=pk)
    for key, value in updates.items():
        setattr(user, key, value)
    user.updated_by = updated_by
    try:
        user.full_clean()
        user.save()
    except DjangoValidationError as exc:
        error_dict = getattr(exc, "error_dict", {}) or {}
        if "email" in error_dict:
            raise ValidationError({"messages": ["EmailAlreadyExists"]}) from exc
        raise ValidationError({"messages": ["InvalidUserData"]}) from exc
    except IntegrityError as exc:
        raise ValidationError({"messages": ["EmailAlreadyExists"]}) from exc

    logger.info(
        "User core fields updated: pk=%s updated_by=%s fields=%s",
        pk,
        getattr(updated_by, "email", updated_by),
        sorted(updates.keys()),
    )
    return get_user_with_roles_prefetched(pk=user.pk)


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
