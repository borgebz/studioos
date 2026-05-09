from __future__ import annotations

import config.pytest_db_host_env  # noqa: F401 — inner conftest loads before parent; plugin also patches early

import pytest

from tests.conftest import make_user_with_role


@pytest.fixture
def inventory_permission():
    def _get(codename, *, model="product"):
        from django.contrib.auth.models import Permission

        return Permission.objects.get(
            codename=codename,
            content_type__app_label="inventory",
            content_type__model=model,
        )

    return _get
