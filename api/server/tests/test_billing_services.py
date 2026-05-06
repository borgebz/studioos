"""Tests for billing services."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound

from billing.models import BillingEntrySourceType, BillingEntryStatus


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


@pytest.fixture
def student_participant(scheduled_coaching, direction_user):
    from django.contrib.auth import get_user_model

    from accounts.models import Role
    from coachings import services

    User = get_user_model()
    user = User.objects.create_user(
        email=f"bstud_{direction_user.pk}@test.local",
        password="x",
        first_name="S",
        last_name="T",
        is_active=True,
    )
    role = Role.objects.get(code="student")
    user.groups.add(role.group)
    services.add_participant(
        coaching_class_id=scheduled_coaching.pk,
        student_id=user.pk,
        requesting_user=direction_user,
    )
    return user


@pytest.mark.django_db
class TestCreateBillingEntriesForCoaching:
    def test_happy_single_attended(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from billing.models import BillingEntry
        from coachings.models import CoachingClass, CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(
            total_price=Decimal("30.00")
        )
        scheduled_coaching.refresh_from_db()

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert len(rows) == 1
        assert rows[0].amount_due == Decimal("30.00")
        assert rows[0].status == BillingEntryStatus.PENDING
        assert rows[0].source_type == BillingEntrySourceType.COACHING
        assert rows[0].description, "description must be populated at creation"
        assert "Privada (1 de 1)" in rows[0].description
        assert BillingEntry.objects.count() == 1

    def test_not_billable_skips(self, scheduled_coaching, direction_user):
        from billing import services
        from billing.models import BillingEntry
        from coachings.models import CoachingClass

        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(
            is_billable=False,
            total_price=Decimal("50.00"),
        )
        scheduled_coaching.refresh_from_db()

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert rows == []
        assert BillingEntry.objects.count() == 0

    def test_zero_price_skips(self, scheduled_coaching, direction_user):
        from billing import services
        from billing.models import BillingEntry
        from coachings.models import CoachingClass

        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(
            total_price=Decimal("0.00"),
        )
        scheduled_coaching.refresh_from_db()

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert rows == []
        assert BillingEntry.objects.count() == 0

    def test_none_total_raises(self, scheduled_coaching, direction_user):
        from billing import services
        from coachings.models import CoachingClass

        CoachingClass.objects.filter(pk=scheduled_coaching.pk).update(total_price=None)
        scheduled_coaching.refresh_from_db()

        with pytest.raises(ValidationError) as exc:
            services.create_billing_entries_for_coaching(
                coaching=scheduled_coaching, user=direction_user
            )
        assert "CoachingMissingTotalPrice" in str(exc.value.detail)

    def test_double_call_integrity_error(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from billing.models import BillingEntry
        from coachings.models import CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        assert BillingEntry.objects.count() == 1

        with pytest.raises((IntegrityError, DjangoValidationError)):
            services.create_billing_entries_for_coaching(
                coaching=scheduled_coaching, user=direction_user
            )


@pytest.mark.django_db
class TestCancelBillingEntry:
    def test_cancel_pending(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from coachings.models import CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )
        entry = rows[0]

        out = services.cancel_billing_entry(
            entry=entry,
            notes="Erro administrativo.",
            updated_by=direction_user,
        )
        assert out.status == BillingEntryStatus.CANCELLED
        assert out.cancelled_at is not None
        assert out.notes == "Erro administrativo."

    def test_cancel_requires_notes(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from coachings.models import CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )

        with pytest.raises(ValidationError) as exc:
            services.cancel_billing_entry(
                entry=rows[0],
                notes="   ",
                updated_by=direction_user,
            )
        assert "CancellationNotesRequired" in str(exc.value.detail)


@pytest.mark.django_db
class TestListBillingEntriesScoping:
    def test_student_sees_only_own(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from coachings.models import CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )

        qs = services.list_billing_entries(requesting_user=student_participant)
        assert qs.count() == 1

        qs_staff = services.list_billing_entries(requesting_user=direction_user)
        assert qs_staff.count() >= 1

    def test_student_student_id_filter_raises(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services

        with pytest.raises(ValidationError) as exc:
            services.list_billing_entries(
                requesting_user=student_participant,
                student_id=direction_user.pk,
            )
        assert "BillingStudentFilterStaffOnly" in str(exc.value.detail)


@pytest.mark.django_db
class TestGetBillingEntryForRequest:
    def test_other_student_not_found(
        self, scheduled_coaching, student_participant, direction_user
    ):
        from billing import services
        from coachings.models import CoachingParticipantStatus

        p = scheduled_coaching.participants.get(student_id=student_participant.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        rows = services.create_billing_entries_for_coaching(
            coaching=scheduled_coaching, user=direction_user
        )

        from django.contrib.auth import get_user_model

        User = get_user_model()
        other = User.objects.create_user(
            email="other_view@test.local",
            password="x",
            first_name="O",
            last_name="T",
            is_active=True,
        )

        with pytest.raises(AppNotFound) as exc:
            services.get_billing_entry_for_request(pk=rows[0].pk, requesting_user=other)
        assert "BillingEntryNotFound" in str(exc.value.detail)
