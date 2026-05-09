from django.conf import settings
from django.db import models

from core.models import BaseModel


class Listing(BaseModel):

    class ListingType(models.TextChoices):
        RENT = "rent", "Rent"
        SELL = "sell", "Sell"
        LEND = "lend", "Lend"
        DONATE = "donate", "Donate"

    class ListingStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

    variant = models.ForeignKey(
        "inventory.ProductVariant",
        on_delete=models.CASCADE,
        related_name="listings",
    )
    listing_type = models.CharField(max_length=20, choices=ListingType.choices)
    status = models.CharField(
        max_length=20, choices=ListingStatus.choices, default=ListingStatus.DRAFT
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    asking_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    is_public = models.BooleanField(default=False)

    class Meta:
        permissions = [
            ("manage_school_listings", "Can manage school-owned listings"),
            ("view_own_listings", "Can view own listings"),
            ("view_productlisting", "Can view any listing"),
        ]

    def __str__(self):
        return f"{self.title} ({self.listing_type})"


class ListingFavorite(BaseModel):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="favorites",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listing_favorites",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="marketplace_listingfavorite_listing_user_active_uniq",
            )
        ]

    def __str__(self):
        return f"Favorite: user {self.user_id} → listing {self.listing_id}"


class ListingComment(BaseModel):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listing_comments",
    )
    body = models.TextField()
    parent_comment = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )

    class Meta:
        permissions = [
            ("can_moderate_listingcomment", "Can moderate listing comment"),
        ]

    def __str__(self):
        return f"Comment #{self.pk}"


class ProductTransaction(BaseModel):

    class TransactionType(models.TextChoices):
        RENT = "rent", "Rent"
        SELL = "sell", "Sell"
        LEND = "lend", "Lend"
        DONATE = "donate", "Donate"

    class TransactionStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        COMPLETED = "completed", "Completed"
        REJECTED = "rejected", "Rejected"
        CANCELLED = "cancelled", "Cancelled"
        BLOCKED = "blocked", "Blocked"

    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    variant = models.ForeignKey(
        "inventory.ProductVariant",
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    status = models.CharField(
        max_length=20,
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING,
    )
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="requested_transactions",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="owned_transactions",
    )
    agreed_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_transactions",
    )

    class Meta:
        permissions = [
            ("view_own_transactions", "Can view own transactions"),
            ("view_all_transactions", "Can view any transaction"),
        ]

    def __str__(self):
        return f"Transaction {self.pk} ({self.transaction_type}) — {self.status}"
