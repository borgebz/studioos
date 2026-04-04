"""Global exception shape and permission wiring (smoke)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError


@pytest.mark.django_db
def test_custom_exception_handler_validation_error_messages_shape():
    from rest_framework.response import Response

    from core.exceptions import custom_exception_handler

    exc = ValidationError({"messages": ["EmailAlreadyExists"]})
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 400
    assert "errors" in response.data
    assert response.data["errors"]["messages"] == ["EmailAlreadyExists"]


@pytest.mark.django_db
def test_custom_exception_handler_permission_denied_code():
    from rest_framework.response import Response

    from core.exceptions import custom_exception_handler

    exc = PermissionDenied()
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 403
    assert response.data == {"errors": {"messages": ["PermissionDenied"]}}


@pytest.mark.django_db
def test_custom_exception_handler_not_found_code():
    from rest_framework.response import Response

    from core.exceptions import custom_exception_handler

    exc = NotFound()
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 404
    assert response.data == {"errors": {"messages": ["NotFound"]}}


@pytest.mark.django_db
class TestAllowAnyVsProtectedEndpoints:
    """Public period list vs authenticated period create."""

    def test_get_periods_allow_any(self, api_client):
        resp = api_client.get("/api/enrollments/periods/")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_post_period_create_unauthenticated_returns_401(self, api_client):
        """POST /periods/create/ with no token must return 401, not 403."""
        resp = api_client.post(
            "/api/enrollments/periods/create/",
            {
                "academic_year": "2040/2041",
                "period_type": "both",
                "start_date": "2040-01-01",
                "end_date": "2040-12-31",
                "is_open": False,
            },
            format="json",
        )
        assert resp.status_code == 401
        assert "NotAuthenticated" in resp.json()["errors"]["messages"]

    def test_post_period_create_wrong_role_returns_403(self, student_auth_client):
        """POST /periods/create/ with a student token must return 403."""
        resp = student_auth_client.post(
            "/api/enrollments/periods/create/",
            {
                "academic_year": "2041/2042",
                "period_type": "both",
                "start_date": "2041-01-01",
                "end_date": "2041-12-31",
                "is_open": False,
            },
            format="json",
        )
        assert resp.status_code == 403
        assert "PermissionDenied" in resp.json()["errors"]["messages"]

    def test_get_period_detail_allow_any(self, api_client, open_enrollment_period):
        """GET /periods/<pk>/ must be reachable without a token."""
        resp = api_client.get(f"/api/enrollments/periods/{open_enrollment_period.pk}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == open_enrollment_period.pk

    def test_post_period_succeeds_for_direction(self, auth_client):
        resp = auth_client.post(
            "/api/enrollments/periods/create/",
            {
                "academic_year": "2030/2031",
                "period_type": "both",
                "start_date": "2030-01-01",
                "end_date": "2030-12-31",
                "is_open": False,
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.json()["academic_year"] == "2030/2031"


@pytest.mark.django_db
def test_me_requires_authentication(api_client):
    resp = api_client.get("/api/accounts/me/")
    assert resp.status_code == 401
    body = resp.json()
    assert "errors" in body
    assert "NotAuthenticated" in body["errors"]["messages"]
