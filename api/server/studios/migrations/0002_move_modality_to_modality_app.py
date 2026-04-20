import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("studios", "0001_initial"),
        ("modality", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="studiomodality",
                    name="modality",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="studio_modalities",
                        to="modality.modality",
                    ),
                ),
                migrations.AlterField(
                    model_name="studio",
                    name="modalities",
                    field=models.ManyToManyField(
                        blank=True,
                        related_name="studios",
                        through="studios.StudioModality",
                        to="modality.modality",
                    ),
                ),
                migrations.DeleteModel(name="Modality"),
            ],
            database_operations=[],
        ),
    ]
