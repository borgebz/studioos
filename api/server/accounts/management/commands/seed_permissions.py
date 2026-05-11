from django.contrib.auth.models import Permission
from django.core.management.base import BaseCommand

from accounts.models import Role

# ---------------------------------------------------------------------------
# Permission groups — organised by app / domain
# ---------------------------------------------------------------------------

EVENTS_PERMISSIONS_MANAGEMENT = [
    "events.view_event",
    "events.add_event",
    "events.change_event",
    "events.delete_event",
    "events.can_view_unpublished_event",
    "events.can_publish_event",
    "events.can_schedule_event_publication",
    "events.can_archive_event",
    "events.can_cancel_event",
    "events.can_complete_event",
    "events.view_eventfile",
    "events.add_eventfile",
    "events.change_eventfile",
    "events.delete_eventfile",
    "events.view_eventpost",
    "events.add_eventpost",
    "events.change_eventpost",
    "events.delete_eventpost",
    "events.can_view_unpublished_eventpost",
    "events.can_publish_eventpost",
    "events.can_schedule_eventpost_publication",
    "events.view_eventcomment",
    "events.add_eventcomment",
    "events.change_eventcomment",
    "events.delete_eventcomment",
    "events.can_moderate_eventcomment",
    "events.view_eventinterest",
    "events.add_eventinterest",
    "events.change_eventinterest",
    "events.delete_eventinterest",
]

MESSAGING_PERMISSIONS = [
    "messaging.can_send_message",
    "messaging.can_list_conversations",
]

AVAILABILITY_PERMISSIONS = [
    "availability.view_teacheravailability",
    "availability.add_teacheravailability",
    "availability.change_teacheravailability",
    "availability.delete_teacheravailability",
]

AVAILABILITY_PERMISSIONS_MANAGEMENT = [
    *AVAILABILITY_PERMISSIONS,
    "availability.can_manage_teacher_availability_for_others",
]

COACHINGS_PERMISSIONS = [
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

CLASSES_PERMISSIONS = [
    "classes.view_classe",
    "classes.add_classe",
    "classes.change_classe",
    "classes.delete_classe",
    "classes.can_manage_classes",
    "classes.view_classemember",
    "classes.add_classemember",
    "classes.change_classemember",
    "classes.delete_classemember",
]

INVENTORY_PERMISSIONS = [
    "inventory.view_category",
    "inventory.add_category",
    "inventory.change_category",
    "inventory.delete_category",
    "inventory.view_color",
    "inventory.add_color",
    "inventory.change_color",
    "inventory.delete_color",
    "inventory.view_product",
    "inventory.add_product",
    "inventory.change_product",
    "inventory.delete_product",
    "inventory.view_productvariant",
    "inventory.add_productvariant",
    "inventory.change_productvariant",
    "inventory.delete_productvariant",
    "inventory.view_school_product",
    "inventory.add_school_product",
    "inventory.change_school_product",
    "inventory.delete_school_product",
    "inventory.manage_school_inventory",
    "inventory.can_manage_variant_bookings",
    "inventory.view_productmedia",
    "inventory.add_productmedia",
    "inventory.change_productmedia",
    "inventory.delete_productmedia",
    "inventory.view_schoolproductdetails",
    "inventory.add_schoolproductdetails",
    "inventory.change_schoolproductdetails",
    "inventory.delete_schoolproductdetails",
    "inventory.view_size",
    "inventory.add_size",
    "inventory.change_size",
    "inventory.delete_size",
    "inventory.view_sizesystem",
    "inventory.add_sizesystem",
    "inventory.change_sizesystem",
    "inventory.delete_sizesystem",
    "inventory.view_variantbooking",
    "inventory.add_variantbooking",
    "inventory.change_variantbooking",
    "inventory.delete_variantbooking",
    "inventory.view_variantcolor",
    "inventory.add_variantcolor",
    "inventory.change_variantcolor",
    "inventory.delete_variantcolor",
    "inventory.view_variantmedia",
    "inventory.add_variantmedia",
    "inventory.change_variantmedia",
    "inventory.delete_variantmedia",
]

MARKETPLACE_PERMISSIONS_MANAGEMENT = [
    "marketplace.manage_school_listings",
    "marketplace.view_productlisting",
    "marketplace.view_all_transactions",
]

MARKETPLACE_PERMISSIONS_USER = [
    "marketplace.view_own_listings",
    "marketplace.view_own_transactions",
]

# ---------------------------------------------------------------------------
# Role → permission mapping
#
# Hierarchy (highest → lowest):
#   direction > coordination > collaborator / teacher / teacher_external
#   parent and student are separate tracks with own-data access.
#
# Principles:
# - direction: full management of every module.
# - coordination: day-to-day operations (scheduling, reviews, class mgmt),
#     but NOT role/user admin or enrollment-period management.
# - collaborator: read-only view of operational data + messaging.
# - teacher / teacher_external: own availability, accept/reject coaching,
#     view classes, messaging, and profile.
# - parent: request coaching for dependents, confirm dependent attendance,
#     view billing/fines, view classes, marketplace participation.
# - student: request coaching, participate, view own billing, view classes,
#     marketplace participation.
# ---------------------------------------------------------------------------

ROLE_PERMISSIONS = {
    "direction": [
        # accounts
        "accounts.add_user",
        "accounts.change_user",
        "accounts.view_user",
        "accounts.can_list_users",
        "accounts.can_invite_user",
        "accounts.delete_user",
        "accounts.view_role",
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
        # modality
        "modality.add_modality",
        "modality.add_usermodality",
        "modality.change_modality",
        "modality.delete_modality",
        "modality.delete_usermodality",
        "modality.view_modality",
        "modality.view_usermodality",
        # availability
        *AVAILABILITY_PERMISSIONS_MANAGEMENT,
        # coachings (full management + scheduling)
        *COACHINGS_PERMISSIONS,
        "coachings.can_schedule_coaching",
        # events
        *EVENTS_PERMISSIONS_MANAGEMENT,
        # classes
        *CLASSES_PERMISSIONS,
        # billing
        "billing.view_billingentry",
        "billing.add_billingentry",
        "billing.change_billingentry",
        "billing.delete_billingentry",
        "billing.can_cancel_billingentry",
        "billing.view_fine",
        "billing.add_fine",
        "billing.change_fine",
        "billing.delete_fine",
        "billing.can_review_fine",
        # messaging
        *MESSAGING_PERMISSIONS,
        # inventory
        *INVENTORY_PERMISSIONS,
        # marketplace
        *MARKETPLACE_PERMISSIONS_MANAGEMENT,
        *MARKETPLACE_PERMISSIONS_USER,
    ],
    "coordination": [
        # accounts (view/invite only — no role management)
        "accounts.view_user",
        "accounts.view_role",
        "accounts.can_list_users",
        "accounts.can_invite_user",
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
        # modality
        "modality.add_modality",
        "modality.add_usermodality",
        "modality.change_modality",
        "modality.delete_modality",
        "modality.delete_usermodality",
        "modality.view_modality",
        "modality.view_usermodality",
        # availability
        *AVAILABILITY_PERMISSIONS_MANAGEMENT,
        # coachings (full management + scheduling)
        *COACHINGS_PERMISSIONS,
        "coachings.can_schedule_coaching",
        # events
        *EVENTS_PERMISSIONS_MANAGEMENT,
        # classes
        *CLASSES_PERMISSIONS,
        # billing (view + cancel + fine review — no creation)
        "billing.view_billingentry",
        "billing.can_cancel_billingentry",
        "billing.view_fine",
        "billing.can_review_fine",
        # messaging
        *MESSAGING_PERMISSIONS,
        # marketplace
        *MARKETPLACE_PERMISSIONS_MANAGEMENT,
        *MARKETPLACE_PERMISSIONS_USER,
    ],
    "collaborator": [
        "accounts.view_user",
        "studios.view_studio",
        "modality.view_modality",
        "availability.view_teacheravailability",
        "coachings.view_coachingclass",
        "coachings.view_coachingparticipant",
        "classes.view_classe",
        "classes.view_classemember",
        *MESSAGING_PERMISSIONS,
    ],
    "teacher": [
        "accounts.can_teach",
        "accounts.view_user",
        "accounts.can_have_profile",
        "studios.view_studio",
        "modality.view_modality",
        "modality.view_usermodality",
        # own availability management
        *AVAILABILITY_PERMISSIONS,
        # coaching interaction
        "coachings.view_coachingclass",
        "coachings.can_accept_coaching_as_teacher",
        "coachings.can_reject_coaching_as_teacher",
        "coachings.view_coachingparticipant",
        # classes (read-only)
        "classes.view_classe",
        "classes.view_classemember",
        *MESSAGING_PERMISSIONS,
    ],
    "teacher_external": [
        "accounts.can_teach",
        "accounts.view_user",
        "accounts.can_have_profile",
        "studios.view_studio",
        "modality.view_modality",
        "modality.view_usermodality",
        # own availability management
        *AVAILABILITY_PERMISSIONS,
        # coaching interaction
        "coachings.view_coachingclass",
        "coachings.can_accept_coaching_as_teacher",
        "coachings.can_reject_coaching_as_teacher",
        "coachings.view_coachingparticipant",
        # classes (read-only)
        "classes.view_classe",
        "classes.view_classemember",
        *MESSAGING_PERMISSIONS,
    ],
    "parent": [
        "accounts.view_user",
        "studios.view_studio",
        "modality.view_modality",
        # availability (read-only — see teacher availability)
        "availability.view_teacheravailability",
        # coaching: request on behalf of dependents + confirm attendance
        "coachings.view_coachingclass",
        "coachings.add_coachingclass",
        "coachings.view_coachingparticipant",
        "coachings.can_confirm_dependent_coaching_attendance",
        # classes (read-only — see children's classes)
        "classes.view_classe",
        "classes.view_classemember",
        # billing (view own children's entries)
        "billing.view_billingentry",
        "billing.view_fine",
        # marketplace
        *MARKETPLACE_PERMISSIONS_USER,
        *MESSAGING_PERMISSIONS,
    ],
    "student": [
        "accounts.view_user",
        "accounts.can_participate_in_coaching",
        "studios.view_studio",
        "modality.view_modality",
        # availability (read-only — see teacher availability)
        "availability.view_teacheravailability",
        # coaching: request + participate
        "coachings.view_coachingclass",
        "coachings.add_coachingclass",
        "coachings.view_coachingparticipant",
        "coachings.add_coachingparticipant",
        # classes (read-only — see own classes)
        "classes.view_classe",
        "classes.view_classemember",
        # billing (view own entries)
        "billing.view_billingentry",
        "billing.view_fine",
        # marketplace
        *MARKETPLACE_PERMISSIONS_USER,
        *MESSAGING_PERMISSIONS,
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
