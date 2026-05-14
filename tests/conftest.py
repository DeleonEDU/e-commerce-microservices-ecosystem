from __future__ import annotations

from pathlib import Path

import pytest

from repo_governance.layout import discover_repo_root


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return discover_repo_root()
