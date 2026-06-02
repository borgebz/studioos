import uuid
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound


def _dt(offset_hours=0):
    return timezone.now() + timedelta(hours=offset_hours)


@pytest.fixture
def scheduled_coaching(direction_user, teacher_user, modality, studio_with_modality):
    """Approved coaching in SCHEDULED state (shared by participant and batch tests)."""
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


@pytest.mark.django_db
class TestCoachingRequest:
    def test_create_request_success(self, direction_user, teacher_user, modality):
        from coachings import services
        from coachings.models import CoachingParticipant, CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        assert coaching.pk is not None
        assert coaching.status == CoachingStatus.REQUESTED
        assert not CoachingParticipant.objects.filter(
            coaching_class_id=coaching.pk
        ).exists()

    def test_create_request_enrolls_requester_when_can_participate(
        self, student_user, teacher_user, modality
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        assert coaching.status == CoachingStatus.REQUESTED
        p = coaching.participants.get(student_id=student_user.pk)
        assert p.status == CoachingParticipantStatus.PENDING

    def test_create_request_by_assigned_teacher_starts_pending_approval(
        self, teacher_user, modality
    ):
        """A teacher creating their own coaching skips REQUESTED and is not
        auto-enrolled as a participant of their own lesson."""
        from coachings import services
        from coachings.models import CoachingParticipant, CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=teacher_user,
        )
        assert coaching.status == CoachingStatus.PENDING_APPROVAL
        assert not CoachingParticipant.objects.filter(
            coaching_class_id=coaching.pk, student_id=teacher_user.pk
        ).exists()

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

        services.create_direct_coordination_coaching(
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

    def test_approve_coaching_total_price_none_raises(
        self, pending_coaching, direction_user, studio_with_modality
    ):
        from coachings import services

        with pytest.raises(ValidationError) as exc:
            services.approve_coaching(
                pk=pending_coaching.pk,
                studio_id=studio_with_modality.pk,
                total_price=None,
                user=direction_user,
            )
        assert "CoachingTotalPriceRequired" in str(exc.value.detail)

    def test_approve_coaching_sets_pending_participants_active(
        self,
        student_user,
        teacher_user,
        direction_user,
        modality,
        studio_with_modality,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        p = coaching.participants.get(student_id=student_user.pk)
        assert p.status == CoachingParticipantStatus.PENDING
        services.teacher_accept_coaching(pk=coaching.pk, user=teacher_user)
        coaching = services.approve_coaching(
            pk=coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        assert coaching.status == CoachingStatus.SCHEDULED
        p.refresh_from_db()
        assert p.status == CoachingParticipantStatus.ACTIVE

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
        c2_req = services.create_coaching_request(
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
        from coachings.models import CoachingClass

        CoachingClass.objects.filter(pk=c.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
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

    def test_invalid_transition_complete_from_scheduled(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        """Coordination completes only from PENDING_COMPLETION_APPROVAL, not SCHEDULED."""
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
        c.refresh_from_db()
        assert c.status == CoachingStatus.SCHEDULED
        with pytest.raises(ValidationError) as exc:
            services.complete_coaching(pk=c.pk, user=direction_user)
        assert "InvalidStatusTransition" in str(exc.value.detail)


@pytest.mark.django_db
class TestAdvanceScheduledToWaitingConfirmation:
    def test_batch_moves_eligible_scheduled_to_waiting_confirmation(
        self, scheduled_coaching
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        n = services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)
        assert n == 1
        scheduled_coaching.refresh_from_db()
        assert scheduled_coaching.status == CoachingStatus.WAITING_CONFIRMATION

    def test_batch_skips_when_session_not_ended(self, scheduled_coaching):
        from coachings import services
        from coachings.models import CoachingStatus

        before_end = scheduled_coaching.end_datetime - timedelta(minutes=1)
        n = services.advance_scheduled_to_waiting_confirmation_batch(now=before_end)
        assert n == 0
        scheduled_coaching.refresh_from_db()
        assert scheduled_coaching.status == CoachingStatus.SCHEDULED


@pytest.mark.django_db
class TestCreateScheduledCoaching:
    def test_create_scheduled_success(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        coaching = services.create_direct_coordination_coaching(
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

        services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.create_direct_coordination_coaching(
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
            services.create_direct_coordination_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=bare_studio.pk,
                total_price="60.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
            )
        assert "StudioModalityIncompatible" in str(exc.value.detail)

    def test_recurring_creates_definition(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import RecurrenceType, RecurringCoaching

        coaching = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
            schedule=True,
            recurring_data={
                "recurrence_type": RecurrenceType.WEEKLY,
                "recurrence_interval": 1,
                "days_of_week": "MO",
            },
        )
        assert coaching.recurring_coaching_id is not None
        rec = RecurringCoaching.objects.get(pk=coaching.recurring_coaching_id)
        assert rec.recurrence_type == RecurrenceType.WEEKLY

    def test_no_recurring_payload_means_no_recurring_row(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services

        coaching = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
            recurring_data=None,
        )
        assert coaching.recurring_coaching_id is None

    def test_recurring_end_date_and_occurrences_rejected(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import RecurrenceType

        with pytest.raises(ValidationError) as exc:
            services.create_direct_coordination_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                total_price="60.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
                recurring_data={
                    "recurrence_type": RecurrenceType.WEEKLY,
                    "end_date": date(2026, 12, 1),
                    "occurrences_count": 3,
                },
            )
        assert "RecurringEndDateAndOccurrencesExclusive" in str(exc.value.detail)


@pytest.mark.django_db
class TestParticipants:
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
        self, student_user, teacher_user, modality
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
        p = c.participants.get(student_id=student_user.pk)
        assert p.status == CoachingParticipantStatus.PENDING

    def test_add_participant_requested_staff_invite(
        self, student_user, teacher_user, modality, direction_user, student
    ):
        """Coordination adds a student: invited + invited_by_staff (accept → active)."""
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
        assert p.invited_by_staff is True

    def test_teacher_accept_keeps_staff_invited_participants_invited(
        self,
        student_user,
        teacher_user,
        modality,
        direction_user,
        student,
    ):
        """Staff-invited rows stay invited until the student accepts (not bumped to pending)."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        invited = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert invited.status == CoachingParticipantStatus.INVITED
        assert invited.invited_by_staff is True
        coaching = services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        assert coaching.status == CoachingStatus.PENDING_APPROVAL
        invited.refresh_from_db()
        assert invited.status == CoachingParticipantStatus.INVITED

    def test_peer_invite_is_pending_until_coaching_approved(
        self,
        student_user,
        teacher_user,
        modality,
        student,
        studio_with_modality,
        direction_user,
    ):
        """Approve activates requester only; invited peers stay invited until accept + staff approve."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        requester = c.participants.get(student_id=student_user.pk)
        assert requester.status == CoachingParticipantStatus.PENDING

        peer = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=student_user,
        )
        assert peer.status == CoachingParticipantStatus.INVITED
        assert peer.invited_by_staff is False

        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        peer.refresh_from_db()
        assert peer.status == CoachingParticipantStatus.INVITED

        coaching = services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        assert coaching.status == CoachingStatus.SCHEDULED
        peer.refresh_from_db()
        requester.refresh_from_db()
        assert peer.status == CoachingParticipantStatus.INVITED
        assert requester.status == CoachingParticipantStatus.ACTIVE

        services.student_accept_coaching_invitation(
            coaching_class_id=c.pk,
            user=student,
        )
        peer.refresh_from_db()
        assert peer.status == CoachingParticipantStatus.PENDING

        out = services.staff_approve_pending_participant(
            coaching_class_id=c.pk,
            participant_pk=peer.pk,
            approving_user=direction_user,
        )
        assert out.status == CoachingParticipantStatus.ACTIVE

    def test_peer_invite_on_scheduled_pending_until_staff_approve(
        self,
        student_user,
        teacher_user,
        modality,
        student,
        studio_with_modality,
        direction_user,
    ):
        """Scheduled coaching + peer add → invited; peer accepts → pending; staff approve → active."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        scheduled = services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        assert scheduled.status == CoachingStatus.SCHEDULED

        peer = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=student_user,
        )
        assert peer.status == CoachingParticipantStatus.INVITED

        services.student_accept_coaching_invitation(
            coaching_class_id=c.pk,
            user=student,
        )
        peer.refresh_from_db()
        assert peer.status == CoachingParticipantStatus.PENDING

        out = services.staff_approve_pending_participant(
            coaching_class_id=c.pk,
            participant_pk=peer.pk,
            approving_user=direction_user,
        )
        assert out.status == CoachingParticipantStatus.ACTIVE

    def test_staff_approve_requires_scheduled_coaching(
        self,
        student_user,
        teacher_user,
        modality,
        student,
        direction_user,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        peer = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=student_user,
        )
        assert c.status == CoachingStatus.REQUESTED
        assert peer.status == CoachingParticipantStatus.INVITED

        with pytest.raises(ValidationError) as exc:
            services.staff_approve_pending_participant(
                coaching_class_id=c.pk,
                participant_pk=peer.pk,
                approving_user=direction_user,
            )
        assert "CoachingNotEligibleForParticipantApproval" in str(exc.value.detail)

    def test_staff_approve_requires_pending_status(
        self,
        student_user,
        teacher_user,
        modality,
        student,
        studio_with_modality,
        direction_user,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        peer = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert peer.status == CoachingParticipantStatus.ACTIVE

        with pytest.raises(ValidationError) as exc:
            services.staff_approve_pending_participant(
                coaching_class_id=c.pk,
                participant_pk=peer.pk,
                approving_user=direction_user,
            )
        assert "ParticipantNotPendingApproval" in str(exc.value.detail)

    def test_teacher_accept_does_not_change_legacy_invited_participants(
        self,
        student_user,
        teacher_user,
        modality,
        direction_user,
        student,
        studio_with_modality,
    ):
        """Teacher and coordination approve do not change ``INVITED`` roster rows."""
        from coachings import services
        from coachings.models import CoachingParticipant, CoachingParticipantStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        invited = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        CoachingParticipant.objects.filter(pk=invited.pk).update(invited_by_staff=False)
        invited.refresh_from_db()
        assert invited.status == CoachingParticipantStatus.INVITED
        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        invited.refresh_from_db()
        assert invited.status == CoachingParticipantStatus.INVITED

        services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        invited.refresh_from_db()
        assert invited.status == CoachingParticipantStatus.INVITED

    def test_staff_invited_stays_invited_through_coordination_approve(
        self,
        student_user,
        teacher_user,
        modality,
        direction_user,
        student,
        studio_with_modality,
    ):
        """Staff-invited participants remain INVITED until accept-invite (not activated on approve)."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        c = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=student_user,
        )
        invited = services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert invited.invited_by_staff is True

        services.teacher_accept_coaching(pk=c.pk, user=teacher_user)
        services.approve_coaching(
            pk=c.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        invited.refresh_from_db()
        assert invited.status == CoachingParticipantStatus.INVITED

        out = services.student_accept_coaching_invitation(
            coaching_class_id=c.pk,
            user=student,
        )
        assert out.status == CoachingParticipantStatus.ACTIVE

    def test_student_accept_coaching_invitation_success(
        self, student_user, teacher_user, modality, direction_user, student
    ):
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
        assert p.invited_by_staff is True

        out = services.student_accept_coaching_invitation(
            coaching_class_id=c.pk,
            user=student,
        )
        assert out.status == CoachingParticipantStatus.ACTIVE

    def test_student_accept_coaching_invitation_not_invited(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.student_accept_coaching_invitation(
                coaching_class_id=scheduled_coaching.pk,
                user=student,
            )
        assert "ParticipantNotInvited" in str(exc.value.detail)

    def test_student_accept_coaching_invitation_no_enrollment(
        self, scheduled_coaching, student
    ):
        from coachings import services

        with pytest.raises(AppNotFound) as exc:
            services.student_accept_coaching_invitation(
                coaching_class_id=scheduled_coaching.pk,
                user=student,
            )
        assert "ParticipantNotFound" in str(exc.value.detail)

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

    def test_add_participant_revives_attended_row(
        self, scheduled_coaching, student, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        p.status = CoachingParticipantStatus.ATTENDED
        p.save()

        revived = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        assert revived.pk == p.pk
        assert revived.status == CoachingParticipantStatus.ACTIVE

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
        from coachings.models import (
            CoachingClass,
            CoachingParticipantStatus,
            CoachingStatus,
        )

        p = services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        # Move to a final attendance state so the new completion gate passes.
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])
        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
        )
        services.complete_coaching(pk=scheduled_coaching.pk, user=direction_user)
        # After completion, every participant is in a final state (ATTENDED/ABSENT),
        # so the participant-level terminal check trips before the coaching-level
        # check. Either way the cancel is correctly blocked.
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=p.pk,
                requesting_user=direction_user,
                may_cancel_on_behalf_of_others=True,
            )
        assert "ParticipantEnrollmentIsTerminal" in str(exc.value.detail)

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
        from coachings.models import CoachingParticipantStatus

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
        assert p2.pk == p.pk
        assert p2.status == CoachingParticipantStatus.ACTIVE
        assert p2.cancelled_at is None


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

        with pytest.raises(AppNotFound) as exc:
            services.update_coaching(
                pk=requested_coaching.pk,
                requesting_user=direction_user,
                allow_teacher_change=True,
                updates={"modality_id": 999_999_999},
            )
        assert "ModalityNotFound" in str(exc.value.detail)

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
        from coachings.models import CoachingClass, CoachingStatus

        CoachingClass.objects.filter(pk=c.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
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

        services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            requesting_user=direction_user,
        )
        b = services.create_direct_coordination_coaching(
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

        b = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="60.00",
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            requesting_user=direction_user,
        )
        services.create_direct_coordination_coaching(
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

        with pytest.raises(AppNotFound) as exc:
            services.add_user_modality(
                user_id=999_999,
                modality_id=modality.pk,
                requesting_user=direction_user,
            )
        assert "TeacherNotFound" in str(exc.value.detail)


@pytest.mark.django_db
class TestTeacherConfirmAndParticipantAttendance:
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

    def test_teacher_confirm_blocked_before_session_end(
        self, scheduled_coaching, teacher_user
    ):
        from coachings import services

        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)

        with pytest.raises(ValidationError) as exc:
            services.teacher_confirm_coaching(
                pk=scheduled_coaching.pk, user=teacher_user
            )
        assert "CoachingSessionNotEndedYet" in str(exc.value.detail)

    def test_teacher_confirm_and_attendance_advance_to_pending_completion(
        self, scheduled_coaching, teacher_user, student, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)

        with patch("coachings.services.timezone.now", return_value=after_end):
            services.teacher_confirm_coaching(
                pk=scheduled_coaching.pk, user=teacher_user
            )
            out = services.confirm_participant_attendance(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=scheduled_coaching.participants.get(
                    student_id=student.pk
                ).pk,
                user=student,
                attended=True,
            )

        scheduled_coaching.refresh_from_db()
        assert scheduled_coaching.status == CoachingStatus.PENDING_COMPLETION_APPROVAL
        assert out.status == CoachingParticipantStatus.ATTENDED

    def test_teacher_confirm_idempotent_rejected(
        self, scheduled_coaching, teacher_user, student, direction_user
    ):
        from coachings import services

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)

        with patch("coachings.services.timezone.now", return_value=after_end):
            services.teacher_confirm_coaching(
                pk=scheduled_coaching.pk, user=teacher_user
            )
            with pytest.raises(ValidationError) as exc:
                services.teacher_confirm_coaching(
                    pk=scheduled_coaching.pk, user=teacher_user
                )
        assert "TeacherAlreadyConfirmedCoaching" in str(exc.value.detail)

    def test_parent_can_confirm_attendance(
        self, scheduled_coaching, teacher_user, student, direction_user, db
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role

        from coachings import services

        User = get_user_model()
        parent = User.objects.create_user(
            email=f"par_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Par",
            last_name="User",
            is_active=True,
        )
        role = Role.objects.get(code="parent")
        parent.groups.add(role.group)

        student.parent = parent
        student.save(update_fields=["parent"])

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)

        with patch("coachings.services.timezone.now", return_value=after_end):
            services.teacher_confirm_coaching(
                pk=scheduled_coaching.pk, user=teacher_user
            )
            services.confirm_participant_attendance(
                coaching_class_id=scheduled_coaching.pk,
                participant_pk=scheduled_coaching.participants.get(
                    student_id=student.pk
                ).pk,
                user=parent,
                attended=False,
            )

        p = scheduled_coaching.participants.get(student_id=student.pk)
        p.refresh_from_db()
        from coachings.models import CoachingParticipantStatus

        assert p.status == CoachingParticipantStatus.ABSENT


@pytest.mark.django_db
class TestParticipantConfirmAttendanceHTTP:
    """HTTP tests for confirm-attendance (student vs parent vs forbidden roles)."""

    @pytest.fixture
    def parent_only_user(self, db):
        from django.contrib.auth import get_user_model

        from accounts.models import Role

        User = get_user_model()
        user = User.objects.create_user(
            email=f"parent_only_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Parent",
            last_name="Only",
            is_active=True,
        )
        user.groups.add(Role.objects.get(code="parent").group)
        return user

    def _prepare_waiting_confirmation(
        self, scheduled_coaching, teacher_user, student_user, direction_user
    ):
        from unittest.mock import patch

        from coachings import services

        services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student_user.pk,
            requesting_user=direction_user,
        )
        after_end = scheduled_coaching.end_datetime + timedelta(minutes=1)
        services.advance_scheduled_to_waiting_confirmation_batch(now=after_end)
        with patch("coachings.services.timezone.now", return_value=after_end):
            services.teacher_confirm_coaching(
                pk=scheduled_coaching.pk, user=teacher_user
            )
        part_pk = scheduled_coaching.participants.get(student_id=student_user.pk).pk
        return part_pk, after_end

    def test_parent_has_dependent_perm_not_student_enrollment_perm(
        self, parent_only_user
    ):
        assert parent_only_user.has_perm(
            "coachings.can_confirm_dependent_coaching_attendance"
        )
        assert not parent_only_user.has_perm("accounts.can_participate_in_coaching")

    def test_parent_can_confirm_child_attendance_via_api(
        self,
        api_client,
        scheduled_coaching,
        teacher_user,
        student_user,
        direction_user,
        parent_only_user,
    ):
        student_user.parent = parent_only_user
        student_user.save(update_fields=["parent"])
        pk_part, after_end = self._prepare_waiting_confirmation(
            scheduled_coaching, teacher_user, student_user, direction_user
        )
        api_client.force_authenticate(user=parent_only_user)
        with patch("coachings.services.timezone.now", return_value=after_end):
            resp = api_client.post(
                f"/api/coachings/{scheduled_coaching.pk}/participants/{pk_part}/confirm-attendance/",
                data={"attended": True},
                format="json",
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "attended"

    def test_student_can_confirm_own_attendance_via_api(
        self,
        api_client,
        scheduled_coaching,
        teacher_user,
        student_user,
        direction_user,
    ):
        pk_part, after_end = self._prepare_waiting_confirmation(
            scheduled_coaching, teacher_user, student_user, direction_user
        )
        api_client.force_authenticate(user=student_user)
        with patch("coachings.services.timezone.now", return_value=after_end):
            resp = api_client.post(
                f"/api/coachings/{scheduled_coaching.pk}/participants/{pk_part}/confirm-attendance/",
                data={"attended": False},
                format="json",
            )
        assert resp.status_code == 200
        assert resp.json()["status"] == "absent"

    def test_collaborator_cannot_confirm_attendance(
        self,
        api_client,
        scheduled_coaching,
        teacher_user,
        student_user,
        direction_user,
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role

        pk_part, after_end = self._prepare_waiting_confirmation(
            scheduled_coaching, teacher_user, student_user, direction_user
        )
        User = get_user_model()
        collab = User.objects.create_user(
            email=f"collab_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="C",
            last_name="D",
            is_active=True,
        )
        collab.groups.add(Role.objects.get(code="collaborator").group)
        api_client.force_authenticate(user=collab)
        with patch("coachings.services.timezone.now", return_value=after_end):
            resp = api_client.post(
                f"/api/coachings/{scheduled_coaching.pk}/participants/{pk_part}/confirm-attendance/",
                data={"attended": True},
                format="json",
            )
        assert resp.status_code == 403
        assert "PermissionDenied" in resp.json()["errors"]["messages"]

    def test_teacher_blocked_at_permission_decorator(
        self,
        api_client,
        scheduled_coaching,
        teacher_user,
        student_user,
        direction_user,
    ):
        pk_part, after_end = self._prepare_waiting_confirmation(
            scheduled_coaching, teacher_user, student_user, direction_user
        )
        api_client.force_authenticate(user=teacher_user)
        with patch("coachings.services.timezone.now", return_value=after_end):
            resp = api_client.post(
                f"/api/coachings/{scheduled_coaching.pk}/participants/{pk_part}/confirm-attendance/",
                data={"attended": True},
                format="json",
            )
        assert resp.status_code == 403
        assert "PermissionDenied" in resp.json()["errors"]["messages"]

    def test_other_student_cannot_confirm_peer_attendance(
        self,
        api_client,
        scheduled_coaching,
        teacher_user,
        student_user,
        direction_user,
        db,
    ):
        from django.contrib.auth import get_user_model

        from accounts.models import Role

        pk_part, after_end = self._prepare_waiting_confirmation(
            scheduled_coaching, teacher_user, student_user, direction_user
        )
        User = get_user_model()
        other = User.objects.create_user(
            email=f"student_b_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Other",
            last_name="Student",
            is_active=True,
        )
        other.groups.add(Role.objects.get(code="student").group)
        api_client.force_authenticate(user=other)
        with patch("coachings.services.timezone.now", return_value=after_end):
            resp = api_client.post(
                f"/api/coachings/{scheduled_coaching.pk}/participants/{pk_part}/confirm-attendance/",
                data={"attended": True},
                format="json",
            )
        assert resp.status_code == 400
        assert (
            "CannotConfirmAttendanceForThisParticipant"
            in resp.json()["errors"]["messages"]
        )


@pytest.mark.django_db
class TestDirectCoordinationCoachingWithClasse:
    @pytest.fixture
    def classe_with_students(self, direction_user, student_user):
        from classes import services as classe_services

        classe = classe_services.create_classe(
            name="Test Classe for Coaching",
            created_by=direction_user,
        )
        classe_services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        return classe

    def test_roster_populated_from_classe(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
        classe_with_students,
        student_user,
    ):
        from coachings import services

        coaching = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
            classe_id=classe_with_students.pk,
        )
        coaching = services.get_coaching(pk=coaching.pk)
        participant_ids = [p.student_id for p in coaching.participants.all()]
        assert student_user.pk in participant_ids

    def test_classe_id_saved_on_coaching(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
        classe_with_students,
    ):
        from coachings import services

        coaching = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
            classe_id=classe_with_students.pk,
        )
        assert coaching.classe_id == classe_with_students.pk

    def test_nonexistent_classe_raises(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
    ):
        from coachings import services

        with pytest.raises(AppNotFound) as exc:
            services.create_direct_coordination_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                total_price="50.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
                classe_id=999999,
            )
        assert "ClasseNotFound" in str(exc.value.detail)

    def test_empty_classe_raises(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
    ):
        from classes import services as classe_services
        from coachings import services

        empty_classe = classe_services.create_classe(
            name="Empty Classe",
            created_by=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.create_direct_coordination_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                total_price="50.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
                classe_id=empty_classe.pk,
            )
        assert "ClasseHasNoMembers" in str(exc.value.detail)

    def test_classe_roster_rejects_member_without_participate_permission(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
        db,
    ):
        """Bulk classe roster must not enrol users lacking ``can_participate_in_coaching``."""
        from django.contrib.auth import get_user_model

        from accounts.models import Role
        from classes.models import Classe, ClasseMember
        from coachings import services

        User = get_user_model()
        parent = User.objects.create_user(
            email=f"parent_only_{uuid.uuid4().hex[:8]}@test.local",
            password="test-pass-123",
            first_name="Parent",
            last_name="Only",
            is_active=True,
        )
        parent.groups.add(Role.objects.get(code="parent").group)

        classe = Classe.objects.create(
            name=f"Classe invalid member {uuid.uuid4().hex[:8]}",
            created_by=direction_user,
        )
        ClasseMember.objects.create(
            classe=classe,
            student=parent,
            created_by=direction_user,
        )

        with pytest.raises(ValidationError) as exc:
            services.create_direct_coordination_coaching(
                teacher_id=teacher_user.pk,
                modality_id=modality.pk,
                studio_id=studio_with_modality.pk,
                total_price="50.00",
                start_datetime=_dt(1),
                end_datetime=_dt(2),
                requesting_user=direction_user,
                classe_id=classe.pk,
            )
        assert "UserCannotParticipateInCoaching" in str(exc.value.detail)

    def test_no_classe_uses_enrollment_roster(
        self,
        direction_user,
        teacher_user,
        modality,
        studio_with_modality,
    ):
        from coachings import services

        coaching = services.create_direct_coordination_coaching(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            requesting_user=direction_user,
        )
        assert coaching.classe_id is None
