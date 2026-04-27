"""Tests for fine creation, approval, and waiving."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError


def _dt(hours=1):
    return timezone.now() + timedelta(hours=hours)


@pytest.fixture
def scheduled_coaching(direction_user, teacher_user, modality, studio_with_modality):
    """Approved coaching in SCHEDULED state."""
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


def _make_student(suffix):
    """Create a fresh student user. Suffix used to keep emails unique."""
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"fine_stud_{suffix}@test.local",
        password="x",
        first_name=f"S{suffix}",
        last_name="Test",
        is_active=True,
    )
    user.groups.add(Role.objects.get(code="student").group)
    return user


@pytest.mark.django_db
class TestCreateFinesForCoaching:
    def test_absent_participant_creates_pending_fine(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services
        from billing.models import Fine, FineReason, FineStatus
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("absent_one")
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        p = scheduled_coaching.participants.get(student_id=student.pk)
        p.status = CoachingParticipantStatus.ABSENT
        p.save(update_fields=["status"])

        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert len(fines) == 1
        assert fines[0].reason == FineReason.ABSENCE
        assert fines[0].status == FineStatus.PENDING_REVIEW
        assert fines[0].amount is None
        assert fines[0].student_id == student.pk
        assert Fine.objects.filter(coaching_class=scheduled_coaching).count() == 1

    def test_late_cancelled_creates_late_cancellation_fine(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services
        from billing.models import FineReason, FineStatus
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("late_one")
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        p = scheduled_coaching.participants.get(student_id=student.pk)
        p.status = CoachingParticipantStatus.LATE_CANCELLED
        p.save(update_fields=["status"])

        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert len(fines) == 1
        assert fines[0].reason == FineReason.LATE_CANCELLATION
        assert fines[0].status == FineStatus.PENDING_REVIEW

    def test_attended_and_cancelled_do_not_generate_fines(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        s_attended = _make_student("att")
        s_cancelled = _make_student("can")
        for s in (s_attended, s_cancelled):
            coachings_services.add_participant(
                coaching_class_id=scheduled_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        scheduled_coaching.participants.filter(student=s_attended).update(
            status=CoachingParticipantStatus.ATTENDED
        )
        scheduled_coaching.participants.filter(student=s_cancelled).update(
            status=CoachingParticipantStatus.CANCELLED
        )

        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert fines == []

    def test_mixed_statuses_only_absent_and_late_get_fines(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services
        from billing.models import FineReason
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        sa = _make_student("mix_att")
        sb = _make_student("mix_abs")
        sc = _make_student("mix_late")
        sd = _make_student("mix_canc")
        mapping = [
            (sa, CoachingParticipantStatus.ATTENDED),
            (sb, CoachingParticipantStatus.ABSENT),
            (sc, CoachingParticipantStatus.LATE_CANCELLED),
            (sd, CoachingParticipantStatus.CANCELLED),
        ]
        for s, _ in mapping:
            coachings_services.add_participant(
                coaching_class_id=scheduled_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        for s, status_value in mapping:
            scheduled_coaching.participants.filter(student=s).update(
                status=status_value
            )

        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert len(fines) == 2
        reasons = {f.student_id: f.reason for f in fines}
        assert reasons[sb.pk] == FineReason.ABSENCE
        assert reasons[sc.pk] == FineReason.LATE_CANCELLATION

    def test_fines_created_regardless_of_is_billable(
        self, scheduled_coaching, direction_user
    ):
        """is_billable=False suppresses billing entries but NOT fines."""
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import (
            CoachingClass,
            CoachingParticipantStatus,
        )

        student = _make_student("nbil")
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )
        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(is_billable=False)
        scheduled_coaching.refresh_from_db()

        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert len(fines) == 1

    def test_double_call_raises_integrity_error(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("dup")
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )
        billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        with pytest.raises(IntegrityError):
            billing_services.create_fines_for_coaching(
                coaching=scheduled_coaching, user=direction_user
            )


@pytest.mark.django_db
class TestApproveFine:
    def _make_pending_fine(self, scheduled_coaching, direction_user, student_label):
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student(student_label)
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )
        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        return fines[0], student

    def test_approve_with_explicit_amount(self, scheduled_coaching, direction_user):
        from billing import services as billing_services
        from billing.models import (
            BillingEntry,
            BillingEntrySourceType,
            BillingEntryStatus,
            FineStatus,
        )

        fine, student = self._make_pending_fine(
            scheduled_coaching, direction_user, "appr1"
        )
        out = billing_services.approve_fine(
            fine=fine,
            amount=Decimal("30.00"),
            reviewed_by=direction_user,
            notes="Reviewed.",
        )
        assert out.status == FineStatus.APPROVED
        assert out.amount == Decimal("30.00")
        assert out.reviewed_by_id == direction_user.pk
        assert out.reviewed_at is not None

        entry = BillingEntry.objects.get(fine=fine)
        assert entry.source_type == BillingEntrySourceType.FINE
        assert entry.amount_due == Decimal("30.00")
        assert entry.status == BillingEntryStatus.PENDING
        assert entry.student_id == student.pk
        assert entry.description.startswith("Multa: Ausência")

    def test_approve_without_amount_uses_default(
        self, scheduled_coaching, direction_user, settings
    ):
        from billing import services as billing_services
        from billing.models import BillingEntry

        settings.COACHING_FINE_DEFAULT_AMOUNT = "25.00"

        fine, _ = self._make_pending_fine(
            scheduled_coaching, direction_user, "appr_def"
        )
        out = billing_services.approve_fine(
            fine=fine,
            amount=None,
            reviewed_by=direction_user,
        )
        assert out.amount == Decimal("25.00")
        entry = BillingEntry.objects.get(fine=fine)
        assert entry.amount_due == Decimal("25.00")

    def test_approve_negative_amount_rejected(self, scheduled_coaching, direction_user):
        from billing import services as billing_services

        fine, _ = self._make_pending_fine(
            scheduled_coaching, direction_user, "appr_neg"
        )
        with pytest.raises(ValidationError) as exc:
            billing_services.approve_fine(
                fine=fine,
                amount=Decimal("-5.00"),
                reviewed_by=direction_user,
            )
        assert "FineAmountNegative" in str(exc.value.detail)

    def test_approve_already_approved_rejected(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services

        fine, _ = self._make_pending_fine(
            scheduled_coaching, direction_user, "appr_dup"
        )
        billing_services.approve_fine(
            fine=fine, amount=Decimal("25.00"), reviewed_by=direction_user
        )
        with pytest.raises(ValidationError) as exc:
            billing_services.approve_fine(
                fine=fine, amount=Decimal("30.00"), reviewed_by=direction_user
            )
        assert "FineNotPendingReview" in str(exc.value.detail)


@pytest.mark.django_db
class TestWaiveFine:
    def _make_pending_fine(self, scheduled_coaching, direction_user, label):
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student(label)
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.LATE_CANCELLED
        )
        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        return fines[0]

    def test_waive_pending_fine(self, scheduled_coaching, direction_user):
        from billing import services as billing_services
        from billing.models import BillingEntry, FineStatus

        fine = self._make_pending_fine(scheduled_coaching, direction_user, "waive_ok")
        out = billing_services.waive_fine(
            fine=fine,
            reviewed_by=direction_user,
            notes="Aluno apresentou justificação válida.",
        )
        assert out.status == FineStatus.WAIVED
        assert out.amount is None
        assert out.reviewed_by_id == direction_user.pk
        assert not BillingEntry.objects.filter(fine=fine).exists()

    def test_waive_requires_notes(self, scheduled_coaching, direction_user):
        from billing import services as billing_services

        fine = self._make_pending_fine(
            scheduled_coaching, direction_user, "waive_notes"
        )
        with pytest.raises(ValidationError) as exc:
            billing_services.waive_fine(
                fine=fine, reviewed_by=direction_user, notes="   "
            )
        assert "WaiveNotesRequired" in str(exc.value.detail)

    def test_waive_already_terminal_rejected(self, scheduled_coaching, direction_user):
        from billing import services as billing_services

        fine = self._make_pending_fine(scheduled_coaching, direction_user, "waive_term")
        billing_services.approve_fine(
            fine=fine, amount=Decimal("25.00"), reviewed_by=direction_user
        )
        with pytest.raises(ValidationError) as exc:
            billing_services.waive_fine(
                fine=fine, reviewed_by=direction_user, notes="Tentativa tardia."
            )
        assert "FineNotPendingReview" in str(exc.value.detail)


@pytest.mark.django_db
class TestListAndGetFineScoping:
    def _seed_fine(self, scheduled_coaching, direction_user, label):
        from billing import services as billing_services
        from coachings import services as coachings_services
        from coachings.models import CoachingParticipantStatus

        student = _make_student(label)
        coachings_services.add_participant(
            coaching_class_id=scheduled_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        scheduled_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )
        fines = billing_services.create_fines_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        return fines[0], student

    def test_student_only_sees_own(self, scheduled_coaching, direction_user):
        from billing import services as billing_services

        _, owner = self._seed_fine(scheduled_coaching, direction_user, "scope_a")
        qs_owner = billing_services.list_fines(requesting_user=owner)
        assert qs_owner.count() == 1
        qs_staff = billing_services.list_fines(requesting_user=direction_user)
        assert qs_staff.count() >= 1

    def test_student_filter_by_other_student_id_rejected(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services

        _, owner = self._seed_fine(scheduled_coaching, direction_user, "scope_b")
        with pytest.raises(ValidationError) as exc:
            billing_services.list_fines(
                requesting_user=owner, student_id=direction_user.pk
            )
        assert "FineStudentFilterStaffOnly" in str(exc.value.detail)

    def test_get_other_student_fine_returns_404(
        self, scheduled_coaching, direction_user
    ):
        from billing import services as billing_services

        fine, _ = self._seed_fine(scheduled_coaching, direction_user, "scope_c")
        intruder = _make_student("scope_intruder")
        with pytest.raises(NotFound):
            billing_services.get_fine_for_request(pk=fine.pk, requesting_user=intruder)
