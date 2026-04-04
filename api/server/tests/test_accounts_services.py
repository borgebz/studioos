"""Unit tests for `accounts.services`."""

from __future__ import annotations

import uuid

import pytest
from rest_framework.exceptions import NotFound, ValidationError


@pytest.mark.django_db
class TestCreateUser:
    def test_creates_inactive_user_with_role(self, direction_user):
        from accounts import services

        user = services.create_user(
            email=f"new_user_{uuid.uuid4().hex[:8]}@test.local",
            first_name="New",
            last_name="User",
            role_code="student",
            created_by=direction_user,
        )
        assert user.pk is not None
        assert user.is_active is False
        group = user.groups.select_related("role").first()
        assert group is not None
        assert group.role.code == "student"

    def test_role_not_found(self, direction_user):
        from accounts import services

        with pytest.raises(ValidationError) as exc:
            services.create_user(
                email="r@r.test",
                first_name="A",
                last_name="B",
                role_code="nonexistent_role_code",
                created_by=direction_user,
            )
        assert "RoleNotFound" in exc.value.detail["messages"]

    def test_email_mandatory(self, direction_user):
        from accounts import services

        with pytest.raises(ValidationError) as exc:
            services.create_user(
                email="",
                first_name="A",
                last_name="B",
                role_code="student",
                created_by=direction_user,
            )
        assert "EmailIsMandatory" in exc.value.detail["messages"]


@pytest.mark.django_db
class TestProfile:
    def test_create_profile_duplicate_is_400(self, direction_user):
        from accounts import services
        from accounts.models import Profile

        Profile.objects.create(user=direction_user, display_name="x")

        with pytest.raises(ValidationError) as exc:
            services.create_profile_for_user(
                user=direction_user,
                created_by=direction_user,
                display_name="y",
            )
        assert "ProfileAlreadyExists" in exc.value.detail["messages"]

    def test_create_and_update_profile(self, direction_user):
        from accounts import services

        profile = services.create_profile_for_user(
            user=direction_user,
            created_by=direction_user,
            display_name="Hello",
        )
        assert profile.display_name == "Hello"

        profile = services.update_profile_for_user(
            profile=profile,
            updated_by=direction_user,
            bio="Dancer",
        )
        assert profile.bio == "Dancer"


@pytest.mark.django_db
class TestActivateAccount:
    def test_invalid_uid(self):
        from accounts import services

        with pytest.raises(ValidationError) as exc:
            services.activate_account(
                uid="bogus",
                token="nope",
                password="newpass123",
            )
        assert "InvalidActivationLink" in exc.value.detail["messages"]

    def test_invalid_token(self, db):
        from django.contrib.auth import get_user_model

        from accounts import services
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        User = get_user_model()
        user = User.objects.create_user(
            email=f"inactive_tok_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="T",
            last_name="U",
            is_active=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        with pytest.raises(ValidationError) as exc:
            services.activate_account(
                uid=uid,
                token="invalid-token",
                password="newpass123",
            )
        assert "InvalidOrExpiredToken" in str(exc.value.detail["messages"])

    def test_already_active(self, direction_user):
        from accounts import services

        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        from accounts.emails import account_activation_token

        uid = urlsafe_base64_encode(force_bytes(direction_user.pk))
        token = account_activation_token.make_token(direction_user)
        with pytest.raises(ValidationError) as exc:
            services.activate_account(
                uid=uid,
                token=token,
                password="anotherpass123",
            )
        assert "AccountAlreadyActive" in exc.value.detail["messages"]

    def test_success_sets_password_and_activates(self):
        from django.contrib.auth import get_user_model

        from accounts import services
        from accounts.emails import account_activation_token
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        User = get_user_model()
        user = User.objects.create_user(
            email="inactive_test@test.local",
            password="initial-not-used",
            first_name="I",
            last_name="N",
            is_active=False,
        )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        out = services.activate_account(
            uid=uid,
            token=token,
            password="activated123",
        )
        assert out.is_active is True
        user.refresh_from_db()
        assert user.check_password("activated123")


@pytest.mark.django_db
def test_get_profile_for_user_not_found(direction_user):
    from accounts import services

    with pytest.raises(NotFound):
        services.get_profile_for_user(user=direction_user)
