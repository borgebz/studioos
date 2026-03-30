"""Thin HTTP tests for high-risk public flows."""

from __future__ import annotations

import uuid

import pytest


@pytest.mark.django_db
class TestEnrollmentSubmitHttp:
    def test_json_submit_returns_201(
        self, api_client, open_enrollment_period, modality
    ):
        from enrollments.models import ConsentType, EnrollmentType

        sid = f"api_student_{uuid.uuid4().hex[:8]}@test.local"
        pid = f"api_parent_{uuid.uuid4().hex[:8]}@test.local"
        payload = {
            "enrollment_type": EnrollmentType.NEW,
            "student_email": sid,
            "student_name": "API Student",
            "student_date_of_birth": "2014-06-01",
            "parent_name": "API Parent",
            "parent_email": pid,
            "parent_phone": "913333333",
            "modality_ids": [modality.pk],
            "consents": [
                {"consent_type": ConsentType.RGPD, "accepted": True},
                {"consent_type": ConsentType.INTERNAL_REGULATION, "accepted": True},
            ],
        }
        resp = api_client.post("/api/enrollments/", payload, format="json")
        assert resp.status_code == 201, resp.content
        body = resp.json()
        assert body["student_email"] == sid
        assert len(body["consents"]) == 2

    def test_invalid_json_in_multipart_data_field(
        self, api_client, open_enrollment_period
    ):
        from django.core.files.uploadedfile import SimpleUploadedFile

        file = SimpleUploadedFile(
            "proof.pdf", b"%PDF-1.4 minimal", content_type="application/pdf"
        )
        resp = api_client.post(
            "/api/enrollments/",
            {"data": "not-json{{{", "files": file},
            format="multipart",
        )
        assert resp.status_code == 400
        assert "InvalidJsonInDataField" in str(resp.json())


@pytest.mark.django_db
class TestActivateAccountHttp:
    def test_post_activation_success(self, api_client):
        from django.contrib.auth import get_user_model
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        from accounts.emails import account_activation_token

        User = get_user_model()
        user = User.objects.create_user(
            email=f"activ_{uuid.uuid4().hex[:8]}@test.local",
            password="ignored123",
            first_name="Act",
            last_name="Ive",
            is_active=False,
        )
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = account_activation_token.make_token(user)
        resp = api_client.post(
            "/api/accounts/activate/",
            {
                "uid": uid,
                "token": token,
                "password": "newpassword123",
            },
            format="json",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json().get("message") == "AccountActivated"
        user.refresh_from_db()
        assert user.is_active is True
        assert user.check_password("newpassword123")
