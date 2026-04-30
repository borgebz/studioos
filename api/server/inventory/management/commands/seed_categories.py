from django.core.management.base import BaseCommand
from inventory.models import Category, SizeSystem


class Command(BaseCommand):
    help = "Seed initial categories"

    CATEGORIES = [
        {
            "name": "Costumes",
            "parent_category": None,
            "sort_order": 1,
            "is_active": True,
            "size_system": "ClothingAdult",
        },
        {
            "name": "Ballet",
            "parent_category": "Costumes",
            "sort_order": 1,
            "is_active": True,
            "size_system": "ClothingAdult",
        },
        {
            "name": "Contemporary",
            "parent_category": "Costumes",
            "sort_order": 2,
            "is_active": True,
            "size_system": "ClothingAdult",
        },
        {
            "name": "Accessories",
            "parent_category": None,
            "sort_order": 2,
            "is_active": True,
            "size_system": "OneSize",
        },
        {
            "name": "Shoes",
            "parent_category": None,
            "sort_order": 3,
            "is_active": True,
            "size_system": "ShoesEU",
        },
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        for item in self.CATEGORIES:
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

            parent = None

            if item["parent_category"]:
                try:
                    parent = Category.objects.get(
                        name=item["parent_category"]
                    )
                except Category.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Missing Parent Category: {item['parent_category']}"
                        )
                    )
                    skipped += 1
                    continue

            obj, was_created = Category.objects.update_or_create(
                name=item["name"],
                parent=parent,
                defaults={
                    "sort_order": item["sort_order"],
                    "is_active": item["is_active"],
                    "size_system": size_system,
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