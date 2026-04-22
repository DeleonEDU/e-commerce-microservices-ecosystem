from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from database import Base
import datetime

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    product_id = Column(Integer, index=True)
    rating = Column(Integer)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ProductRating(Base):
    """
    Кеш для середнього рейтингу, щоб не рахувати його щоразу при запиті каталогу.
    """
    __tablename__ = "product_ratings"

    product_id = Column(Integer, primary_key=True, index=True)
    average_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    last_updated = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
    )
