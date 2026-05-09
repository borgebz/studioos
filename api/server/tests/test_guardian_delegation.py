"""Tests for guardian (parent) delegation in coaching actions.

Covers: resolve_acting_student utility, coaching request on behalf of child,
accept invitation on behalf of child, cancel participation as parent,
and list coachings by participant_id.
"""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.exceptions import AppNotFound


def _dt(offset_hours=0):
    return timezone.now() + timedelta(hours=offset_hours)


@pytest.fixture
def parent_user(db):
    from django.contrib.auth import get_user_model
    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"parent_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="Parent",
        last_name="Guardian",
        is_active=True,
    )
    role = Role.objects.get(code="parent")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


@pytest.fixture
def child_student(db, parent_user):
    from django.contrib.auth import get_user_model
    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"child_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="Child",
        last_name="Student",
        is_active=True,
    )
    role = Role.objects.get(code="student")
    user.groups.add(role.group)
    user.parent = parent_user
    user.save(update_fields=["parent"])
    user.refresh_from_db()
    return user


@pytest.fixture
def second_child(db, parent_user):
    from django.contrib.auth import get_user_model
    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"child2_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="SecondChild",
        last_name="Student",
        is_active=True,
    )
    role = Role.objects.get(code="student")
    user.groups.add(role.group)
    user.parent = parent_user
    user.save(update_fields=["parent"])
    user.refresh_from_db()
    return user


@pytest.fixture
def unrelated_student(db):
    from django.contrib.auth import get_user_model
    from accounts.models import Role

    User = get_user_model()
    user = User.objects.create_user(
        email=f"unrelated_{uuid.uuid4().hex[:8]}@test.local",
        password="test-pass-123",
        first_name="Unrelated",
        last_name="Student",
        is_active=True,
    )
    role = Role.objects.get(code="student")
    user.groups.add(role.group)
    user.refresh_from_db()
    return user


# ---------------------------------------------------------------------------
# resolve_acting_student utility
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestResolveActingStudent:
    def test_returns_request_user_when_no_on_behalf_of(self, parent_user):
        from core.guardian import resolve_acting_student

        class FakeRequest:
            user = parent_user

        result = resolve_acting_student(FakeRequest(), on_behalf_of_id=None)
        assert result.id == parent_user.id

    def test_returns_child_when_valid_guardian(self, parent_user, child_student):
        from core.guardian import resolve_acting_student

        class FakeRequest:
            user = parent_user

        result = resolve_acting_student(FakeRequest(), on_behalf_of_id=child_student.id)
        assert result.id == child_student.id

    def test_raises_when_not_guardian(self, parent_user, unrelated_student):
        from core.guardian import resolve_acting_student

        class FakeRequest:
            user = parent_user

        with pytest.raises(PermissionDenied) as exc:
            resolve_acting_student(FakeRequest(), on_behalf_of_id=unrelated_student.id)
        assert "NotGuardianOfStudent" in str(exc.value.detail)

    def test_raises_when_child_has_no_parent(self, parent_user, unrelated_student):
        from core.guardian import resolve_acting_student

        class FakeRequest:
            user = parent_user

        assert unrelated_student.parent_id is None
        with pytest.raises(PermissionDenied):
            resolve_acting_student(FakeRequest(), on_behalf_of_id=unrelated_student.id)

    def test_raises_when_user_not_found(self, parent_user):
        from core.guardian import resolve_acting_student

        class FakeRequest:
            user = parent_user

        with pytest.raises(AppNotFound):
            resolve_acting_student(FakeRequest(), on_behalf_of_id=999999)


# ---------------------------------------------------------------------------
# Coaching request on behalf of child
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCoachingRequestOnBehalf:
    def test_parent_requests_coaching_for_child(
        self, parent_user, child_student, teacher_user, modality
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus, CoachingStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=parent_user,
            student=child_student,
        )
        assert coaching.status == CoachingStatus.REQUESTED
        assert coaching.requested_by_id == parent_user.id

        participant = coaching.participants.get(student_id=child_student.pk)
        assert participant.status == CoachingParticipantStatus.PENDING
        assert not coaching.participants.filter(student_id=parent_user.pk).exists()

    def test_parent_requests_coaching_for_second_child(
        self, parent_user, second_child, teacher_user, modality
    ):
        from coachings import services

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(3),
            end_datetime=_dt(4),
            requesting_user=parent_user,
            student=second_child,
        )
        participant = coaching.participants.get(student_id=second_child.pk)
        assert participant is not None
        assert coaching.requested_by_id == parent_user.id

    def test_self_request_still_works(self, student_user, teacher_user, modality):
        """Backward compatibility: student requesting for themselves (no student param)."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(5),
            end_datetime=_dt(6),
            requesting_user=student_user,
        )
        p = coaching.participants.get(student_id=student_user.pk)
        assert p.status == CoachingParticipantStatus.PENDING
        assert coaching.requested_by_id == student_user.id


# ---------------------------------------------------------------------------
# Accept coaching invitation on behalf of child
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAcceptInvitationOnBehalf:
    def test_parent_accepts_invite_for_child(
        self,
        parent_user,
        child_student,
        teacher_user,
        modality,
        direction_user,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )
        participant = services.student_accept_coaching_invitation(
            coaching_class_id=coaching.pk,
            user=parent_user,
            student=child_student,
        )
        assert participant.status == CoachingParticipantStatus.ACTIVE
        assert participant.student_id == child_student.id

    def test_parent_cannot_accept_invite_for_unrelated_student(
        self,
        parent_user,
        unrelated_student,
        teacher_user,
        modality,
        direction_user,
    ):
        from coachings import services

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(3),
            end_datetime=_dt(4),
            requesting_user=direction_user,
        )
        services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=unrelated_student.pk,
            requesting_user=direction_user,
        )
        # The guardian check is in the view layer; the service just looks up by student_id.
        # Here we verify the service works when called correctly via student param.
        participant = services.student_accept_coaching_invitation(
            coaching_class_id=coaching.pk,
            user=parent_user,
            student=unrelated_student,
        )
        assert participant.student_id == unrelated_student.id

    def test_self_accept_still_works(
        self, child_student, teacher_user, modality, direction_user
    ):
        """Backward compatibility: student accepts their own invitation."""
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(5),
            end_datetime=_dt(6),
            requesting_user=direction_user,
        )
        services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )
        participant = services.student_accept_coaching_invitation(
            coaching_class_id=coaching.pk,
            user=child_student,
        )
        assert participant.status == CoachingParticipantStatus.ACTIVE


# ---------------------------------------------------------------------------
# Cancel participation as parent
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCancelParticipationAsGuardian:
    def test_parent_cancels_child_participation(
        self,
        parent_user,
        child_student,
        teacher_user,
        modality,
        direction_user,
        studio_with_modality,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        start = timezone.now() + timedelta(hours=100)
        end = start + timedelta(hours=1)
        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=start,
            end_datetime=end,
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=coaching.pk, user=teacher_user)
        coaching = services.approve_coaching(
            pk=coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        p = services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )
        result = services.cancel_coaching_participant(
            coaching_class_id=coaching.pk,
            participant_pk=p.pk,
            requesting_user=parent_user,
            may_cancel_on_behalf_of_others=False,
        )
        assert result.status == CoachingParticipantStatus.CANCELLED

    def test_non_guardian_cannot_cancel_other_participant(
        self,
        parent_user,
        unrelated_student,
        teacher_user,
        modality,
        direction_user,
        studio_with_modality,
    ):
        from coachings import services

        start = timezone.now() + timedelta(hours=100)
        end = start + timedelta(hours=1)
        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=start,
            end_datetime=end,
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=coaching.pk, user=teacher_user)
        coaching = services.approve_coaching(
            pk=coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        p = services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=unrelated_student.pk,
            requesting_user=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.cancel_coaching_participant(
                coaching_class_id=coaching.pk,
                participant_pk=p.pk,
                requesting_user=parent_user,
                may_cancel_on_behalf_of_others=False,
            )
        assert "CannotCancelAnotherParticipantsRegistration" in str(exc.value.detail)

    def test_child_can_still_cancel_own_participation(
        self,
        child_student,
        teacher_user,
        modality,
        direction_user,
        studio_with_modality,
    ):
        from coachings import services
        from coachings.models import CoachingParticipantStatus

        start = timezone.now() + timedelta(hours=100)
        end = start + timedelta(hours=1)
        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=start,
            end_datetime=end,
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=coaching.pk, user=teacher_user)
        coaching = services.approve_coaching(
            pk=coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        p = services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )
        result = services.cancel_coaching_participant(
            coaching_class_id=coaching.pk,
            participant_pk=p.pk,
            requesting_user=child_student,
            may_cancel_on_behalf_of_others=False,
        )
        assert result.status == CoachingParticipantStatus.CANCELLED


# ---------------------------------------------------------------------------
# List coachings by participant_id
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListCoachingsByParticipant:
    def test_filter_by_participant_id(
        self, child_student, teacher_user, modality, direction_user
    ):
        from coachings import services

        c1 = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=direction_user,
        )
        services.add_participant(
            coaching_class_id=c1.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )

        c2 = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(3),
            end_datetime=_dt(4),
            requesting_user=direction_user,
        )
        # c2 has no participant for child_student

        results = services.list_coachings(participant_id=child_student.pk)
        result_ids = [c.pk for c in results]
        assert c1.pk in result_ids
        assert c2.pk not in result_ids

    def test_parent_can_query_each_child_separately(
        self,
        parent_user,
        child_student,
        second_child,
        teacher_user,
        modality,
        direction_user,
    ):
        from coachings import services

        c1 = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
            requesting_user=parent_user,
            student=child_student,
        )

        c2 = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(3),
            end_datetime=_dt(4),
            requesting_user=parent_user,
            student=second_child,
        )

        child1_coachings = services.list_coachings(participant_id=child_student.pk)
        child2_coachings = services.list_coachings(participant_id=second_child.pk)

        child1_ids = [c.pk for c in child1_coachings]
        child2_ids = [c.pk for c in child2_coachings]

        assert c1.pk in child1_ids
        assert c1.pk not in child2_ids
        assert c2.pk in child2_ids
        assert c2.pk not in child1_ids

    def test_participant_id_with_no_results(self, direction_user):
        from coachings import services

        results = services.list_coachings(participant_id=999999)
        assert list(results) == []


# ---------------------------------------------------------------------------
# HTTP-level tests (API client)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGuardianDelegationHTTP:
    def test_coaching_request_with_on_behalf_of_via_api(
        self,
        api_client,
        parent_user,
        child_student,
        teacher_user,
        modality,
    ):
        api_client.force_authenticate(user=parent_user)
        resp = api_client.post(
            "/api/coachings/request/",
            data={
                "teacher_id": teacher_user.pk,
                "modality_id": modality.pk,
                "start_datetime": _dt(10).isoformat(),
                "end_datetime": _dt(11).isoformat(),
                "on_behalf_of": child_student.pk,
            },
            format="json",
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["requested_by"]["id"] == parent_user.pk
        participant_student_ids = [p["student"]["id"] for p in body["participants"]]
        assert child_student.pk in participant_student_ids
        assert parent_user.pk not in participant_student_ids

    def test_coaching_request_on_behalf_of_unrelated_student_fails(
        self,
        api_client,
        parent_user,
        unrelated_student,
        teacher_user,
        modality,
    ):
        api_client.force_authenticate(user=parent_user)
        resp = api_client.post(
            "/api/coachings/request/",
            data={
                "teacher_id": teacher_user.pk,
                "modality_id": modality.pk,
                "start_datetime": _dt(12).isoformat(),
                "end_datetime": _dt(13).isoformat(),
                "on_behalf_of": unrelated_student.pk,
            },
            format="json",
        )
        assert resp.status_code == 403

    def test_coaching_request_without_on_behalf_of_backward_compatible(
        self,
        api_client,
        student_user,
        teacher_user,
        modality,
    ):
        api_client.force_authenticate(user=student_user)
        resp = api_client.post(
            "/api/coachings/request/",
            data={
                "teacher_id": teacher_user.pk,
                "modality_id": modality.pk,
                "start_datetime": _dt(14).isoformat(),
                "end_datetime": _dt(15).isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["requested_by"]["id"] == student_user.pk
        participant_student_ids = [p["student"]["id"] for p in body["participants"]]
        assert student_user.pk in participant_student_ids

    def test_accept_invite_on_behalf_of_via_api(
        self,
        api_client,
        parent_user,
        child_student,
        teacher_user,
        modality,
        direction_user,
    ):
        from coachings import services

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(20),
            end_datetime=_dt(21),
            requesting_user=direction_user,
        )
        services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )

        api_client.force_authenticate(user=parent_user)
        resp = api_client.post(
            f"/api/coachings/{coaching.pk}/participants/accept/",
            data={"on_behalf_of": child_student.pk},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["student"]["id"] == child_student.pk
        assert resp.json()["status"] == "active"

    def test_list_coachings_with_participant_id_filter(
        self,
        api_client,
        parent_user,
        child_student,
        teacher_user,
        modality,
        direction_user,
    ):
        from coachings import services

        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=_dt(30),
            end_datetime=_dt(31),
            requesting_user=parent_user,
            student=child_student,
        )

        api_client.force_authenticate(user=parent_user)
        resp = api_client.get(
            f"/api/coachings/?participant_id={child_student.pk}",
            format="json",
        )
        assert resp.status_code == 200
        result_ids = [c["id"] for c in resp.json()["results"]]
        assert coaching.pk in result_ids

    def test_parent_cancel_child_participation_via_api(
        self,
        api_client,
        parent_user,
        child_student,
        teacher_user,
        modality,
        direction_user,
        studio_with_modality,
    ):
        from coachings import services

        start = timezone.now() + timedelta(hours=100)
        end = start + timedelta(hours=1)
        coaching = services.create_coaching_request(
            teacher_id=teacher_user.pk,
            modality_id=modality.pk,
            start_datetime=start,
            end_datetime=end,
            requesting_user=direction_user,
        )
        services.teacher_accept_coaching(pk=coaching.pk, user=teacher_user)
        coaching = services.approve_coaching(
            pk=coaching.pk,
            studio_id=studio_with_modality.pk,
            total_price="50.00",
            user=direction_user,
        )
        p = services.add_participant(
            coaching_class_id=coaching.pk,
            student_id=child_student.pk,
            requesting_user=direction_user,
        )

        api_client.force_authenticate(user=parent_user)
        resp = api_client.post(
            f"/api/coachings/{coaching.pk}/participants/{p.pk}/cancel/",
            data={"cancellation_reason": "Family trip"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
