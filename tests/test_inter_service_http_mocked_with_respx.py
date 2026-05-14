from __future__ import annotations

import httpx
import pytest
import respx


@pytest.mark.respx(assert_all_mocked=True)
def test_product_inventory_fetch_is_mocked_no_real_network(respx_mock: respx.MockRouter) -> None:
    """
    ``testing_strategy.md``: inter-service HTTP must be intercepted (here: ``respx`` + ``httpx``).
    """
    respx_mock.get("http://product_service:8000/internal/products/42").mock(
        return_value=httpx.Response(200, json={"id": 42, "stock": 3})
    )
    with httpx.Client() as client:
        response = client.get("http://product_service:8000/internal/products/42", timeout=5.0)
    assert response.status_code == 200
    assert response.json() == {"id": 42, "stock": 3}
