import os
import sys
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

sys.path.append('/app')
from database import DATABASE_URL
from models import Review, ProductRating

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# Generate reviews for products 1 to 15
users = [
    {"id": 2, "name": "Олександр"},
    {"id": 3, "name": "Марія"},
    {"id": 4, "name": "Іван"},
    {"id": 5, "name": "Анна"},
    {"id": 6, "name": "Дмитро"},
]

comments = [
    "Дуже задоволений покупкою! Рекомендую.",
    "Якість на висоті, швидка доставка.",
    "Товар відповідає опису, все супер.",
    "Трохи затримали доставку, але товар хороший.",
    "Чудовий сервіс, буду замовляти ще.",
    "Непогано, але очікував більшого.",
    "Все працює як треба, дякую!",
    "Найкраща ціна на ринку.",
    "Дружині дуже сподобалось.",
    "Рекомендую цього продавця."
]

for product_id in range(1, 16):
    num_reviews = random.randint(2, 6)
    
    total_rating = 0
    for _ in range(num_reviews):
        user = random.choice(users)
        rating = random.choice([4, 5, 5, 5, 3])
        total_rating += rating
        
        review = Review(
            user_id=user["id"],
            user_name=user["name"],
            product_id=product_id,
            rating=rating,
            comment=random.choice(comments),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
        )
        session.add(review)
    
    # Update product rating cache
    avg_rating = total_rating / num_reviews
    
    pr = session.query(ProductRating).filter_by(product_id=product_id).first()
    if not pr:
        pr = ProductRating(product_id=product_id, average_rating=avg_rating, review_count=num_reviews)
        session.add(pr)
    else:
        pr.average_rating = avg_rating
        pr.review_count = num_reviews

session.commit()
print("Reviews populated successfully!")
