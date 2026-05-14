from __future__ import annotations

from pathlib import Path
from typing import Final

# Per ``.cursor/rules/testing_strategy.md`` and ``.cursorrules``: no live Stripe hosts in tests.
FORBIDDEN_STRIPE_HOST_MARKERS: Final[tuple[str, ...]] = (
    "api.stripe.com",
    "connect.stripe.com",
    "files.stripe.com",
    "hooks.stripe.com",
)


def iter_service_test_python_files(services_dir: Path) -> list[Path]:
    """Collect Python files that belong to service test suites."""
    files: list[Path] = []
    if not services_dir.is_dir():
        return files
    for svc in sorted(p for p in services_dir.iterdir() if p.is_dir()):
        tests_dir = svc / "tests"
        if tests_dir.is_dir():
            files.extend(p for p in tests_dir.rglob("*.py") if p.name != "__init__.py")
        for tests_py in svc.rglob("tests.py"):
            if tests_py.is_file():
                files.append(tests_py)
    return files


def find_stripe_host_violations(path: Path, content: str) -> list[str]:
    violations: list[str] = []
    lowered = content.lower()
    for marker in FORBIDDEN_STRIPE_HOST_MARKERS:
        if marker in lowered:
            violations.append(f"{path}: contains forbidden live Stripe host marker {marker!r}")
    return violations
