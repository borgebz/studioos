import pytest
from rest_framework.exceptions import ValidationError

from inventory.services.size_services import create_size
from inventory.services.size_system_services import create_size_system


@pytest.mark.django_db
def test_create_size():
    size_system = create_size_system(name="EU")

    size = create_size(
        name="M",
        size_system_id=size_system.id,
    )

    assert size.id is not None
    assert size.name == "M"
    assert size.size_system == size_system


@pytest.mark.django_db
def test_duplicate_size_in_same_system():
    size_system = create_size_system(name="EU")

    create_size(
        name="M",
        size_system_id=size_system.id,
    )

    with pytest.raises(ValidationError) as exc:
        create_size(
            name="M",
            size_system_id=size_system.id,
        )

    assert exc.value.detail["messages"] == ["DuplicateSizeInSystem"]


@pytest.mark.django_db
def test_allow_same_size_name_in_different_systems():
    eu = create_size_system(name="EU")
    us = create_size_system(name="US")

    create_size(
        name="M",
        size_system_id=eu.id,
    )

    size = create_size(
        name="M",
        size_system_id=us.id,
    )

    assert size.id is not None
    assert size.size_system == us
