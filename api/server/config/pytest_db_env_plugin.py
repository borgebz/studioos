"""Loads before pytest-django touches ``DATABASES`` (``pytest_load_initial_conftests``)."""

from __future__ import annotations

import pytest


@pytest.hookimpl(tryfirst=True)
def pytest_load_initial_conftests(
    early_config: pytest.Config,
    parser: pytest.Parser,
    args: list[str],
) -> None:
    import config.pytest_db_host_env  # noqa: F401 — side effect before Django settings load
