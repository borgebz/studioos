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
def test_custom_exception_handler_invalid_token_expired_shape():
    from rest_framework.response import Response
    from rest_framework_simplejwt.exceptions import InvalidToken

    from core.exceptions import custom_exception_handler

    exc = InvalidToken(
        {
            "detail": "Given token not valid for any token type",
            "messages": [
                {
                    "token_class": "AccessToken",
                    "token_type": "access",
                    "message": "Token is expired",
                }
            ],
        }
    )
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 401
    assert response.data == {"errors": {"messages": ["TokenExpired"]}}


@pytest.mark.django_db
def test_custom_exception_handler_invalid_token_other_shape():
    from rest_framework.response import Response
    from rest_framework_simplejwt.exceptions import InvalidToken

    from core.exceptions import custom_exception_handler

    exc = InvalidToken(
        {
            "detail": "Given token not valid for any token type",
            "messages": [
                {
                    "token_class": "AccessToken",
                    "token_type": "access",
                    "message": "Token is invalid",
                }
            ],
        }
    )
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 401
    assert response.data == {"errors": {"messages": ["TokenNotValid"]}}


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
def test_custom_exception_handler_app_not_found_detail():
    from rest_framework.response import Response

    from core.exceptions import AppNotFound, custom_exception_handler

    exc = AppNotFound("ModalityNotFound")
    context = {"view": MagicMock(), "request": MagicMock()}
    response = custom_exception_handler(exc, context)
    assert isinstance(response, Response)
    assert response.status_code == 404
    assert response.data == {"errors": {"messages": ["ModalityNotFound"]}}


@pytest.mark.django_db
def test_custom_exception_handler_app_not_found_default_detail():
    """Bare AppNotFound() matches generic NotFound response."""
    from rest_framework.response import Response

    from core.exceptions import AppNotFound, custom_exception_handler

    exc = AppNotFound()
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


@pytest.mark.django_db
def test_list_users_requires_authentication(api_client):
    resp = api_client.get("/api/accounts/users/")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_list_users_forbidden_for_student(student_auth_client):
    resp = student_auth_client.get("/api/accounts/users/")
    assert resp.status_code == 403
    assert "PermissionDenied" in resp.json()["errors"]["messages"]


@pytest.mark.django_db
def test_list_users_ok_for_direction(auth_client, direction_user):
    resp = auth_client.get("/api/accounts/users/")
    assert resp.status_code == 200
    data = resp.json()
    results = data.get("results", data) if isinstance(data, dict) else data
    assert isinstance(results, list)
    emails = {row["email"] for row in results}
    assert direction_user.email in emails


@pytest.mark.django_db
def test_patch_user_core_fields_ok(auth_client, student_user):
    resp = auth_client.patch(
        f"/api/accounts/users/{student_user.pk}/",
        data={"first_name": "Patched", "language": "en"},
        format="json",
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["first_name"] == "Patched"
    student_user.refresh_from_db()
    assert student_user.first_name == "Patched"
    assert student_user.language == "en"


@pytest.mark.django_db
def test_patch_user_forbidden_without_change_user(student_auth_client, teacher_user):
    resp = student_auth_client.patch(
        f"/api/accounts/users/{teacher_user.pk}/",
        data={"first_name": "Nope"},
        format="json",
    )
    assert resp.status_code == 403
    assert "PermissionDenied" in resp.json()["errors"]["messages"]


@pytest.mark.django_db
def test_patch_user_not_found(auth_client):
    resp = auth_client.patch(
        "/api/accounts/users/999999/",
        data={"first_name": "X"},
        format="json",
    )
    assert resp.status_code == 404
    assert any("NotFound" in m for m in resp.json()["errors"]["messages"])


@pytest.mark.django_db
def test_patch_user_parent_address_postal(auth_client, student_user, teacher_user):
    resp = auth_client.patch(
        f"/api/accounts/users/{student_user.pk}/",
        data={
            "parent_id": teacher_user.pk,
            "address": "Rua Example",
            "postal_code": "1000-001",
        },
        format="json",
    )
    assert resp.status_code == 200
    student_user.refresh_from_db()
    assert student_user.parent_id == teacher_user.pk
    assert student_user.address == "Rua Example"
    assert student_user.postal_code == "1000-001"


@pytest.mark.django_db
def test_patch_user_parent_cannot_be_self(auth_client, student_user):
    resp = auth_client.patch(
        f"/api/accounts/users/{student_user.pk}/",
        data={"parent_id": student_user.pk},
        format="json",
    )
    assert resp.status_code == 400
    errs = resp.json()["errors"]
    assert "parent_id" in errs
    assert any("ParentCannotBeSelf" in str(v) for v in errs["parent_id"])


@pytest.mark.django_db
def test_patch_user_parent_not_found(auth_client, student_user):
    resp = auth_client.patch(
        f"/api/accounts/users/{student_user.pk}/",
        data={"parent_id": 999_999},
        format="json",
    )
    assert resp.status_code == 400
    errs = resp.json()["errors"]
    assert "parent_id" in errs
    assert any("ParentNotFound" in str(v) for v in errs["parent_id"])


@pytest.mark.django_db
def test_list_teachers_requires_authentication(api_client):
    resp = api_client.get("/api/accounts/teachers/")
    assert resp.status_code == 401


@pytest.mark.django_db
def test_list_teachers_ok_for_any_authenticated_user(
    api_client, teacher_user, student_user
):
    api_client.force_authenticate(user=student_user)
    resp = api_client.get("/api/accounts/teachers/")
    assert resp.status_code == 200
    rows = resp.json()
    emails = {row["email"] for row in rows}
    assert teacher_user.email in emails
    row = next(r for r in rows if r["email"] == teacher_user.email)
    assert set(row.keys()) == {
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "phone_country_code",
    }
