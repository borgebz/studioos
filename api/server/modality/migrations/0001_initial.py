# Modality model moved from studios; initial table name matches studios.0001 (then 0002 → `modality`).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def forwards_contenttype(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    ContentType.objects.filter(app_label="studios", model="modality").update(
        app_label="modality"
    )


def backwards_contenttype(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    ContentType.objects.filter(app_label="modality", model="modality").update(
        app_label="studios"
    )


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("studios", "0001_initial"),
        # Ensure enrollments.0001 (FK to studios.modality) applies before studios.0002
        # removes Modality from the studios migration graph.
        ("enrollments", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="Modality",
                    fields=[
                        (
                            "id",
                            models.BigAutoField(
                                auto_created=True,
                                primary_key=True,
                                serialize=False,
                                verbose_name="ID",
                            ),
                        ),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        (
                            "deleted_at",
                            models.DateTimeField(blank=True, default=None, null=True),
                        ),
                        ("name", models.CharField(max_length=255, unique=True)),
                        ("description", models.TextField(blank=True, default="")),
                        (
                            "max_capacity",
                            models.PositiveIntegerField(
                                blank=True,
                                help_text="Maximum number of students for this modality, if applicable.",
                                null=True,
                            ),
                        ),
                        (
                            "min_age_months",
                            models.PositiveIntegerField(
                                blank=True,
                                help_text="Minimum student age in months for eligibility.",
                                null=True,
                            ),
                        ),
                        (
                            "max_age_months",
                            models.PositiveSmallIntegerField(
                                blank=True,
                                help_text="Maximum student age in months for eligibility.",
                                null=True,
                            ),
                        ),
                        (
                            "created_by",
                            models.ForeignKey(
                                blank=True,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name="+",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                        (
                            "deleted_by",
                            models.ForeignKey(
                                blank=True,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name="+",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                        (
                            "updated_by",
                            models.ForeignKey(
                                blank=True,
                                null=True,
                                on_delete=django.db.models.deletion.SET_NULL,
                                related_name="+",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                    ],
                    options={
                        "verbose_name_plural": "modalities",
                        "ordering": ["name"],
                        "db_table": "studios_modality",
                    },
                ),
            ],
            database_operations=[],
        ),
        migrations.RunPython(forwards_contenttype, backwards_contenttype),
    ]
