"""Coaching API serializers — input validation and response shapes for coachings views.

Follows project naming: *QuerySerializer for list filters, *Submit/*Update for writes,
plain *Serializer for read models. Business rules stay in services; these only validate
and serialize HTTP payloads.
"""

from rest_framework import serializers

from accounts.serializers import UserResponseSerializer
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingStatus,
    RecurrenceType,
    RecurringCoaching,
    TeacherAvailability,
)
from modality.serializers import ModalitySerializer
from studios.serializers import StudioSerializer

# --- Teacher availability (slots): filters, body payloads, read model ---


class TeacherAvailabilityQuerySerializer(serializers.Serializer):
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)


class TeacherAvailabilitySubmitSerializer(serializers.Serializer):
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    modality_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TeacherAvailabilityUpdateSerializer(serializers.Serializer):
    start_datetime = serializers.DateTimeField(required=False)
    end_datetime = serializers.DateTimeField(required=False)
    modality_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


# --- Coaching session: create, schedule, workflow actions, patch ---


class CoachingRequestSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    modality_id = serializers.IntegerField()
    studio_id = serializers.IntegerField(required=False, allow_null=True)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True)
    classe_id = serializers.IntegerField(required=False, allow_null=True)


class RecurringCoachingSubmitSerializer(serializers.Serializer):
    recurrence_type = serializers.ChoiceField(choices=RecurrenceType.choices)
    recurrence_interval = serializers.IntegerField(required=False, min_value=1, default=1)
    days_of_week = serializers.CharField(required=False, allow_blank=True, default="")
    end_date = serializers.DateField(required=False, allow_null=True)
    occurrences_count = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs.get("end_date") and attrs.get("occurrences_count"):
            raise serializers.ValidationError(
                {"messages": ["RecurringEndDateAndOccurrencesExclusive"]}
            )
        return attrs


class DirectCoordinationCoachingCreateSerializer(serializers.Serializer):
    """Body for POST ``/api/coachings/`` — coordination-created timetable coaching."""

    teacher_id = serializers.IntegerField()
    modality_id = serializers.IntegerField()
    studio_id = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    is_billable = serializers.BooleanField(
        required=False,
        default=True,
        help_text="Coordination-only; ignored on student-request flows.",
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    schedule = serializers.BooleanField(
        default=True,
        help_text="Roster fill: true = ACTIVE from enrollments; false = staff-invite (INVITED).",
    )
    classe_id = serializers.IntegerField(required=False, allow_null=True)
    recurring_coaching = RecurringCoachingSubmitSerializer(
        required=False,
        allow_null=True,
    )


class CoachingApproveSerializer(serializers.Serializer):
    studio_id = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=0)


class CoachingRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class CoachingCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)


class TeacherConfirmCoachingSerializer(serializers.Serializer):
    teacher_notes = serializers.CharField(required=False, allow_blank=True)


class ConfirmParticipantAttendanceSerializer(serializers.Serializer):
    attended = serializers.BooleanField()


class CoachingUpdateSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField(required=False)
    modality_id = serializers.IntegerField(required=False)
    studio_id = serializers.IntegerField(required=False, allow_null=True)
    total_price = serializers.DecimalField(
        max_digits=8, decimal_places=2, required=False, allow_null=True
    )
    is_billable = serializers.BooleanField(
        required=False,
        help_text="Only for coordination-scheduled coachings (no requester).",
    )
    start_datetime = serializers.DateTimeField(required=False)
    end_datetime = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


# --- Participants & coaching list filters ---


class AddParticipantSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class ParticipantCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)


class CoachingListQuerySerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=CoachingStatus.choices, required=False)
    studio_id = serializers.IntegerField(required=False)
    requested_by_id = serializers.IntegerField(required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)


# --- Read models (nested resources for responses) ---


class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    modality = ModalitySerializer(read_only=True)

    class Meta:
        model = TeacherAvailability
        fields = [
            "id",
            "teacher_id",
            "modality",
            "start_datetime",
            "end_datetime",
            "notes",
        ]


class CoachingParticipantSerializer(serializers.ModelSerializer):
    student = UserResponseSerializer(read_only=True)

    class Meta:
        model = CoachingParticipant
        fields = [
            "id",
            "student",
            "status",
            "invited_by_staff",
            "cancelled_at",
            "cancellation_reason",
        ]


class RecurringCoachingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringCoaching
        fields = [
            "id",
            "recurrence_type",
            "recurrence_interval",
            "days_of_week",
            "end_date",
            "occurrences_count",
            "notes",
        ]


class CoachingClassSerializer(serializers.ModelSerializer):
    modality = ModalitySerializer(read_only=True)
    studio = StudioSerializer(read_only=True)
    teacher = UserResponseSerializer(read_only=True)
    requested_by = UserResponseSerializer(read_only=True)
    teacher_confirmed_by = UserResponseSerializer(read_only=True)
    participants = CoachingParticipantSerializer(many=True, read_only=True)
    recurring_id = serializers.IntegerField(
        source="recurring_coaching_id",
        read_only=True,
        allow_null=True,
    )
    recurring_coaching = RecurringCoachingSerializer(
        read_only=True,
    )

    class Meta:
        model = CoachingClass
        fields = [
            "id",
            "status",
            "teacher",
            "modality",
            "studio",
            "start_datetime",
            "end_datetime",
            "completed_at",
            "is_billable",
            "total_price",
            "requested_by",
            "recurring_id",
            "recurring_coaching",
            "classe_id",
            "notes",
            "teacher_notes",
            "teacher_confirmed_at",
            "teacher_confirmed_by",
            "rejection_reason",
            "cancellation_reason",
            "participants",
        ]
