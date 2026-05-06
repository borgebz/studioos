from datetime import date
from decimal import Decimal

from rest_framework import serializers

from enrollments.models import (
    Enrollment,
    EnrollmentConsent,
    EnrollmentFile,
    EnrollmentModality,
    EnrollmentPayment,
    EnrollmentPeriod,
    EnrollmentStatus,
    EnrollmentType,
    ConsentType,
)

# ---------------------------------------------------------------------------
# List / filter query
# ---------------------------------------------------------------------------


class EnrollmentListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=EnrollmentStatus.choices, required=False)
    academic_year = serializers.CharField(required=False)
    enrollment_type = serializers.ChoiceField(
        choices=EnrollmentType.choices, required=False
    )


# ---------------------------------------------------------------------------
# Enrollment Period
# ---------------------------------------------------------------------------


class EnrollmentPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentPeriod
        fields = [
            "id",
            "academic_year",
            "period_type",
            "start_date",
            "end_date",
            "is_open",
            "enrollment_fee",
            "insurance_general",
            "insurance_intensive",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start is not None and end is not None and end < start:
            raise serializers.ValidationError({"end_date": ["PeriodEndBeforeStart"]})
        return attrs


# ---------------------------------------------------------------------------
# Nested read serializers (used inside Enrollment responses)
# ---------------------------------------------------------------------------


class EnrollmentModalityReadSerializer(serializers.ModelSerializer):
    modality_id = serializers.IntegerField(source="modality.id")
    modality_name = serializers.CharField(source="modality.name")

    class Meta:
        model = EnrollmentModality
        fields = ["id", "modality_id", "modality_name"]
        read_only_fields = fields


class EnrollmentFileReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentFile
        fields = ["id", "file", "original_filename", "mime_type", "created_at"]
        read_only_fields = fields


class EnrollmentConsentReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentConsent
        fields = [
            "id",
            "consent_type",
            "accepted",
            "accepted_at",
        ]
        read_only_fields = fields


class EnrollmentPaymentReadSerializer(serializers.ModelSerializer):
    confirmed_by_email = serializers.EmailField(
        source="confirmed_by.email",
        read_only=True,
        default=None,
    )

    class Meta:
        model = EnrollmentPayment
        fields = [
            "id",
            "payment_type",
            "amount",
            "status",
            "confirmed_by",
            "confirmed_by_email",
            "notes",
            "created_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Enrollment read (detail / list responses)
# ---------------------------------------------------------------------------


class EnrollmentReadSerializer(serializers.ModelSerializer):
    period = EnrollmentPeriodSerializer(read_only=True)
    enrollment_modalities = EnrollmentModalityReadSerializer(many=True, read_only=True)
    files = EnrollmentFileReadSerializer(many=True, read_only=True)
    consents = EnrollmentConsentReadSerializer(many=True, read_only=True)
    payments = EnrollmentPaymentReadSerializer(many=True, read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "student",
            "parent",
            "period",
            "status",
            "enrollment_type",
            # student snapshot
            "student_email",
            "student_name",
            "student_date_of_birth",
            "student_nif",
            "student_nationality",
            "student_document_number",
            "student_document_expiry",
            "address",
            "postal_code",
            # parent snapshot
            "parent_name",
            "parent_email",
            "parent_phone",
            "parent_phone_country_code",
            # other
            "historical_notes",
            # nested
            "enrollment_modalities",
            "files",
            "consents",
            "payments",
            # timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Enrollment submit (input)
# ---------------------------------------------------------------------------


class ConsentInputSerializer(serializers.Serializer):
    consent_type = serializers.ChoiceField(choices=ConsentType.choices)
    accepted = serializers.BooleanField()


class EnrollmentSubmitSerializer(serializers.Serializer):
    """
    Input serializer for enrollment submission.
    Validates the flat enrollment data + nested modalities and consents.
    The service layer handles all the creation logic.
    """

    # optional: submit to a specific open period instead of auto-detecting
    period_id = serializers.IntegerField(required=False, allow_null=True)

    # enrollment data
    enrollment_type = serializers.ChoiceField(
        choices=EnrollmentType.choices,
        default=EnrollmentType.NEW,
    )
    student_email = serializers.EmailField()
    student_name = serializers.CharField(max_length=255)
    student_date_of_birth = serializers.DateField()

    def validate_student_date_of_birth(self, value):
        if value >= date.today():
            raise serializers.ValidationError("DateOfBirthMustBeInPast")
        return value

    student_nif = serializers.CharField(max_length=20, required=False, default="")
    student_nationality = serializers.CharField(
        max_length=100, required=False, default=""
    )
    student_document_number = serializers.CharField(
        max_length=50, required=False, default=""
    )
    student_document_expiry = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, default="")
    postal_code = serializers.CharField(max_length=20, required=False, default="")
    parent_name = serializers.CharField(max_length=255)
    parent_email = serializers.EmailField()
    parent_phone = serializers.CharField(max_length=30)
    parent_phone_country_code = serializers.CharField(
        max_length=5, required=False, default=""
    )
    historical_notes = serializers.CharField(required=False, default="")

    # nested
    modality_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
    )
    consents = ConsentInputSerializer(many=True, required=False)
    # multipart-friendly alternative to `consents` (both required if `consents` omitted)
    consent_rgpd = serializers.BooleanField(required=False, write_only=True)
    consent_internal_regulation = serializers.BooleanField(
        required=False, write_only=True
    )

    def validate(self, attrs):
        consents = attrs.get("consents") or []
        if consents:
            attrs.pop("consent_rgpd", None)
            attrs.pop("consent_internal_regulation", None)
            return attrs

        flat_rgpd = attrs.pop("consent_rgpd", None)
        flat_ir = attrs.pop("consent_internal_regulation", None)
        if flat_rgpd is None or flat_ir is None:
            raise serializers.ValidationError(
                {"messages": ["ConsentsOrConsentFlagsRequired"]},
            )
        attrs["consents"] = [
            {"consent_type": ConsentType.RGPD, "accepted": bool(flat_rgpd)},
            {
                "consent_type": ConsentType.INTERNAL_REGULATION,
                "accepted": bool(flat_ir),
            },
        ]
        return attrs

    def get_enrollment_data(self):
        """Extract only the Enrollment model fields from validated data."""
        data = self.validated_data.copy()
        data.pop("modality_ids", None)
        data.pop("consents", None)
        data.pop("period_id", None)
        return data


class FileUploadSerializer(serializers.Serializer):
    """Separate serializer for file uploads (multipart)."""

    file = serializers.FileField()
    original_filename = serializers.CharField(max_length=255, required=False)
    mime_type = serializers.CharField(max_length=100, required=False, default="")

    ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    def validate_file(self, value):
        from pathlib import Path

        ext = Path(value.name).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("FileTypeNotSupported")
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError("FileSizeExceeds10MB")
        return value

    def validate(self, data):
        if "original_filename" not in data or not data["original_filename"]:
            data["original_filename"] = data["file"].name
        return data


# ---------------------------------------------------------------------------
# Enrollment update (data fields only — no status, no period)
# ---------------------------------------------------------------------------


class EnrollmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        fields = [
            "student_email",
            "student_name",
            "student_date_of_birth",
            "student_nif",
            "student_nationality",
            "student_document_number",
            "student_document_expiry",
            "address",
            "postal_code",
            "parent_name",
            "parent_email",
            "parent_phone",
            "parent_phone_country_code",
            "historical_notes",
        ]


# ---------------------------------------------------------------------------
# Payment (direction-managed)
# ---------------------------------------------------------------------------


class EnrollmentPaymentCreateSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01")
    )

    class Meta:
        model = EnrollmentPayment
        fields = [
            "payment_type",
            "amount",
            "notes",
        ]
