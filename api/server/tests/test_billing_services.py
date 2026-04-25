"""Tests for `billing.services`."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError


@pytest.fixture
def scheduled_coaching(direction_user, teacher_user, modality, studio_with_modality):
    """Creates an approved coaching in SCHEDULED state for billing tests."""
    from coachings import services

    # Criamos uma aula agendada para daqui a 1 hora
    c = services.create_coaching_request(
        teacher_id=teacher_user.pk,
        modality_id=modality.pk,
        start_datetime=timezone.now() + timedelta(hours=1),
        end_datetime=timezone.now() + timedelta(hours=2),
        requesting_user=direction_user,
    )
    services.teacher_accept_coaching(pk=c.pk, user=teacher_user)

    return services.approve_coaching(
        pk=c.pk,
        studio_id=studio_with_modality.pk,
        total_price="50.00",
        user=direction_user,
    )


class TestGenerateCoachingBilling:
    @pytest.mark.django_db
    def test_generate_billing_invalid_price_raises_error(self, scheduled_coaching, direction_user):
        """
        Ensure that attempting to generate bills for a coaching class
        with no price or zero price raises an InvalidCoachingPrice error.
        """
        from billing.services import generate_coaching_billing

        # Force the coaching class to have an invalid price
        scheduled_coaching.total_price = 0
        scheduled_coaching.save(update_fields=["total_price"])

        with pytest.raises(ValidationError) as exc:
            generate_coaching_billing(
                coaching_class=scheduled_coaching,
                created_by=direction_user
            )

        assert "InvalidCoachingPrice" in str(exc.value.detail)