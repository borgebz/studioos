"""Tests for `enrollments.services` business logic."""

from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from rest_framework.exceptions import NotFound, ValidationError

from tests.conftest import enrollment_submit_kwargs


@pytest.mark.django_db
class TestPeriods:
    def test_get_period_not_found(self):
        from enrollments import services

        with pytest.raises(NotFound):
            services.get_period(pk=9_999_999)

    def test_open_close_period(self, direction_user):
        from enrollments import services
        from enrollments.models import PeriodType

        today = date.today()
        p = services.create_period(
            created_by=direction_user,
            academic_year="2099/2100",
            period_type=PeriodType.BOTH,
            start_date=today - timedelta(days=1),
            end_date=today + timedelta(days=1),
            is_open=False,
        )
        p = services.open_period(period=p, updated_by=direction_user)
        assert p.is_open is True
        p = services.close_period(period=p, updated_by=direction_user)
        assert p.is_open is False


@pytest.mark.django_db
class TestGetOpenPeriod:
    def test_no_open_period_raises(self, frozen_enrollment_march_2026):
        from enrollments import services

        with pytest.raises(ValidationError) as exc:
            services.submit_enrollment(
                **enrollment_submit_kwargs(modality_id=1),
            )
        assert "NoOpenEnrollmentPeriod" in str(exc.value.detail)

    def test_period_type_must_match_enrollment_type(
        self, modality, frozen_enrollment_march_2026
    ):
        from enrollments import services
        from enrollments.models import PeriodType

        services.create_period(
            created_by=None,
            academic_year="2025/2026",
            period_type=PeriodType.RENEWAL,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            is_open=True,
        )
        with pytest.raises(ValidationError) as exc:
            services.submit_enrollment(
                **enrollment_submit_kwargs(
                    modality_id=modality.pk,
                ),
            )
        assert "NoOpenEnrollmentPeriod" in str(exc.value.detail)

    def test_new_enrollment_finds_both_or_new_period(
        self, modality, frozen_enrollment_march_2026
    ):
        from enrollments import services
        from enrollments.models import PeriodType

        services.create_period(
            created_by=None,
            academic_year="2025/2026",
            period_type=PeriodType.BOTH,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            is_open=True,
        )
        enrollment = services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )
        assert enrollment.pk is not None
        from enrollments.models import EnrollmentType

        assert enrollment.enrollment_type == EnrollmentType.NEW


@pytest.mark.django_db
class TestSubmitEnrollment:
    def test_requires_modalities(self, open_enrollment_period, modality):
        from enrollments import services

        data = enrollment_submit_kwargs(modality_id=modality.pk)
        data["modality_ids"] = []
        with pytest.raises(ValidationError) as exc:
            services.submit_enrollment(**data)
        assert "AtLeastOneModalityRequired" in str(exc.value.detail)

    def test_creates_nested_rows(self, open_enrollment_period, modality):
        from enrollments import services
        from enrollments.models import EnrollmentConsent, EnrollmentModality

        e = services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )
        assert EnrollmentModality.objects.filter(enrollment=e).count() == 1
        assert EnrollmentConsent.objects.filter(enrollment=e).count() == 2

    def test_atomic_rollback_on_model_validation_error(
        self, open_enrollment_period, modality
    ):
        """Invalid enrollment data fails full_clean inside atomic — no enrollment row."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        from enrollments import services
        from enrollments.models import Enrollment

        before = Enrollment.objects.count()
        kwargs = enrollment_submit_kwargs(modality_id=modality.pk)
        kwargs["enrollment_data"]["student_date_of_birth"] = None
        with pytest.raises(DjangoValidationError):
            services.submit_enrollment(**kwargs)
        assert Enrollment.objects.count() == before


@pytest.mark.django_db
class TestStatusTransitions:
    def _submitted_enrollment(self, open_enrollment_period, modality):
        from enrollments import services

        return services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )

    def test_invalid_transition(self, open_enrollment_period, modality):
        from enrollments import services
        from enrollments.models import EnrollmentStatus

        e = self._submitted_enrollment(open_enrollment_period, modality)
        e.status = EnrollmentStatus.APPROVED
        e.save()
        with pytest.raises(ValidationError) as exc:
            services.reject_enrollment(enrollment=e, updated_by=None)
        assert "InvalidStatusTransition" in str(exc.value.detail)

    def test_reject_and_cancel_from_submitted(self, open_enrollment_period, modality):
        from enrollments import services
        from enrollments.models import EnrollmentStatus

        e = self._submitted_enrollment(open_enrollment_period, modality)
        e = services.reject_enrollment(enrollment=e, updated_by=None)
        assert e.status == EnrollmentStatus.REJECTED

        e2 = self._submitted_enrollment(open_enrollment_period, modality)
        e2 = services.cancel_enrollment(enrollment=e2, updated_by=None)
        assert e2.status == EnrollmentStatus.CANCELLED


@pytest.mark.django_db
class TestApproveEnrollment:
    def test_student_and_parent_email_must_differ(
        self, open_enrollment_period, modality
    ):
        from enrollments import services

        shared = f"same_{uuid.uuid4().hex[:8]}@test.local"
        e = services.submit_enrollment(
            **enrollment_submit_kwargs(
                modality_id=modality.pk,
                student_email=shared,
                parent_email=shared,
            ),
        )
        with pytest.raises(ValidationError) as exc:
            services.approve_enrollment(enrollment=e, updated_by=None)
        assert "StudentAndParentEmailMustBeDifferent" in str(exc.value.detail)

    @pytest.mark.django_db(transaction=True)
    def test_new_creates_users_and_sends_activation(
        self, open_enrollment_period, modality
    ):
        from enrollments import services

        e = services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )
        with patch("enrollments.services.send_activation_email") as send_mail:
            services.approve_enrollment(enrollment=e, updated_by=None)
        assert send_mail.call_count == 2

    def test_renewal_updates_existing_users(
        self, open_enrollment_period, modality, direction_user
    ):
        from django.contrib.auth import get_user_model

        from enrollments import services
        from enrollments.models import EnrollmentType

        User = get_user_model()
        stu_email = f"st_{uuid.uuid4().hex[:8]}@test.local"
        par_email = f"pa_{uuid.uuid4().hex[:8]}@test.local"
        parent = User.objects.create_user(
            email=par_email,
            password="x",
            first_name="P",
            last_name="Old",
            phone="900000000",
            is_active=True,
        )
        student = User.objects.create_user(
            email=stu_email,
            password="x",
            first_name="S",
            last_name="Old",
            parent=parent,
            is_active=True,
        )

        kwargs = enrollment_submit_kwargs(
            modality_id=modality.pk,
            student_email=stu_email,
            parent_email=par_email,
        )
        kwargs["enrollment_data"]["enrollment_type"] = EnrollmentType.RENEWAL
        kwargs["enrollment_data"]["parent_phone"] = "911111111"
        e = services.submit_enrollment(**kwargs)

        with patch("enrollments.services.send_activation_email"):
            services.approve_enrollment(enrollment=e, updated_by=direction_user)
        parent.refresh_from_db()
        assert parent.phone == "911111111"
        student.refresh_from_db()
        assert student.pk == e.student_id


@pytest.mark.django_db
class TestPayments:
    def test_confirm_wrong_scope_not_found(self, open_enrollment_period, modality):
        from enrollments import services

        e = services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )
        from enrollments.models import PaymentType

        p = services.create_payment(
            enrollment=e,
            created_by=None,
            payment_type=PaymentType.ENROLLMENT_FEE,
            amount=Decimal("50.00"),
        )
        with pytest.raises(NotFound):
            services.confirm_payment_for_enrollment(
                enrollment_pk=e.pk,
                payment_pk=p.pk + 9999,
                confirmed_by=None,
            )

    def test_confirm_payment(self, open_enrollment_period, modality, direction_user):
        from enrollments import services
        from enrollments.models import PaymentStatus, PaymentType

        e = services.submit_enrollment(
            **enrollment_submit_kwargs(modality_id=modality.pk),
        )
        p = services.create_payment(
            enrollment=e,
            created_by=direction_user,
            payment_type=PaymentType.ENROLLMENT_FEE,
            amount=Decimal("25.00"),
        )
        out = services.confirm_payment_for_enrollment(
            enrollment_pk=e.pk,
            payment_pk=p.pk,
            confirmed_by=direction_user,
        )
        assert out.status == PaymentStatus.CONFIRMED
        assert out.confirmed_by_id == direction_user.pk
