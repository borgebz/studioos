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
)
from modality.serializers import ModalitySerializer
from studios.serializers import StudioSerializer

# --- Teacher availability (slots): filters, body payloads, read model ---


# --- Coaching session: create, schedule, workflow actions, patch ---


class CoachingRequestSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    modality_id = serializers.IntegerField()
    studio_id = serializers.IntegerField(required=False, allow_null=True)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True)
    classe_id = serializers.IntegerField(required=False, allow_null=True)
    on_behalf_of = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Student user ID when a parent requests on behalf of their child.",
    )


class RecurringCoachingSubmitSerializer(serializers.Serializer):
    recurrence_type = serializers.ChoiceField(choices=RecurrenceType.choices)
    recurrence_interval = serializers.IntegerField(
        required=False, min_value=1, default=1
    )
    days_of_week = serializers.CharField(required=False, allow_blank=True, default="")
    end_date = serializers.DateField(required=False, allow_null=True)
    occurrences_count = serializers.IntegerField(
        required=False, allow_null=True, min_value=1
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs.get("end_date") and attrs.get("occurrences_count"):
            raise serializers.ValidationError(
                {"messages": ["RecurringEndDateAndOccurrencesExclusive"]}
            )
        if not attrs.get("end_date") and not attrs.get("occurrences_count"):
            raise serializers.ValidationError(
                {"messages": ["RecurringEndConditionRequired"]}
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
        help_text="true = coaching is created as SCHEDULED; false = goes through approval flow (REQUESTED).",
    )
    auto_confirm_participants = serializers.BooleanField(
        default=True,
        help_text="true = participants added as ACTIVE; false = participants added as INVITED (must accept).",
    )
    classe_id = serializers.IntegerField(required=False, allow_null=True)
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text="Explicit student user IDs to add as participants. Merged with classe members when classe_id is also provided; duplicates are removed automatically.",
    )
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


class RecurringSeriesCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)
    cancel_past = serializers.BooleanField(
        default=False,
        help_text="If true, also cancels sessions that have already ended (still cancellable by status).",
    )


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
    """Query params for ``GET /api/coachings/``.

    ``teacher_id``, ``studio_id``, ``modality_id`` and ``status`` accept
    multiple values (repeat the param, e.g. ``?status=scheduled&status=requested``)
    and are translated into ``__in`` lookups by the service.
    """

    _MULTI_FIELDS = ("teacher_id", "studio_id", "modality_id", "status")

    teacher_id = serializers.ListField(child=serializers.IntegerField(), required=False)
    studio_id = serializers.ListField(child=serializers.IntegerField(), required=False)
    modality_id = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )
    status = serializers.ListField(
        child=serializers.ChoiceField(choices=CoachingStatus.choices),
        required=False,
    )
    requested_by_id = serializers.IntegerField(required=False)
    participant_id = serializers.IntegerField(
        required=False,
        help_text="Filter coachings where this user is a participant.",
    )
    recurring_coaching_id = serializers.IntegerField(required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)

    def to_internal_value(self, data):
        # QueryDict collapses repeated keys to the last value when iterated;
        # use getlist() so multi-value filters survive.
        if hasattr(data, "getlist"):
            normalized = {}
            for key in data.keys():
                if key in self._MULTI_FIELDS:
                    normalized[key] = data.getlist(key)
                else:
                    normalized[key] = data.get(key)
            data = normalized
        return super().to_internal_value(data)


# --- Read models (nested resources for responses) ---


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
    sessions_count = serializers.IntegerField(read_only=True, default=None)

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
            "sessions_count",
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
    recurring_coaching = serializers.SerializerMethodField()

    def get_recurring_coaching(self, obj):
        if obj.recurring_coaching is None:
            return None
        rc = obj.recurring_coaching
        rc.sessions_count = getattr(obj, "_recurring_sessions_count", None)
        return RecurringCoachingSerializer(rc).data

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
