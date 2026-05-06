from django.core.management.base import BaseCommand
from inventory.models import Category, CategorySizeSystem, SizeSystem


class Command(BaseCommand):
    help = "Seed initial inventory categories for StudioOS"

    # Each entry:
    #   name           – category name
    #   parent         – parent category name (None = root)
    #   sort_order     – display order within parent level
    #   size_systems   – list of SizeSystem names to link (ordered); empty = no sizes
    CATEGORIES = [
        # ── ROOT CATEGORIES ──────────────────────────────────────────────────────
        {
            "name": "Vestuário de Treino",
            "parent": None,
            "sort_order": 1,
            "size_systems": [],
        },
        {
            "name": "Figurinos de Espetáculo",
            "parent": None,
            "sort_order": 2,
            "size_systems": [],
        },
        {
            "name": "Calçado",
            "parent": None,
            "sort_order": 3,
            "size_systems": [],
        },
        {
            "name": "Acessórios de Dança",
            "parent": None,
            "sort_order": 4,
            "size_systems": [],
        },
        {
            "name": "Adereços de Cena",
            "parent": None,
            "sort_order": 5,
            "size_systems": [],
        },
        {
            "name": "Cenografia e Palco",
            "parent": None,
            "sort_order": 6,
            "size_systems": [],
        },
        {
            "name": "Material de Treino",
            "parent": None,
            "sort_order": 7,
            "size_systems": [],
        },
        {
            "name": "Maquilhagem e Caracterização",
            "parent": None,
            "sort_order": 8,
            "size_systems": [],
        },
        # ── VESTUÁRIO DE TREINO ───────────────────────────────────────────────────
        # Collants, bodies, leotards — core dance training wear; adults use intl + EU,
        # kids use age + height (two systems visible simultaneously).
        {
            "name": "Collants e Bodies",
            "parent": "Vestuário de Treino",
            "sort_order": 1,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Leggings e Calças",
            "parent": "Vestuário de Treino",
            "sort_order": 2,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Saias de Ensaio",
            "parent": "Vestuário de Treino",
            "sort_order": 3,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Tops e T-Shirts",
            "parent": "Vestuário de Treino",
            "sort_order": 4,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Agasalhos e Casacos",
            "parent": "Vestuário de Treino",
            "sort_order": 5,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        # Socks/tights are one-size or generic intl — no EU numeric makes sense here.
        {
            "name": "Meias e Collants de Dança",
            "parent": "Vestuário de Treino",
            "sort_order": 6,
            "size_systems": ["ClothingInternational", "KidsAge"],
        },
        # ── FIGURINOS DE ESPETÁCULO ───────────────────────────────────────────────
        {
            "name": "Tutus e Vestidos de Ballet",
            "parent": "Figurinos de Espetáculo",
            "sort_order": 1,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Figurinos de Contemporâneo",
            "parent": "Figurinos de Espetáculo",
            "sort_order": 2,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Figurinos de Jazz",
            "parent": "Figurinos de Espetáculo",
            "sort_order": 3,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Figurinos de Hip-Hop",
            "parent": "Figurinos de Espetáculo",
            "sort_order": 4,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        {
            "name": "Figurinos Temáticos e Fantasias",
            "parent": "Figurinos de Espetáculo",
            "sort_order": 5,
            "size_systems": [
                "ClothingInternational",
                "ClothingEU",
                "KidsAge",
                "KidsHeight",
            ],
        },
        # ── CALÇADO ───────────────────────────────────────────────────────────────
        # All dance footwear uses EU numeric sizing (full range 35–46).
        {
            "name": "Sapatilhas de Ballet",
            "parent": "Calçado",
            "sort_order": 1,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Pontas",
            "parent": "Calçado",
            "sort_order": 2,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Sapatilhas de Jazz",
            "parent": "Calçado",
            "sort_order": 3,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Sapatilhas de Contemporâneo",
            "parent": "Calçado",
            "sort_order": 4,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Sapatos de Carácter",
            "parent": "Calçado",
            "sort_order": 5,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Botas de Espetáculo",
            "parent": "Calçado",
            "sort_order": 6,
            "size_systems": ["ShoesEU"],
        },
        {
            "name": "Sapatilhas de Hip-Hop",
            "parent": "Calçado",
            "sort_order": 7,
            "size_systems": ["ShoesEU"],
        },
        # ── ACESSÓRIOS DE DANÇA ───────────────────────────────────────────────────
        # Small accessories: hair, protection, straps — all one-size items.
        {
            "name": "Tiaras e Adereços de Cabeça",
            "parent": "Acessórios de Dança",
            "sort_order": 1,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Luvas",
            "parent": "Acessórios de Dança",
            "sort_order": 2,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Cintos e Suspensórios",
            "parent": "Acessórios de Dança",
            "sort_order": 3,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Joelheiras e Proteções",
            "parent": "Acessórios de Dança",
            "sort_order": 4,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Meias-Pontas e Coberturas",
            "parent": "Acessórios de Dança",
            "sort_order": 5,
            "size_systems": ["OneSize"],
        },
        # ── ADEREÇOS DE CENA ──────────────────────────────────────────────────────
        # Performance props — no sizing needed.
        {
            "name": "Leques e Xailes",
            "parent": "Adereços de Cena",
            "sort_order": 1,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Bastões e Chapéus",
            "parent": "Adereços de Cena",
            "sort_order": 2,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Flores e Bouquets",
            "parent": "Adereços de Cena",
            "sort_order": 3,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Outros Adereços de Mão",
            "parent": "Adereços de Cena",
            "sort_order": 4,
            "size_systems": ["OneSize"],
        },
        # ── CENOGRAFIA E PALCO ────────────────────────────────────────────────────
        # Large set pieces — no meaningful size system.
        {
            "name": "Painéis e Fundos de Cena",
            "parent": "Cenografia e Palco",
            "sort_order": 1,
            "size_systems": [],
        },
        {
            "name": "Mobiliário de Cena",
            "parent": "Cenografia e Palco",
            "sort_order": 2,
            "size_systems": [],
        },
        {
            "name": "Estruturas e Suportes",
            "parent": "Cenografia e Palco",
            "sort_order": 3,
            "size_systems": [],
        },
        # ── MATERIAL DE TREINO ────────────────────────────────────────────────────
        # Studio training equipment — school-owned, no size.
        {
            "name": "Barras Portáteis",
            "parent": "Material de Treino",
            "sort_order": 1,
            "size_systems": [],
        },
        {
            "name": "Colchões e Tapetes",
            "parent": "Material de Treino",
            "sort_order": 2,
            "size_systems": [],
        },
        {
            "name": "Elásticos e Resistências",
            "parent": "Material de Treino",
            "sort_order": 3,
            "size_systems": [],
        },
        {
            "name": "Blocos e Apoios",
            "parent": "Material de Treino",
            "sort_order": 4,
            "size_systems": [],
        },
        # ── MAQUILHAGEM E CARACTERIZAÇÃO ─────────────────────────────────────────
        {
            "name": "Maquilhagem de Palco",
            "parent": "Maquilhagem e Caracterização",
            "sort_order": 1,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Perucas",
            "parent": "Maquilhagem e Caracterização",
            "sort_order": 2,
            "size_systems": ["OneSize"],
        },
        {
            "name": "Acessórios de Caracterização",
            "parent": "Maquilhagem e Caracterização",
            "sort_order": 3,
            "size_systems": ["OneSize"],
        },
    ]

    def handle(self, *args, **kwargs):
        created = 0
        updated = 0
        skipped = 0

        # Pre-load all size systems into memory to avoid repeated DB hits.
        size_system_map = {ss.name: ss for ss in SizeSystem.objects.all()}

        for item in self.CATEGORIES:
            # Resolve parent
            parent = None
            if item["parent"]:
                try:
                    parent = (
                        Category.objects.get(name=item["parent"], parent=None)
                        if not Category.objects.filter(name=item["parent"]).exists()
                        else Category.objects.get(name=item["parent"])
                    )
                except Category.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Missing parent: {item['parent']} — skipping {item['name']}"
                        )
                    )
                    skipped += 1
                    continue
                except Category.MultipleObjectsReturned:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Ambiguous parent '{item['parent']}' — skipping {item['name']}"
                        )
                    )
                    skipped += 1
                    continue

            # Resolve size systems
            size_systems = []
            missing_ss = False
            for ss_name in item["size_systems"]:
                ss = size_system_map.get(ss_name)
                if not ss:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Missing SizeSystem '{ss_name}' for '{item['name']}' — skipping"
                        )
                    )
                    missing_ss = True
                    break
                size_systems.append(ss)

            if missing_ss:
                skipped += 1
                continue

            # Upsert category
            category, was_created = Category.objects.update_or_create(
                name=item["name"],
                parent=parent,
                defaults={
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

            # Replace size system links
            CategorySizeSystem.objects.filter(category=category).delete()
            for order, ss in enumerate(size_systems):
                CategorySizeSystem.objects.create(
                    category=category,
                    size_system=ss,
                    sort_order=order,
                )

            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {item['name']}"))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f"Updated: {item['name']}"))

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created}, updated {updated}, skipped {skipped}."
            )
        )
