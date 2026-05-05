"""HTTP tests for fine endpoints."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone


def _dt(hours=1):
    return timezone.now() + timedelta(hours=hours)


def _make_student(suffix):
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"fine_api_{suffix}@test.local",
        password="x",
        first_name=f"S{suffix}",
        last_name="Test",
        is_active=True,
    )
    user.groups.add(Role.objects.get(code="student").group)
    return user


@pytest.mark.django_db
class TestFineEndpoints:
    @pytest.fixture
    def coaching_with_fine(
        self, direction_user, teacher_user, modality, studio_with_modality
    ):
        """A completed coaching with one ABSENT participant → one PENDING_REVIEW fine."""
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
        student = _make_student("api_absent")
        services.add_participant(
            coaching_class_id=c.pk,
            student_id=student.pk,
            requesting_user=direction_user,
        )
        c.participants.filter(student=student).update(
            status=CoachingParticipantStatus.ABSENT
        )
        CoachingClass.objects.filter(pk=c.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
        )
        services.complete_coaching(pk=c.pk, user=direction_user)
        return c, student

    def test_list_fines_staff_sees_all(self, auth_client, coaching_with_fine):
        r = auth_client.get("/api/billing/fines/")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, list)
        assert len(body) >= 1
        item = body[0]
        assert "reason" in item and "status" in item

    def test_list_fines_filter_by_status(self, auth_client, coaching_with_fine):
        r = auth_client.get("/api/billing/fines/?status=pending_review")
        assert r.status_code == 200
        for f in r.json():
            assert f["status"] == "pending_review"

    def test_get_fine_detail_includes_suggested_amount(
        self, auth_client, coaching_with_fine
    ):
        from billing.models import Fine

        coaching, _ = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)
        r = auth_client.get(f"/api/billing/fines/{fine.pk}/")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "pending_review"
        assert body["amount"] is None
        assert body["suggested_amount"] is not None

    def test_approve_fine_with_amount_creates_billing_entry(
        self, auth_client, coaching_with_fine
    ):
        from billing.models import BillingEntry, Fine

        coaching, student = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)

        r = auth_client.post(
            f"/api/billing/fines/{fine.pk}/approve/",
            {"amount": "30.00", "notes": "Reviewed."},
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "approved"
        assert Decimal(body["amount"]) == Decimal("30.00")

        entry = BillingEntry.objects.get(fine_id=fine.pk)
        assert entry.amount_due == Decimal("30.00")
        assert entry.student_id == student.pk
        assert entry.description.startswith("Multa: Ausência")

    def test_approve_fine_without_amount_uses_default(
        self, auth_client, coaching_with_fine, settings
    ):
        from billing.models import BillingEntry, Fine

        settings.COACHING_FINE_DEFAULT_AMOUNT = "25.00"
        coaching, _ = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)

        r = auth_client.post(
            f"/api/billing/fines/{fine.pk}/approve/",
            {},
            format="json",
        )
        assert r.status_code == 200
        entry = BillingEntry.objects.get(fine_id=fine.pk)
        assert entry.amount_due == Decimal("25.00")

    def test_waive_fine(self, auth_client, coaching_with_fine):
        from billing.models import BillingEntry, Fine

        coaching, _ = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)

        r = auth_client.post(
            f"/api/billing/fines/{fine.pk}/waive/",
            {"notes": "Apresentou justificação válida."},
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "waived"
        assert not BillingEntry.objects.filter(fine_id=fine.pk).exists()

    def test_waive_fine_requires_notes(self, auth_client, coaching_with_fine):
        from billing.models import Fine

        coaching, _ = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)

        r = auth_client.post(
            f"/api/billing/fines/{fine.pk}/waive/",
            {"notes": "   "},
            format="json",
        )
        assert r.status_code == 400

    def test_student_only_sees_own_fines(self, api_client, coaching_with_fine):
        from billing.models import Fine

        coaching, owner = coaching_with_fine
        api_client.force_authenticate(user=owner)
        r = api_client.get("/api/billing/fines/")
        assert r.status_code == 200
        body = r.json()
        assert len(body) == 1
        assert body[0]["student_id"] == owner.pk

        intruder = _make_student("api_intruder")
        api_client.force_authenticate(user=intruder)
        fine = Fine.objects.get(coaching_class=coaching)
        r2 = api_client.get(f"/api/billing/fines/{fine.pk}/")
        assert r2.status_code == 404

    def test_student_cannot_approve_fine(self, api_client, coaching_with_fine):
        from billing.models import Fine

        coaching, owner = coaching_with_fine
        fine = Fine.objects.get(coaching_class=coaching)
        api_client.force_authenticate(user=owner)
        r = api_client.post(
            f"/api/billing/fines/{fine.pk}/approve/",
            {"amount": "10.00"},
            format="json",
        )
        assert r.status_code == 403
