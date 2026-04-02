from rest_framework.exceptions import ValidationError
from .models import Studio, Modality


def create_studio(data):
    return Studio.objects.create(**data)


def create_modality(data):
    studio_ids = data.pop("allowed_studio_ids", [])

    # Validação de Idades
    min_age = data.get("min_age_months")
    max_age = data.get("max_age_months")

    if min_age is not None and max_age is not None and min_age > max_age:
        raise ValidationError({"messages": ["InvalidAgeRange"]})

    # Validação dos Estúdios
    studios = Studio.objects.filter(id__in=studio_ids)
    if len(studios) != len(studio_ids):
        raise ValidationError({"messages": ["OneOrMoreStudiosNotFound"]})

    # Criar e associar
    modality = Modality.objects.create(**data)
    modality.studios.set(studios)

    return modality
