import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from fastapi import HTTPException

import schemas
import models
from service import RatingService
from repository import RatingRepository

@pytest.fixture
def mock_repository():
    return MagicMock(spec=RatingRepository)

@pytest.fixture
def rating_service(mock_repository):
    return RatingService(repository=mock_repository)

def test_create_review_already_reviewed_recently(rating_service, mock_repository):
    # Setup
    review_data = schemas.ReviewCreate(user_id=1, product_id=2, rating=5, comment="Great!")
    mock_repository.get_recent_review.return_value = models.Review(id=1, user_id=1, product_id=2, rating=4)

    # Execute and Assert
    with pytest.raises(HTTPException) as excinfo:
        rating_service.create_review(review_data)
    
    assert excinfo.value.status_code == 429
    assert "already left a review" in excinfo.value.detail

@patch("service.requests.get")
def test_create_review_order_service_unavailable(mock_get, rating_service, mock_repository):
    # Setup
    review_data = schemas.ReviewCreate(user_id=1, product_id=2, rating=5, comment="Great!")
    mock_repository.get_recent_review.return_value = None
    
    import requests
    mock_get.side_effect = requests.RequestException()

    # Execute and Assert
    with pytest.raises(HTTPException) as excinfo:
        rating_service.create_review(review_data)
    
    assert excinfo.value.status_code == 503
    assert "Order service unavailable" in excinfo.value.detail

@patch("service.requests.get")
def test_create_review_not_a_buyer(mock_get, rating_service, mock_repository):
    # Setup
    review_data = schemas.ReviewCreate(user_id=1, product_id=2, rating=5, comment="Great!")
    mock_repository.get_recent_review.return_value = None
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"has_bought": False}
    mock_get.return_value = mock_response

    # Execute and Assert
    with pytest.raises(HTTPException) as excinfo:
        rating_service.create_review(review_data)
    
    assert excinfo.value.status_code == 403
    assert "Only buyers can leave a review" in excinfo.value.detail

@patch("service.requests.get")
def test_create_review_success(mock_get, rating_service, mock_repository):
    # Setup
    review_data = schemas.ReviewCreate(user_id=1, product_id=2, rating=5, comment="Great!")
    mock_repository.get_recent_review.return_value = None
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"has_bought": True}
    mock_get.return_value = mock_response

    created_review = models.Review(id=1, **review_data.model_dump(), created_at=datetime.utcnow())
    mock_repository.create_review.return_value = created_review
    mock_repository.get_product_stats.return_value = (5.0, 1)
    
    rating_cache = models.ProductRating(product_id=2, average_rating=0.0, review_count=0)
    mock_repository.get_product_rating.return_value = rating_cache

    # Execute
    result = rating_service.create_review(review_data)

    # Assert
    assert result.id == 1
    assert result.rating == 5
    mock_repository.update_product_rating.assert_called_once()
    updated_cache = mock_repository.update_product_rating.call_args[0][0]
    assert updated_cache.average_rating == 5.0
    assert updated_cache.review_count == 1

def test_get_rating_summary_no_ratings(rating_service, mock_repository):
    # Setup
    mock_repository.get_product_rating.return_value = None

    # Execute
    result = rating_service.get_rating_summary(product_id=999)

    # Assert
    assert result.product_id == 999
    assert result.average_rating == 0.0
    assert result.review_count == 0

def test_get_rating_summary_with_ratings(rating_service, mock_repository):
    # Setup
    mock_repository.get_product_rating.return_value = models.ProductRating(
        product_id=1, average_rating=4.5, review_count=10
    )

    # Execute
    result = rating_service.get_rating_summary(product_id=1)

    # Assert
    assert result.product_id == 1
    assert result.average_rating == 4.5
    assert result.review_count == 10

def test_get_top_products(rating_service, mock_repository):
    # Setup
    mock_repository.get_top_products.return_value = [
        models.ProductRating(product_id=1, average_rating=4.8, review_count=100),
        models.ProductRating(product_id=2, average_rating=4.5, review_count=50)
    ]

    # Execute
    result = rating_service.get_top_products(limit=2)

    # Assert
    assert len(result) == 2
    assert result[0]["product_id"] == 1
    assert result[0]["score"] == 4.8
    assert result[1]["product_id"] == 2
    assert result[1]["score"] == 4.5
