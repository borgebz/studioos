import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("enrollments", "0001_initial"),
        ("modality", "0001_initial"),
        ("studios", "0002_move_modality_to_modality_app"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="enrollmentmodality",
                    name="modality",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="enrollment_modalities",
                        to="modality.modality",
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
