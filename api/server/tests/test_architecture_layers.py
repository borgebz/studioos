"""Static checks that enforce View → Serializer → Service → Model layering."""

from __future__ import annotations

import ast
from pathlib import Path

import pytest

SERVER_ROOT = Path(__file__).resolve().parent.parent


def _iter_py_files(relative_dir: str) -> list[Path]:
    d = SERVER_ROOT / relative_dir
    if not d.is_dir():
        return []
    return sorted(p for p in d.glob("*.py") if p.name != "__init__.py")


def _module_basename_from_import(module: str | None) -> str:
    if not module:
        return ""
    return module.split(".")[-1]


def _collect_imports(tree: ast.AST) -> set[tuple[str, str | None]]:
    """(kind, target) where kind is 'from' or 'import'."""
    out: set[tuple[str, str | None]] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            mod = node.module or ""
            for alias in node.names:
                out.add(("from", f"{mod}:{alias.name}"))
        elif isinstance(node, ast.Import):
            for alias in node.names:
                out.add(("import", alias.name))
    return out


def _uses_objects_accessor(tree: ast.AST) -> list[int]:
    lines: list[int] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and node.attr == "objects":
            lines.append(node.lineno)
    return lines


@pytest.mark.parametrize(
    "app",
    ["accounts", "enrollments", "core"],
)
def test_services_do_not_import_views_or_serializers(app):
    path = SERVER_ROOT / app / "services.py"
    if not path.exists():
        return
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom):
            continue
        mod = node.module or ""
        if mod.endswith(".views") or ".views." in mod or mod.endswith("views"):
            pytest.fail(f"{path.relative_to(SERVER_ROOT)} imports views: {mod}")
        if (
            mod.endswith(".serializers")
            or ".serializers." in mod
            or mod.endswith("serializers")
        ):
            pytest.fail(f"{path.relative_to(SERVER_ROOT)} imports serializers: {mod}")
        base = _module_basename_from_import(mod)
        if base == "views" or base == "serializers":
            pytest.fail(
                f"{path.relative_to(SERVER_ROOT)} imports layer {base} via {mod}"
            )


@pytest.mark.parametrize(
    "app",
    ["accounts", "enrollments", "core", "studios"],
)
def test_models_do_not_import_higher_layers(app):
    for path in _iter_py_files(app):
        if path.name != "models.py":
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if not isinstance(node, ast.ImportFrom):
                continue
            mod = node.module or ""
            for fragment in ("services", "views", "serializers"):
                if fragment in mod.split("."):
                    pytest.fail(
                        f"{path.relative_to(SERVER_ROOT)} must not import {fragment} ({mod})"
                    )


@pytest.mark.parametrize(
    "app",
    ["accounts", "enrollments"],
)
def test_serializers_do_not_import_services(app):
    path = SERVER_ROOT / app / "serializers.py"
    if not path.exists():
        return
    tree = ast.parse(path.read_text(encoding="utf-8"))
    imports = _collect_imports(tree)
    joined = " ".join(f"{k} {v}" for k, v in imports)
    if "services" in joined:
        pytest.fail(
            f"{path.relative_to(SERVER_ROOT)} imports services; serializers should only validate."
        )


@pytest.mark.parametrize(
    "relative_path",
    [
        "accounts/views.py",
        "enrollments/views.py",
        "core/views.py",
        "studios/views.py",
    ],
)
def test_views_do_not_query_orm_via_objects_manager(relative_path):
    path = SERVER_ROOT / relative_path
    if not path.exists() or path.stat().st_size == 0:
        return
    tree = ast.parse(path.read_text(encoding="utf-8"))
    hits = _uses_objects_accessor(tree)
    if hits:
        pytest.fail(
            f"{relative_path} uses `.objects` at lines {hits}; delegate to services instead."
        )
