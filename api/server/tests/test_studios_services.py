import pytest
from rest_framework.exceptions import ValidationError

from core.exceptions import AppNotFound


@pytest.mark.django_db
class TestStudio:
    def test_create_studio_success(self, direction_user):
        from studios import services

        s = services.create_studio(user=direction_user, name="Studio A", max_capacity=8)
        assert s.pk is not None
        assert s.name == "Studio A"

    def test_create_studio_duplicate_name(self, direction_user):
        from studios import services

        services.create_studio(user=direction_user, name="Dup Studio", max_capacity=8)
        with pytest.raises(ValidationError) as exc:
            services.create_studio(
                user=direction_user, name="Dup Studio", max_capacity=4
            )
        assert "StudioNameAlreadyExists" in exc.value.detail["name"]

    def test_update_studio_name_collision(self, direction_user):
        from studios import services

        services.create_studio(user=direction_user, name="Studio X", max_capacity=8)
        s2 = services.create_studio(
            user=direction_user, name="Studio Y", max_capacity=8
        )
        with pytest.raises(ValidationError) as exc:
            services.update_studio(pk=s2.pk, user=direction_user, name="Studio X")
        assert "StudioNameAlreadyExists" in exc.value.detail["name"]

    def test_delete_studio_soft(self, direction_user):
        from studios import services
        from studios.models import Studio

        s = services.create_studio(
            user=direction_user, name="To Delete", max_capacity=4
        )
        services.delete_studio(pk=s.pk, user=direction_user)
        assert not Studio.objects.filter(pk=s.pk).exists()
        assert Studio.all_objects.filter(pk=s.pk).exists()

    def test_get_studio_not_found(self):
        from studios import services

        with pytest.raises(AppNotFound) as exc:
            services.get_studio(pk=999_999)
        assert "StudioNotFound" in str(exc.value.detail)

    def test_create_studio_with_modality_ids(self, direction_user, modality):
        from studios import services
        from studios.models import StudioModality

        s = services.create_studio(
            user=direction_user,
            name="__Studio With Mod__",
            max_capacity=8,
            allowed_modality_ids=[modality.pk],
        )
        assert StudioModality.objects.filter(studio=s, modality=modality).exists()

    def test_create_studio_invalid_modality_id(self, direction_user):
        from studios import services

        with pytest.raises(ValidationError) as exc:
            services.create_studio(
                user=direction_user,
                name="__Bad Mod Studio__",
                max_capacity=8,
                allowed_modality_ids=[999_999],
            )
        assert "OneOrMoreModalitiesNotFound" in str(exc.value.detail)

    def test_update_studio_modality_ids_replaces_links(self, direction_user, modality):
        from modality import services as modality_services
        from studios import services
        from studios.models import StudioModality

        m2 = modality_services.create_modality(
            user=direction_user, name="__Second Mod For Studio__"
        )
        s = services.create_studio(
            user=direction_user,
            name="__Studio Replace Mods__",
            max_capacity=8,
            allowed_modality_ids=[modality.pk],
        )
        services.update_studio(
            pk=s.pk, user=direction_user, allowed_modality_ids=[m2.pk]
        )
        assert not StudioModality.objects.filter(studio=s, modality=modality).exists()
        assert StudioModality.objects.filter(studio=s, modality=m2).exists()


@pytest.mark.django_db
class TestModality:
    def test_create_modality_success(self, direction_user):
        from modality import services

        m = services.create_modality(user=direction_user, name="__Ballet__")
        assert m.pk is not None

    def test_create_modality_invalid_age_range(self, direction_user):
        from modality import services

        with pytest.raises(ValidationError) as exc:
            services.create_modality(
                user=direction_user,
                name="__Bad Age__",
                min_age_months=60,
                max_age_months=24,
            )
        assert "InvalidAgeRange" in str(exc.value.detail)

    def test_create_modality_with_studio_ids(self, direction_user):
        from modality import services as modality_services
        from studios import services as studio_services
        from studios.models import StudioModality

        studio = studio_services.create_studio(
            user=direction_user, name="__Linked Studio__", max_capacity=8
        )
        m = modality_services.create_modality(
            user=direction_user,
            name="__Linked Modality__",
            allowed_studio_ids=[studio.pk],
        )
        assert StudioModality.objects.filter(studio=studio, modality=m).exists()

    def test_create_modality_invalid_studio_id(self, direction_user):
        from modality import services

        with pytest.raises(ValidationError) as exc:
            services.create_modality(
                user=direction_user,
                name="__Bad Studio__",
                allowed_studio_ids=[999_999],
            )
        assert "OneOrMoreStudiosNotFound" in str(exc.value.detail)

    def test_update_modality_studio_ids_replaces_links(self, direction_user):
        from modality import services as modality_services
        from studios import services as studio_services
        from studios.models import StudioModality

        s1 = studio_services.create_studio(
            user=direction_user, name="__S1__", max_capacity=8
        )
        s2 = studio_services.create_studio(
            user=direction_user, name="__S2__", max_capacity=8
        )
        m = modality_services.create_modality(
            user=direction_user,
            name="__Update Links__",
            allowed_studio_ids=[s1.pk],
        )
        modality_services.update_modality(
            pk=m.pk, user=direction_user, allowed_studio_ids=[s2.pk]
        )
        assert not StudioModality.objects.filter(studio=s1, modality=m).exists()
        assert StudioModality.objects.filter(studio=s2, modality=m).exists()

    def test_delete_modality_soft(self, direction_user):
        from modality import services
        from modality.models import Modality

        m = services.create_modality(user=direction_user, name="__Soft Del__")
        services.delete_modality(pk=m.pk, user=direction_user)
        assert not Modality.objects.filter(pk=m.pk).exists()
        assert Modality.all_objects.filter(pk=m.pk).exists()
