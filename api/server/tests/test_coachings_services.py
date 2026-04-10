import uuid
from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError


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
        with pytest.raises(NotFound):
            services.delete_teacher_availability(
                teacher_id=other.pk, pk=block.pk, requesting_user=direction_user
            )


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

        with pytest.raises(NotFound):
            services.create_coaching_request(
                teacher_id=999_999,
                modality_id=modality.pk,
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
            )


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

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert p.pk is not None
        assert p.student_id == student.pk

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

    def test_remove_participant_soft_deletes(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipant

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        services.remove_participant(
            coaching_class_id=scheduled_coaching.pk,
            pk=p.pk,
            requesting_user=direction_user,
        )
        assert not CoachingParticipant.objects.filter(pk=p.pk).exists()
        assert CoachingParticipant.all_objects.filter(pk=p.pk).exists()

    def test_removed_participant_can_be_readded(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        services.remove_participant(
            coaching_class_id=scheduled_coaching.pk,
            pk=p.pk,
            requesting_user=direction_user,
        )
        p2 = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert p2.pk is not None


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
