from django.contrib.auth.base_user import BaseUserManager
from django.core.management.base import BaseCommand, CommandError

from accounts.models import Role, User


class Command(BaseCommand):
    help = (
        "Create or update a superuser and attach a Role (Django Group). "
        "Use after migrate + seed_roles. Intended for local development."
    )

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--first-name", default="Admin")
        parser.add_argument("--last-name", default="User")
        parser.add_argument(
            "--role",
            default="direction",
            help="Role code from seed_roles (default: direction)",
        )

    def handle(self, *args, **options):
        email = BaseUserManager.normalize_email(options["email"].strip())
        if not email:
            raise CommandError("Email is required.")

        try:
            role = Role.objects.select_related("group").get(code=options["role"])
        except Role.DoesNotExist as exc:
            raise CommandError(
                f"Role code {options['role']!r} not found. Run: python manage.py seed_roles"
            ) from exc

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = User.objects.create_superuser(
                email=email,
                password=options["password"],
                first_name=options["first_name"],
                last_name=options["last_name"],
            )
            created = True
        else:
            user.first_name = options["first_name"] or user.first_name
            user.last_name = options["last_name"] or user.last_name
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.set_password(options["password"])
            user.save()
            created = False

        user.groups.add(role.group)

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(f"{action} superuser {email} with role {role.code}.")
        )
