from django.contrib.auth.models import Permission
from django.core.management.base import BaseCommand

from accounts.models import Role

ROLE_PERMISSIONS = {
    "direction": [
        # accounts
        "accounts.change_user",
        "accounts.view_user",
        "accounts.delete_user",
        "accounts.add_role",
        "accounts.change_role",
        "accounts.delete_role",
        # enrollments
        "enrollments.can_review_enrollment",
        "enrollments.can_approve_enrollment",
        "enrollments.can_reject_enrollment",
        "enrollments.can_cancel_enrollment",
        "enrollments.can_manage_periods",
        "enrollments.can_manage_enrollment_payments",
    ],
    "coordination": [
        "accounts.view_user",
        # enrollments
        "enrollments.can_review_enrollment",
        "enrollments.can_approve_enrollment",
        "enrollments.can_reject_enrollment",
        "enrollments.can_cancel_enrollment",
        "enrollments.can_manage_enrollment_payments",
    ],
    "collaborator": [
        "accounts.view_user",
    ],
    "teacher_internal": [
        "accounts.view_user",
        "accounts.can_have_profile",
    ],
    "teacher_external": [
        "accounts.view_user",
        "accounts.can_have_profile",
    ],
    "parent": [
        "accounts.view_user",
    ],
    "student": [
        "accounts.view_user",
    ],
}


class Command(BaseCommand):
    help = "Assign permissions to roles. Idempotent."

    def handle(self, *args, **options):
        all_permissions = Permission.objects.all()

        for role_code, perms in ROLE_PERMISSIONS.items():
            try:
                role = Role.objects.select_related("group").get(code=role_code)
            except Role.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(
                        f"  {role_code}: role not found, run seed_roles first"
                    )
                )
                continue

            if perms == "__all__":
                role.group.permissions.set(all_permissions)
                self.stdout.write(f"  {role_code}: all permissions")
            else:
                permission_objects = []
                for perm_string in perms:
                    app_label, codename = perm_string.split(".")
                    try:
                        perm = Permission.objects.get(
                            content_type__app_label=app_label,
                            codename=codename,
                        )
                        permission_objects.append(perm)
                    except Permission.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f"    {perm_string}: not found")
                        )

                role.group.permissions.set(permission_objects)
                self.stdout.write(
                    f"  {role_code}: {len(permission_objects)} permissions"
                )

        self.stdout.write(self.style.SUCCESS("Permissions assigned."))