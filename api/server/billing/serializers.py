from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from accounts.serializers import UserResponseSerializer
from billing.models import (
    BillingEntry,
    BillingEntrySourceType,
    BillingEntryStatus,
    Fine,
    FineReason,
    FineStatus,
)
from coachings.models import CoachingClass, CoachingParticipant
from modality.serializers import ModalitySerializer

# -----------------------------------------------------------------------------
# Billing entry serializers
# -----------------------------------------------------------------------------


class CoachingClassBillingSummarySerializer(serializers.ModelSerializer):
    modality = ModalitySerializer(read_only=True)

    class Meta:
        model = CoachingClass
        fields = ["id", "start_datetime", "end_datetime", "modality"]


class CoachingClassBillingDetailSerializer(serializers.ModelSerializer):
    """Extended coaching summary that includes the teacher — used in detail responses."""

    modality = ModalitySerializer(read_only=True)
    teacher = UserResponseSerializer(read_only=True, allow_null=True)

    class Meta:
        model = CoachingClass
        fields = ["id", "start_datetime", "end_datetime", "modality", "teacher"]


class CoachingParticipantBillingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoachingParticipant
        fields = ["id", "status"]


class FineBillingSummarySerializer(serializers.ModelSerializer):
    """Compact fine view embedded in BillingEntry detail/list."""

    reason = serializers.ChoiceField(choices=FineReason.choices, read_only=True)
    status = serializers.ChoiceField(choices=FineStatus.choices, read_only=True)

    class Meta:
        model = Fine
        fields = ["id", "reason", "status", "amount"]


class BillingEntryListSerializer(serializers.ModelSerializer):
    source_type = serializers.ChoiceField(
        choices=BillingEntrySourceType.choices, read_only=True
    )
    status = serializers.ChoiceField(choices=BillingEntryStatus.choices, read_only=True)
    coaching_class = CoachingClassBillingSummarySerializer(
        read_only=True,
        allow_null=True,
    )
    fine = FineBillingSummarySerializer(read_only=True, allow_null=True)

    class Meta:
        model = BillingEntry
        fields = [
            "id",
            "source_type",
            "student_id",
            "amount_due",
            "description",
            "status",
            "coaching_class",
            "fine",
            "created_at",
        ]
        read_only_fields = fields


class BillingEntryDetailSerializer(serializers.ModelSerializer):
    source_type = serializers.ChoiceField(
        choices=BillingEntrySourceType.choices, read_only=True
    )
    status = serializers.ChoiceField(choices=BillingEntryStatus.choices, read_only=True)
    coaching_class = CoachingClassBillingDetailSerializer(read_only=True, allow_null=True)
    coaching_participant = CoachingParticipantBillingSerializer(read_only=True)
    fine = FineBillingSummarySerializer(read_only=True, allow_null=True)

    class Meta:
        model = BillingEntry
        fields = [
            "id",
            "source_type",
            "student_id",
            "amount_due",
            "description",
            "status",
            "exported_at",
            "cancelled_at",
            "notes",
            "coaching_class",
            "coaching_participant",
            "fine",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BillingEntryCancelSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=True, allow_blank=False, trim_whitespace=True
    )

    def validate_notes(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("CancellationNotesRequired")
        return value.strip()


class BillingEntryListQuerySerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False)
    coaching_class_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=BillingEntryStatus.choices, required=False)
    source_type = serializers.ChoiceField(
        choices=BillingEntrySourceType.choices, required=False
    )
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)


# -----------------------------------------------------------------------------
# Fine serializers
# -----------------------------------------------------------------------------


class FineListSerializer(serializers.ModelSerializer):
    reason = serializers.ChoiceField(choices=FineReason.choices, read_only=True)
    status = serializers.ChoiceField(choices=FineStatus.choices, read_only=True)
    coaching_class = CoachingClassBillingSummarySerializer(read_only=True)

    class Meta:
        model = Fine
        fields = [
            "id",
            "reason",
            "status",
            "amount",
            "student_id",
            "coaching_class",
            "reviewed_at",
            "created_at",
        ]
        read_only_fields = fields


class FineDetailSerializer(serializers.ModelSerializer):
    reason = serializers.ChoiceField(choices=FineReason.choices, read_only=True)
    status = serializers.ChoiceField(choices=FineStatus.choices, read_only=True)
    coaching_class = CoachingClassBillingDetailSerializer(read_only=True, allow_null=True)
    coaching_participant = CoachingParticipantBillingSerializer(read_only=True)
    reviewed_by = UserResponseSerializer(read_only=True, allow_null=True)
    suggested_amount = serializers.SerializerMethodField()

    class Meta:
        model = Fine
        fields = [
            "id",
            "reason",
            "status",
            "amount",
            "suggested_amount",
            "student_id",
            "coaching_class",
            "coaching_participant",
            "reviewed_at",
            "reviewed_by",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2))
    def get_suggested_amount(self, obj):
        # Only relevant while pending review; surfaces the env default to the UI.
        from billing.services import get_fine_default_amount

        if obj.status == FineStatus.PENDING_REVIEW:
            return str(get_fine_default_amount())
        return None


class FineApproveSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        help_text="If omitted/null, settings.COACHING_FINE_DEFAULT_AMOUNT is used.",
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class FineWaiveSerializer(serializers.Serializer):
    notes = serializers.CharField(
        required=True, allow_blank=False, trim_whitespace=True
    )

    def validate_notes(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("WaiveNotesRequired")
        return value.strip()


class FineListQuerySerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False)
    coaching_class_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=FineStatus.choices, required=False)
    reason = serializers.ChoiceField(choices=FineReason.choices, required=False)
