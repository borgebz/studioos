from django.conf import settings
from django.db import models
import uuid
from core.models import BaseModel

# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------


class EnrollmentStatus(models.TextChoices):
    SUBMITTED = "submitted", "Submitted"
    UNDER_REVIEW = "under_review", "Under Review"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"
    CANCELLED = "cancelled", "Cancelled"


class EnrollmentType(models.TextChoices):
    NEW = "new", "New"
    RENEWAL = "renewal", "Renewal"


class PaymentType(models.TextChoices):
    ENROLLMENT_FEE = "enrollment_fee", "Enrollment Fee"
    INSURANCE = "insurance", "Insurance"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"


class ConsentType(models.TextChoices):
    RGPD = "rgpd", "RGPD / Data Processing"
    INTERNAL_REGULATION = "internal_regulation", "Internal Regulation"


class PeriodType(models.TextChoices):
    NEW = "new", "New Enrollments"
    RENEWAL = "renewal", "Renewals"
    BOTH = "both", "New & Renewals"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class EnrollmentPeriod(BaseModel):
    """
    A window during which enrollments can be submitted.
    The school opens a period for a given academic year and type.
    """

    academic_year = models.CharField(
        max_length=9,
        help_text="Format: 2025/2026",
    )
    period_type = models.CharField(
        max_length=50,
        choices=PeriodType.choices,
        default=PeriodType.BOTH,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    is_open = models.BooleanField(default=False)

    # --- Pricing (null = not required for this window) ---
    enrollment_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Matrícula fee. Null means not required.",
    )
    insurance_general = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Insurance for general regime. Null means not required.",
    )
    insurance_intensive = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Insurance for intensive regime. Null means not required.",
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        status = "open" if self.is_open else "closed"
        return f"{self.academic_year} — {self.period_type} ({status})"


class Enrollment(BaseModel):
    """
    A matrícula / inscrição submission for a given academic year.
    Stores a snapshot of the submitted data regardless of whether the
    student / parent already has a User account.
    """

    # --- Link to existing users (set when accounts are created/matched) ---
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments_as_student",
    )
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments_as_parent",
    )

    # --- Enrollment period ---
    period = models.ForeignKey(
        EnrollmentPeriod,
        on_delete=models.PROTECT,
        related_name="enrollments",
    )

    # --- Enrollment metadata ---
    status = models.CharField(
        max_length=50,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.SUBMITTED,
    )
    enrollment_type = models.CharField(
        max_length=50,
        choices=EnrollmentType.choices,
        default=EnrollmentType.NEW,
    )

    # --- Student snapshot ---
    student_email = models.EmailField()
    student_name = models.CharField(max_length=255)
    student_date_of_birth = models.DateField()
    student_nif = models.CharField(max_length=20, blank=True, default="")
    student_nationality = models.CharField(max_length=100, blank=True, default="")
    student_document_number = models.CharField(max_length=50, blank=True, default="")
    student_document_expiry = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")

    # --- Parent / guardian snapshot ---
    parent_name = models.CharField(max_length=255)
    parent_email = models.EmailField()
    parent_phone = models.CharField(max_length=30)
    parent_phone_country_code = models.CharField(max_length=5, blank=True, default="")

    # --- Dance history ---
    historical_notes = models.TextField(
        blank=True,
        default="",
        help_text="Prior dance experience: school, level, modality, exams, observations.",
    )

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("can_review_enrollment", "Can view and review enrollments"),
            ("can_approve_enrollment", "Can approve an enrollment"),
            ("can_reject_enrollment", "Can reject an enrollment"),
            ("can_cancel_enrollment", "Can cancel an enrollment"),
            ("can_manage_periods", "Can create and manage enrollment periods"),
            (
                "can_manage_enrollment_payments",
                "Can create and confirm enrollment payments",
            ),
        ]

    def __str__(self):
        return f"{self.student_name} — {self.period.academic_year} ({self.status})"


class EnrollmentModality(BaseModel):
    """
    Modalities selected during enrollment.
    An enrollment must have at least one (enforced at service level).
    """

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="enrollment_modalities",
    )
    modality = models.ForeignKey(
        "studios.Modality",
        on_delete=models.PROTECT,
        related_name="enrollment_modalities",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "modality"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_enrollment_modality",
            ),
        ]

    def __str__(self):
        return f"{self.enrollment} — {self.modality.name}"


class EnrollmentFile(BaseModel):
    """
    Files attached to an enrollment (e.g. payment proof).
    Uses Django's FileField — files are stored in MEDIA_ROOT.
    """

    def enrollment_file_path(instance, filename):
        from pathlib import Path

        ext = Path(filename).suffix.lower()
        return f"enrollments/files/{uuid.uuid4()}{ext}"

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="files",
    )
    file = models.FileField(upload_to=enrollment_file_path)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100, blank=True, default="")

    def __str__(self):
        return f"{self.enrollment} — {self.original_filename}"


class EnrollmentConsent(BaseModel):
    """
    Tracks explicit consent given during enrollment
    (RGPD, internal regulation acceptance, etc.).
    """

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="consents",
    )
    consent_type = models.CharField(
        max_length=50,
        choices=ConsentType.choices,
    )
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["enrollment", "consent_type"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_enrollment_consent",
            ),
        ]

    def __str__(self):
        status = "accepted" if self.accepted else "pending"
        return f"{self.enrollment} — {self.consent_type} ({status})"


class EnrollmentPayment(BaseModel):
    """
    Payment confirmation records created by direction.
    Direction reviews uploaded payment proofs and manually creates
    these entries as the source of truth for what was paid.
    """

    enrollment = models.ForeignKey(
        Enrollment,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    payment_type = models.CharField(
        max_length=50,
        choices=PaymentType.choices,
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=50,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_enrollment_payments",
    )
    notes = models.TextField(
        blank=True,
        default="",
        help_text="Optional notes from direction about this payment.",
    )

    def __str__(self):
        return f"{self.enrollment} — {self.payment_type} ({self.status})"
