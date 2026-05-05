"""HTTP tests for billing endpoints."""

from datetime import timedelta

import pytest
from django.utils import timezone


def _dt(hours=1):
    return timezone.now() + timedelta(hours=hours)


@pytest.mark.django_db
class TestBillingEndpoints:
    @pytest.fixture
    def coaching_with_entry(
        self, direction_user, teacher_user, student_user, modality, studio_with_modality
    ):
        from coachings import services
        from coachings.models import (
            CoachingClass,
            CoachingParticipantStatus,
            CoachingStatus,
        )

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
            total_price="40.00",
            user=direction_user,
        )
        services.add_participant(
            coaching_class_id=c.pk,
            student_id=student_user.pk,
            requesting_user=direction_user,
        )
        p = c.participants.get(student_id=student_user.pk)
        p.status = CoachingParticipantStatus.ATTENDED
        p.save(update_fields=["status"])

        CoachingClass.objects.filter(pk=c.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
        )
        services.complete_coaching(pk=c.pk, user=direction_user)
        return c

    def test_list_entries_authenticated_staff(self, auth_client, coaching_with_entry):
        r = auth_client.get("/api/billing/entries/")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_cancel_entry(self, auth_client, coaching_with_entry):
        from billing.models import BillingEntry

        entry = BillingEntry.objects.filter(
            coaching_class_id=coaching_with_entry.pk
        ).first()
        assert entry is not None

        r = auth_client.post(
            f"/api/billing/entries/{entry.pk}/cancel/",
            {"notes": "Correção administrativa."},
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "cancelled"
