from unittest.mock import MagicMock, patch

import pytest
import stripe
from fastapi import HTTPException

import models
import schemas
from service import PaymentService


@pytest.fixture
def mock_repository():
    return MagicMock()


@pytest.fixture
def payment_service(mock_repository):
    return PaymentService(repository=mock_repository)


@patch("service.stripe.PaymentIntent.create")
def test_create_payment_intent_success(mock_stripe_create, payment_service, mock_repository):
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_123"
    mock_stripe_intent.client_secret = "secret_123"
    mock_stripe_create.return_value = mock_stripe_intent

    mock_payment = models.Payment(
        id=1,
        order_id=10,
        user_id=5,
        amount=100.50,
        stripe_payment_intent_id="pi_123",
        status=models.PaymentStatus.PENDING,
    )
    mock_repository.create_payment.return_value = mock_payment

    payment_data = schemas.PaymentCreate(order_id=10, user_id=5, amount=100.50)
    response = payment_service.create_payment_intent(payment_data)

    mock_stripe_create.assert_called_once_with(
        amount=10050,
        currency="usd",
        metadata={
            "order_id": "10",
            "user_id": "5",
        },
    )
    mock_repository.create_payment.assert_called_once()
    assert response.id == 1
    assert response.client_secret == "secret_123"
    assert response.status == "pending"


@patch("service.stripe.PaymentIntent.create")
def test_create_payment_intent_failure(mock_stripe_create, payment_service):
    mock_stripe_create.side_effect = Exception("Stripe error")

    payment_data = schemas.PaymentCreate(order_id=10, user_id=5, amount=100.50)

    with pytest.raises(HTTPException) as exc_info:
        payment_service.create_payment_intent(payment_data)

    assert exc_info.value.status_code == 400
    assert "Stripe error" in exc_info.value.detail


@patch("service.stripe.PaymentIntent.create")
def test_create_subscription_intent_success(mock_stripe_create, payment_service):
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_sub_123"
    mock_stripe_intent.client_secret = "secret_sub_123"
    mock_stripe_create.return_value = mock_stripe_intent

    sub_data = schemas.SubscriptionIntentCreate(user_id=5, tier=models.SubscriptionTier.PRO, amount=15.0)
    response = payment_service.create_subscription_intent(sub_data)

    mock_stripe_create.assert_called_once_with(
        amount=1500,
        currency="usd",
        metadata={
            "type": "subscription",
            "user_id": "5",
            "tier": "pro",
        },
    )
    assert response.id == 0
    assert response.client_secret == "secret_sub_123"
    assert response.status == "pending"


@patch("service.requests.post")
def test_set_subscription_tier_create(mock_post, payment_service, mock_repository):
    mock_repository.get_subscription_by_user.return_value = None

    mock_sub = models.Subscription(id=1, user_id=5, tier=models.SubscriptionTier.PRO)
    mock_repository.create_subscription.return_value = mock_sub

    response = payment_service.set_subscription_tier(5, models.SubscriptionTier.PRO)

    mock_repository.create_subscription.assert_called_once()
    mock_post.assert_called_once_with(
        "http://productservice:8003/products/update-seller-premium/",
        json={"seller_id": 5, "is_premium": True},
        timeout=5,
    )
    assert response == mock_sub


@patch("service.requests.post")
def test_set_subscription_tier_update(mock_post, payment_service, mock_repository):
    existing_sub = models.Subscription(id=1, user_id=5, tier=models.SubscriptionTier.FREE)
    mock_repository.get_subscription_by_user.return_value = existing_sub

    response = payment_service.set_subscription_tier(5, models.SubscriptionTier.VIP)

    mock_repository.update_subscription.assert_called_once_with(existing_sub)
    assert existing_sub.tier == models.SubscriptionTier.VIP

    mock_post.assert_called_once_with(
        "http://productservice:8003/products/update-seller-premium/",
        json={"seller_id": 5, "is_premium": True},
        timeout=5,
    )
    assert response == existing_sub


@patch("service.publish_message")
def test_confirm_payment_order_success(mock_publish, payment_service, mock_repository):
    mock_intent = MagicMock()
    mock_intent.status = "succeeded"
    mock_intent.id = "pi_123"
    mock_intent.metadata = None

    mock_payment = models.Payment(
        id=1,
        order_id=10,
        user_id=5,
        stripe_payment_intent_id="pi_123",
        status=models.PaymentStatus.PENDING,
    )
    mock_repository.get_payment_by_stripe_id.return_value = mock_payment

    payment_service.confirm_payment(mock_intent)

    assert mock_payment.status == models.PaymentStatus.COMPLETED
    mock_repository.update_payment.assert_called_once_with(mock_payment)
    mock_publish.assert_called_once_with("order_payments", {"order_id": 10, "status": "paid"})


@patch("service.PaymentService.set_subscription_tier")
def test_confirm_payment_subscription_success(mock_set_tier, payment_service):
    mock_intent = MagicMock()
    mock_intent.status = "succeeded"
    mock_intent.id = "pi_sub_123"
    mock_intent.metadata = {"type": "subscription", "user_id": "5", "tier": "pro"}

    payment_service.confirm_payment(mock_intent)

    mock_set_tier.assert_called_once_with(5, models.SubscriptionTier.PRO)


def test_confirm_payment_failed(payment_service, mock_repository):
    mock_intent = MagicMock()
    mock_intent.status = "failed"
    mock_intent.id = "pi_123"

    mock_payment = models.Payment(
        id=1,
        order_id=10,
        user_id=5,
        stripe_payment_intent_id="pi_123",
        status=models.PaymentStatus.PENDING,
    )
    mock_repository.get_payment_by_stripe_id.return_value = mock_payment

    payment_service.confirm_payment(mock_intent)

    assert mock_payment.status == models.PaymentStatus.FAILED
    mock_repository.update_payment.assert_called_once_with(mock_payment)
