import pytest
from rest_framework.exceptions import ValidationError

from inventory.services.category_services import create_category


@pytest.mark.django_db
def test_create_category_without_parent():
    category = create_category(
        name="Roupa",
    )

    assert category.id is not None
    assert category.name == "Roupa"
    assert category.parent is None


@pytest.mark.django_db
def test_create_category_with_parent():
    parent = create_category(
        name="Roupa",
    )

    child = create_category(
        name="T-Shirts",
        parent_category_id=parent.id,
    )

    assert child.id is not None
    assert child.parent == parent


@pytest.mark.django_db
def test_duplicate_category_name_same_level():
    create_category(
        name="Roupa",
    )

    with pytest.raises(ValidationError) as exc:
        create_category(
            name="Roupa",
        )

    assert exc.value.detail["messages"] == ["DuplicateCategoryNameInLevel"]


@pytest.mark.django_db
def test_allow_same_name_different_parent():
    parent1 = create_category(name="Homem")
    parent2 = create_category(name="Mulher")

    create_category(
        name="Calçado",
        parent_category_id=parent1.id,
    )

    category = create_category(
        name="Calçado",
        parent_category_id=parent2.id,
    )

    assert category.id is not None
