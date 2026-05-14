from __future__ import annotations

from pathlib import Path

import pytest

from repo_governance.layout import (
    EXPECTED_SERVICES,
    collect_layout_violations,
    discover_repo_root,
    validate_rules_markers,
)
from repo_governance.stripe_policy import (
    FORBIDDEN_STRIPE_HOST_MARKERS,
    find_stripe_host_violations,
    iter_service_test_python_files,
)


def test_discover_repo_root_raises_when_services_not_in_ancestors(tmp_path: Path) -> None:
    leaf = tmp_path / "deep" / "leaf.py"
    leaf.parent.mkdir(parents=True)
    leaf.write_text("#", encoding="utf-8")
    with pytest.raises(RuntimeError, match="services"):
        discover_repo_root(leaf)


def test_collect_layout_errors_when_services_dir_missing(tmp_path: Path) -> None:
    errors = collect_layout_violations(tmp_path)
    assert errors == [f"Expected directory missing: {tmp_path / 'services'}"]


def test_collect_layout_reports_missing_expected_service(tmp_path: Path) -> None:
    services = tmp_path / "services"
    services.mkdir()
    for name in ("auth_service", "order_service"):
        d = services / name
        d.mkdir()
        (d / "requirements.txt").write_text("x", encoding="utf-8")
        (d / "tests").mkdir()
        (d / "tests" / "test_x.py").write_text("def test_x():\n    pass\n", encoding="utf-8")
    errors = collect_layout_violations(tmp_path)
    assert any("Expected service directory missing" in e for e in errors)


def test_collect_layout_flags_extra_service_directory(tmp_path: Path) -> None:
    services = tmp_path / "services"
    services.mkdir()
    for name in EXPECTED_SERVICES:
        d = services / name
        d.mkdir()
        (d / "requirements.txt").write_text("x", encoding="utf-8")
        (d / "tests").mkdir()
        (d / "tests" / "test_x.py").write_text("def test_x():\n    pass\n", encoding="utf-8")
    (services / "experimental_service").mkdir()
    errors = collect_layout_violations(tmp_path)
    assert any("Unexpected service directory" in e for e in errors)


def test_collect_layout_ignores_dot_prefixed_service_dirs(tmp_path: Path) -> None:
    services = tmp_path / "services"
    services.mkdir()
    for name in EXPECTED_SERVICES:
        d = services / name
        d.mkdir()
        (d / "requirements.txt").write_text("x", encoding="utf-8")
        (d / "tests").mkdir()
        (d / "tests" / "test_x.py").write_text("def test_x():\n    pass\n", encoding="utf-8")
    (services / ".stash").mkdir()
    errors = collect_layout_violations(tmp_path)
    assert not any(".stash" in e for e in errors)


def test_collect_layout_detects_missing_requirements(tmp_path: Path) -> None:
    services = tmp_path / "services"
    services.mkdir()
    for name in EXPECTED_SERVICES:
        d = services / name
        d.mkdir()
        if name != "rating_service":
            (d / "requirements.txt").write_text("x", encoding="utf-8")
        (d / "tests").mkdir()
        (d / "tests" / "test_x.py").write_text("def test_x():\n    pass\n", encoding="utf-8")
    errors = collect_layout_violations(tmp_path)
    assert any("Missing requirements.txt" in e for e in errors)


def test_collect_layout_detects_missing_tests(tmp_path: Path) -> None:
    services = tmp_path / "services"
    services.mkdir()
    for name in EXPECTED_SERVICES:
        d = services / name
        d.mkdir()
        (d / "requirements.txt").write_text("x", encoding="utf-8")
    errors = collect_layout_violations(tmp_path)
    assert any("No pytest/Django tests found" in e for e in errors)


def test_iter_service_test_python_files_returns_empty_for_missing_services_dir(
    tmp_path: Path,
) -> None:
    assert iter_service_test_python_files(tmp_path / "services") == []


@pytest.mark.parametrize("marker", FORBIDDEN_STRIPE_HOST_MARKERS)
def test_find_stripe_host_violations_detects_forbidden_hosts(
    tmp_path: Path, marker: str
) -> None:
    rel = Path("demo") / "case.py"
    hits = find_stripe_host_violations(rel, f"doc {marker} example")
    assert hits and marker in hits[0]


def test_validate_rules_markers_missing_file(tmp_path: Path) -> None:
    ghost = tmp_path / "missing.md"
    errors = validate_rules_markers({"doc": ghost}, {"doc": ("pytest",)})
    assert any("Rules file missing" in e for e in errors)


def test_validate_rules_markers_missing_needle(tmp_path: Path) -> None:
    doc = tmp_path / "rules.md"
    doc.write_text("hello world", encoding="utf-8")
    errors = validate_rules_markers({"doc": doc}, {"doc": ("unique-token-not-present",)})
    assert any("does not contain required marker" in e for e in errors)
