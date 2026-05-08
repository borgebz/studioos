from django.core.management.base import BaseCommand
from inventory.models import SizeSystem


class Command(BaseCommand):
    help = "Seed initial size systems"

    SIZE_SYSTEMS = [
        {"name": "ClothingInternational", "is_active": True},
        {"name": "ClothingEU", "is_active": True},
        {"name": "ShoesEU", "is_active": True},
        {"name": "KidsAge", "is_active": True},
        {"name": "KidsHeight", "is_active": True},
        {"name": "OneSize", "is_active": True},
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        for item in self.SIZE_SYSTEMS:
            obj, was_created = SizeSystem.all_objects.update_or_create(
                name=item["name"],
                defaults={"is_active": item["is_active"]},
            )

            if obj.is_deleted:
                skipped += 1
                self.stdout.write(f"Skipped (deleted): {obj.name}")
            elif was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {obj.name}"))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f"Updated: {obj.name}"))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Done. Created {created}, updated {updated}, skipped {skipped}.")
        )
