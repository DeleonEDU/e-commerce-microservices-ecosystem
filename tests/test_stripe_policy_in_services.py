from __future__ import annotations

from pathlib import Path

from repo_governance.stripe_policy import find_stripe_host_violations, iter_service_test_python_files


def test_service_test_suites_do_not_reference_live_stripe_hosts(repo_root: Path) -> None:
    """
    Static guardrail from ``.cursorrules`` / ``testing_strategy.md``:
    tests must not embed real Stripe endpoint hosts (use mocks / respx / responses).
    """
    all_violations: list[str] = []
    for path in iter_service_test_python_files(repo_root / "services"):
        text = path.read_text(encoding="utf-8")
        all_violations.extend(find_stripe_host_violations(path.relative_to(repo_root), text))
    assert not all_violations, "Stripe host violations:\n" + "\n".join(all_violations)
