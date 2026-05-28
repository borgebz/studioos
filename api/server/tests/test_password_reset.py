"""Tests for the password reset feature (services + API endpoints)."""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.exceptions import ValidationError

from accounts.emails import account_activation_token

User = get_user_model()


# ---------------------------------------------------------------------------
# Service-layer tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRequestPasswordReset:
    def test_enqueues_email_for_active_user(self):
        user = User.objects.create_user(
            email=f"reset_{uuid.uuid4().hex[:8]}@test.local",
            password="old-pass-123",
            first_name="A",
            last_name="B",
            is_active=True,
        )
        from accounts import services

        with patch("accounts.tasks.send_password_reset_email_task") as mock_task:
            services.request_password_reset(email=user.email)
            mock_task.delay.assert_called_once_with(user.pk)

    def test_no_email_for_nonexistent_user(self):
        from accounts import services

        with patch("accounts.tasks.send_password_reset_email_task") as mock_task:
            services.request_password_reset(email="does-not-exist@test.local")
            mock_task.delay.assert_not_called()

    def test_no_email_for_inactive_user(self):
        email = f"inactive_{uuid.uuid4().hex[:8]}@test.local"
        User.objects.create_user(
            email=email,
            password="x",
            first_name="I",
            last_name="N",
            is_active=False,
        )
        from accounts import services

        with patch("accounts.tasks.send_password_reset_email_task") as mock_task:
            services.request_password_reset(email=email)
            mock_task.delay.assert_not_called()


@pytest.mark.django_db
class TestCompletePasswordReset:
    def _make_active_user(self):
        return User.objects.create_user(
            email=f"reset_{uuid.uuid4().hex[:8]}@test.local",
            password="old-pass-123",
            first_name="R",
            last_name="U",
            is_active=True,
        )

    def test_success_changes_password(self):
        from accounts import services

        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        out = services.complete_password_reset(
            uid=uid, token=token, password="new-pass-456"
        )
        assert out.pk == user.pk
        user.refresh_from_db()
        assert user.check_password("new-pass-456")

    def test_invalid_uid(self):
        from accounts import services

        with pytest.raises(ValidationError) as exc:
            services.complete_password_reset(
                uid="bogus", token="nope", password="whatever123"
            )
        assert "InvalidResetLink" in exc.value.detail["messages"]

    def test_invalid_token(self):
        from accounts import services

        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        with pytest.raises(ValidationError) as exc:
            services.complete_password_reset(
                uid=uid, token="bad-token", password="whatever123"
            )
        assert "InvalidOrExpiredToken" in exc.value.detail["messages"]

    def test_inactive_user_rejected(self):
        from accounts import services

        user = User.objects.create_user(
            email=f"inactive_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="I",
            last_name="N",
            is_active=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        with pytest.raises(ValidationError) as exc:
            services.complete_password_reset(
                uid=uid, token=token, password="whatever123"
            )
        assert "InvalidResetLink" in exc.value.detail["messages"]

    def test_token_single_use(self):
        """After a successful reset the same token must not work again."""
        from accounts import services

        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        services.complete_password_reset(
            uid=uid, token=token, password="first-reset-123"
        )

        with pytest.raises(ValidationError) as exc:
            services.complete_password_reset(
                uid=uid, token=token, password="second-reset-456"
            )
        assert "InvalidOrExpiredToken" in exc.value.detail["messages"]


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _disable_throttle(settings):
    """Raise throttle limit and clear cache for API endpoint tests in this module."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {"anon": "1000/min"},
    }
    from django.core.cache import cache

    cache.clear()


@pytest.mark.django_db
class TestPasswordResetRequestEndpoint:
    URL = "/api/accounts/auth/password-reset/"

    def test_returns_200_for_existing_user(self, api_client):
        user = User.objects.create_user(
            email=f"api_reset_{uuid.uuid4().hex[:8]}@test.local",
            password="old-pass-123",
            first_name="A",
            last_name="B",
            is_active=True,
        )
        with patch("accounts.tasks.send_password_reset_email_task"):
            resp = api_client.post(self.URL, {"email": user.email})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "PasswordResetEmailSent"

    def test_returns_200_for_unknown_email(self, api_client):
        """Must not leak whether the email exists."""
        resp = api_client.post(self.URL, {"email": "nobody@test.local"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "PasswordResetEmailSent"

    def test_rejects_missing_email(self, api_client):
        resp = api_client.post(self.URL, {})
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPasswordResetConfirmEndpoint:
    URL = "/api/accounts/auth/password-reset/confirm/"

    def _make_active_user(self):
        return User.objects.create_user(
            email=f"confirm_{uuid.uuid4().hex[:8]}@test.local",
            password="old-pass-123",
            first_name="C",
            last_name="U",
            is_active=True,
        )

    def test_success(self, api_client):
        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        resp = api_client.post(
            self.URL,
            {"uid": uid, "token": token, "password": "brand-new-pass-789"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["detail"] == "PasswordResetComplete"
        user.refresh_from_db()
        assert user.check_password("brand-new-pass-789")

    def test_invalid_token(self, api_client):
        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        resp = api_client.post(
            self.URL,
            {"uid": uid, "token": "invalid", "password": "whatever123"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_too_short(self, api_client):
        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        resp = api_client.post(
            self.URL,
            {"uid": uid, "token": token, "password": "short"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_can_login_with_new_password(self, api_client):
        from rest_framework.test import APIClient

        user = self._make_active_user()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)

        api_client.post(
            self.URL,
            {"uid": uid, "token": token, "password": "new-login-pass-123"},
        )
        # Use a fresh client to avoid throttle state from previous requests
        fresh_client = APIClient()
        resp = fresh_client.post(
            "/api/accounts/auth/login/",
            {"email": user.email, "password": "new-login-pass-123"},
        )
        assert resp.status_code == status.HTTP_200_OK
