from rest_framework import serializers

from accounts.serializers import UserResponseSerializer
from coachings.models import (
    CoachingClass,
    CoachingParticipant,
    CoachingStatus,
    TeacherAvailability,
)
from modality.serializers import ModalitySerializer
from studios.serializers import StudioSerializer


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


class CoachingRequestSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    modality_id = serializers.IntegerField()
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True)


class CoachingDirectScheduleSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    modality_id = serializers.IntegerField()
    studio_id = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=8, decimal_places=2)
    start_datetime = serializers.DateTimeField()
    end_datetime = serializers.DateTimeField()
    notes = serializers.CharField(required=False, allow_blank=True)


class CoachingApproveSerializer(serializers.Serializer):
    studio_id = serializers.IntegerField()
    total_price = serializers.DecimalField(max_digits=8, decimal_places=2)


class CoachingRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class CoachingCancelSerializer(serializers.Serializer):
    cancellation_reason = serializers.CharField(required=False, allow_blank=True)


class AddParticipantSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()


class CoachingListQuerySerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField(required=False)
    status = serializers.ChoiceField(choices=CoachingStatus.choices, required=False)
    studio_id = serializers.IntegerField(required=False)
    requested_by_id = serializers.IntegerField(required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)


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
        fields = ["id", "student"]


class CoachingClassSerializer(serializers.ModelSerializer):
    modality = ModalitySerializer(read_only=True)
    studio = StudioSerializer(read_only=True)
    teacher = UserResponseSerializer(read_only=True)
    requested_by = UserResponseSerializer(read_only=True)
    participants = CoachingParticipantSerializer(many=True, read_only=True)

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
            "total_price",
            "requested_by",
            "notes",
            "rejection_reason",
            "cancellation_reason",
            "participants",
        ]
