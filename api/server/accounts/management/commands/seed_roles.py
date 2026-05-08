from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from accounts.models import Role

ROLES = [
    {
        "code": "direction",
        "name": "Direction",
        "description": "Direction",
    },
    {
        "code": "coordination",
        "name": "Coordination",
        "description": "Coordination",
    },
    {
        "code": "collaborator",
        "name": "Collaborator",
        "description": "Collaborator",
    },
    {
        "code": "teacher",
        "name": "Teacher",
        "description": "Teacher",
    },
    {
        "code": "teacher_external",
        "name": "ExternalTeacher",
        "description": "ExternalTeacher",
    },
    {
        "code": "parent",
        "name": "Parent",
        "description": "Parent",
    },
    {
        "code": "student",
        "name": "Student",
        "description": "Student",
    },
]


class Command(BaseCommand):
    help = "Seed default roles. Idempotent."

    def handle(self, *args, **options):
        for role_data in ROLES:
            group, _ = Group.objects.get_or_create(name=role_data["name"])
            obj, created = Role.all_objects.get_or_create(
                code=role_data["code"],
                defaults={
                    "group": group,
                    "description": role_data["description"],
                },
            )
            if obj.is_deleted:
                status = "skipped (deleted)"
            elif created:
                status = "created"
            else:
                status = "exists"
            self.stdout.write(f"  {role_data['code']}: {status}")

        self.stdout.write(self.style.SUCCESS("Seed complete."))
