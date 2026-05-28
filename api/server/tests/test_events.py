"""Tests for the events app (services + HTTP)."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from django.utils import timezone


def _run_send_event_notification_emails_task_sync(*args, **kwargs):
    """Execute the Celery task body synchronously (tests have no eager worker)."""
    from events.tasks import send_event_notification_emails_task

    send_event_notification_emails_task.apply(args=args, kwargs=kwargs)


@pytest.mark.django_db
class TestEventClassTargeting:
    """Tests for notification_target=classes and EventClassTarget management."""

    def _make_classe(self, direction_user):
        import uuid
        from classes.models import Classe

        return Classe.objects.create(
            name=f"Classe_{uuid.uuid4().hex[:8]}",
            created_by=direction_user,
        )

    def _add_member(self, classe, student, direction_user):
        from classes.models import ClasseMember

        return ClasseMember.objects.create(
            classe=classe,
            student=student,
            created_by=direction_user,
        )

    def test_create_event_with_class_targets_returns_ids(
        self, auth_client, direction_user
    ):
        c = self._make_classe(direction_user)
        resp = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "notification_target": "classes",
                        "class_target_classe_ids": [c.pk],
                    }
                )
            },
            format="multipart",
        )
        assert resp.status_code == 201, resp.content
        data = resp.json()
        assert data["notification_target"] == "classes"
        assert data["class_target_classe_ids"] == [c.pk]

    def test_publish_classes_target_with_no_targets_is_blocked(
        self, auth_client, direction_user
    ):
        from events import services

        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
            notification_target="classes",
        )
        resp = auth_client.post(f"/api/events/{e.pk}/publish/", {}, format="json")
        assert resp.status_code == 400
        assert "EventClassTargetRequiredWhenTargetIsClasses" in str(resp.content)

    def test_update_event_replaces_class_targets(self, auth_client, direction_user):
        c1 = self._make_classe(direction_user)
        c2 = self._make_classe(direction_user)
        resp = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "notification_target": "classes",
                        "class_target_classe_ids": [c1.pk, c2.pk],
                    }
                )
            },
            format="multipart",
        )
        pk = resp.json()["id"]

        resp = auth_client.put(
            f"/api/events/{pk}/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "notification_target": "classes",
                        "class_target_classe_ids": [c1.pk],
                    }
                )
            },
            format="multipart",
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["class_target_classe_ids"] == [c1.pk]

    def test_cannot_clear_class_targets_on_published_event(
        self, auth_client, direction_user
    ):
        from events import services

        c = self._make_classe(direction_user)
        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
            notification_target="classes",
        )
        services.replace_event_class_targets(
            event=e, classe_ids=[c.pk], created_by=direction_user
        )
        services.publish_event(event=e, updated_by=direction_user)

        resp = auth_client.put(
            f"/api/events/{e.pk}/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "notification_target": "classes",
                        "class_target_classe_ids": [],
                    }
                )
            },
            format="multipart",
        )
        assert resp.status_code == 400
        assert "CannotClearClassTargetsOnPublishedEvent" in str(resp.content)

    def test_invalid_classe_id_raises_error(self, auth_client):
        resp = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "notification_target": "classes",
                        "class_target_classe_ids": [999999],
                    }
                )
            },
            format="multipart",
        )
        assert resp.status_code == 400
        assert "InvalidClassTargetIds" in str(resp.content)

    @patch(
        "events.tasks.send_event_notification_emails_task.delay",
        side_effect=_run_send_event_notification_emails_task_sync,
    )
    @patch("events.services.transaction.on_commit", side_effect=lambda f: f())
    @patch("core.emails.send_simple_email")
    def test_notification_classes_only_emails_class_members(
        self,
        mock_send,
        _commit,
        _mock_delay,
        auth_client,
        direction_user,
        student_user,
        teacher_user,
    ):
        c = self._make_classe(direction_user)
        self._add_member(c, student_user, direction_user)
        # teacher_user and direction_user are NOT members

        resp = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "Targeted",
                        "description": "D",
                        "body": "Body",
                        "notification_target": "classes",
                        "class_target_classe_ids": [c.pk],
                    }
                )
            },
            format="multipart",
        )
        pk = resp.json()["id"]

        resp = auth_client.post(
            f"/api/events/{pk}/publish/",
            {"notification": "notification"},
            format="json",
        )
        assert resp.status_code == 200

        emailed = {call.kwargs["to"] for call in mock_send.call_args_list}
        assert student_user.email in emailed
        assert teacher_user.email not in emailed
        assert direction_user.email not in emailed
        assert mock_send.call_count == 1


@pytest.mark.django_db
class TestEventServices:
    def test_create_event_no_date_uses_date_tbd(self, direction_user):
        from events import services

        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
        )
        assert str(e.event_state) == "date_tbd"

    def test_update_event_does_not_clobber_cancelled_when_clearing_date(
        self, direction_user
    ):
        from events import services
        from events.models import EventState

        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
            event_date=timezone.now(),
        )
        e = services.cancel_event(event=e, updated_by=direction_user)
        assert e.event_state == EventState.CANCELLED

        e = services.update_event(
            event=e,
            updated_by=direction_user,
            event_date=None,
            title="T",
            description="D",
            body="",
            location="",
            contact_info="",
        )
        assert e.event_state == EventState.CANCELLED


@pytest.mark.django_db
class TestUpdateEventCoverPhotoDedup:
    """SHA-256 deduplication for ``update_event`` (``cover_photo`` field)."""

    @staticmethod
    def _png_bytes(rgb):
        from io import BytesIO

        from PIL import Image

        buf = BytesIO()
        Image.new("RGB", (1, 1), color=rgb).save(buf, format="PNG")
        return buf.getvalue()

    def test_same_file_keeps_stored_path(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from events import services

        payload = self._png_bytes((40, 41, 42))
        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
            cover_photo=SimpleUploadedFile(
                "cover1.png", payload, content_type="image/png"
            ),
        )
        path_before = e.cover_photo.name

        services.update_event(
            event=e,
            updated_by=direction_user,
            title="T",
            description="D",
            body="",
            location="",
            contact_info="",
            notification_target="all",
            cover_photo=SimpleUploadedFile(
                "cover2.png", payload, content_type="image/png"
            ),
        )
        e.refresh_from_db()
        assert e.cover_photo.name == path_before

    def test_different_file_updates_path(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from events import services

        a = self._png_bytes((1, 2, 3))
        b = self._png_bytes((4, 5, 6))
        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
            cover_photo=SimpleUploadedFile("c.png", a, content_type="image/png"),
        )
        path_before = e.cover_photo.name

        services.update_event(
            event=e,
            updated_by=direction_user,
            title="T",
            description="D",
            body="",
            location="",
            contact_info="",
            notification_target="all",
            cover_photo=SimpleUploadedFile("d.png", b, content_type="image/png"),
        )
        e.refresh_from_db()
        assert e.cover_photo.name != path_before

    def test_no_existing_file_always_saves(self, direction_user):
        from django.core.files.uploadedfile import SimpleUploadedFile

        from events import services

        payload = self._png_bytes((9, 9, 9))
        e = services.create_event(
            created_by=direction_user,
            title="T",
            description="D",
        )
        assert not e.cover_photo

        services.update_event(
            event=e,
            updated_by=direction_user,
            title="T",
            description="D",
            body="",
            location="",
            contact_info="",
            notification_target="all",
            cover_photo=SimpleUploadedFile(
                "only.png", payload, content_type="image/png"
            ),
        )
        e.refresh_from_db()
        assert e.cover_photo.name


@pytest.mark.django_db
class TestEventsHttp:
    def test_student_cannot_create_event(self, student_auth_client):
        resp = student_auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "X",
                        "description": "Y",
                    }
                )
            },
            format="multipart",
        )
        assert resp.status_code == 403

    def test_direction_can_create_and_list_published_after_publish(
        self, auth_client, api_client
    ):
        create = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "Show",
                        "description": "Short",
                        "body": "<p>Rich</p>",
                    }
                )
            },
            format="multipart",
        )
        assert create.status_code == 201, create.content
        pk = create.json()["id"]

        pub = auth_client.post(f"/api/events/{pk}/publish/", {}, format="json")
        assert pub.status_code == 200, pub.content

        r = api_client.get("/api/events/")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert pk in ids

    def test_comment_tree_in_list(self, auth_client, direction_user, student_user):
        from events import services

        e = services.create_event(
            created_by=direction_user,
            title="E",
            description="D",
        )
        services.publish_event(event=e, updated_by=direction_user)

        auth_client.force_authenticate(user=student_user)
        root = auth_client.post(
            f"/api/events/{e.pk}/comments/",
            {"body": "Root"},
            format="json",
        )
        assert root.status_code == 201
        rid = root.json()["id"]

        reply = auth_client.post(
            f"/api/events/{e.pk}/comments/",
            {"body": "Reply", "parent_comment_id": rid},
            format="json",
        )
        assert reply.status_code == 201

        r = auth_client.get(f"/api/events/{e.pk}/comments/")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["body"] == "Root"
        assert len(data[0]["replies"]) == 1
        assert data[0]["replies"][0]["body"] == "Reply"

    @patch(
        "events.tasks.send_event_notification_emails_task.delay",
        side_effect=_run_send_event_notification_emails_task_sync,
    )
    @patch("events.services.transaction.on_commit", side_effect=lambda f: f())
    @patch("core.emails.send_simple_email")
    def test_publish_notification_test_emails_only_requester(
        self,
        mock_send,
        _commit,
        _mock_delay,
        auth_client,
        direction_user,
    ):
        create = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "T",
                        "description": "D",
                        "body": "<p>Hello</p>",
                    }
                )
            },
            format="multipart",
        )
        assert create.status_code == 201
        pk = create.json()["id"]

        resp = auth_client.post(
            f"/api/events/{pk}/publish/",
            {"notification": "notification_test"},
            format="json",
        )
        assert resp.status_code == 200
        mock_send.assert_called_once_with(
            to=direction_user.email,
            subject="T",
            body="<p>Hello</p>",
            attachments=[],
        )

    @patch(
        "events.tasks.send_event_notification_emails_task.delay",
        side_effect=_run_send_event_notification_emails_task_sync,
    )
    @patch("events.services.transaction.on_commit", side_effect=lambda f: f())
    @patch("core.emails.send_simple_email")
    def test_publish_notification_broadcasts_distinct_emails(
        self,
        mock_send,
        _commit,
        _mock_delay,
        auth_client,
        direction_user,
        student_user,
        teacher_user,
    ):
        create = auth_client.post(
            "/api/events/",
            {
                "data": json.dumps(
                    {
                        "title": "Ev",
                        "description": "d",
                        "body": "Plain",
                    }
                )
            },
            format="multipart",
        )
        pk = create.json()["id"]

        resp = auth_client.post(
            f"/api/events/{pk}/publish/",
            {"notification": "notification"},
            format="json",
        )
        assert resp.status_code == 200

        emailed = {c.kwargs["to"] for c in mock_send.call_args_list}
        assert direction_user.email in emailed
        assert student_user.email in emailed
        assert teacher_user.email in emailed
        assert mock_send.call_count >= 3
