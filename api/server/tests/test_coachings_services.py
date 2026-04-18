import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from core.exceptions import AppNotFound


def _dt(offset_hours=0):
    return timezone.now() + timedelta(hours=offset_hours)


@pytest.mark.django_db
class TestTeacherAvailability:
    def test_create_availability_success(self, direction_user, teacher_user):
        from coachings import services

        block = services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        assert block.pk is not None
        assert block.teacher_id == teacher_user.pk

    def test_create_availability_invalid_date_range(self, direction_user, teacher_user):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.create_teacher_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(3),
                end_datetime=_dt(1),
            )
        assert "InvalidDateRange" in str(exc.value.detail)

    def test_create_availability_overlap_blocked(self, direction_user, teacher_user):
        from coachings import services

        services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        with pytest.raises(ValidationError) as exc:
            services.create_teacher_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(2),
                end_datetime=_dt(4),
            )
        assert "TeacherAvailabilityOverlap" in str(exc.value.detail)

    def test_create_availability_adjacent_slots_allowed(
        self, direction_user, teacher_user
    ):
        from coachings import services

        services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        block2 = services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(2),
            end_datetime=_dt(3),
        )
        assert block2.pk is not None

    def test_delete_availability_soft(self, direction_user, teacher_user):
        from coachings import services
        from coachings.models import TeacherAvailability

        block = services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        services.delete_teacher_availability(
            teacher_id=teacher_user.pk, pk=block.pk, requesting_user=direction_user
        )
        assert not TeacherAvailability.objects.filter(pk=block.pk).exists()
        assert TeacherAvailability.all_objects.filter(pk=block.pk).exists()

    def test_delete_availability_wrong_teacher(self, direction_user, teacher_user):
        from django.contrib.auth import get_user_model

        from coachings import services

        User = get_user_model()
        other = User.objects.create_user(
            email=f"other_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Other",
            last_name="Teacher",
            is_active=True,
        )
        block = services.create_teacher_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        with pytest.raises(ValidationError) as exc:
            services.delete_teacher_availability(
                teacher_id=other.pk, pk=block.pk, requesting_user=direction_user
            )
        assert "UserCannotTeach" in str(exc.value.detail)


@pytest.mark.django_db
class TestCoachingRequest:
    def test_create_request_success(self, direction_user, teacher_user, modality):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        assert coaching.pk is not None
        assert coaching.status == CoachingStatus.REQUESTED

    def test_create_request_invalid_date_range(
        self, direction_user, teacher_user, modality
    ):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.create_coaching_request(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                start_datetime=_dt(2),
                end_datetime=_dt(1),
                requesting_user=direction_user,
            )
        assert "InvalidDateRange" in str(exc.value.detail)

    def test_create_request_invalid_teacher(self, direction_user, modality):
        from coachings import services

        with pytest.raises(AppNotFound) as exc:
            services.create_coaching_request(
                teacher_id=999_999,
                modality_id=modality.pk,
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
            )
        assert "TeacherNotFound" in str(exc.value.detail)

    def test_create_request_teacher_must_have_can_teach(self, direction_user, modality):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.create_coaching_request(
                teacher_id=direction_user.pk,
                modality_id=modality.pk,
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
            )
        assert "UserCannotTeach" in str(exc.value.detail)

    def test_create_request_with_studio_success(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            requesting_user=direction_user,
        )
        assert coaching.status == CoachingStatus.REQUESTED
        assert coaching.studio_id == studio_with_modality.pk

    def test_create_request_studio_conflicts_with_scheduled(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.create_coaching_request(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                start_datetime=_dt(2),
                end_datetime=_dt(2.5),
                requesting_user=direction_user,
            )
        assert "TeacherScheduleConflict" in str(
            exc.value.detail
        ) or "StudioScheduleConflict" in str(exc.value.detail)


@pytest.mark.django_db
class TestCoachingLifecycle:
    @pytest.fixture
    def requested_coaching(self, direction_user, teacher_user, modality):
        from coachings import services

        return services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )

    @pytest.fixture
    def pending_coaching(self, requested_coaching, teacher_user):
        from coachings import services

        return services.teacher_accept_coaching(
            pk=requested_coaching.pk, user=teacher_user
        )

    def test_teacher_accept_success(self, requested_coaching, teacher_user):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.teacher_accept_coaching(
            pk=requested_coaching.pk, user=teacher_user
        )
        assert coaching.status == CoachingStatus.PENDING_APPROVAL

    def test_teacher_accept_wrong_teacher(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.teacher_accept_coaching(
                pk=requested_coaching.pk, user=direction_user
            )
        assert "NotTheAssignedTeacher" in str(exc.value.detail)

    def test_teacher_reject_success(self, requested_coaching, teacher_user):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.teacher_reject_coaching(
            pk=requested_coaching.pk, user=teacher_user, rejection_reason="Unavailable"
        )
        assert coaching.status == CoachingStatus.REJECTED
        assert coaching.rejection_reason == "Unavailable"

    def test_teacher_reject_wrong_teacher(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.teacher_reject_coaching(
                pk=requested_coaching.pk, user=direction_user
            )
        assert "NotTheAssignedTeacher" in str(exc.value.detail)

    def test_teacher_cannot_reject_pending_approval(
        self, pending_coaching, teacher_user
    ):
        """Teacher cannot reject after they already accepted — only coordination can."""
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.teacher_reject_coaching(pk=pending_coaching.pk, user=teacher_user)
        assert "InvalidStatusTransition" in str(exc.value.detail)

    def test_coordination_reject_pending_approval(
        self, pending_coaching, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.reject_coaching_coordination(
            pk=pending_coaching.pk, user=direction_user
        )
        assert coaching.status == CoachingStatus.REJECTED

    def test_coordination_reject_requested_succeeds(
        self, requested_coaching, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.reject_coaching_coordination(
            pk=requested_coaching.pk, user=direction_user
        )
        assert coaching.status == CoachingStatus.REJECTED

    def test_approve_coaching_success(
        self, pending_coaching, direction_user, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.approve_coaching(
            pk=pending_coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        assert coaching.status == CoachingStatus.SCHEDULED
        assert coaching.studio.pk == studio_with_modality.pk

    def test_approve_coaching_teacher_conflict(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        c1_req = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c1_req.pk, user=teacher_user)
        services.approve_coaching(
            pk=c1_req.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )

        c2_req = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c2_req.pk, user=teacher_user)
        with pytest.raises(ValidationError) as exc:
            services.approve_coaching(
                pk=c2_req.pk,
                studio_id=studio_with_modality.pk,
                total_price="50.00",
                user=direction_user,
            )
        detail = str(exc.value.detail)
        assert "TeacherScheduleConflict" in detail or "StudioScheduleConflict" in detail

    def test_approve_coaching_incompatible_studio(
        self, pending_coaching, direction_user
    ):
        from coachings import services
        from studios import services as studio_services

        bare_studio = studio_services.create_studio(
            user=direction_user,
            name=f"__Bare Studio {uuid.uuid4().hex[:6]}__",
            max_capacity=8,
        )
        with pytest.raises(ValidationError) as exc:
            services.approve_coaching(
                pk=pending_coaching.pk,
                studio_id=bare_studio.pk,
                total_price="50.00",
                user=direction_user,
            )
        assert "StudioModalityIncompatible" in str(exc.value.detail)

    def test_complete_coaching(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        coaching = services.complete_coaching(pk=c.pk, user=direction_user)
        assert coaching.status == CoachingStatus.COMPLETED
        assert coaching.completed_at is not None

    def test_cancel_coaching_from_requested(self, requested_coaching, direction_user):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.cancel_coaching(
            pk=requested_coaching.pk,
            user=direction_user,
            cancellation_reason="Changed mind",
        )
        assert coaching.status == CoachingStatus.CANCELLED
        assert coaching.cancellation_reason == "Changed mind"

    def test_invalid_transition_complete_from_requested(
        self, requested_coaching, direction_user
    ):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.complete_coaching(pk=requested_coaching.pk, user=direction_user)
        assert "InvalidStatusTransition" in str(exc.value.detail)


@pytest.mark.django_db
class TestCreateScheduledCoaching:
    def test_create_scheduled_success(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        assert coaching.status == CoachingStatus.SCHEDULED
        assert coaching.studio.pk == studio_with_modality.pk

    def test_create_scheduled_teacher_conflict(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.create_scheduled_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                total_price="60.00",
                start_datetime=_dt(2),
                end_datetime=_dt(4),
                requesting_user=direction_user,
            )
        assert "TeacherScheduleConflict" in str(exc.value.detail)

    def test_create_scheduled_incompatible_studio(
        self, direction_user, teacher_user, modality
    ):
        from coachings import services
        from studios import services as studio_services

        bare_studio = studio_services.create_studio(
            user=direction_user,
            name=f"__Bare {uuid.uuid4().hex[:6]}__",
            max_capacity=8,
        )
        with pytest.raises(ValidationError) as exc:
            services.create_scheduled_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=bare_studio.pk,
                total_price="60.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
            )
        assert "StudioModalityIncompatible" in str(exc.value.detail)


@pytest.mark.django_db
class TestParticipants:
    @pytest.fixture
    def scheduled_coaching(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        return services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )

    @pytest.fixture
    def student(self, db):
        from django.contrib.auth import get_user_model

        from accounts.models import Role

        User = get_user_model()
        user = User.objects.create_user(
            email=f"stud_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Stud",
            last_name="User",
            is_active=True,
        )
        role = Role.objects.get(code="student")
        user.groups.add(role.group)
        return user

    def test_add_participant_success(self, scheduled_coaching, student, direction_user):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert p.pk is not None
        assert p.student_id == student.pk
        assert p.status == CoachingParticipantStatus.ACTIVE

    def test_add_participant_requested_requester_pending(
        self, student_user, teacher_user, modality, direction_user
    ):
        """Before approval, the user who requested the coaching is pending when rostered."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        assert c.status == CoachingStatus.REQUESTED
        p = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student_user.pk,
            requesting_user=direction_user,
        )
        assert p.status == CoachingParticipantStatus.PENDING

    def test_add_participant_requested_other_invited(
        self, student_user, teacher_user, modality, direction_user, student
    ):
        """Non-requester students added before scheduling are invited."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        assert c.status == CoachingStatus.REQUESTED
        p = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert p.status == CoachingParticipantStatus.INVITED

    def test_add_participant_requires_student_capability(
        self, scheduled_coaching, teacher_user, direction_user
    ):
        """Only users with can_participate_in_coaching may be rostered."""
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.add_participant(
                coaching_class_id=scheduled_coaching.pk,
                student_id=teacher_user.pk,
                requesting_user=direction_user,
            )
        assert "UserCannotParticipateInCoaching" in str(exc.value.detail)

    def test_add_participant_duplicate_blocked(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.add_participant(
                coaching_class_id=scheduled_coaching.pk,
                student_id=student.pk,
                requesting_user=direction_user,
            )
        assert "ParticipantAlreadyEnrolled" in str(exc.value.detail)

    def test_add_participant_capacity_reached(
        self, direction_user, teacher_user, studio_with_modality
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role
        from coachings import services
        from modality.models import Modality
        from studios.models import StudioModality

        User = get_user_model()

        capped_modality = Modality.objects.create(
            name=f"__Capped {uuid.uuid4().hex[:6]}__",
            max_capacity=1,
            created_by=direction_user,
        )
        StudioModality.objects.create(
            studio=studio_with_modality,
            modality=capped_modality,
            created_by=direction_user,
        )
        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=capped_modality.pk,
            start_datetime=_dt(5),
            end_datetime=_dt(6),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        c = services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        s1 = User.objects.create_user(
            email=f"s1_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="S1",
            last_name="User",
            is_active=True,
        )
        s1.groups.add(Role.objects.get(code="student").group)
        s2 = User.objects.create_user(
            email=f"s2_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="S2",
            last_name="User",
            is_active=True,
        )
        s2.groups.add(Role.objects.get(code="student").group)
        services.add_participant(
            coaching_class_id=c.pk, student_id=s1.pk, requesting_user=direction_user
        )
        with pytest.raises(ValidationError) as exc:
            services.add_participant(
                coaching_class_id=c.pk, student_id=s2.pk, requesting_user=direction_user
            )
        assert "CoachingParticipantCapacityReached" in str(exc.value.detail)

    def test_cancel_participant_late_within_48h(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        out = services.cancel_coaching_participant(
            coaching_class_id=scheduled_coaching.pk,
            participant_pk=p.pk,
            requesting_user=direction_user,
            may_cancel_on_behalf_of_others=True,
        )
        assert out.status == CoachingParticipantStatus.LATE_CANCELLED
        assert out.cancelled_at is not None

    def test_cancel_participant_on_time_outside_48h_window(
        self, direction_user, teacher_user, studio_with_modality, modality, student
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        start = timezone.now() + timedelta(hours=100)
        end = start + timedelta(hours=1)
        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=start,
            end_datetime=end,
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        c = services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        p = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        out = services.cancel_coaching_participant(
            coaching_class_id=c.pk,
            participant_pk=p.pk,
            requesting_user=direction_user,
            may_cancel_on_behalf_of_others=True,
        )
        assert out.status == CoachingParticipantStatus.CANCELLED

    def test_cancel_participant_self_only(
        self, scheduled_coaching, student, direction_user
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role
        from coachings import services

        User = get_user_model()
        other = User.objects.create_user(
            email=f"other_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="O",
            last_name="User",
            is_active=True,
        )
        other.groups.add(Role.objects.get(code="student").group)

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=other.pk,
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=p.pk,
                requesting_user=student,
                may_cancel_on_behalf_of_others=False,
            )
        assert "CannotCancelAnotherParticipantsRegistration" in str(exc.value.detail)

        ok = services.cancel_coaching_participant(
            coaching_class_id=scheduled_coaching.pk,
            participant_pk=p.pk,
            requesting_user=other,
            may_cancel_on_behalf_of_others=False,
        )
        assert ok.pk == p.pk

    def test_cancel_participant_terminal_blocked(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        services.cancel_coaching_participant(
            coaching_class_id=scheduled_coaching.pk,
            participant_pk=p.pk,
            requesting_user=direction_user,
            may_cancel_on_behalf_of_others=True,
        )
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=p.pk,
                requesting_user=direction_user,
                may_cancel_on_behalf_of_others=True,
            )
        assert "ParticipantEnrollmentIsTerminal" in str(exc.value.detail)

    def test_cancel_participant_blocked_when_coaching_completed(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        services.complete_coaching(pk=scheduled_coaching.pk, user=direction_user)
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=p.pk,
                requesting_user=direction_user,
                may_cancel_on_behalf_of_others=True,
            )
        assert "CoachingNotEligibleForParticipantCancellation" in str(exc.value.detail)

    def test_cancel_participant_blocked_when_session_started(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        with patch(
            "coachings.services.timezone.now",
            return_value=scheduled_coaching.start_datetime + timedelta(minutes=5),
        ):
            with pytest.raises(ValidationError) as exc:
                services.cancel_coaching_participant(
                    coaching_class_id=scheduled_coaching.pk,
                    participant_pk=p.pk,
                    requesting_user=direction_user,
                    may_cancel_on_behalf_of_others=True,
                )
        assert "CoachingNotEligibleForParticipantCancellation" in str(exc.value.detail)

    def test_cancel_participant_blocked_pending_completion_status(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.status = CoachingStatus.PENDING_COMPLETION_APPROVAL
        scheduled_coaching.save(update_fields=["status"])
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=p.pk,
                requesting_user=direction_user,
                may_cancel_on_behalf_of_others=True,
            )
        assert "CoachingNotEligibleForParticipantCancellation" in str(exc.value.detail)

    def test_reenroll_after_cancel(self, scheduled_coaching, student, direction_user):
        from coachings import services

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        services.cancel_coaching_participant(
            coaching_class_id=scheduled_coaching.pk,
            participant_pk=p.pk,
            requesting_user=direction_user,
            may_cancel_on_behalf_of_others=True,
        )
        p2 = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert p2.pk != p.pk


@pytest.mark.django_db
class TestUpdateCoaching:
    @pytest.fixture
    def requested_coaching(self, direction_user, teacher_user, modality):
        from coachings import services

        return services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )

    @pytest.fixture
    def pending_coaching(self, requested_coaching, teacher_user):
        from coachings import services

        return services.teacher_accept_coaching(
            pk=requested_coaching.pk, user=teacher_user
        )

    def test_update_requested_notes(self, requested_coaching, direction_user):
        from coachings import services

        updated = services.update_coaching(
            pk=requested_coaching.pk,
            requesting_user=direction_user,
            allow_teacher_change=True,
            updates={"notes": "Updated notes"},
        )
        assert updated.notes == "Updated notes"

    def test_update_modality_id_success(self, requested_coaching, direction_user):
        from modality.models import Modality

        from coachings import services

        other = Modality.objects.create(
            name=f"___Other_{uuid.uuid4().hex[:8]}___",
            description="",
        )
        updated = services.update_coaching(
            pk=requested_coaching.pk,
            requesting_user=direction_user,
            allow_teacher_change=True,
            updates={"modality_id": other.pk},
        )
        assert updated.modality_id == other.pk

    def test_update_modality_id_not_found(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(NotFound):
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"modality_id": 999_999_999},
            )

    def test_update_not_editable_when_completed(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        services.complete_coaching(pk=c.pk, user=direction_user)
        with pytest.raises(ValidationError) as exc:
            services.update_coaching(
                pk=c.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"notes": "Too late"},
            )
        assert "CoachingNotEditable" in str(exc.value.detail)

    def test_teacher_id_forbidden_when_allow_teacher_false(
        self, requested_coaching, direction_user, teacher_user
    ):
        from coachings import services

        other_id = teacher_user.pk + 99999
        with pytest.raises(ValidationError) as exc:
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=False,
                updates={"teacher_id": other_id},
            )
        assert "TeacherIdNotEditable" in str(exc.value.detail)

    def test_update_teacher_id_success(
        self, requested_coaching, direction_user, teacher_user
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role
        from coachings import services

        User = get_user_model()
        other_teacher = User.objects.create_user(
            email=f"teacher2_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="T2",
            last_name="User",
            is_active=True,
        )
        other_teacher.groups.add(Role.objects.get(code="teacher").group)

        updated = services.update_coaching(
            pk=requested_coaching.pk,
            requesting_user=direction_user,
            allow_teacher_change=True,
            updates={"teacher_id": other_teacher.pk},
        )
        assert updated.teacher_id == other_teacher.pk

    def test_update_teacher_not_found(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(AppNotFound) as exc:
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"teacher_id": 999_999_999},
            )
        assert "TeacherNotFound" in str(exc.value.detail)

    def test_update_studio_not_found(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(AppNotFound) as exc:
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"studio_id": 999_999_999},
            )
        assert "StudioNotFound" in str(exc.value.detail)

    def test_update_invalid_date_range(self, requested_coaching, direction_user):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={
                    "start_datetime": _dt(5),
                    "end_datetime": _dt(4),
                },
            )
        assert "InvalidDateRange" in str(exc.value.detail)

    def test_update_scheduled_reschedule_conflict(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        b = services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.update_coaching(
                pk=b.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={
                    "start_datetime": _dt(2),
                    "end_datetime": _dt(2.5),
                },
            )
        assert "TeacherScheduleConflict" in str(
            exc.value.detail
        ) or "StudioScheduleConflict" in str(exc.value.detail)

    def test_update_scheduled_notes_no_conflict_check(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        b = services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            requesting_user=direction_user,
        )
        services.create_scheduled_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        updated = services.update_coaching(
            pk=b.pk,
            requesting_user=direction_user,
            allow_teacher_change=True,
            updates={"notes": "Only notes"},
        )
        assert updated.notes == "Only notes"

    def test_update_studio_incompatible(
        self, pending_coaching, direction_user, teacher_user, modality
    ):
        from coachings import services
        from studios import services as studio_services

        bare = studio_services.create_studio(
            user=direction_user,
            name=f"__Bare {uuid.uuid4().hex[:6]}__",
            max_capacity=8,
        )
        with pytest.raises(ValidationError) as exc:
            services.update_coaching(
                pk=pending_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"studio_id": bare.pk},
            )
        assert "StudioModalityIncompatible" in str(exc.value.detail)


@pytest.mark.django_db
class TestUserModality:
    def test_add_user_modality_success(self, direction_user, teacher_user, modality):
        from modality import services

        link = services.add_user_modality(
            user_id=teacher_user.pk,
            modality_id=modality.pk,
            requesting_user=direction_user,
        )
        assert link.pk is not None
        assert link.user_id == teacher_user.pk

    def test_add_user_modality_non_teacher_blocked(
        self, direction_user, student_user, modality
    ):
        from modality import services

        with pytest.raises(ValidationError) as exc:
            services.add_user_modality(
                user_id=student_user.pk,
                modality_id=modality.pk,
                requesting_user=direction_user,
            )
        assert "UserCannotTeach" in str(exc.value.detail)

    def test_add_user_modality_invalid_user(self, direction_user, modality):
        from modality import services

        with pytest.raises(NotFound):
            services.add_user_modality(
                user_id=999_999,
                modality_id=modality.pk,
                requesting_user=direction_user,
            )
