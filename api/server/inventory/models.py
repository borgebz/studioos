from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


# Create your models here.
class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

#Size System Model
class SizeSystem(BaseModel):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

#Categories Model
class Category(BaseModel):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    size_system = models.ForeignKey(
        SizeSystem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    def __str__(self):
        return self.name

#Size Model
class Size(BaseModel):
    name = models.CharField(max_length=50)
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    size_system = models.ForeignKey(
        SizeSystem,
        on_delete=models.CASCADE,
        related_name='sizes'
    )

    class Meta:
        unique_together = ('name', 'size_system')

    def __str__(self):
        return f"{self.name} ({self.size_system})"

#Color Model
class Color(BaseModel):
    name = models.CharField(max_length=100)
    hex_code = models.CharField(max_length=7)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

#Product Model
class Product(BaseModel):

    class OwnerType(models.TextChoices):
        SCHOOL = 'school', 'School'
        MEMBER = 'member', 'Member'

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        ARCHIVED = 'archived', 'Archived'

    owner_type = models.CharField(max_length=20, choices=OwnerType.choices)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    target_gender = models.CharField(max_length=50, blank=True, null=True)
    brand = models.CharField(max_length=255, blank=True, null=True)
    material = models.CharField(max_length=255, blank=True, null=True)

    status = models.CharField(max_length=20, choices=Status.choices)

    def __str__(self):
        return self.name

#Product Variant Model
class ProductVariant(BaseModel):

    class Condition(models.TextChoices):
        NEW = 'new'
        EXCELLENT = 'excellent'
        GOOD = 'good'
        FAIR = 'fair'
        DAMAGED = 'damaged'

    class Status(models.TextChoices):
        AVAILABLE = 'available'
        RESERVED = 'reserved'
        IN_USE = 'in_use'
        MAINTENANCE = 'maintenance'
        INACTIVE = 'inactive'
        SOLD = 'sold'
        DONATED = 'donated'

    class AcquisitionType(models.TextChoices):
        PURCHASED = 'purchased'
        DONATED = 'donated'
        SCHOOL_OWNED = 'school_owned'
        OTHER = 'other'

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants'
    )

    size = models.ForeignKey(
        Size,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    condition = models.CharField(max_length=20, choices=Condition.choices)
    sku = models.CharField(max_length=100, unique=True)

    status = models.CharField(max_length=20, choices=Status.choices)

    acquisition_type = models.CharField(max_length=20, choices=AcquisitionType.choices)
    acquired_at = models.DateTimeField(null=True, blank=True)

    internal_notes = models.TextField(blank=True)
    public_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.product.name} - {self.sku}"

#Variant Color Model
class VariantColor(models.Model):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='colors'
    )
    color = models.ForeignKey(Color, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('variant', 'color')

#Product Media Model
class ProductMedia(BaseModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='media'
    )

    image = models.ImageField(upload_to='products/')
    is_primary = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

#Variant Medi Model
class VariantMedia(models.Model):
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='media_links'
    )
    product_media = models.ForeignKey(ProductMedia, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('variant', 'product_media')

    def clean(self):
        if self.product_media.product_id != self.variant.product_id:
            raise ValidationError("Media must belong to the same product")

#School Product Details Model
class SchoolProductDetails(models.Model):
    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name='school_details'
    )

    inventory_code = models.CharField(max_length=100)
    storage_location = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def clean(self):
        if self.product.owner_type != Product.OwnerType.SCHOOL:
            raise ValidationError("Only school products can have SchoolProductDetails")


#Variant Booking Model
class VariantBooking(BaseModel):

    class BookingType(models.TextChoices):
        RESERVATION = 'reservation'
        LOAN = 'loan'
        RENT = 'rent'
        SCHOOL_USE = 'school_use'
        MAINTENANCE = 'maintenance'
        BLOCKED = 'blocked'

    class Status(models.TextChoices):
        PENDING = 'pending'
        CONFIRMED = 'confirmed'
        ACTIVE = 'active'
        COMPLETED = 'completed'
        CANCELLED = 'cancelled'

    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    booking_type = models.CharField(max_length=20, choices=BookingType.choices)
    status = models.CharField(max_length=20, choices=Status.choices)

    start_at = models.DateTimeField()
    end_at = models.DateTimeField()

    actual_start_at = models.DateTimeField(null=True, blank=True)
    actual_end_at = models.DateTimeField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_bookings'
    )

    approved_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_bookings'
    )

    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    def clean(self):
        if self.start_at >= self.end_at:
            raise ValidationError("Invalid time range")

        overlapping = VariantBooking.objects.filter(
            variant=self.variant,
            status__in=[
                self.Status.PENDING,
                self.Status.CONFIRMED,
                self.Status.ACTIVE
            ]
        ).filter(
            start_at__lt=self.end_at,
            end_at__gt=self.start_at
        )

        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError("This variant is already booked for this time range")
