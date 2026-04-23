from typing import List

from fastapi import Depends, FastAPI
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db
from models import Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rating Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ratings"}


import requests

@app.post("/reviews", response_model=schemas.ReviewResponse)
def create_review(review_data: schemas.ReviewCreate, db: Session = Depends(get_db)):
    # Перевіряємо чи користувач купив товар
    try:
        resp = requests.get(
            f"http://orderservice:8002/users/{review_data.user_id}/has_bought/{review_data.product_id}",
            timeout=3
        )
        if resp.status_code != 200 or not resp.json().get("has_bought"):
            raise HTTPException(status_code=403, detail="Only buyers can leave a review for this product.")
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Order service unavailable for verification.")

    new_review = models.Review(**review_data.model_dump())
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    stats = (
        db.query(
            func.avg(models.Review.rating).label("average"),
            func.count(models.Review.id).label("count"),
        )
        .filter(models.Review.product_id == review_data.product_id)
        .first()
    )

    rating_cache = (
        db.query(models.ProductRating)
        .filter(models.ProductRating.product_id == review_data.product_id)
        .first()
    )
    if not rating_cache:
        rating_cache = models.ProductRating(product_id=review_data.product_id)
        db.add(rating_cache)

    rating_cache.average_rating = float(stats.average) if stats.average else 0.0
    rating_cache.review_count = int(stats.count or 0)
    db.commit()

    return new_review


def _reviews_for_product(product_id: int, db: Session) -> List[models.Review]:
    return db.query(models.Review).filter(models.Review.product_id == product_id).all()


@app.get("/products/{product_id}/reviews", response_model=List[schemas.ReviewResponse])
def list_product_reviews(product_id: int, db: Session = Depends(get_db)):
    return _reviews_for_product(product_id, db)


@app.get("/reviews/product/{product_id}", response_model=List[schemas.ReviewResponse], include_in_schema=False)
def list_product_reviews_legacy(product_id: int, db: Session = Depends(get_db)):
    return _reviews_for_product(product_id, db)


def _rating_summary(product_id: int, db: Session) -> schemas.ProductRatingResponse:
    rating = (
        db.query(models.ProductRating)
        .filter(models.ProductRating.product_id == product_id)
        .first()
    )
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


@app.get("/products/{product_id}/rating", response_model=schemas.ProductRatingResponse)
def get_product_rating(product_id: int, db: Session = Depends(get_db)):
    return _rating_summary(product_id, db)


@app.get("/ratings/product/{product_id}", response_model=schemas.ProductRatingResponse, include_in_schema=False)
def get_product_rating_legacy(product_id: int, db: Session = Depends(get_db)):
    return _rating_summary(product_id, db)


@app.get("/rankings/top", response_model=List[schemas.RankedProduct])
def get_top_products(limit: int = 10, db: Session = Depends(get_db)):
    top_products = (
        db.query(models.ProductRating)
        .order_by(
            models.ProductRating.average_rating.desc(),
            models.ProductRating.review_count.desc(),
        )
        .limit(limit)
        .all()
    )
    return [{"product_id": p.product_id, "score": p.average_rating} for p in top_products]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8005)
