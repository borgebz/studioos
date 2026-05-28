from datetime import date

import pytest
from django.core.exceptions import ValidationError

from enrollments.models import EnrollmentPeriod, PeriodType


@pytest.mark.django_db
def test_period_start_after_end_invalid():
    p = EnrollmentPeriod(
        academic_year="2026/2027",
        period_type=PeriodType.BOTH,
        start_date=date(2026, 6, 1),
        end_date=date(2026, 1, 1),
    )
    with pytest.raises(ValidationError) as exc:
        p.full_clean()
    assert "PeriodEndBeforeStart" in str(exc.value)
