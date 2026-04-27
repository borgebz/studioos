"""Tests for billing entry description builder."""

from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import MagicMock

from billing.services import (
    _abbreviate_teacher,
    _coaching_format_label,
    build_coaching_description,
    build_fine_description,
)
from billing.models import FineReason


class FakeUser:
    def __init__(self, first, last):
        self.first_name = first
        self.last_name = last


def _make_coaching_mock(
    *,
    modality_name="Ballet Clássico",
    start_dt=None,
    teacher_first="Maria",
    teacher_last="Santos",
):
    if start_dt is None:
        start_dt = datetime(2026, 4, 15, 18, 0, tzinfo=dt_timezone.utc)
    coaching = MagicMock()
    coaching.modality_id = 1
    coaching.modality.name = modality_name
    coaching.start_datetime = start_dt
    coaching.teacher = FakeUser(teacher_first, teacher_last)
    return coaching


class TestAbbreviateTeacher:
    def test_simple_first_last(self):
        assert _abbreviate_teacher(FakeUser("Maria", "Santos")) == "Prof. Maria Santos"

    def test_compound_last_takes_last_token(self):
        assert (
            _abbreviate_teacher(FakeUser("Maria Madalena", "Pereira da Silva"))
            == "Prof. Maria Silva"
        )

    def test_only_first_name(self):
        assert _abbreviate_teacher(FakeUser("Ana", "")) == "Prof. Ana"

    def test_none_user(self):
        assert _abbreviate_teacher(None) == "Prof."


class TestCoachingFormatLabel:
    def test_one(self):
        assert _coaching_format_label(1) == "Privada"

    def test_two(self):
        assert _coaching_format_label(2) == "Dueto"

    def test_three(self):
        assert _coaching_format_label(3) == "Trio"

    def test_four_and_above(self):
        assert _coaching_format_label(4) == "Ensemble"
        assert _coaching_format_label(8) == "Ensemble"


class TestBuildCoachingDescription:
    def test_solo(self):
        coaching = _make_coaching_mock()
        desc = build_coaching_description(
            coaching=coaching, position_one_indexed=1, total_attended=1
        )
        # Format with separator
        assert "Ballet Clássico" in desc
        assert "Prof. Maria Santos" in desc
        assert "Privada (1 de 1)" in desc

    def test_dueto_position_2(self):
        coaching = _make_coaching_mock(
            modality_name="Hip-Hop",
            teacher_first="João",
            teacher_last="Costa",
        )
        desc = build_coaching_description(
            coaching=coaching, position_one_indexed=2, total_attended=2
        )
        assert "Hip-Hop" in desc
        assert "Prof. João Costa" in desc
        assert "Dueto (2 de 2)" in desc

    def test_trio(self):
        coaching = _make_coaching_mock(modality_name="Dança Contemporânea")
        desc = build_coaching_description(
            coaching=coaching, position_one_indexed=1, total_attended=3
        )
        assert "Trio (1 de 3)" in desc

    def test_ensemble(self):
        coaching = _make_coaching_mock(modality_name="Jazz")
        desc = build_coaching_description(
            coaching=coaching, position_one_indexed=4, total_attended=6
        )
        assert "Ensemble (4 de 6)" in desc

    def test_truncated_to_255(self):
        coaching = _make_coaching_mock(modality_name="X" * 500)
        desc = build_coaching_description(
            coaching=coaching, position_one_indexed=1, total_attended=1
        )
        assert len(desc) <= 255


class TestBuildFineDescription:
    def test_absence(self):
        fine = MagicMock()
        fine.reason = FineReason.ABSENCE
        fine.coaching_class_id = 1
        fine.coaching_class.modality_id = 1
        fine.coaching_class.modality.name = "Ballet Clássico"
        fine.coaching_class.start_datetime = datetime(
            2026, 4, 15, 18, 0, tzinfo=dt_timezone.utc
        )
        desc = build_fine_description(fine=fine)
        assert desc.startswith("Multa: Ausência")
        assert "Ballet Clássico" in desc

    def test_late_cancellation(self):
        fine = MagicMock()
        fine.reason = FineReason.LATE_CANCELLATION
        fine.coaching_class_id = 1
        fine.coaching_class.modality_id = 1
        fine.coaching_class.modality.name = "Hip-Hop"
        fine.coaching_class.start_datetime = datetime(
            2026, 4, 22, 19, 30, tzinfo=dt_timezone.utc
        )
        desc = build_fine_description(fine=fine)
        assert desc.startswith("Multa: Cancelamento tardio")
        assert "Hip-Hop" in desc


def test_decimal_round_down_does_not_affect_descriptions():
    """Sanity: descriptions ignore amounts, so amounts are not part of the string."""
    coaching = _make_coaching_mock()
    desc = build_coaching_description(
        coaching=coaching, position_one_indexed=1, total_attended=1
    )
    assert str(Decimal("3.34")) not in desc
