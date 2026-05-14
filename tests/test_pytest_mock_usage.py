from __future__ import annotations

import os

from pytest_mock import MockerFixture


def test_pytest_mock_can_stub_environment(mocker: MockerFixture) -> None:
    """``.cursorrules`` recommends ``pytest-mock`` for stubs."""
    mocker.patch.dict(os.environ, {"ECOSYSTEM_POLICY_CHECK": "ok"})
    assert os.environ["ECOSYSTEM_POLICY_CHECK"] == "ok"


def test_pytest_mock_magic_mock_fixture(mocker: MockerFixture) -> None:
    fake = mocker.MagicMock(spec=int)
    fake.__truediv__.return_value = 2
    assert fake / 1 == 2  # type: ignore[operator]
