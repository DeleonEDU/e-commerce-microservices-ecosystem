from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

import models

class RatingRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_recent_review(self, user_id: int, product_id: int, since: datetime) -> Optional[models.Review]:
        return (
            self.db.query(models.Review)
            .filter(
                models.Review.user_id == user_id,
                models.Review.product_id == product_id,
                models.Review.created_at >= since
            )
            .first()
        )

    def create_review(self, review: models.Review) -> models.Review:
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def get_product_stats(self, product_id: int) -> Tuple[Optional[float], Optional[int]]:
        stats = (
            self.db.query(
                func.avg(models.Review.rating).label("average"),
                func.count(models.Review.id).label("count"),
            )
            .filter(models.Review.product_id == product_id)
            .first()
        )
        return stats.average, stats.count

    def get_product_rating(self, product_id: int) -> Optional[models.ProductRating]:
        return (
            self.db.query(models.ProductRating)
            .filter(models.ProductRating.product_id == product_id)
            .first()
        )

    def create_product_rating(self, product_id: int) -> models.ProductRating:
        rating_cache = models.ProductRating(product_id=product_id)
        self.db.add(rating_cache)
        return rating_cache

    def update_product_rating(self, rating: models.ProductRating):
        self.db.commit()
        self.db.refresh(rating)

    def get_reviews_for_product(self, product_id: int) -> List[models.Review]:
        return self.db.query(models.Review).filter(models.Review.product_id == product_id).all()

    def get_top_products(self, limit: int) -> List[models.ProductRating]:
        return (
            self.db.query(models.ProductRating)
            .order_by(
                models.ProductRating.average_rating.desc(),
                models.ProductRating.review_count.desc(),
            )
            .limit(limit)
            .all()
        )
