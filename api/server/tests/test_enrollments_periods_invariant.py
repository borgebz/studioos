"""
Tests for the single-open-period invariant and the public/admin split on
EnrollmentPeriod endpoints.
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError

from enrollments import services
from enrollments.models import PeriodType


def _draft_period(*, academic_year="2026/2027", period_type=PeriodType.NEW):
    today = timezone.now().date()
    return services.create_period(
        academic_year=academic_year,
        period_type=period_type,
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=60),
        is_open=False,
    )


# ---------------------------------------------------------------------------
# Single-open-period invariant (service-level)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSingleOpenPeriodInvariant:
    def test_open_period_when_none_open_succeeds(self):
        period = _draft_period()
        opened = services.open_period(period=period)
        assert opened.is_open is True

    def test_open_second_period_while_one_open_conflicts(
        self, open_enrollment_period
    ):
        second = _draft_period(
            academic_year="2026/2027",
            period_type=PeriodType.RENEWAL,
        )
        with pytest.raises(DRFValidationError) as exc:
            services.open_period(period=second)
        payload = exc.value.detail
        assert "ConflictingOpenPeriod" in payload["messages"]
        # DRF wraps values as ErrorDetail strings; compare via str().
        assert [str(x) for x in payload["conflicting_period_id"]] == [
            str(open_enrollment_period.pk)
        ]

    def test_open_already_open_period_is_idempotent(self, open_enrollment_period):
        # Opening an already-open period must not falsely match itself.
        same = services.open_period(period=open_enrollment_period)
        assert same.pk == open_enrollment_period.pk
        assert same.is_open is True

    def test_patch_dates_on_open_period_does_not_conflict(
        self, open_enrollment_period
    ):
        # Editing dates on an already-open period must not re-trigger the check.
        new_end = open_enrollment_period.end_date + timedelta(days=10)
        updated = services.update_period(
            period=open_enrollment_period,
            end_date=new_end,
        )
        assert updated.end_date == new_end
        assert updated.is_open is True

    def test_patch_is_open_true_while_other_open_conflicts(
        self, open_enrollment_period
    ):
        second = _draft_period(
            academic_year="2026/2027",
            period_type=PeriodType.RENEWAL,
        )
        with pytest.raises(DRFValidationError) as exc:
            services.update_period(period=second, is_open=True)
        assert "ConflictingOpenPeriod" in exc.value.detail["messages"]

    def test_create_period_open_while_other_open_conflicts(
        self, open_enrollment_period
    ):
        today = timezone.now().date()
        with pytest.raises(DRFValidationError) as exc:
            services.create_period(
                academic_year="2026/2027",
                period_type=PeriodType.NEW,
                start_date=today,
                end_date=today + timedelta(days=10),
                is_open=True,
            )
        assert "ConflictingOpenPeriod" in exc.value.detail["messages"]

    def test_close_then_open_another_succeeds(self, open_enrollment_period):
        # "Close one, open the next" — the supported workflow.
        services.close_period(period=open_enrollment_period)
        second = _draft_period(
            academic_year="2026/2027",
            period_type=PeriodType.RENEWAL,
        )
        opened = services.open_period(period=second)
        assert opened.is_open is True


# ---------------------------------------------------------------------------
# Period detail endpoint — public visibility scoped to open periods
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPeriodDetailVisibility:
    def test_public_get_404_when_closed(self, api_client):
        period = _draft_period()  # is_open=False
        url = reverse("enrollments:period-detail", args=[period.pk])
        resp = api_client.get(url)
        assert resp.status_code == 404
        assert "EnrollmentPeriodNotFound" in resp.json()["errors"]["messages"]

    def test_public_get_200_when_open(self, api_client, open_enrollment_period):
        url = reverse(
            "enrollments:period-detail", args=[open_enrollment_period.pk]
        )
        resp = api_client.get(url)
        assert resp.status_code == 200
        assert resp.json()["id"] == open_enrollment_period.pk

    def test_admin_get_200_when_closed(self, auth_client):
        period = _draft_period()
        url = reverse("enrollments:period-detail", args=[period.pk])
        resp = auth_client.get(url)
        assert resp.status_code == 200
        assert resp.json()["id"] == period.pk

    def test_student_get_404_when_closed(self, student_auth_client):
        # Authenticated but without can_manage_periods → same scoping as anon.
        period = _draft_period()
        url = reverse("enrollments:period-detail", args=[period.pk])
        resp = student_auth_client.get(url)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Admin list endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAdminPeriodList:
    def test_requires_auth(self, api_client):
        url = reverse("enrollments:period-admin-list")
        resp = api_client.get(url)
        assert resp.status_code in (401, 403)

    def test_forbidden_for_student(self, student_auth_client):
        url = reverse("enrollments:period-admin-list")
        resp = student_auth_client.get(url)
        assert resp.status_code == 403

    def test_returns_all_with_filters(self, auth_client, open_enrollment_period):
        draft = _draft_period(
            academic_year="2026/2027",
            period_type=PeriodType.RENEWAL,
        )

        url = reverse("enrollments:period-admin-list")

        # No filter: both periods returned.
        resp = auth_client.get(url)
        assert resp.status_code == 200
        ids = {p["id"] for p in resp.json()}
        assert {open_enrollment_period.pk, draft.pk} <= ids

        # Filter is_open=true: only the open one.
        resp = auth_client.get(url, {"is_open": "true"})
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()]
        assert ids == [open_enrollment_period.pk]

        # Filter period_type=renewal: only the draft.
        resp = auth_client.get(url, {"period_type": "renewal"})
        assert resp.status_code == 200
        ids = [p["id"] for p in resp.json()]
        assert ids == [draft.pk]

        # Filter academic_year non-matching: empty.
        resp = auth_client.get(url, {"academic_year": "2099/2100"})
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# Public list endpoint — still open-only
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_public_period_list_still_open_only(api_client, open_enrollment_period):
    # Closed draft should not appear in the public listing.
    _draft_period(academic_year="2026/2027", period_type=PeriodType.RENEWAL)
    url = reverse("enrollments:period-list")
    resp = api_client.get(url)
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert ids == [open_enrollment_period.pk]
