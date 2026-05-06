from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.db.models import Count, Prefetch
from rest_framework.exceptions import ValidationError

from accounts.models import Role
from core.exceptions import AppNotFound


def list_roles():
    return (
        Role.objects.select_related("group")
        .annotate(permission_count=Count("group__permissions", distinct=True))
        .prefetch_related("group__permissions")
        .order_by("code")
    )


def get_role_by_code(*, code):
    try:
        perms_qs = Permission.objects.select_related("content_type").order_by(
            "content_type__app_label",
            "codename",
        )
        return (
            Role.objects.select_related("group")
            .prefetch_related(
                Prefetch("group__permissions", queryset=perms_qs),
            )
            .get(code=code)
        )
    except Role.DoesNotExist:
        raise AppNotFound("RoleNotFound")


@transaction.atomic
def create_role(*, code, name, description, created_by):
    if Role.all_objects.filter(code=code).exists():
        raise ValidationError({"messages": ["RoleCodeAlreadyExists"]})
    if Group.objects.filter(name=name).exists():
        raise ValidationError({"messages": ["RoleNameAlreadyExists"]})

    group = Group.objects.create(name=name)
    role = Role(
        group=group,
        code=code,
        description=description,
        created_by=created_by,
    )
    role.full_clean()
    role.save()
    return get_role_by_code(code=role.code)


def update_role(*, role, description, updated_by):
    role.description = description
    role.updated_by = updated_by
    role.full_clean()
    role.save()
    return role


def delete_role(*, role, deleted_by):
    if role.group.user_set.exists():
        raise ValidationError({"messages": ["RoleHasUsers"]})
    role.delete(deleted_by=deleted_by)


def set_role_permissions(*, role, permission_ids: list[int], updated_by):
    perms = Permission.objects.filter(pk__in=permission_ids).select_related(
        "content_type"
    )
    role.group.permissions.set(perms)
    role.updated_by = updated_by
    role.save(update_fields=["updated_by", "updated_at"])
    return get_role_by_code(code=role.code)


def list_available_permissions():
    return (
        Permission.objects.select_related("content_type")
        .order_by("content_type__app_label", "codename")
        .all()
    )
