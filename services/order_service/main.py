import requests
from typing import List

from fastapi import Depends, FastAPI, HTTPException, status
import sqlalchemy
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import engine, get_db
from models import Base
from redis_client import distributed_lock

Base.metadata.create_all(bind=engine)

# Add seller_id column if it doesn't exist
try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN seller_id INTEGER;"))
        conn.commit()
except Exception:
    pass

app = FastAPI(title="Order Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "orders"}


@app.post("/cart/{user_id}/items", response_model=schemas.CartItem)
def add_cart_item(user_id: int, item: schemas.CartItemCreate, db: Session = Depends(get_db)):
    cart = db.query(models.Cart).filter(models.Cart.user_id == user_id).first()
    if not cart:
        cart = models.Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    cart_item = models.CartItem(cart_id=cart.id, **item.model_dump())
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item


@app.get("/cart/{user_id}", response_model=schemas.Cart)
def get_cart(user_id: int, db: Session = Depends(get_db)):
    cart = (
        db.query(models.Cart)
        .options(joinedload(models.Cart.items))
        .filter(models.Cart.user_id == user_id)
        .first()
    )
    if not cart:
        cart = models.Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@app.get("/users/{user_id}/orders", response_model=List[schemas.Order])
def list_user_orders(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.user_id == user_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


@app.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders", response_model=schemas.Order)
def create_order(order_data: schemas.OrderCreate, db: Session = Depends(get_db)):
    if order_data.items:
        items_data = order_data.items
        cart = None
    else:
        cart = (
            db.query(models.Cart)
            .options(joinedload(models.Cart.items))
            .filter(models.Cart.user_id == order_data.user_id)
            .first()
        )
        if not cart or not cart.items:
            raise HTTPException(status_code=400, detail="Cart is empty")
        items_data = cart.items

    product_ids = [item.product_id for item in items_data]
    
    # Bulk fetch products
    try:
        prod_resp = requests.post(
            "http://productservice:8003/products/bulk/",
            json={"product_ids": product_ids},
            timeout=5
        )
        if prod_resp.status_code != 200:
            raise HTTPException(status_code=503, detail="Product service unavailable")
        products_data = {p["id"]: p for p in prod_resp.json()}
    except Exception:
        raise HTTPException(status_code=503, detail="Product service unavailable")

    total_price = 0.0
    order_items: list[models.OrderItem] = []

    for item in items_data:
        prod_info = products_data.get(item.product_id)
        if not prod_info:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")

        price = float(prod_info.get("price", 0.0))
        seller_id = prod_info.get("seller_id")

        lock_key = f"stock_lock_{item.product_id}"
        with distributed_lock(lock_key) as acquired:
            if not acquired:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Product {item.product_id} is currently being processed. Try again later.",
                )
            
            total_price += price * item.quantity
            order_items.append(
                models.OrderItem(product_id=item.product_id, seller_id=seller_id, quantity=item.quantity, price=price)
            )

    new_order = models.Order(user_id=order_data.user_id, total_price=total_price)
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    for oi in order_items:
        oi.order_id = new_order.id
        db.add(oi)

    if cart:
        db.query(models.CartItem).filter(models.CartItem.cart_id == cart.id).delete()
    db.commit()

    loaded = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == new_order.id)
        .first()
    )
    if not loaded:
        raise HTTPException(status_code=500, detail="Failed to load created order")
    return loaded


@app.get("/sellers/{seller_id}/analytics")
def get_seller_analytics(seller_id: int, db: Session = Depends(get_db)):
    items = db.query(models.OrderItem).filter(models.OrderItem.seller_id == seller_id).all()
    total_revenue = sum(item.price * item.quantity for item in items)
    total_sales = sum(item.quantity for item in items)
    
    # recent items sold
    recent_items = (
        db.query(models.OrderItem)
        .options(joinedload(models.OrderItem.order))
        .filter(models.OrderItem.seller_id == seller_id)
        .order_by(models.OrderItem.id.desc())
        .limit(10)
        .all()
    )
    
    return {
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "recent_sales": [
            {
                "product_id": ri.product_id,
                "quantity": ri.quantity,
                "price": ri.price,
                "date": ri.order.created_at if ri.order else None
            }
            for ri in recent_items
        ]
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
