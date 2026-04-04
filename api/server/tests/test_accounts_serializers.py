"""Tests for `accounts.serializers`."""

from __future__ import annotations

import uuid

import pytest


@pytest.mark.django_db
class TestCreateUserSerializerEmailUniqueness:
    def test_validate_email_rejects_soft_deleted_user_email(self):
        """
        Email uniqueness must use all_objects so a soft-deleted row still counts.

        With only User.objects in validate_email, the duplicate is missed and
        validation incorrectly succeeds until the DB unique constraint fires (or worse).
        """
        from django.contrib.auth import get_user_model

        from accounts.serializers import CreateUserSerializer

        User = get_user_model()
        email = f"soft_deleted_{uuid.uuid4().hex[:12]}@test.local"
        user = User.objects.create_user(
            email=email,
            password="x",
            first_name="Old",
            last_name="User",
            is_active=False,
        )
        user.delete(deleted_by=user)

        serializer = CreateUserSerializer(
            data={
                "email": email,
                "first_name": "New",
                "last_name": "User",
                "role_code": "student",
            }
        )

        assert serializer.is_valid() is False
        assert "email" in serializer.errors
        assert any(
            "EmailAlreadyExists" in str(err) for err in serializer.errors["email"]
        )
