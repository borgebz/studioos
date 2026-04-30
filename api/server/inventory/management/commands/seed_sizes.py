from django.core.management.base import BaseCommand
from inventory.models import Size, SizeSystem


class Command(BaseCommand):
    help = "Seed initial sizes for size systems"

    SIZES = [
        # ClothingAdult
        {"name": "XS", "sort_order": 1, "size_system": "ClothingAdult", "is_active": True},
        {"name": "S",  "sort_order": 2, "size_system": "ClothingAdult", "is_active": True},
        {"name": "M",  "sort_order": 3, "size_system": "ClothingAdult", "is_active": True},
        {"name": "L",  "sort_order": 4, "size_system": "ClothingAdult", "is_active": True},

        # ClothingKids
        {"name": "4Y",  "sort_order": 1, "size_system": "ClothingKids", "is_active": True},
        {"name": "6Y",  "sort_order": 2, "size_system": "ClothingKids", "is_active": True},
        {"name": "8Y",  "sort_order": 3, "size_system": "ClothingKids", "is_active": True},
        {"name": "10Y", "sort_order": 4, "size_system": "ClothingKids", "is_active": True},

        # ShoesEU
        {"name": "36", "sort_order": 1, "size_system": "ShoesEU", "is_active": True},
        {"name": "37", "sort_order": 2, "size_system": "ShoesEU", "is_active": True},
        {"name": "38", "sort_order": 3, "size_system": "ShoesEU", "is_active": True},
        {"name": "39", "sort_order": 4, "size_system": "ShoesEU", "is_active": True},

        # OneSize
        {"name": "One Size", "sort_order": 1, "size_system": "OneSize", "is_active": True},
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        for item in self.SIZES:
            try:
                size_system = SizeSystem.objects.get(
                    name=item["size_system"]
                )
            except SizeSystem.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(
                        f"Missing SizeSystem: {item['size_system']}"
                    )
                )
                skipped += 1
                continue

            obj, was_created = Size.objects.update_or_create(
                name=item["name"],
                size_system=size_system,
                defaults={
                    "sort_order": item["sort_order"],
                    "is_active": item["is_active"],
                }
            )

            if was_created:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created: {obj.name}")
                )
            else:
                updated += 1
                self.stdout.write(
                    self.style.WARNING(f"Updated: {obj.name}")
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created}, updated {updated}, skipped {skipped}."
            )
        )