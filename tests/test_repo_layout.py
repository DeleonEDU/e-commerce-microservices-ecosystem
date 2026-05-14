from __future__ import annotations

from pathlib import Path

from repo_governance.layout import collect_layout_violations, discover_repo_root


def test_discover_repo_root_points_at_services(repo_root: Path) -> None:
    assert (repo_root / "services").is_dir()
    assert (repo_root / "docker-compose.yml").is_file()


def test_microservice_layout_matches_architecture_rules(repo_root: Path) -> None:
    violations = collect_layout_violations(repo_root)
    assert not violations, "Layout violations:\n" + "\n".join(violations)
