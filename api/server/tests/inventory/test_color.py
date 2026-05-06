import pytest
from rest_framework.exceptions import ValidationError

from inventory.services.color_services import create_color


@pytest.mark.django_db
def test_create_color():
    color = create_color(
        name="Preto",
        hex_code="#000000",
    )

    assert color.id is not None
    assert color.name == "Preto"
    assert color.hex_code == "#000000"


@pytest.mark.django_db
def test_duplicate_color_name():
    create_color(
        name="Preto",
        hex_code="#000000",
    )

    with pytest.raises(ValidationError) as exc:
        create_color(
            name="Preto",
            hex_code="#111111",
        )

    assert exc.value.detail["messages"] == ["DuplicateColorName"]


@pytest.mark.django_db
def test_invalid_hex_code():
    with pytest.raises(ValidationError) as exc:
        create_color(
            name="Azul",
            hex_code="blue",
        )

    assert exc.value.detail["messages"] == ["InvalidHexCode"]
