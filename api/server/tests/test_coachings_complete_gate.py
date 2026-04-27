"""End-to-end completion: gate, billing entries, and fines together."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError


def _dt(hours=1):
    return timezone.now() + timedelta(hours=hours)


def _make_student(suffix):
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"complete_stud_{suffix}@test.local",
        password="x",
        first_name=f"S{suffix}",
        last_name="Test",
        is_active=True,
    )
    user.groups.add(Role.objects.get(code="student").group)
    return user


@pytest.fixture
def pending_completion_coaching(
    direction_user, teacher_user, modality, studio_with_modality
):
    """Coaching pushed to PENDING_COMPLETION_APPROVAL with a known total_price."""
    from coachings import services
    from coachings.models import CoachingClass, CoachingStatus

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
        total_price="60.00",
        user=direction_user,
    )
    CoachingClass.objects.filter(pk=c.pk).update(
        status=CoachingStatus.PENDING_COMPLETION_APPROVAL
    )
    return services.get_coaching(pk=c.pk)


@pytest.mark.django_db
class TestCompleteCoachingGate:
    def test_blocked_when_participant_active(
        self, pending_completion_coaching, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("gate_active")
        services.add_participant(
            coaching_class_id=pending_completion_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        # Coaching is already in PENDING_COMPLETION_APPROVAL, so add_participant
        # creates the row as INVITED (which the gate excludes). Force ACTIVE
        # to exercise the intermediate-status path.
        pending_completion_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ACTIVE
        )

        with pytest.raises(ValidationError) as exc:
            services.complete_coaching(
                pk=pending_completion_coaching.pk, user=direction_user
            )
        assert "CoachingHasUnresolvedParticipantStatuses" in str(exc.value.detail)

    def test_passes_when_all_participants_in_final_state(
        self, pending_completion_coaching, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        s1 = _make_student("gate_att")
        s2 = _make_student("gate_abs")
        for s in (s1, s2):
            services.add_participant(
                coaching_class_id=pending_completion_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        pending_completion_coaching.participants.filter(student=s1).update(
            status=CoachingParticipantStatus.ATTENDED
        )
        pending_completion_coaching.participants.filter(student=s2).update(
            status=CoachingParticipantStatus.ABSENT
        )

        out = services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        assert out.status == CoachingStatus.COMPLETED

    def test_passes_with_zero_participants(
        self, pending_completion_coaching, direction_user
    ):
        from coachings import services
        from coachings.models import CoachingStatus

        out = services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        assert out.status == CoachingStatus.COMPLETED


@pytest.mark.django_db
class TestCompleteCoachingGeneratesEntriesAndFines:
    def test_attended_creates_entries_with_descriptions(
        self, pending_completion_coaching, direction_user
    ):
        from billing.models import BillingEntry, BillingEntrySourceType
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        s1 = _make_student("c_a1")
        s2 = _make_student("c_a2")
        for s in (s1, s2):
            services.add_participant(
                coaching_class_id=pending_completion_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        pending_completion_coaching.participants.update(
            status=CoachingParticipantStatus.ATTENDED
        )

        services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        entries = BillingEntry.objects.filter(
            coaching_class=pending_completion_coaching,
            source_type=BillingEntrySourceType.COACHING,
        ).order_by("created_at")
        assert entries.count() == 2
        # 60.00 / 2 = 30.00 each, no remainder
        assert sum(e.amount_due for e in entries) == Decimal("60.00")
        for e in entries:
            assert e.description, "description must be populated at creation"
            assert "Dueto (" in e.description  # 2 attended → Dueto

    def test_absent_creates_pending_fine_no_billing_entry(
        self, pending_completion_coaching, direction_user
    ):
        from billing.models import (
            BillingEntry,
            BillingEntrySourceType,
            Fine,
            FineReason,
            FineStatus,
        )
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("c_abs")
        services.add_participant(
            coaching_class_id=pending_completion_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        pending_completion_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )

        services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        # Fine generated, no billing entry yet (waiting for approval)
        fine = Fine.objects.get(coaching_class=pending_completion_coaching)
        assert fine.status == FineStatus.PENDING_REVIEW
        assert fine.reason == FineReason.ABSENCE
        assert fine.student_id == student.pk
        assert not BillingEntry.objects.filter(
            coaching_class=pending_completion_coaching,
            source_type=BillingEntrySourceType.COACHING,
        ).exists()

    def test_mixed_states_only_attended_billed_only_absent_fined(
        self, pending_completion_coaching, direction_user
    ):
        from billing.models import (
            BillingEntry,
            BillingEntrySourceType,
            Fine,
            FineReason,
        )
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        sa = _make_student("mix_a")
        sb = _make_student("mix_b")
        sc = _make_student("mix_c")
        sd = _make_student("mix_d")
        for s in (sa, sb, sc, sd):
            services.add_participant(
                coaching_class_id=pending_completion_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        pending_completion_coaching.participants.filter(student=sa).update(
            status=CoachingParticipantStatus.ATTENDED
        )
        pending_completion_coaching.participants.filter(student=sb).update(
            status=CoachingParticipantStatus.ABSENT
        )
        pending_completion_coaching.participants.filter(student=sc).update(
            status=CoachingParticipantStatus.LATE_CANCELLED
        )
        pending_completion_coaching.participants.filter(student=sd).update(
            status=CoachingParticipantStatus.CANCELLED
        )

        services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        entries = BillingEntry.objects.filter(
            coaching_class=pending_completion_coaching,
            source_type=BillingEntrySourceType.COACHING,
        )
        assert entries.count() == 1
        assert entries.first().student_id == sa.pk
        # 60.00 / 1 = 60.00 to the only attended
        assert entries.first().amount_due == Decimal("60.00")

        fines = Fine.objects.filter(coaching_class=pending_completion_coaching)
        assert fines.count() == 2
        reasons = {f.student_id: f.reason for f in fines}
        assert reasons[sb.pk] == FineReason.ABSENCE
        assert reasons[sc.pk] == FineReason.LATE_CANCELLATION
        assert sd.pk not in reasons  # CANCELLED → no fine

    def test_complete_with_only_cancelled_participants_no_entries_no_fines(
        self, pending_completion_coaching, direction_user
    ):
        from billing.models import BillingEntry, Fine
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        student = _make_student("only_canc")
        services.add_participant(
            coaching_class_id=pending_completion_coaching.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        pending_completion_coaching.participants.filter(student=student).update(
            status=CoachingParticipantStatus.CANCELLED
        )

        services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        assert not BillingEntry.objects.filter(
            coaching_class=pending_completion_coaching
        ).exists()
        assert not Fine.objects.filter(
            coaching_class=pending_completion_coaching
        ).exists()

    def test_non_billable_skips_entries_but_still_generates_fines(
        self, pending_completion_coaching, direction_user
    ):
        from billing.models import (
            BillingEntry,
            BillingEntrySourceType,
            Fine,
        )
        from coachings import services
        from coachings.models import (
            CoachingClass,
            CoachingParticipantStatus,
        )

        s1 = _make_student("nb_att")
        s2 = _make_student("nb_abs")
        for s in (s1, s2):
            services.add_participant(
                coaching_class_id=pending_completion_coaching.pk,
                student_id=s.pk,
                requesting_user=direction_user,
            )
        pending_completion_coaching.participants.filter(student=s1).update(
            status=CoachingParticipantStatus.ATTENDED
        )
        pending_completion_coaching.participants.filter(student=s2).update(
            status=CoachingParticipantStatus.ABSENT
        )
        CoachingClass.objects.filter(pk=pending_completion_coaching.pk).update(
            is_billable=False
        )

        services.complete_coaching(
            pk=pending_completion_coaching.pk, user=direction_user
        )
        # No coaching billing entry
        assert not BillingEntry.objects.filter(
            coaching_class=pending_completion_coaching,
            source_type=BillingEntrySourceType.COACHING,
        ).exists()
        # But fine was still generated for the absent student
        fines = Fine.objects.filter(coaching_class=pending_completion_coaching)
        assert fines.count() == 1
        assert fines.first().student_id == s2.pk
