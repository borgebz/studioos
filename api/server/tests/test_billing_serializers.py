"""Tests for `billing.serializers`."""

from __future__ import annotations

import pytest
from rest_framework.serializers import ValidationError


class TestFineCreateSerializer:
    def test_amount_must_be_positive_invalid(self):
        """Amount must be strictly positive."""
        from billing.serializers import FineCreateSerializer

        serializer = FineCreateSerializer()

        with pytest.raises(ValidationError) as exc:
            serializer.validate_amount(-15.00)

        assert "FineAmountMustBePositive" in str(exc.value)

    def test_amount_must_be_positive_valid(self):
        from billing.serializers import FineCreateSerializer

        serializer = FineCreateSerializer()
        result = serializer.validate_amount(25.00)

        assert result == 25.00