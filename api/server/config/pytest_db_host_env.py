"""Patch ``os.environ`` for Postgres when pytest runs on the host (not inside Compose).

Loaded by ``config.pytest_db_env_plugin`` before pytest-django reads ``DATABASES``. Conftest
modules may import this module for safety when the plugin is disabled.
"""

from __future__ import annotations

import os
import socket
from pathlib import Path


def _dotenv_keys(path: Path, keys: frozenset[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, raw = line.partition("=")
        key = key.strip()
        if key not in keys:
            continue
        val = raw.strip().strip('"').strip("'")
        out[key] = val
    return out


def ensure_local_postgres_host_for_pytest() -> None:
    """If ``DB_HOST`` is the Compose service ``db`` and it does not resolve, use localhost.

    Published port from ``docker-compose.yml``: host 5433 -> container 5432.
    """
    keys = frozenset({"DB_HOST", "DB_PORT"})
    env_file = Path(__file__).resolve().parent.parent / ".env"
    file_vals = _dotenv_keys(env_file, keys)
    host = os.environ.get("DB_HOST") or file_vals.get("DB_HOST", "")
    if host != "db":
        return
    try:
        socket.gethostbyname("db")
    except OSError:
        os.environ["DB_HOST"] = "127.0.0.1"
        port = os.environ.get("DB_PORT") or file_vals.get("DB_PORT", "")
        if port in ("", "5432"):
            os.environ["DB_PORT"] = "5433"


ensure_local_postgres_host_for_pytest()
