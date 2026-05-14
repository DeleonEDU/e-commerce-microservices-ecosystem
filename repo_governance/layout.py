from __future__ import annotations

from pathlib import Path
from typing import Final

EXPECTED_SERVICES: Final[tuple[str, ...]] = (
    "auth_service",
    "order_service",
    "payment_service",
    "product_service",
    "rating_service",
)


def discover_repo_root(start: Path | None = None) -> Path:
    """Return repository root (directory that contains ``services/``)."""
    here = start or Path(__file__).resolve()
    for parent in (here, *here.parents):
        if (parent / "services").is_dir():
            return parent
    raise RuntimeError("Could not locate repository root (missing services/ directory)")


def collect_layout_violations(root: Path) -> list[str]:
    """
    Verify microservice layout aligned with ``.cursor/rules/architecture.md``:
    each bounded context lives under ``services/<name>/`` with its own
    ``requirements.txt`` and a ``tests/`` package (or Django ``tests.py`` trees).
    """
    errors: list[str] = []
    services = root / "services"
    if not services.is_dir():
        return [f"Expected directory missing: {services}"]

    found = {p.name for p in services.iterdir() if p.is_dir()}
    missing = set(EXPECTED_SERVICES) - found
    extra = found - set(EXPECTED_SERVICES)
    for name in sorted(missing):
        errors.append(f"Expected service directory missing: services/{name}")
    for name in sorted(extra):
        # Allow helper dirs without failing strict matrix — only flag if looks like service
        if name.startswith("."):
            continue
        errors.append(f"Unexpected service directory (update EXPECTED_SERVICES): services/{name}")

    for name in EXPECTED_SERVICES:
        svc = services / name
        if not svc.is_dir():
            continue
        req = svc / "requirements.txt"
        if not req.is_file():
            errors.append(f"Missing requirements.txt for service: {name}")

        has_tests_dir = (svc / "tests").is_dir() and any((svc / "tests").glob("test_*.py"))
        has_django_tests = any(svc.glob("**/tests.py"))
        if not (has_tests_dir or has_django_tests):
            errors.append(f"No pytest/Django tests found under services/{name}")

    return errors


def rules_files(root: Path) -> dict[str, Path]:
    return {
        "architecture": root / ".cursor" / "rules" / "architecture.md",
        "testing_strategy": root / ".cursor" / "rules" / "testing_strategy.md",
    }


def validate_rules_markers(paths: dict[str, Path], markers: dict[str, tuple[str, ...]]) -> list[str]:
    errors: list[str] = []
    for key, path in paths.items():
        if not path.is_file():
            errors.append(f"Rules file missing: {path}")
            continue
        text = path.read_text(encoding="utf-8")
        for needle in markers.get(key, ()):
            if needle not in text:
                errors.append(f"{path} does not contain required marker: {needle!r}")
    return errors
