import uuid
from datetime import date, time, timedelta

import pytest
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from availability import services
from availability.models import RecurringAvailability, TeacherAvailability
from core.exceptions import AppNotFound


def _dt(offset_hours=0):
    return timezone.now() + timedelta(hours=offset_hours)


# ---------------------------------------------------------------------------
# Service-level tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateAvailability:
    def test_create_one_time_success(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        assert block.pk is not None
        assert block.teacher_id == teacher_user.pk
        assert not hasattr(block, "recurring") or block.recurring is None

    def test_create_recurring_success(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "0,2,4",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": date.today(),
                "valid_until": date.today() + timedelta(days=90),
            },
        )
        assert block.pk is not None
        assert block.recurring is not None
        assert block.recurring.days_of_week == "0,2,4"

    def test_create_invalid_date_range(self, direction_user, teacher_user):
        with pytest.raises(ValidationError) as exc:
            services.create_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(3),
                end_datetime=_dt(1),
            )
        assert "InvalidDateRange" in str(exc.value.detail)

    def test_create_one_time_overlap_blocked(self, direction_user, teacher_user):
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        with pytest.raises(ValidationError) as exc:
            services.create_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(2),
                end_datetime=_dt(4),
            )
        assert "TeacherAvailabilityOverlap" in str(exc.value.detail)

    def test_create_adjacent_slots_allowed(self, direction_user, teacher_user):
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        block2 = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(2),
            end_datetime=_dt(3),
        )
        assert block2.pk is not None

    def test_create_recurring_invalid_time_range(self, direction_user, teacher_user):
        with pytest.raises(ValidationError) as exc:
            services.create_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(1),
                end_datetime=_dt(3),
                recurring={
                    "days_of_week": "0",
                    "start_time": time(14, 0),
                    "end_time": time(10, 0),
                    "valid_from": date.today(),
                },
            )
        assert "InvalidTimeRange" in str(exc.value.detail)

    def test_create_recurring_invalid_validity_range(self, direction_user, teacher_user):
        with pytest.raises(ValidationError) as exc:
            services.create_availability(
                teacher_id=teacher_user.pk,
                requesting_user=direction_user,
                start_datetime=_dt(1),
                end_datetime=_dt(3),
                recurring={
                    "days_of_week": "0",
                    "start_time": time(9, 0),
                    "end_time": time(12, 0),
                    "valid_from": date.today() + timedelta(days=30),
                    "valid_until": date.today(),
                },
            )
        assert "InvalidValidityRange" in str(exc.value.detail)

    def test_create_recurring_defaults_valid_from_to_today(
        self, direction_user, teacher_user
    ):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "1",
                "start_time": time(10, 0),
                "end_time": time(11, 0),
            },
        )
        assert block.recurring.valid_from == timezone.now().date()


@pytest.mark.django_db
class TestUpdateAvailability:
    def test_update_notes(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        updated = services.update_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
            notes="updated",
        )
        assert updated.notes == "updated"

    def test_patch_recurring_null_removes_rule(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "0",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": date.today(),
            },
        )
        assert block.recurring is not None

        updated = services.update_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
            recurring=None,
        )
        assert not hasattr(updated, "recurring") or updated.recurring is None
        assert RecurringAvailability.all_objects.filter(
            availability_id=block.pk
        ).exists()

    def test_patch_add_recurring_to_one_time(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )

        updated = services.update_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
            recurring={
                "days_of_week": "1,3",
                "start_time": time(9, 0),
                "end_time": time(11, 0),
                "valid_from": date.today(),
            },
        )
        assert updated.recurring is not None
        assert updated.recurring.days_of_week == "1,3"

    def test_patch_update_existing_recurring(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "0",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": date.today(),
            },
        )

        updated = services.update_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
            recurring={"days_of_week": "0,2,4"},
        )
        assert updated.recurring.days_of_week == "0,2,4"

    def test_update_not_found(self, direction_user, teacher_user):
        with pytest.raises(AppNotFound):
            services.update_availability(
                teacher_id=teacher_user.pk,
                pk=99999,
                requesting_user=direction_user,
                notes="x",
            )


@pytest.mark.django_db
class TestDeleteAvailability:
    def test_delete_soft(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        services.delete_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
        )
        assert not TeacherAvailability.objects.filter(pk=block.pk).exists()
        assert TeacherAvailability.all_objects.filter(pk=block.pk).exists()

    def test_delete_recurring_also_soft_deletes_rule(self, direction_user, teacher_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "0",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": date.today(),
            },
        )
        recurring_pk = block.recurring.pk
        services.delete_availability(
            teacher_id=teacher_user.pk,
            pk=block.pk,
            requesting_user=direction_user,
        )
        assert not RecurringAvailability.objects.filter(pk=recurring_pk).exists()
        assert RecurringAvailability.all_objects.filter(pk=recurring_pk).exists()

    def test_delete_wrong_teacher(self, direction_user, teacher_user):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other = User.objects.create_user(
            email=f"other_{uuid.uuid4().hex[:8]}@test.local",
            password="x",
            first_name="Other",
            last_name="Teacher",
            is_active=True,
        )
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        with pytest.raises(ValidationError) as exc:
            services.delete_availability(
                teacher_id=other.pk,
                pk=block.pk,
                requesting_user=direction_user,
            )
        assert "UserCannotTeach" in str(exc.value.detail)


@pytest.mark.django_db
class TestListAvailability:
    def test_list_returns_one_time_slots(self, direction_user, teacher_user):
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        slots = services.list_availability(
            teacher_id=teacher_user.pk,
            date_from=_dt(0),
            date_to=_dt(24),
        )
        assert len(slots) == 1
        assert slots[0]["is_recurring"] is False
        assert slots[0]["id"] is not None

    def test_list_expands_recurring_slots(self, direction_user, teacher_user):
        today = date.today()
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": ",".join(str(i) for i in range(7)),
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": today,
                "valid_until": today + timedelta(days=6),
            },
        )
        slots = services.list_availability(
            teacher_id=teacher_user.pk,
            date_from=timezone.now().replace(hour=0, minute=0, second=0),
            date_to=timezone.now().replace(hour=0, minute=0, second=0)
            + timedelta(days=7),
        )
        recurring_slots = [s for s in slots if s["is_recurring"]]
        assert len(recurring_slots) == 7

    def test_list_mixed_one_time_and_recurring(self, direction_user, teacher_user):
        today = date.today()
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(2),
        )
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(10),
            end_datetime=_dt(11),
            recurring={
                "days_of_week": ",".join(str(i) for i in range(7)),
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": today,
                "valid_until": today + timedelta(days=2),
            },
        )
        slots = services.list_availability(
            teacher_id=teacher_user.pk,
            date_from=_dt(0),
            date_to=_dt(72),
        )
        one_time = [s for s in slots if not s["is_recurring"]]
        recurring = [s for s in slots if s["is_recurring"]]
        assert len(one_time) == 1
        assert len(recurring) >= 1

    def test_list_recurring_outside_date_range_excluded(
        self, direction_user, teacher_user
    ):
        past = date.today() - timedelta(days=60)
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(-1440),
            end_datetime=_dt(-1438),
            recurring={
                "days_of_week": "0",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": past,
                "valid_until": past + timedelta(days=7),
            },
        )
        slots = services.list_availability(
            teacher_id=teacher_user.pk,
            date_from=_dt(0),
            date_to=_dt(168),
        )
        assert len(slots) == 0


# ---------------------------------------------------------------------------
# HTTP endpoint tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAvailabilityEndpoints:
    def test_create_one_time_returns_201(self, api_client, teacher_user):
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.post(
            f"/api/availability/teachers/{teacher_user.pk}/",
            {
                "start_datetime": _dt(1).isoformat(),
                "end_datetime": _dt(3).isoformat(),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["is_recurring"] is False
        assert resp.data["recurring"] is None

    def test_create_recurring_returns_201(self, api_client, teacher_user):
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.post(
            f"/api/availability/teachers/{teacher_user.pk}/",
            {
                "start_datetime": _dt(1).isoformat(),
                "end_datetime": _dt(3).isoformat(),
                "recurring": {
                    "days_of_week": "1,3,5",
                    "start_time": "09:00",
                    "end_time": "12:00",
                    "valid_from": str(date.today()),
                },
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["is_recurring"] is True
        assert resp.data["recurring"]["days_of_week"] == "1,3,5"

    def test_unauthenticated_rejected(self, api_client, teacher_user):
        resp = api_client.get(
            f"/api/availability/teachers/{teacher_user.pk}/",
            {"date_from": _dt(0).isoformat(), "date_to": _dt(24).isoformat()},
        )
        assert resp.status_code == 401

    def test_list_requires_date_range(self, api_client, teacher_user):
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.get(
            f"/api/availability/teachers/{teacher_user.pk}/",
        )
        assert resp.status_code == 400

    def test_list_returns_expanded_slots(self, api_client, teacher_user, direction_user):
        services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.get(
            f"/api/availability/teachers/{teacher_user.pk}/",
            {"date_from": _dt(0).isoformat(), "date_to": _dt(24).isoformat()},
        )
        assert resp.status_code == 200
        assert len(resp.data) == 1

    def test_patch_removes_recurring(self, api_client, teacher_user, direction_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
            recurring={
                "days_of_week": "0",
                "start_time": time(9, 0),
                "end_time": time(12, 0),
                "valid_from": date.today(),
            },
        )
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.patch(
            f"/api/availability/teachers/{teacher_user.pk}/{block.pk}/",
            {"recurring": None},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["is_recurring"] is False
        assert resp.data["recurring"] is None

    def test_delete_returns_204(self, api_client, teacher_user, direction_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.delete(
            f"/api/availability/teachers/{teacher_user.pk}/{block.pk}/",
        )
        assert resp.status_code == 204

    def test_get_detail_returns_200(self, api_client, teacher_user, direction_user):
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        api_client.force_authenticate(user=teacher_user)
        resp = api_client.get(
            f"/api/availability/teachers/{teacher_user.pk}/{block.pk}/",
        )
        assert resp.status_code == 200
        assert resp.data["id"] == block.pk

    def test_other_teacher_cannot_manage(self, api_client, teacher_user, direction_user):
        from tests.conftest import make_user_with_role

        other_teacher = make_user_with_role("teacher")
        block = services.create_availability(
            teacher_id=teacher_user.pk,
            requesting_user=direction_user,
            start_datetime=_dt(1),
            end_datetime=_dt(3),
        )
        api_client.force_authenticate(user=other_teacher)
        resp = api_client.patch(
            f"/api/availability/teachers/{teacher_user.pk}/{block.pk}/",
            {"notes": "hacked"},
            format="json",
        )
        assert resp.status_code == 403
