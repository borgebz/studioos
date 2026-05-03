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
class TestUpdateUserCoreFields:
    def test_updates_first_name(self, direction_user, student_user):
        from accounts import services

        out = services.update_user_core_fields(
            pk=student_user.pk,
            updated_by=direction_user,
            first_name="Updated",
        )
        assert out.first_name == "Updated"
        assert out.updated_by_id == direction_user.pk

    def test_email_conflict(self, direction_user, student_user, teacher_user):
        from accounts import services

        with pytest.raises(ValidationError) as exc:
            services.update_user_core_fields(
                pk=student_user.pk,
                updated_by=direction_user,
                email=teacher_user.email,
            )
        assert "EmailAlreadyExists" in exc.value.detail["messages"]

    def test_not_found(self, direction_user):
        from accounts import services

        with pytest.raises(NotFound):
            services.update_user_core_fields(
                pk=999_999,
                updated_by=direction_user,
                first_name="X",
            )

    def test_updates_address_postal_parent(
        self, direction_user, student_user, teacher_user
    ):
        from accounts import services

        services.update_user_core_fields(
            pk=student_user.pk,
            updated_by=direction_user,
            address="Rua do Teste",
            postal_code="4000-007",
            parent_id=teacher_user.pk,
        )
        student_user.refresh_from_db()
        assert student_user.address == "Rua do Teste"
        assert student_user.postal_code == "4000-007"
        assert student_user.parent_id == teacher_user.pk

    def test_clear_parent(self, direction_user, student_user, teacher_user):
        from accounts import services

        student_user.parent = teacher_user
        student_user.save(update_fields=["parent"])

        services.update_user_core_fields(
            pk=student_user.pk,
            updated_by=direction_user,
            parent_id=None,
        )
        student_user.refresh_from_db()
        assert student_user.parent_id is None


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
class TestUpdateProfilePhotoDedup:
    """SHA-256 deduplication for ``update_profile_for_user`` (``photo`` field)."""

    @staticmethod
    def _png_bytes(rgb):
        from io import BytesIO

        from PIL import Image

        buf = BytesIO()
        Image.new("RGB", (1, 1), color=rgb).save(buf, format="PNG")
        return buf.getvalue()

    def test_same_file_keeps_stored_path(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from accounts import services

        payload = self._png_bytes((200, 10, 30))
        profile = services.create_profile_for_user(
            user=direction_user,
            created_by=direction_user,
            display_name="HasPhoto",
            photo=SimpleUploadedFile("first.png", payload, content_type="image/png"),
        )
        path_before = profile.photo.name

        services.update_profile_for_user(
            profile=profile,
            updated_by=direction_user,
            photo=SimpleUploadedFile(
                "other_name.png", payload, content_type="image/png"
            ),
        )
        profile.refresh_from_db()
        assert profile.photo.name == path_before

    def test_different_file_updates_path(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from accounts import services

        red = self._png_bytes((255, 0, 0))
        blue = self._png_bytes((0, 0, 255))
        profile = services.create_profile_for_user(
            user=direction_user,
            created_by=direction_user,
            display_name="HasPhoto",
            photo=SimpleUploadedFile("a.png", red, content_type="image/png"),
        )
        path_before = profile.photo.name

        services.update_profile_for_user(
            profile=profile,
            updated_by=direction_user,
            photo=SimpleUploadedFile("b.png", blue, content_type="image/png"),
        )
        profile.refresh_from_db()
        assert profile.photo.name != path_before

    def test_no_existing_file_always_saves(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from accounts import services

        payload = self._png_bytes((10, 200, 50))
        profile = services.create_profile_for_user(
            user=direction_user,
            created_by=direction_user,
            display_name="NoPhotoYet",
        )
        assert not profile.photo

        services.update_profile_for_user(
            profile=profile,
            updated_by=direction_user,
            photo=SimpleUploadedFile("new.png", payload, content_type="image/png"),
        )
        profile.refresh_from_db()
        assert profile.photo.name


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
def test_list_teachers_returns_users_with_can_teach(teacher_user, student_user):
    from accounts import services

    teachers = list(services.list_teachers())
    emails = {u.email for u in teachers}
    assert teacher_user.email in emails
    assert student_user.email not in emails


@pytest.mark.django_db
def test_user_can_teach_matches_list_teachers(
    teacher_user, student_user, direction_user
):
    from accounts import services

    assert services.user_can_teach(user=teacher_user) is True
    assert services.user_can_teach(user=student_user) is False
    assert services.user_can_teach(user=direction_user) is False


@pytest.mark.django_db
def test_assert_user_can_teach_raises(student_user):
    from accounts import services

    with pytest.raises(ValidationError) as exc:
        services.assert_user_can_teach(user=student_user)
    assert "UserCannotTeach" in exc.value.detail["messages"]


@pytest.mark.django_db
def test_get_teacher_user_by_pk(teacher_user, student_user):
    from accounts import services
    from core.exceptions import AppNotFound

    assert services.get_teacher_user_by_pk(pk=teacher_user.pk).pk == teacher_user.pk
    with pytest.raises(ValidationError) as exc:
        services.get_teacher_user_by_pk(pk=student_user.pk)
    assert "UserCannotTeach" in exc.value.detail["messages"]
    with pytest.raises(AppNotFound):
        services.get_teacher_user_by_pk(pk=999_999_999)


@pytest.mark.django_db
def test_get_profile_for_user_not_found(direction_user):
    from accounts import services

    with pytest.raises(NotFound):
        services.get_profile_for_user(user=direction_user)
