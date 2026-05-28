from rest_framework import serializers

from availability.models import RecurringAvailability, TeacherAvailability, Weekday
from modality.serializers import ModalitySerializer

# --- Query filters ---


class AvailabilityQuerySerializer(serializers.Serializer):
    date_from = serializers.DateTimeField(required=True)
    date_to = serializers.DateTimeField(required=True)


# --- Recurring sub-serializers (nested in create/update) ---


class RecurringAvailabilitySubmitSerializer(serializers.Serializer):
    days_of_week = serializers.CharField(
        help_text="Comma-separated weekday integers (0=Mon..6=Sun), e.g. '0,2,4'.",
    )
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    valid_from = serializers.DateField(required=False)
    valid_until = serializers.DateField(required=False, allow_null=True)

    def validate_days_of_week(self, value):
        valid_days = {str(c[0]) for c in Weekday.choices}
        parts = [d.strip() for d in value.split(",") if d.strip()]
        if not parts:
            raise serializers.ValidationError("AtLeastOneDayRequired")
        for d in parts:
            if d not in valid_days:
                raise serializers.ValidationError(f"InvalidDay: {d}")
        return ",".join(sorted(set(parts), key=int))


class RecurringAvailabilityUpdateSerializer(serializers.Serializer):
    days_of_week = serializers.CharField(required=False)
    start_time = serializers.TimeField(required=False)
    end_time = serializers.TimeField(required=False)
    valid_from = serializers.DateField(required=False)
    valid_until = serializers.DateField(required=False, allow_null=True)

    def validate_days_of_week(self, value):
        valid_days = {str(c[0]) for c in Weekday.choices}
        parts = [d.strip() for d in value.split(",") if d.strip()]
        if not parts:
            raise serializers.ValidationError("AtLeastOneDayRequired")
        for d in parts:
            if d not in valid_days:
                raise serializers.ValidationError(f"InvalidDay: {d}")
        return ",".join(sorted(set(parts), key=int))


# --- Create / Update ---


class AvailabilitySubmitSerializer(serializers.Serializer):
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    modality_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    recurring = RecurringAvailabilitySubmitSerializer(required=False, allow_null=True)


class AvailabilityUpdateSerializer(serializers.Serializer):
    start_datetime = serializers.DateTimeField(required=False)
    end_datetime = serializers.DateTimeField(required=False)
    modality_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    recurring = RecurringAvailabilityUpdateSerializer(required=False, allow_null=True)


# --- Read models ---


class RecurringAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringAvailability
        fields = [
            "days_of_week",
            "start_time",
            "end_time",
            "valid_from",
            "valid_until",
        ]


class AvailabilitySerializer(serializers.ModelSerializer):
    modality = ModalitySerializer(read_only=True)
    is_recurring = serializers.SerializerMethodField()
    recurring = RecurringAvailabilitySerializer(read_only=True)

    class Meta:
        model = TeacherAvailability
        fields = [
            "id",
            "teacher_id",
            "modality",
            "start_datetime",
            "end_datetime",
            "notes",
            "is_recurring",
            "recurring",
        ]

    def get_is_recurring(self, obj):
        return hasattr(obj, "recurring") and obj.recurring is not None


class ExpandedSlotSerializer(serializers.Serializer):
    """A concrete time slot — either a one-time availability or an expanded recurring occurrence."""

    id = serializers.IntegerField(allow_null=True)
    teacher_id = serializers.IntegerField()
    modality = ModalitySerializer(allow_null=True)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    notes = serializers.CharField()
    is_recurring = serializers.BooleanField()
    recurring_id = serializers.IntegerField(allow_null=True)
