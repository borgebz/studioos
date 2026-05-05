"""Coachings workflow integration with billing."""

from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone


def _dt(hours=1):
    return timezone.now() + timedelta(hours=hours)


@pytest.mark.django_db
class TestCoachingBillingIntegration:
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

    def test_complete_with_zero_price_no_entries(
        self, pending_coaching, direction_user, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingClass, CoachingStatus
        from billing.models import BillingEntry

        services.approve_coaching(
            pk=pending_coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="0.00",
            user=direction_user,
        )
        CoachingClass.objects.filter(pk=pending_coaching.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
        )
        out = services.complete_coaching(pk=pending_coaching.pk, user=direction_user)
        assert out.status == CoachingStatus.COMPLETED
        assert BillingEntry.objects.count() == 0

    def test_complete_billing_failure_rollbacks_completion(
        self, pending_coaching, direction_user, studio_with_modality
    ):
        from coachings import services
        from coachings.models import CoachingClass, CoachingStatus

        services.approve_coaching(
            pk=pending_coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        CoachingClass.objects.filter(pk=pending_coaching.pk).update(
            status=CoachingStatus.PENDING_COMPLETION_APPROVAL
        )

        with patch(
            "coachings.services.create_billing_entries_for_coaching",
            side_effect=RuntimeError("forced billing failure"),
        ):
            with pytest.raises(RuntimeError):
                services.complete_coaching(pk=pending_coaching.pk, user=direction_user)

        CoachingClass.objects.get(pk=pending_coaching.pk).refresh_from_db()
        c = CoachingClass.objects.get(pk=pending_coaching.pk)
        assert c.status == CoachingStatus.PENDING_COMPLETION_APPROVAL
