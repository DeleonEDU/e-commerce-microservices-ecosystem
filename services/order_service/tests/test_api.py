import os
os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from main import app, get_db
from models import Base
import schemas
from database import engine

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def cleanup_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "orders"}

def test_get_cart_empty():
    response = client.get("/cart/1")
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["items"] == []

def test_add_item_to_cart():
    # First get/create cart
    client.get("/cart/1")
    
    response = client.post(
        "/cart/1/items",
        json={"product_id": 100, "quantity": 2}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["product_id"] == 100
    assert data["quantity"] == 2

    # Check cart
    response2 = client.get("/cart/1")
    assert len(response2.json()["items"]) == 1

def test_list_user_orders_empty():
    response = client.get("/users/1/orders")
    assert response.status_code == 200
    assert response.json() == []

def test_get_order_not_found():
    response = client.get("/orders/999")
    assert response.status_code == 404
