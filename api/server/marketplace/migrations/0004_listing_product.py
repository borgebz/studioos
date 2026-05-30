import django.db.models.deletion
from django.db import migrations, models


def assign_products(apps, schema_editor):
    """Point each listing at its variant's product.

    A listing now wraps a whole product. If multiple legacy listings shared the
    same product (the old model allowed it), keep the most recent and drop the
    rest so the OneToOne can be enforced.
    """
    Listing = apps.get_model("marketplace", "Listing")
    seen = set()
    for listing in Listing.objects.all().order_by("-created_at", "-id"):
        product_id = listing.variant.product_id
        if product_id in seen:
            listing.delete()
            continue
        seen.add(product_id)
        listing.product_id = product_id
        listing.save(update_fields=["product"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0003_add_listing_comment"),
        ("inventory", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="product",
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="listing",
                to="inventory.product",
            ),
        ),
        migrations.RunPython(assign_products, noop),
        migrations.AlterField(
            model_name="listing",
            name="product",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="listing",
                to="inventory.product",
            ),
        ),
        migrations.RemoveField(
            model_name="listing",
            name="variant",
        ),
    ]
