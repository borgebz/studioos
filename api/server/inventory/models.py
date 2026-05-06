import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel


def product_media_upload_to(instance, filename):
    ext = Path(filename).suffix.lower()
    return f"products/{uuid.uuid4()}{ext}"


# Size System Model
class SizeSystem(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


# Categories Model
class Category(BaseModel):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="children"
    )
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    size_system = models.ForeignKey(
        SizeSystem, null=True, blank=True, on_delete=models.SET_NULL
    )

    def __str__(self):
        return self.name


# Size Model
class Size(BaseModel):
    name = models.CharField(max_length=50)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    size_system = models.ForeignKey(
        SizeSystem, on_delete=models.CASCADE, related_name="sizes"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name", "size_system"],
                condition=models.Q(deleted_at__isnull=True),
                name="inventory_size_name_system_active_uniq",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.size_system})"


# Color Model
class Color(BaseModel):
    name = models.CharField(max_length=100)
    hex_code = models.CharField(max_length=7)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(deleted_at__isnull=True),
                name="inventory_color_name_active_uniq",
            ),
            models.UniqueConstraint(
                fields=["hex_code"],
                condition=models.Q(deleted_at__isnull=True),
                name="inventory_color_hex_code_active_uniq",
            ),
        ]

    def __str__(self):
        return self.name


# Product Model
class Product(BaseModel):

    class OwnerType(models.TextChoices):
        SCHOOL = "school", "School"
        MEMBER = "member", "Member"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        ARCHIVED = "archived", "Archived"

    owner_type = models.CharField(max_length=20, choices=OwnerType.choices)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True
    )

    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    target_gender = models.CharField(max_length=50, blank=True, null=True)
    brand = models.CharField(max_length=255, blank=True, null=True)
    material = models.CharField(max_length=255, blank=True, null=True)

    status = models.CharField(max_length=20, choices=Status.choices)

    class Meta:
        permissions = [
            ("view_school_product", "Can view school products"),
            ("add_school_product", "Can add school products"),
            ("change_school_product", "Can change school products"),
            ("delete_school_product", "Can delete school products"),
            ("manage_school_inventory", "Can manage school-owned inventory variants and bookings"),
        ]

    def clean(self):
        super().clean()
        if self.owner_type == self.OwnerType.MEMBER and self.owner_id is None:
            raise ValidationError("ProductMemberRequiresOwner")
        if self.owner_type == self.OwnerType.SCHOOL and self.owner_id is not None:
            raise ValidationError("SchoolProductMustNotHaveOwner")

    def __str__(self):
        return self.name


# Product Variant Model
class ProductVariant(BaseModel):

    class Condition(models.TextChoices):
        NEW = "new"
        EXCELLENT = "excellent"
        GOOD = "good"
        FAIR = "fair"
        DAMAGED = "damaged"

    class Status(models.TextChoices):
        AVAILABLE = "available"
        MAINTENANCE = "maintenance"
        INACTIVE = "inactive"
        SOLD = "sold"
        DONATED = "donated"
        ARCHIVED = "archived"

    class AcquisitionType(models.TextChoices):
        PURCHASED = "purchased"
        DONATED = "donated"
        SCHOOL_OWNED = "school_owned"
        OTHER = "other"

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="variants"
    )

    size = models.ForeignKey(Size, null=True, blank=True, on_delete=models.SET_NULL)

    condition = models.CharField(max_length=20, choices=Condition.choices)
    sku = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(max_length=20, choices=Status.choices)

    acquisition_type = models.CharField(max_length=20, choices=AcquisitionType.choices)
    acquired_at = models.DateTimeField(null=True, blank=True)

    internal_notes = models.TextField(blank=True, null=True)
    public_notes = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["sku"],
                condition=models.Q(deleted_at__isnull=True, sku__isnull=False)
                & ~models.Q(sku=""),
                name="inventory_productvariant_sku_active_uniq",
            ),
        ]
        permissions = [
            ("can_manage_variant_bookings", "Can manage variant bookings"),
        ]

    def __str__(self):
        sku_display = self.sku or "—"
        return f"{self.product.name} - {sku_display}"


# Variant Color Model
class VariantColor(BaseModel):
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="colors"
    )
    color = models.ForeignKey(Color, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["variant", "color"],
                condition=models.Q(deleted_at__isnull=True),
                name="inventory_variantcolor_variant_color_active_uniq",
            ),
        ]


# Product Media Model
class ProductMedia(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="media")

    image = models.ImageField(upload_to=product_media_upload_to)
    is_primary = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)


# Variant Media Model
class VariantMedia(BaseModel):
    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="media_links"
    )
    product_media = models.ForeignKey(ProductMedia, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["variant", "product_media"],
                condition=models.Q(deleted_at__isnull=True),
                name="inventory_variantmedia_variant_media_active_uniq",
            ),
        ]

    def clean(self):
        if self.product_media.product_id != self.variant.product_id:
            raise ValidationError("Media must belong to the same product")


# School Product Details Model
class SchoolProductDetails(BaseModel):
    product = models.OneToOneField(
        Product, on_delete=models.CASCADE, related_name="school_details"
    )

    inventory_code = models.CharField(max_length=100)
    storage_location = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default="")

    def clean(self):
        if self.product.owner_type != Product.OwnerType.SCHOOL:
            raise ValidationError("Only school products can have SchoolProductDetails")


# Variant Booking Model
class VariantBooking(BaseModel):

    class BookingType(models.TextChoices):
        RESERVATION = "reservation"
        LOAN = "loan"
        RENT = "rent"
        SALE = "sale"
        DONATION = "donation"
        SCHOOL_USE = "school_use"
        MAINTENANCE = "maintenance"
        BLOCKED = "blocked"

    class Status(models.TextChoices):
        PENDING = "pending"
        CONFIRMED = "confirmed"
        COMPLETED = "completed"
        BLOCKED = "blocked"
        CANCELLED = "cancelled"

    # Statuses that represent an active hold on the variant —
    # used for overlap checks and delete guards across the codebase.
    ACTIVE_HOLD_STATUSES = (
        Status.PENDING,
        Status.CONFIRMED,
        Status.BLOCKED,
    )

    variant = models.ForeignKey(
        ProductVariant, on_delete=models.CASCADE, related_name="bookings"
    )

    booking_type = models.CharField(max_length=20, choices=BookingType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    actual_start_at = models.DateTimeField(null=True, blank=True)
    actual_end_at = models.DateTimeField(null=True, blank=True)

    listing = models.ForeignKey(
        "marketplace.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )

    approved_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_bookings",
    )

    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def clean(self):
        if self.start_at >= self.end_at:
            raise ValidationError("InvalidBookingDateRange")
