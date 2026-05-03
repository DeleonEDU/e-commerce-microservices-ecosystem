import json
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db

# Set up SQLite memory DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Import app AFTER setting up the testing DB bindings
import os
os.environ["TESTING"] = "1"
from main import app, STRIPE_WEBHOOK_SECRET

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "payments"}


@patch("service.stripe.PaymentIntent.create")
def test_create_payment_intent(mock_stripe_create):
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_12345"
    mock_stripe_intent.client_secret = "secret_12345"
    mock_stripe_create.return_value = mock_stripe_intent

    response = client.post(
        "/payment-intents",
        json={"order_id": 1, "user_id": 2, "amount": 50.0}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["client_secret"] == "secret_12345"
    assert data["status"] == "pending"
    assert "id" in data


@patch("service.stripe.PaymentIntent.create")
def test_create_subscription_intent(mock_stripe_create):
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_sub_123"
    mock_stripe_intent.client_secret = "secret_sub_123"
    mock_stripe_create.return_value = mock_stripe_intent

    response = client.post(
        "/subscription-intents",
        json={"user_id": 1, "tier": "pro", "amount": 10.0}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["client_secret"] == "secret_sub_123"
    assert data["status"] == "pending"
    assert data["id"] == 0


def test_get_user_payments_empty():
    response = client.get("/users/1/payments")
    assert response.status_code == 200
    assert response.json() == []


@patch("service.stripe.PaymentIntent.create")
def test_get_user_payments(mock_stripe_create):
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_123"
    mock_stripe_intent.client_secret = "sec_123"
    mock_stripe_create.return_value = mock_stripe_intent

    # Create a payment
    client.post("/payment-intents", json={"order_id": 1, "user_id": 10, "amount": 100.0})

    response = client.get("/users/10/payments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["order_id"] == 1
    assert data[0]["user_id"] == 10
    assert data[0]["amount"] == 100.0


@patch("service.requests.post")
def test_upsert_subscription(mock_post):
    response = client.put(
        "/users/5/subscription",
        json={"tier": "vip"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 5
    assert data["tier"] == "vip"

    mock_post.assert_called_once()

    # Now get it
    get_response = client.get("/users/5/subscription")
    assert get_response.status_code == 200
    assert get_response.json()["tier"] == "vip"


@patch("service.publish_message")
@patch("service.stripe.PaymentIntent.create")
@patch("main.stripe.PaymentIntent.retrieve")
def test_confirm_payment(mock_retrieve, mock_create, mock_publish):
    # Setup - create payment first
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_test_confirm"
    mock_stripe_intent.client_secret = "sec_confirm"
    mock_create.return_value = mock_stripe_intent

    create_response = client.post("/payment-intents", json={"order_id": 20, "user_id": 5, "amount": 25.0})
    payment_id = create_response.json()["id"]

    # Mock retrieve
    mock_retrieved_intent = MagicMock()
    mock_retrieved_intent.id = "pi_test_confirm"
    mock_retrieved_intent.status = "succeeded"
    mock_retrieved_intent.metadata = None
    mock_retrieve.return_value = mock_retrieved_intent

    # Confirm
    response = client.post(
        "/payments/confirm",
        json={"payment_intent_id": "pi_test_confirm"}
    )
    
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify state changed in DB
    payment_response = client.get(f"/payments/{payment_id}")
    assert payment_response.status_code == 200
    assert payment_response.json()["status"] == "completed"

    mock_publish.assert_called_once()


@patch("service.publish_message")
@patch("main.stripe.Webhook.construct_event")
@patch("service.stripe.PaymentIntent.create")
def test_stripe_webhook_payment_succeeded(mock_create, mock_construct_event, mock_publish):
    # Setup - create payment first
    mock_stripe_intent = MagicMock()
    mock_stripe_intent.id = "pi_webhook_test"
    mock_stripe_intent.client_secret = "sec_webhook"
    mock_create.return_value = mock_stripe_intent

    create_response = client.post("/payment-intents", json={"order_id": 30, "user_id": 5, "amount": 50.0})
    payment_id = create_response.json()["id"]

    # Create mock intent object for webhook
    mock_event_intent = MagicMock()
    mock_event_intent.id = "pi_webhook_test"
    mock_event_intent.status = "succeeded"
    mock_event_intent.metadata = None

    mock_construct_event.return_value = {
        "type": "payment_intent.succeeded",
        "data": {
            "object": mock_event_intent
        }
    }

    response = client.post(
        "/webhooks/stripe",
        headers={"stripe-signature": "dummy_signature"},
        content=b"{}"
    )

    assert response.status_code == 200
    
    # Verify state changed in DB
    payment_response = client.get(f"/payments/{payment_id}")
    assert payment_response.status_code == 200
    assert payment_response.json()["status"] == "completed"

    mock_publish.assert_called_once()
