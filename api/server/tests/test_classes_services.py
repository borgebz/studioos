import uuid

import pytest
from rest_framework.exceptions import NotFound, ValidationError


@pytest.fixture
def classe(direction_user):
    from classes import services

    return services.create_classe(
        name=f"Test Classe {uuid.uuid4().hex[:6]}",
        description="A test classe",
        created_by=direction_user,
    )


@pytest.mark.django_db
class TestCreateClasse:
    def test_create_success(self, direction_user):
        from classes import services

        c = services.create_classe(
            name="Ballet A",
            description="Morning ballet",
            created_by=direction_user,
        )
        assert c.pk is not None
        assert c.name == "Ballet A"
        assert c.description == "Morning ballet"

    def test_create_duplicate_name_blocked(self, direction_user, classe):
        from classes import services

        with pytest.raises(ValidationError) as exc:
            services.create_classe(
                name=classe.name,
                created_by=direction_user,
            )
        assert "ClasseNameAlreadyExists" in str(exc.value.detail)


@pytest.mark.django_db
class TestUpdateClasse:
    def test_update_success(self, direction_user, classe):
        from classes import services

        updated = services.update_classe(
            pk=classe.pk,
            requesting_user=direction_user,
            name="Updated Name",
        )
        assert updated.name == "Updated Name"
        assert updated.description == classe.description

    def test_update_not_found(self, direction_user):
        from classes import services

        with pytest.raises(NotFound):
            services.update_classe(
                pk=999999,
                requesting_user=direction_user,
                name="Nope",
            )


@pytest.mark.django_db
class TestDeleteClasse:
    def test_soft_delete(self, direction_user, classe):
        from classes import services
        from classes.models import Classe

        services.delete_classe(pk=classe.pk, requesting_user=direction_user)
        assert not Classe.objects.filter(pk=classe.pk).exists()
        assert Classe.all_objects.filter(pk=classe.pk).exists()

    def test_delete_not_found(self, direction_user):
        from classes import services

        with pytest.raises(NotFound):
            services.delete_classe(pk=999999, requesting_user=direction_user)


@pytest.mark.django_db
class TestListClasses:
    def test_returns_non_deleted(self, direction_user):
        from classes import services

        c1 = services.create_classe(name="Classe 1", created_by=direction_user)
        c2 = services.create_classe(name="Classe 2", created_by=direction_user)
        services.delete_classe(pk=c2.pk, requesting_user=direction_user)

        result = list(services.list_classes())
        pks = [c.pk for c in result]
        assert c1.pk in pks
        assert c2.pk not in pks


@pytest.mark.django_db
class TestClasseMembers:
    def test_add_member_success(self, direction_user, student_user, classe):
        from classes import services

        member = services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        assert member.student_id == student_user.pk
        assert member.classe_id == classe.pk

    def test_add_member_duplicate_blocked(self, direction_user, student_user, classe):
        from classes import services

        services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        with pytest.raises(ValidationError) as exc:
            services.add_classe_member(
                classe_id=classe.pk,
                student_id=student_user.pk,
                created_by=direction_user,
            )
        assert "StudentAlreadyInClasse" in str(exc.value.detail)

    def test_add_member_non_student_blocked(self, direction_user, teacher_user, classe):
        from classes import services

        with pytest.raises(ValidationError) as exc:
            services.add_classe_member(
                classe_id=classe.pk,
                student_id=teacher_user.pk,
                created_by=direction_user,
            )
        assert "UserCannotParticipateInCoaching" in str(exc.value.detail)

    def test_add_member_classe_not_found(self, direction_user, student_user):
        from classes import services

        with pytest.raises(NotFound):
            services.add_classe_member(
                classe_id=999999,
                student_id=student_user.pk,
                created_by=direction_user,
            )

    def test_remove_member(self, direction_user, student_user, classe):
        from classes import services
        from classes.models import ClasseMember

        member = services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        services.remove_classe_member(
            classe_id=classe.pk,
            member_pk=member.pk,
            requesting_user=direction_user,
        )
        assert not ClasseMember.objects.filter(pk=member.pk).exists()
        assert ClasseMember.all_objects.filter(pk=member.pk).exists()

    def test_list_members(self, direction_user, student_user, classe):
        from classes import services

        services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        members = list(services.list_classe_members(classe_id=classe.pk))
        assert len(members) == 1
        assert members[0].student_id == student_user.pk


@pytest.mark.django_db
class TestGetStudentIdsForClasse:
    def test_returns_student_pks(self, direction_user, student_user, classe):
        from classes import services

        services.add_classe_member(
            classe_id=classe.pk,
            student_id=student_user.pk,
            created_by=direction_user,
        )
        ids = services.get_student_ids_for_classe(classe_id=classe.pk)
        assert student_user.pk in ids

    def test_empty_classe_returns_empty(self, classe):
        from classes import services

        ids = services.get_student_ids_for_classe(classe_id=classe.pk)
        assert ids == []
