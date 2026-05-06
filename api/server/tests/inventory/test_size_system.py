import pytest
from rest_framework.exceptions import ValidationError

from inventory.models import SizeSystem
from inventory.services.size_system_services import create_size_system


@pytest.mark.django_db
def test_create_size_system():
    obj = create_size_system(name="EU")

    assert obj.id is not None
    assert obj.name == "EU"


@pytest.mark.django_db
def test_duplicate_size_system_name():
    create_size_system(name="EU")

    with pytest.raises(ValidationError) as exc:
        create_size_system(name="EU")

    assert exc.value.detail["messages"] == ["DuplicateSizeSystemName"]


@pytest.mark.django_db
def test_list_size_system_exists_in_db():
    create_size_system(name="EU")

    assert SizeSystem.objects.filter(name="EU").exists()
