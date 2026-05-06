"""Invite & onboarding services + API tests."""

from __future__ import annotations

import io
import uuid
from datetime import date
from unittest.mock import MagicMock

import fakeredis
import pytest
from rest_framework.test import APIClient as DRFAPIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook
from rest_framework.exceptions import ValidationError

from accounts import invite_store
from accounts.models import User
from accounts.services import (
    assert_inviter_can_assign_role,
    bulk_invite_users,
    complete_onboarding,
    get_onboarding_preview,
    invite_user,
    parse_bulk_invite_xlsx_rows,
    resend_invite,
)


@pytest.fixture(autouse=True)
def _invite_redis():
    fake = fakeredis.FakeRedis(decode_responses=True)
    invite_store.set_redis_client_for_tests(fake)
    yield fake
    invite_store.reset_redis_client()


@pytest.fixture(autouse=True)
def _stub_invite_email_delay(monkeypatch):
    monkeypatch.setattr(
        "accounts.tasks.send_invite_email_task.delay",
        MagicMock(),
    )


@pytest.fixture(autouse=True)
def _run_on_commit_immediately(monkeypatch):
    """Without this, ``transaction.on_commit`` never fires under pytest-django."""
    from django.db import transaction as dj_transaction

    def _immediate(func, using=None):
        func()

    monkeypatch.setattr(dj_transaction, "on_commit", _immediate)


def _make_xlsx(rows: list[tuple[str, str]]) -> SimpleUploadedFile:
    wb = Workbook()
    ws = wb.active
    ws.append(["email", "role"])
    for email, role in rows:
        ws.append([email, role])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return SimpleUploadedFile(
        "invites.xlsx",
        buf.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@pytest.mark.django_db
class TestInviteHierarchy:
    def test_direction_can_invite_teacher(self, direction_user):
        assert_inviter_can_assign_role(
            inviter=direction_user, target_role_code="teacher"
        )

    def test_coordination_cannot_invite_coordination(self, coordination_user):
        with pytest.raises(ValidationError) as exc:
            assert_inviter_can_assign_role(
                inviter=coordination_user, target_role_code="coordination"
            )
        assert "CannotInviteRole" in exc.value.detail["messages"]

    def test_coordination_can_invite_teacher(self, coordination_user):
        assert_inviter_can_assign_role(
            inviter=coordination_user, target_role_code="teacher"
        )

    def test_coordination_cannot_invite_direction(self, coordination_user):
        with pytest.raises(ValidationError) as exc:
            assert_inviter_can_assign_role(
                inviter=coordination_user, target_role_code="direction"
            )
        assert "CannotInviteRole" in exc.value.detail["messages"]


@pytest.mark.django_db
class TestInviteUserService:
    def test_creates_inactive_user_and_redis_token(self, direction_user):
        email = f"inv_{uuid.uuid4().hex[:8]}@test.local"
        user = invite_user(
            email=email,
            role_code="teacher",
            created_by=direction_user,
        )
        assert user.is_active is False
        assert user.email == email
        # Token stored on commit — resolve via reverse index
        r = invite_store.get_redis_client()
        tok = r.get(f"invite_user:{user.pk}")
        assert tok is not None
        assert r.get(f"invite:{tok}") == str(user.pk)

    def test_rejects_duplicate_email(self, direction_user, teacher_user):
        with pytest.raises(ValidationError) as exc:
            invite_user(
                email=teacher_user.email,
                role_code="student",
                created_by=direction_user,
            )
        assert "EmailAlreadyExists" in exc.value.detail["messages"]


@pytest.mark.django_db
class TestOnboardingFlow:
    def test_preview_and_complete(self, direction_user):
        email = f"onb_{uuid.uuid4().hex[:8]}@test.local"
        invited = invite_user(
            email=email,
            role_code="parent",
            created_by=direction_user,
        )
        r = invite_store.get_redis_client()
        token = r.get(f"invite_user:{invited.pk}")
        preview = get_onboarding_preview(token=token)
        assert preview["email"] == email
        assert preview["role"] == "parent"

        tokens = complete_onboarding(
            token=token,
            first_name="Ana",
            last_name="Silva",
            password="securepassword",
            phone="912345678",
            phone_country_code="+351",
            date_of_birth=date(1990, 5, 15),
        )
        assert "access" in tokens and "refresh" in tokens

        invited.refresh_from_db()
        assert invited.is_active is True
        assert r.get(f"invite:{token}") is None

    def test_consumed_token_rejected_on_second_use(self, direction_user):
        email = f"tok2_{uuid.uuid4().hex[:8]}@test.local"
        invited = invite_user(
            email=email, role_code="parent", created_by=direction_user
        )
        r = invite_store.get_redis_client()
        token = r.get(f"invite_user:{invited.pk}")
        complete_onboarding(
            token=token,
            first_name="X",
            last_name="Y",
            password="longpassword",
            phone="900000000",
            phone_country_code="+351",
            date_of_birth=date(1990, 1, 1),
        )
        with pytest.raises(ValidationError) as exc:
            complete_onboarding(
                token=token,
                first_name="X",
                last_name="Y",
                password="longpassword",
                phone="900000000",
                phone_country_code="+351",
                date_of_birth=date(1990, 1, 1),
            )
        assert "InvalidOrExpiredInviteToken" in exc.value.detail["messages"]

    def test_resend_active_user_rejected(self, direction_user):
        email = f"active_{uuid.uuid4().hex[:8]}@test.local"
        invited = invite_user(
            email=email, role_code="teacher", created_by=direction_user
        )
        r = invite_store.get_redis_client()
        token = r.get(f"invite_user:{invited.pk}")
        complete_onboarding(
            token=token,
            first_name="A",
            last_name="B",
            password="longpassword",
            phone="900000000",
            phone_country_code="+351",
            date_of_birth=date(1985, 3, 20),
        )
        with pytest.raises(ValidationError) as exc:
            resend_invite(user_pk=invited.pk, requesting_user=direction_user)
        assert "AccountAlreadyActive" in exc.value.detail["messages"]


@pytest.mark.django_db
class TestBulkInvite:
    def test_all_or_nothing_validation(self, direction_user):
        email_ok = f"bulk_ok_{uuid.uuid4().hex[:6]}@test.local"
        bad_file = _make_xlsx(
            [
                (email_ok, "teacher"),
                ("not-an-email", "teacher"),
            ]
        )
        with pytest.raises(ValidationError) as exc:
            bulk_invite_users(inviter=direction_user, uploaded_file=bad_file)
        assert exc.value.detail["messages"] == ["BulkInviteValidationFailed"]
        assert "rows" in exc.value.detail
        assert User.all_objects.filter(email__iexact=email_ok).exists() is False

    def test_success_creates_all(self, direction_user):
        e1 = f"b1_{uuid.uuid4().hex[:6]}@test.local"
        e2 = f"b2_{uuid.uuid4().hex[:6]}@test.local"
        f = _make_xlsx([(e1, "student"), (e2, "parent")])
        users = bulk_invite_users(inviter=direction_user, uploaded_file=f)
        assert len(users) == 2
        assert {u.email.lower() for u in users} == {e1.lower(), e2.lower()}


@pytest.mark.django_db
class TestParseBulkXlsx:
    def test_reads_headers_and_rows(self):
        f = _make_xlsx([("a@test.local", "student")])
        rows = parse_bulk_invite_xlsx_rows(uploaded_file=f)
        assert len(rows) == 1
        assert rows[0]["row"] == 2
        assert rows[0]["email"] == "a@test.local"
        assert rows[0]["role"] == "student"


@pytest.mark.django_db
class TestInviteAPI:
    def test_post_invite_201(self, api_client, direction_user):
        api_client.force_authenticate(user=direction_user)
        email = f"api_inv_{uuid.uuid4().hex[:6]}@test.local"
        r = api_client.post(
            "/api/accounts/invites/",
            {"email": email, "role": "teacher"},
            format="json",
        )
        assert r.status_code == 201
        assert r.json()["email"] == email

    def test_onboard_get_and_post(self, api_client, direction_user):
        email = f"api_onb_{uuid.uuid4().hex[:6]}@test.local"
        api_client.force_authenticate(user=direction_user)
        api_client.post(
            "/api/accounts/invites/",
            {"email": email, "role": "student"},
            format="json",
        )
        user = User.objects.get(email__iexact=email)
        token = invite_store.get_redis_client().get(f"invite_user:{user.pk}")

        anon = DRFAPIClient()
        gr = anon.get(f"/api/accounts/onboard/{token}/")
        assert gr.status_code == 200
        assert gr.json()["data"]["email"] == email

        pr = anon.post(
            f"/api/accounts/onboard/{token}/",
            {
                "first_name": "Z",
                "last_name": "Y",
                "password": "longpassword",
                "phone": "900000000",
                "phone_country_code": "+351",
                "date_of_birth": "2005-01-01",
            },
            format="json",
        )
        assert pr.status_code == 200
        assert "access" in pr.json()["data"]

    def test_bulk_invite_201(self, api_client, direction_user):
        e1 = f"xb_{uuid.uuid4().hex[:6]}@test.local"
        e2 = f"xb_{uuid.uuid4().hex[:6]}@test.local"
        f = _make_xlsx([(e1, "student"), (e2, "student")])
        api_client.force_authenticate(user=direction_user)
        r = api_client.post(
            "/api/accounts/invites/bulk/",
            {"file": f},
            format="multipart",
        )
        assert r.status_code == 201
        body = r.json()
        assert body["data"]["count"] == 2

    def test_resend_invite_200(self, api_client, direction_user):
        email = f"rs_{uuid.uuid4().hex[:6]}@test.local"
        api_client.force_authenticate(user=direction_user)
        api_client.post(
            "/api/accounts/invites/",
            {"email": email, "role": "teacher"},
            format="json",
        )
        user = User.objects.get(email__iexact=email)
        old_tok = invite_store.get_redis_client().get(f"invite_user:{user.pk}")
        rr = api_client.post(f"/api/accounts/users/{user.pk}/resend-invite/")
        assert rr.status_code == 200
        new_tok = invite_store.get_redis_client().get(f"invite_user:{user.pk}")
        assert new_tok != old_tok
