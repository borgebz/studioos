from django.core.management.base import BaseCommand

from modality.models import Modality

MODALITIES = [
    {
        "name": "Baby Class I",
        "description": "Dos 2 anos e meio aos 3 anos e 11 meses. Aula à semana.",
        "min_age_months": 30,
        "max_age_months": 47,
    },
    {
        "name": "Baby Class II",
        "description": "Dos 4 anos aos 4 anos e 11 meses. Aula à semana.",
        "min_age_months": 48,
        "max_age_months": 59,
    },
    {
        "name": "Baby Class I/II Sábado",
        "description": "Baby Class ao sábado.",
        "min_age_months": 30,
        "max_age_months": 59,
    },
    {
        "name": "Ballet Clássico",
        "description": "A partir dos 5 anos, com preparação para exames Royal Academy of Dance.",
        "min_age_months": 60,
    },
    {
        "name": "Dança Contemporânea 1x por semana",
        "description": "A partir dos 5 anos. Uma aula por semana.",
        "min_age_months": 60,
    },
    {
        "name": "Dança Contemporânea 2x por semana",
        "description": "A partir dos 5 anos. Duas aulas por semana.",
        "min_age_months": 60,
    },
    {
        "name": "Hip-Hop",
        "description": "",
    },
    {
        "name": "Dança Jazz",
        "description": "",
    },
    {
        "name": "Ginástica Acrobática",
        "description": "",
    },
    {
        "name": "Regime Intensivo de Estudos em Dança",
        "description": "Horários e disciplinas dependem de contacto com a escola.",
    },
    {
        "name": "Acrodance",
        "description": "",
    },
    {
        "name": "Comercial & Fusion",
        "description": "",
    },
    {
        "name": "Teatro Musical",
        "description": "",
    },
    {
        "name": "Acrodance Kids",
        "description": "Para crianças de 4 e 5 anos.",
        "min_age_months": 48,
        "max_age_months": 71,
    },
    {
        "name": "Jazz Adultos",
        "description": "",
    },
    {
        "name": "Dança Contemporânea Adultos",
        "description": "",
    },
    {
        "name": "Ballet Adultos",
        "description": "",
    },
    {
        "name": "Body Balance Adultos",
        "description": "",
    },
    {
        "name": "PBT / Barre / Solo Barre",
        "description": "",
    },
    {
        "name": "Flexibilidade",
        "description": "",
    },
    {
        "name": "Sevilhanas & Flamenco",
        "description": "",
    },
]


class Command(BaseCommand):
    help = (
        "Seed the database with StudioOS modalities from the 2025/2026 matrícula form."
    )

    def handle(self, *args, **options):
        created_count = 0
        existing_count = 0

        for entry in MODALITIES:
            _, created = Modality.objects.get_or_create(
                name=entry["name"],
                defaults={
                    "description": entry.get("description", ""),
                    "max_capacity": entry.get("max_capacity"),
                    "min_age_months": entry.get("min_age_months"),
                    "max_age_months": entry.get("max_age_months"),
                },
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  Created: {entry['name']}"))
            else:
                existing_count += 1
                self.stdout.write(f"  Already exists: {entry['name']}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_count}, skipped {existing_count} existing."
            )
        )
