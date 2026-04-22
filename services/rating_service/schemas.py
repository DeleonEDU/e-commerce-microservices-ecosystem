from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ReviewCreate(BaseModel):
    user_id: int
    product_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    user_id: int
    product_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ProductRatingResponse(BaseModel):
    product_id: int
    average_rating: float
    review_count: int

    model_config = {"from_attributes": True}

class RankedProduct(BaseModel):
    product_id: int
    score: float
