from django.core.management.base import BaseCommand
from inventory.models import Color


class Command(BaseCommand):
    help = "Seed initial colors"

    COLORS = [
        {"name": "Black", "hex_code": "#000000", "is_active": True},
        {"name": "White", "hex_code": "#FFFFFF", "is_active": True},
        {"name": "Blue", "hex_code": "#2563EB", "is_active": True},
        {"name": "Pink", "hex_code": "#EC4899", "is_active": True},
        {"name": "Red", "hex_code": "#DC2626", "is_active": True},
        {"name": "Green", "hex_code": "#16A34A", "is_active": True},
        {"name": "Yellow", "hex_code": "#EAB308", "is_active": True},
        {"name": "Gray", "hex_code": "#6B7280", "is_active": True},
        {"name": "Brown", "hex_code": "#92400E", "is_active": True},
        {"name": "Beige", "hex_code": "#D6C6A5", "is_active": True},
        {"name": "Purple", "hex_code": "#7C3AED", "is_active": True},
        {"name": "Orange", "hex_code": "#EA580C", "is_active": True},
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        for item in self.COLORS:
            obj, was_created = Color.all_objects.update_or_create(
                name=item["name"],
                defaults={
                    "hex_code": item["hex_code"],
                    "is_active": item["is_active"],
                },
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
            self.style.SUCCESS(
                f"Done. Created {created}, updated {updated}, skipped {skipped}."
            )
        )
