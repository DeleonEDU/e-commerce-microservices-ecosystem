from typing import List
from datetime import datetime, timedelta
import requests
from fastapi import HTTPException

import models
import schemas
from repository import RatingRepository

class RatingService:
    def __init__(self, repository: RatingRepository):
        self.repository = repository

    def create_review(self, review_data: schemas.ReviewCreate) -> models.Review:
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        recent_review = self.repository.get_recent_review(review_data.user_id, review_data.product_id, one_week_ago)
        if recent_review:
            raise HTTPException(
                status_code=429, 
                detail="You have already left a review for this product within the last 7 days."
            )

        try:
            resp = requests.get(
                f"http://order_service:8002/users/{review_data.user_id}/has_bought/{review_data.product_id}",
                timeout=3
            )
            if resp.status_code != 200 or not resp.json().get("has_bought"):
                raise HTTPException(status_code=403, detail="Only buyers can leave a review for this product.")
        except requests.RequestException:
            raise HTTPException(status_code=503, detail="Order service unavailable for verification.")

        new_review = models.Review(**review_data.model_dump())
        created_review = self.repository.create_review(new_review)

        average, count = self.repository.get_product_stats(review_data.product_id)

        rating_cache = self.repository.get_product_rating(review_data.product_id)
        if not rating_cache:
            rating_cache = self.repository.create_product_rating(review_data.product_id)

        rating_cache.average_rating = float(average) if average else 0.0
        rating_cache.review_count = int(count or 0)
        self.repository.update_product_rating(rating_cache)

        return created_review

    def get_reviews_for_product(self, product_id: int) -> List[models.Review]:
        return self.repository.get_reviews_for_product(product_id)

    def get_rating_summary(self, product_id: int) -> schemas.ProductRatingResponse:
        rating = self.repository.get_product_rating(product_id)
        if not rating:
            return schemas.ProductRatingResponse(
                product_id=product_id,
                average_rating=0.0,
                review_count=0,
            )
        return schemas.ProductRatingResponse(
            product_id=rating.product_id,
            average_rating=rating.average_rating,
            review_count=rating.review_count,
        )

    def get_top_products(self, limit: int) -> List[dict]:
        top_products = self.repository.get_top_products(limit)
        return [{"product_id": p.product_id, "score": p.average_rating} for p in top_products]
