import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch

from main import app, get_db
from database import Base
import schemas

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ratings"}

@patch("service.requests.get")
def test_create_and_get_review(mock_get):
    # Mock order service to confirm purchase
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {"has_bought": True}

    # 1. Create a review
    review_payload = {
        "user_id": 1,
        "product_id": 100,
        "rating": 5,
        "comment": "Excellent product!"
    }
    response = client.post("/reviews", json=review_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == 1
    assert data["product_id"] == 100
    assert data["rating"] == 5
    assert data["comment"] == "Excellent product!"
    assert "id" in data

    # 2. Get reviews for product
    response = client.get("/products/100/reviews")
    assert response.status_code == 200
    reviews = response.json()
    assert len(reviews) == 1
    assert reviews[0]["user_id"] == 1

    # 3. Get product rating summary
    response = client.get("/products/100/rating")
    assert response.status_code == 200
    rating_summary = response.json()
    assert rating_summary["product_id"] == 100
    assert rating_summary["average_rating"] == 5.0
    assert rating_summary["review_count"] == 1

@patch("service.requests.get")
def test_create_review_not_bought(mock_get):
    # Mock order service to deny purchase
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {"has_bought": False}

    review_payload = {
        "user_id": 2,
        "product_id": 200,
        "rating": 4,
        "comment": "Good!"
    }
    response = client.post("/reviews", json=review_payload)
    assert response.status_code == 403
    assert "Only buyers can leave a review" in response.json()["detail"]

@patch("service.requests.get")
def test_top_products(mock_get):
    # Mock order service to confirm purchase
    mock_response = mock_get.return_value
    mock_response.status_code = 200
    mock_response.json.return_value = {"has_bought": True}

    # Create reviews for multiple products
    client.post("/reviews", json={"user_id": 1, "product_id": 101, "rating": 5})
    client.post("/reviews", json={"user_id": 2, "product_id": 101, "rating": 4}) # Avg: 4.5
    
    # Wait or just mock user_id so it doesn't trigger recent_review (different users)
    client.post("/reviews", json={"user_id": 3, "product_id": 102, "rating": 3}) # Avg: 3.0
    
    client.post("/reviews", json={"user_id": 4, "product_id": 103, "rating": 5})
    client.post("/reviews", json={"user_id": 5, "product_id": 103, "rating": 5}) # Avg: 5.0

    # Get top products
    response = client.get("/rankings/top?limit=2")
    assert response.status_code == 200
    rankings = response.json()
    
    assert len(rankings) == 2
    assert rankings[0]["product_id"] == 103
    assert rankings[0]["score"] == 5.0
    assert rankings[1]["product_id"] == 101
    assert rankings[1]["score"] == 4.5
