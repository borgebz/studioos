from email.policy import default

from django.db import models
from django.db import settings

from config.settings import AUTH_USER_MODEL
from core.models import BaseModel

class PaymentStatus(models.TextChoices):
    PENDING = "Pendente", "pendente"
    PAID = "Pago", "pago"
    CANCELLED = "Anulada", "anulada"

class EnrollmentPaymentType(models.TextChoices):
    MATRICULA = "Matricula", "matricula"
    SEGURO = "Seguro", "seguro"

class RegimeType(models.TextChoices):
    GENERAL = "Regime Geral", "geral"
    INTENSIVO = "Regime Intensivo", "intensivo"

class EnrollmentPayment(BaseModel):
    """
    Represents a payment directly associated with a student's enrollment.
    This usually covers fixed annual fees such as registration ('matrícula') and insurance.
    """
    enrollment = models.ForeignKey(
        "enrollments.Enrollment",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    payment_type = models.CharField(max_length=20, choices=EnrollmentPaymentType.choices)
    amount = models.DecimalField(max_digits=6, decimal_places=2)
    regime = models.CharField(max_length=20, choices=RegimeType.choices, null=True, blank=True)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)

    # Tracks which staff member validated this specific payment
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_enrollment_payments",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_payment_type_display()} - {self.amount}€ ({self.status})"

class CoachingBillingEntry(BaseModel):
    """
    Represents an individual billing record for a student's participation in a coaching class.
    For shared classes (like duets or trios), multiple entries will be generated
    (one for each student) by splitting the total price.
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="coaching_bills",
    )

    # The specific coaching session this bill belongs to
    coaching = models.ForeignKey(
        "coachings.CoachingClass",
        on_delete=models.SET_NULL,
        null=True,
        related_name="billing_entries",
    )
    amount = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)

    class Meta:
        verbose_name_plural = "coaching billing entries"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Coaching Bill - {self.student.email} - {self.amount}€"

class Fine(BaseModel):
    """
    Represents a financial penalty applied to a student.
    Can be used for late cancellations or other infractions.
    May optionally be linked to a specific coaching session.
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="fines",
    )

    coaching = models.ForeignKey(
        "coachings.CoachingClass",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="fines",
    )
    reason = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)

    # The staff member who decided to apply this fine
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="issued_fines",
    )

    # When the fine was paid or manually cancelled/resolved by staff
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Fine: {self.student.email} - {self.amount}€"

