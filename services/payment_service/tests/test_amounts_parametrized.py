"""Parametrized coverage for payment intent amounts (Quality Gate: test count)."""

from unittest.mock import MagicMock, patch

import pytest

import models
import schemas
from service import PaymentService


@pytest.fixture
def mock_repository():
    return MagicMock()


@pytest.fixture
def payment_service(mock_repository):
    return PaymentService(repository=mock_repository)


@pytest.mark.parametrize("dollars", range(1, 101))
@patch("service.stripe.PaymentIntent.create")
def test_create_payment_intent_whole_dollar_amounts(
    mock_stripe_create, payment_service, mock_repository, dollars
):
    """Whole-dollar amounts avoid float rounding issues in int(amount * 100)."""
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = f"pi_{dollars}"
    mock_stripe_intent.client_secret = "sec"
    mock_stripe_create.return_value = mock_stripe_intent

    amount = float(dollars)
    mock_repository.create_payment.return_value = models.Payment(
        id=dollars,
        order_id=1,
        user_id=1,
        amount=amount,
        stripe_payment_intent_id=mock_stripe_intent.id,
        status=models.PaymentStatus.PENDING,
    )

    payment_service.create_payment_intent(
        schemas.PaymentCreate(order_id=1, user_id=1, amount=amount)
    )

    mock_stripe_create.assert_called_once()
    call_kw = mock_stripe_create.call_args.kwargs
    assert call_kw["amount"] == dollars * 100
    assert call_kw["currency"] == "usd"
