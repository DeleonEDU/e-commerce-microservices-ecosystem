import os
import json
from unittest.mock import patch, MagicMock

os.environ["TESTING"] = "true"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app, get_db
from models import Base
from worker import process_payment_message

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_e2e.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()

@patch("service.distributed_lock")
@patch("service.requests.post")
def test_full_e2e_flow(mock_post, mock_lock):
    # Setup mocks for Redis lock and External Service calls
    mock_lock_context = MagicMock()
    mock_lock_context.__enter__.return_value = True
    mock_lock.return_value = mock_lock_context

    def mock_post_side_effect(url, **kwargs):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        if "bulk" in url:
            mock_resp.json.return_value = [
                {"id": 100, "price": 50.0, "seller_id": 10}
            ]
        elif "decrement_stock" in url:
            mock_resp.json.return_value = {"status": "ok"}
        return mock_resp
        
    mock_post.side_effect = mock_post_side_effect

    user_id = 1
    
    # 1. Get empty cart
    resp = client.get(f"/cart/{user_id}")
    assert resp.status_code == 200
    
    # 2. Add item to cart
    resp = client.post(
        f"/cart/{user_id}/items", 
        json={"product_id": 100, "quantity": 2}
    )
    assert resp.status_code == 200
    
    # 3. Create order from cart
    order_data = {
        "user_id": user_id,
        "full_name": "Test User",
        "address": "123 Test St",
        "city": "Test City",
        "zip_code": "12345",
        "payment_method": "card"
    }
    resp = client.post("/orders", json=order_data)
    assert resp.status_code == 200
    order = resp.json()
    order_id = order["id"]
    
    assert order["status"] == "PENDING"
    assert order["total_price"] == 100.0  # 2 quantity * 50.0 price
    
    # 4. Mock RabbitMQ payment processing worker
    body = json.dumps({"order_id": order_id, "status": "paid"}).encode("utf-8")
    
    with patch("worker.database.SessionLocal", return_value=TestingSessionLocal()):
        mock_ch = MagicMock()
        mock_method = MagicMock()
        process_payment_message(mock_ch, mock_method, None, body)
    
    # Verify order is PAID
    resp = client.get(f"/orders/{order_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "PAID"
    
    # 5. Fulfill order (Approve and Deliver items)
    item_id = order["items"][0]["id"]
    seller_id = 10
    
    # Seller approves the item
    resp = client.post(f"/sellers/{seller_id}/items/{item_id}/approve")
    assert resp.status_code == 200
    
    # Verify order is SHIPPED (since all items are approved)
    resp = client.get(f"/orders/{order_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "SHIPPED"
    
    # Seller delivers the item
    resp = client.post(f"/sellers/{seller_id}/items/{item_id}/deliver")
    assert resp.status_code == 200
    
    # Verify order is DELIVERED (since all items are delivered)
    resp = client.get(f"/orders/{order_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "DELIVERED"
    
    # 6. Check Seller Analytics
    resp = client.get(f"/sellers/{seller_id}/analytics")
    assert resp.status_code == 200
    analytics = resp.json()
    assert analytics["total_revenue"] == 100.0
    assert analytics["total_sales"] == 2
