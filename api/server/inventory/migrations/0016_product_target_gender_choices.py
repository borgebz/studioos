from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        (
            "inventory",
            "0015_remove_productvariant_inventory_productvariant_sku_active_uniq",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="product",
            name="target_gender",
            field=models.CharField(
                blank=True,
                choices=[
                    ("female", "Female"),
                    ("male", "Male"),
                    ("unisex", "Unisex"),
                ],
                max_length=50,
                null=True,
            ),
        ),
    ]
