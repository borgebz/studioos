from rest_framework import serializers
from billing.models import CoachingBillingEntry, Fine, BillingStatus

# Coaching Billing Serializers


class CoachingBillingEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for reading coaching billing records.
    Used in list and detail views to show how much a student owes for a class.
    """

    # Enforce ChoiceField for enums as per project rules
    status = serializers.ChoiceField(choices=BillingStatus.choices)

    # Optional: You could add source="student.email" to show the email in the list
    student_email = serializers.EmailField(source="student.email", read_only=True)

    class Meta:
        model = CoachingBillingEntry
        fields = [
            "id",
            "student",
            "student_email",
            "coaching",
            "amount",
            "status",
            "created_at",
            "updated_at",
        ]
        # Timestamps and IDs should always be read-only
        read_only_fields = ["id", "created_at", "updated_at"]


# Fine Serializers


class FineSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed reading of Fines.
    Provides full context including the issuer and resolution data.
    """

    status = serializers.ChoiceField(choices=BillingStatus.choices)
    student_email = serializers.EmailField(source="student.email", read_only=True)
    issued_by_email = serializers.EmailField(source="issued_by.email", read_only=True)

    class Meta:
        model = Fine
        fields = [
            "id",
            "student",
            "student_email",
            "coaching",
            "reason",
            "amount",
            "status",
            "issued_by",
            "issued_by_email",
            "resolved_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "resolved_at"]


class FineCreateSerializer(serializers.ModelSerializer):
    """
    Input serializer for creating a new fine.
    Fields like 'status' and 'issued_by' are handled by the service layer.
    """

    class Meta:
        model = Fine
        fields = [
            "student",
            "coaching",
            "reason",
            "amount",
            "notes",
        ]

    def validate_amount(self, value):
        """Check that the fine amount is not negative."""
        if value <= 0:
            # PascalCase error code as per project standards
            raise serializers.ValidationError("FineAmountMustBePositive")
        return value


class FineUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for partial updates (PATCH) on Fines.
    Typically used to mark a fine as PAID or CANCELLED.
    """

    status = serializers.ChoiceField(choices=BillingStatus.choices, required=False)

    class Meta:
        model = Fine
        fields = [
            "status",
            "notes",
        ]
