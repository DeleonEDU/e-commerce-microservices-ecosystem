import requests
from typing import List

from fastapi import Depends, FastAPI, HTTPException
import sqlalchemy
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db
from models import Base
from repository import OrderRepository
from service import OrderService

Base.metadata.create_all(bind=engine)

# Add columns and enum if they don't exist
def apply_migrations():
    try:
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN seller_id INTEGER;"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN is_delivered BOOLEAN DEFAULT FALSE;"))
            conn.commit()
    except Exception:
        pass

    try:
        with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(sqlalchemy.text("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'delivered';"))
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN full_name VARCHAR;"))
            conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN address VARCHAR;"))
            conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN city VARCHAR;"))
            conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN zip_code VARCHAR;"))
            conn.commit()
    except Exception:
        pass

apply_migrations()

app = FastAPI(title="Order Service", version="1.0.0")

def get_order_service(db: Session = Depends(get_db)) -> OrderService:
    repository = OrderRepository(db)
    return OrderService(repository)

@app.get("/health")
def health():
    return {"status": "ok", "service": "orders"}

@app.post("/cart/{user_id}/items", response_model=schemas.CartItem)
def add_cart_item(user_id: int, item: schemas.CartItemCreate, service: OrderService = Depends(get_order_service)):
    return service.add_to_cart(user_id, item)

@app.get("/cart/{user_id}", response_model=schemas.Cart)
def get_cart(user_id: int, service: OrderService = Depends(get_order_service)):
    return service.get_cart(user_id)

@app.get("/users/{user_id}/orders", response_model=List[schemas.Order])
def list_user_orders(user_id: int, service: OrderService = Depends(get_order_service)):
    return service.repository.get_orders_by_user(user_id)

@app.get("/users/{user_id}/has_bought/{product_id}")
def check_user_bought_product(user_id: int, product_id: int, service: OrderService = Depends(get_order_service)):
    has_bought = service.repository.has_bought_product(user_id, product_id)
    return {"has_bought": has_bought}

@app.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, service: OrderService = Depends(get_order_service)):
    order = service.repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.post("/orders", response_model=schemas.Order)
def create_order(order_data: schemas.OrderCreate, service: OrderService = Depends(get_order_service)):
    return service.create_order(order_data)


@app.get("/sellers/{seller_id}/analytics")
def get_seller_analytics(seller_id: int, service: OrderService = Depends(get_order_service)):
    return service.get_seller_analytics(seller_id)

@app.post("/sellers/{seller_id}/items/{item_id}/approve")
def approve_order_item(seller_id: int, item_id: int, service: OrderService = Depends(get_order_service)):
    return service.approve_item(seller_id, item_id)

@app.post("/sellers/{seller_id}/items/{item_id}/deliver")
def deliver_order_item(seller_id: int, item_id: int, service: OrderService = Depends(get_order_service)):
    return service.deliver_item(seller_id, item_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
