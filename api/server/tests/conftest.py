"""Shared pytest fixtures for Django + DRF."""

from __future__ import annotations

import config.pytest_db_host_env  # noqa: F401 — redundant if plugin loaded; keeps conftest-only runs safe

import uuid
from datetime import date, datetime, timezone as dt_timezone

import pytest
from django.core.management import call_command


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    with django_db_blocker.unblock():
        call_command("seed_roles")
        call_command("seed_permissions")
        call_command("seed_modalities")


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def coordination_user(db):
    """User with the ``coordination`` role (includes bulk/list enrollment permissions)."""
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"coord_{uuid.uuid4().hex[:10]}@test.local",
        password="test-pass-123",
        first_name="Coordination",
        last_name="User",
        is_active=True,
    )
    role = Role.objects.get(code="coordination")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


@pytest.fixture
def direction_user(db):
    """User with the `direction` role and all enrollment/account permissions."""
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"direction_{uuid.uuid4().hex[:10]}@test.local",
        password="test-pass-123",
        first_name="Direction",
        last_name="User",
        is_active=True,
    )
    role = Role.objects.get(code="direction")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


@pytest.fixture
def auth_client(api_client, direction_user):
    api_client.force_authenticate(user=direction_user)
    return api_client


@pytest.fixture
def modality(db):
    from modality.models import Modality

    m, _ = Modality.objects.get_or_create(
        name="___Test Modality___",
        defaults={"description": ""},
    )
    return m


@pytest.fixture
def frozen_enrollment_march_2026():
    """Patch `enrollments.services.timezone.now` to mid-March 2026 (UTC)."""
    from unittest.mock import patch

    fixed = datetime(2026, 3, 15, 12, 0, 0, tzinfo=dt_timezone.utc)
    with patch("enrollments.services.timezone.now", return_value=fixed):
        yield fixed


def enrollment_submit_kwargs(
    *,
    modality_id: int,
    student_email: str | None = None,
    parent_email: str | None = None,
):
    """Build kwargs for `enrollments.services.submit_enrollment`."""
    from enrollments.models import ConsentType, EnrollmentType

    sid = student_email or f"student_{uuid.uuid4().hex[:8]}@test.local"
    pid = parent_email or f"parent_{uuid.uuid4().hex[:8]}@test.local"
    return {
        "enrollment_data": {
            "enrollment_type": EnrollmentType.NEW,
            "student_email": sid,
            "student_name": "Test Student",
            "student_date_of_birth": date(2015, 5, 1),
            "parent_name": "Test Parent",
            "parent_email": pid,
            "parent_phone": "912345678",
        },
        "modality_ids": [modality_id],
        "consents": [
            {
                "consent_type": ConsentType.RGPD,
                "accepted": True,
                "ip_address": "127.0.0.1",
                "user_agent": "pytest",
            },
            {
                "consent_type": ConsentType.INTERNAL_REGULATION,
                "accepted": True,
                "ip_address": "127.0.0.1",
                "user_agent": "pytest",
            },
        ],
    }


@pytest.fixture
def open_enrollment_period(db):
    """Open period spanning today so `_get_open_period` succeeds without mocking time."""
    from datetime import timedelta

    from django.utils import timezone

    from enrollments import services
    from enrollments.models import PeriodType

    today = timezone.now().date()
    return services.create_period(
        created_by=None,
        academic_year="2025/2026",
        period_type=PeriodType.BOTH,
        start_date=today - timedelta(days=30),
        end_date=today + timedelta(days=30),
        is_open=True,
    )


@pytest.fixture
def submitted_enrollment(open_enrollment_period, modality):
    """A freshly submitted enrollment in SUBMITTED state."""
    from enrollments import services

    return services.submit_enrollment(
        **enrollment_submit_kwargs(modality_id=modality.pk)
    )


@pytest.fixture
def under_review_enrollment(submitted_enrollment, direction_user):
    """An enrollment that has been moved to UNDER_REVIEW."""
    from enrollments import services

    return services.start_review(
        enrollment=submitted_enrollment, updated_by=direction_user
    )


@pytest.fixture
def student_user(db):
    """Active user with the student role. Used for 403 permission tests."""
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"student_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="Student",
        last_name="User",
        is_active=True,
    )
    role = Role.objects.get(code="student")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


@pytest.fixture
def student_auth_client(api_client, student_user):
    """API client authenticated as a student. Used for 403 permission tests."""
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.fixture
def teacher_user(db):
    from django.contrib.auth import get_user_model

    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"teacher_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="Teacher",
        last_name="User",
        is_active=True,
    )
    role = Role.objects.get(code="teacher")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


@pytest.fixture
def studio_with_modality(db, direction_user, modality):
    """A studio linked to the shared `modality` fixture."""
    from studios import services as studio_services
    from studios.models import StudioModality

    studio = studio_services.create_studio(
        user=direction_user,
        name=f"__Test Studio {uuid.uuid4().hex[:6]}__",
        max_capacity=8,
    )
    StudioModality.objects.create(
        studio=studio, modality=modality, created_by=direction_user
    )
    return studio
