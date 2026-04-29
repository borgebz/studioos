"""Tests for the events app (services + HTTP)."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from django.utils import timezone


def _run_send_event_notification_emails_task_sync(*args, **kwargs):
    """Execute the Celery task body synchronously (tests have no eager worker)."""
    from events.tasks import send_event_notification_emails_task

    send_event_notification_emails_task.apply(args=args, kwargs=kwargs)


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
class TestEventsHttp:
    def test_student_cannot_create_event(self, student_auth_client):
        resp = student_auth_client.post(
            "/api/events/",
            {
                "title": "X",
                "description": "Y",
            },
            format="json",
        )
        assert resp.status_code == 403

    def test_direction_can_create_and_list_published_after_publish(
        self, auth_client, api_client
    ):
        create = auth_client.post(
            "/api/events/",
            {
                "title": "Show",
                "description": "Short",
                "body": "<p>Rich</p>",
            },
            format="json",
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
                "title": "T",
                "description": "D",
                "body": "<p>Hello</p>",
            },
            format="json",
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
                "title": "Ev",
                "description": "d",
                "body": "Plain",
            },
            format="json",
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
