"""Pure unit tests for billing amount split (no database)."""

from decimal import Decimal

import pytest

from billing.services import _split_total_amount


@pytest.mark.parametrize(
    "total,n,expected",
    [
        (Decimal("30.00"), 1, [Decimal("30.00")]),
        (Decimal("30.00"), 2, [Decimal("15.00"), Decimal("15.00")]),
        (Decimal("10.00"), 3, [Decimal("3.34"), Decimal("3.33"), Decimal("3.33")]),
        (Decimal("10.01"), 3, [Decimal("3.35"), Decimal("3.33"), Decimal("3.33")]),
        (Decimal("0.01"), 3, [Decimal("0.01"), Decimal("0.00"), Decimal("0.00")]),
    ],
)
def test_split_table_cases(total, n, expected):
    out = _split_total_amount(total=total, n=n)
    assert out == expected
    assert sum(out) == total


def test_split_n_zero():
    assert _split_total_amount(total=Decimal("10.00"), n=0) == []


def test_split_invariant_random_grid():
    for t in range(0, 50):
        for n in range(1, 12):
            total = Decimal("0.01") * t
            parts = _split_total_amount(total=total, n=n)
            assert sum(parts) == total


def test_split_example_seven_way():
    parts = _split_total_amount(total=Decimal("100.00"), n=7)
    assert sum(parts) == Decimal("100.00")
