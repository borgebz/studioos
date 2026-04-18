from django.contrib.auth.models import Permission
from django.core.management.base import BaseCommand

from accounts.models import Role

COACHINGS_PERMISSIONS = [
    "coachings.view_teacheravailability",
    "coachings.add_teacheravailability",
    "coachings.change_teacheravailability",
    "coachings.delete_teacheravailability",
    "coachings.can_manage_teacher_availability_for_others",
    "coachings.view_coachingclass",
    "coachings.add_coachingclass",
    "coachings.change_coachingclass",
    "coachings.delete_coachingclass",
    "coachings.can_accept_coaching_as_teacher",
    "coachings.can_reject_coaching_as_teacher",
    "coachings.view_coachingparticipant",
    "coachings.add_coachingparticipant",
    "coachings.change_coachingparticipant",
]

ROLE_PERMISSIONS = {
    "direction": [
        # accounts
        "accounts.change_user",
        "accounts.view_user",
        "accounts.can_list_users",
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
        # studios
        "studios.add_studio",
        "studios.change_studio",
        "studios.delete_studio",
        "studios.view_studio",
        "modality.add_modality",
        "modality.add_usermodality",
        "modality.change_modality",
        "modality.delete_modality",
        "modality.delete_usermodality",
        "modality.view_modality",
        "modality.view_usermodality",
        *COACHINGS_PERMISSIONS,
    ],
    "coordination": [
        "accounts.view_user",
        "accounts.can_list_users",
        # enrollments
        "enrollments.can_review_enrollment",
        "enrollments.can_approve_enrollment",
        "enrollments.can_reject_enrollment",
        "enrollments.can_cancel_enrollment",
        "enrollments.can_manage_enrollment_payments",
        # studios
        "studios.add_studio",
        "studios.change_studio",
        "studios.delete_studio",
        "studios.view_studio",
        "modality.add_modality",
        "modality.add_usermodality",
        "modality.change_modality",
        "modality.delete_modality",
        "modality.delete_usermodality",
        "modality.view_modality",
        "modality.view_usermodality",
        *COACHINGS_PERMISSIONS,
    ],
    "collaborator": [
        "accounts.view_user",
        "studios.view_studio",
        "modality.view_modality",
        "coachings.view_coachingclass",
    ],
    "teacher": [
        "accounts.can_teach",
        "accounts.view_user",
        "accounts.can_have_profile",
        "studios.view_studio",
        "modality.view_modality",
        "modality.view_usermodality",
        "coachings.view_teacheravailability",
        "coachings.add_teacheravailability",
        "coachings.change_teacheravailability",
        "coachings.delete_teacheravailability",
        "coachings.view_coachingclass",
        "coachings.can_accept_coaching_as_teacher",
        "coachings.can_reject_coaching_as_teacher",
    ],
    "teacher_external": [
        "accounts.can_teach",
        "accounts.view_user",
        "accounts.can_have_profile",
        "studios.view_studio",
        "modality.view_modality",
        "modality.view_usermodality",
        "coachings.view_teacheravailability",
        "coachings.add_teacheravailability",
        "coachings.change_teacheravailability",
        "coachings.delete_teacheravailability",
        "coachings.view_coachingclass",
        "coachings.can_accept_coaching_as_teacher",
        "coachings.can_reject_coaching_as_teacher",
    ],
    "parent": [
        "accounts.view_user",
        "coachings.view_coachingclass",
        "coachings.add_coachingclass",
        "studios.view_studio",
    ],
    "student": [
        "accounts.view_user",
        "accounts.can_participate_in_coaching",
        "coachings.view_coachingclass",
        "coachings.add_coachingclass",
        "studios.view_studio",
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
