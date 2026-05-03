from typing import List

from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db
from models import Base
from repository import RatingRepository
from service import RatingService

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Rating Service", version="1.0.0")

def get_rating_service(db: Session = Depends(get_db)) -> RatingService:
    repository = RatingRepository(db)
    return RatingService(repository)

@app.get("/health")
def health():
    return {"status": "ok", "service": "ratings"}

@app.post("/reviews", response_model=schemas.ReviewResponse)
def create_review(review_data: schemas.ReviewCreate, service: RatingService = Depends(get_rating_service)):
    return service.create_review(review_data)

@app.get("/products/{product_id}/reviews", response_model=List[schemas.ReviewResponse])
def list_product_reviews(product_id: int, service: RatingService = Depends(get_rating_service)):
    return service.get_reviews_for_product(product_id)

@app.get("/reviews/product/{product_id}", response_model=List[schemas.ReviewResponse], include_in_schema=False)
def list_product_reviews_legacy(product_id: int, service: RatingService = Depends(get_rating_service)):
    return service.get_reviews_for_product(product_id)

@app.get("/products/{product_id}/rating", response_model=schemas.ProductRatingResponse)
def get_product_rating(product_id: int, service: RatingService = Depends(get_rating_service)):
    return service.get_rating_summary(product_id)

@app.get("/ratings/product/{product_id}", response_model=schemas.ProductRatingResponse, include_in_schema=False)
def get_product_rating_legacy(product_id: int, service: RatingService = Depends(get_rating_service)):
    return service.get_rating_summary(product_id)

@app.get("/rankings/top", response_model=List[schemas.RankedProduct])
def get_top_products(limit: int = 10, service: RatingService = Depends(get_rating_service)):
    return service.get_top_products(limit)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
