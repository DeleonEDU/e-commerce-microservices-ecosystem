from __future__ import annotations

from pathlib import Path

from repo_governance.layout import rules_files, validate_rules_markers


def test_cursor_rules_files_document_testing_strategy(repo_root: Path) -> None:
    paths = rules_files(repo_root)
    markers = {
        "testing_strategy": (
            "pytest",
            "TDD",
            "respx",
            "Stripe",
            "coverage.xml",
        ),
        "architecture": (
            "bounded",
            "database",
            "REST",
        ),
    }
    errors = validate_rules_markers(paths, markers)
    assert not errors, "\n".join(errors)


def test_code_quality_doc_exists(repo_root: Path) -> None:
    doc = repo_root / "docs" / "code_quality.md"
    assert doc.is_file()
    text = doc.read_text(encoding="utf-8")
    assert "PyTest" in text or "pytest" in text
    assert "SOLID" in text
