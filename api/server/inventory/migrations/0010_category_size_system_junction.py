from django.db import migrations, models
import django.db.models.deletion


def migrate_category_size_systems(apps, schema_editor):
    """Copy legacy Category.size_system_id values into the new junction table."""
    Category = apps.get_model("inventory", "Category")
    CategorySizeSystem = apps.get_model("inventory", "CategorySizeSystem")
    for cat in Category.objects.filter(size_system__isnull=False):
        CategorySizeSystem.objects.create(
            category=cat,
            size_system=cat.size_system,
            sort_order=0,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0009_variantbooking_listing_alter_productvariant_status_and_more"),
    ]

    operations = [
        # 1. Create junction table
        migrations.CreateModel(
            name="CategorySizeSystem",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("sort_order", models.IntegerField(default=0)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="size_systems",
                        to="inventory.category",
                    ),
                ),
                (
                    "size_system",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="category_links",
                        to="inventory.sizesystem",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order"],
            },
        ),
        migrations.AddConstraint(
            model_name="categorysizesystem",
            constraint=models.UniqueConstraint(
                fields=["category", "size_system"],
                name="inventory_categorysizesystem_uniq",
            ),
        ),
        # 2. Data-migrate existing FK values into the junction
        migrations.RunPython(
            migrate_category_size_systems,
            migrations.RunPython.noop,
        ),
        # 3. Drop the old FK column from Category
        migrations.RemoveField(
            model_name="category",
            name="size_system",
        ),
    ]
