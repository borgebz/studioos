from django.core.management.base import BaseCommand
from inventory.models import Size, SizeSystem


class Command(BaseCommand):
    help = "Seed initial sizes for size systems"

    SIZES = [
        # ClothingInternational
        {"size_system": "ClothingInternational", "name": "XXS", "sort_order": 1},
        {"size_system": "ClothingInternational", "name": "XS", "sort_order": 2},
        {"size_system": "ClothingInternational", "name": "S", "sort_order": 3},
        {"size_system": "ClothingInternational", "name": "M", "sort_order": 4},
        {"size_system": "ClothingInternational", "name": "L", "sort_order": 5},
        {"size_system": "ClothingInternational", "name": "XL", "sort_order": 6},
        {"size_system": "ClothingInternational", "name": "XXL", "sort_order": 7},
        {"size_system": "ClothingInternational", "name": "XXXL", "sort_order": 8},
        # ClothingEU
        {"size_system": "ClothingEU", "name": "32", "sort_order": 1},
        {"size_system": "ClothingEU", "name": "34", "sort_order": 2},
        {"size_system": "ClothingEU", "name": "36", "sort_order": 3},
        {"size_system": "ClothingEU", "name": "38", "sort_order": 4},
        {"size_system": "ClothingEU", "name": "40", "sort_order": 5},
        {"size_system": "ClothingEU", "name": "42", "sort_order": 6},
        {"size_system": "ClothingEU", "name": "44", "sort_order": 7},
        {"size_system": "ClothingEU", "name": "46", "sort_order": 8},
        {"size_system": "ClothingEU", "name": "48", "sort_order": 9},
        {"size_system": "ClothingEU", "name": "50", "sort_order": 10},
        {"size_system": "ClothingEU", "name": "52", "sort_order": 11},
        # ShoesEU (full range — teachers and adults included)
        {"size_system": "ShoesEU", "name": "35", "sort_order": 1},
        {"size_system": "ShoesEU", "name": "36", "sort_order": 2},
        {"size_system": "ShoesEU", "name": "37", "sort_order": 3},
        {"size_system": "ShoesEU", "name": "38", "sort_order": 4},
        {"size_system": "ShoesEU", "name": "39", "sort_order": 5},
        {"size_system": "ShoesEU", "name": "40", "sort_order": 6},
        {"size_system": "ShoesEU", "name": "41", "sort_order": 7},
        {"size_system": "ShoesEU", "name": "42", "sort_order": 8},
        {"size_system": "ShoesEU", "name": "43", "sort_order": 9},
        {"size_system": "ShoesEU", "name": "44", "sort_order": 10},
        {"size_system": "ShoesEU", "name": "45", "sort_order": 11},
        {"size_system": "ShoesEU", "name": "46", "sort_order": 12},
        # KidsAge (dance school starts at 2.5 years — Baby Class I)
        {"size_system": "KidsAge", "name": "2Y", "sort_order": 1},
        {"size_system": "KidsAge", "name": "3Y", "sort_order": 2},
        {"size_system": "KidsAge", "name": "4Y", "sort_order": 3},
        {"size_system": "KidsAge", "name": "5Y", "sort_order": 4},
        {"size_system": "KidsAge", "name": "6Y", "sort_order": 5},
        {"size_system": "KidsAge", "name": "7Y", "sort_order": 6},
        {"size_system": "KidsAge", "name": "8Y", "sort_order": 7},
        {"size_system": "KidsAge", "name": "9Y", "sort_order": 8},
        {"size_system": "KidsAge", "name": "10Y", "sort_order": 9},
        # KidsHeight (92 cm = ~2.5 years, matches youngest dance students)
        {"size_system": "KidsHeight", "name": "92 cm", "sort_order": 1},
        {"size_system": "KidsHeight", "name": "98 cm", "sort_order": 2},
        {"size_system": "KidsHeight", "name": "104 cm", "sort_order": 3},
        {"size_system": "KidsHeight", "name": "110 cm", "sort_order": 4},
        {"size_system": "KidsHeight", "name": "116 cm", "sort_order": 5},
        # OneSize
        {"size_system": "OneSize", "name": "One Size", "sort_order": 1},
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        for item in self.SIZES:
            try:
                size_system = SizeSystem.all_objects.get(name=item["size_system"])
            except SizeSystem.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Missing SizeSystem: {item['size_system']}")
                )
                skipped += 1
                continue

            obj, was_created = Size.all_objects.update_or_create(
                name=item["name"],
                size_system=size_system,
                defaults={
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

            if obj.is_deleted:
                skipped += 1
                self.stdout.write(
                    f"Skipped (deleted): {obj.name} ({size_system.name})"
                )
            elif was_created:
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created: {obj.name} ({size_system.name})")
                )
            else:
                updated += 1
                self.stdout.write(
                    self.style.WARNING(f"Updated: {obj.name} ({size_system.name})")
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created}, updated {updated}, skipped {skipped}."
            )
        )
