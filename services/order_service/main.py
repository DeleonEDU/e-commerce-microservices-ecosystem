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

# Add is_approved column if it doesn't exist
try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;"))
        conn.commit()
except Exception:
    pass

# Add is_delivered column if it doesn't exist
try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE order_items ADD COLUMN is_delivered BOOLEAN DEFAULT FALSE;"))
        conn.commit()
except Exception:
    pass

# Add 'delivered' to orderstatus enum if it doesn't exist
try:
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(sqlalchemy.text("ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'delivered';"))
except Exception as e:
    print(f"Error adding 'delivered' to enum: {e}")
    pass

# Add shipping details to orders
try:
    with engine.connect() as conn:
        conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN full_name VARCHAR;"))
        conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN address VARCHAR;"))
        conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN city VARCHAR;"))
        conn.execute(sqlalchemy.text("ALTER TABLE orders ADD COLUMN zip_code VARCHAR;"))
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


@app.get("/users/{user_id}/has_bought/{product_id}")
def check_user_bought_product(user_id: int, product_id: int, db: Session = Depends(get_db)):
    has_bought = db.query(models.OrderItem).join(models.Order).filter(
        models.Order.user_id == user_id,
        models.OrderItem.product_id == product_id,
        models.Order.status.in_([models.OrderStatus.PAID, models.OrderStatus.SHIPPED])
    ).first() is not None
    return {"has_bought": has_bought}


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
            
            # Decrement stock synchronously via API
            try:
                dec_resp = requests.post(
                    f"http://productservice:8003/products/{item.product_id}/decrement_stock/",
                    json={"quantity": item.quantity},
                    timeout=5
                )
                if dec_resp.status_code != 200:
                    raise HTTPException(status_code=400, detail=dec_resp.json().get("detail", "Failed to decrement stock"))
            except requests.RequestException:
                raise HTTPException(status_code=503, detail="Product service unavailable")
            
            total_price += price * item.quantity
            order_items.append(
                models.OrderItem(product_id=item.product_id, seller_id=seller_id, quantity=item.quantity, price=price)
            )

    new_order = models.Order(
        user_id=order_data.user_id, 
        total_price=total_price,
        full_name=order_data.full_name,
        address=order_data.address,
        city=order_data.city,
        zip_code=order_data.zip_code
    )
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


from collections import defaultdict
from datetime import datetime, timedelta

@app.get("/sellers/{seller_id}/analytics")
def get_seller_analytics(seller_id: int, db: Session = Depends(get_db)):
    items = (
        db.query(models.OrderItem)
        .options(joinedload(models.OrderItem.order))
        .filter(models.OrderItem.seller_id == seller_id)
        .all()
    )
    
    total_revenue = sum(item.price * item.quantity for item in items)
    total_sales = sum(item.quantity for item in items)
    
    sales_by_date_dict = defaultdict(lambda: {"revenue": 0.0, "sales": 0})
    top_products_dict = defaultdict(lambda: {"revenue": 0.0, "sales": 0})
    
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    for item in items:
        # Top products
        top_products_dict[item.product_id]["revenue"] += item.price * item.quantity
        top_products_dict[item.product_id]["sales"] += item.quantity
        
        # Sales by date
        if item.order and item.order.created_at >= thirty_days_ago:
            date_str = item.order.created_at.strftime("%Y-%m-%d")
            sales_by_date_dict[date_str]["revenue"] += item.price * item.quantity
            sales_by_date_dict[date_str]["sales"] += item.quantity
            
    sales_by_date = [
        {"date": k, "revenue": v["revenue"], "sales": v["sales"]}
        for k, v in sorted(sales_by_date_dict.items())
    ]
    
    top_products = [
        {"product_id": k, "revenue": v["revenue"], "sales": v["sales"]}
        for k, v in sorted(top_products_dict.items(), key=lambda x: x[1]["revenue"], reverse=True)[:5]
    ]
    
    # all items sold (for management)
    all_items = sorted(items, key=lambda x: x.id, reverse=True)
    
    return {
        "total_revenue": total_revenue,
        "total_sales": total_sales,
        "sales_by_date": sales_by_date,
        "top_products": top_products,
        "recent_sales": [
            {
                "id": ri.id,
                "product_id": ri.product_id,
                "quantity": ri.quantity,
                "price": ri.price,
                "is_approved": ri.is_approved,
                "is_delivered": ri.is_delivered,
                "date": ri.order.created_at if ri.order else None,
                "order": {
                    "id": ri.order.id,
                    "full_name": ri.order.full_name,
                    "address": ri.order.address,
                    "city": ri.order.city,
                    "zip_code": ri.order.zip_code,
                    "status": ri.order.status.value if ri.order else "pending"
                } if ri.order else None
            }
            for ri in all_items
        ]
    }

@app.post("/sellers/{seller_id}/items/{item_id}/approve")
def approve_order_item(seller_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.OrderItem).filter(models.OrderItem.id == item_id, models.OrderItem.seller_id == seller_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found or does not belong to this seller")
    
    item.is_approved = True
    db.commit()
    
    # Check if all items in the order are approved and if the order is paid
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == item.order_id).first()
    if order and order.status == models.OrderStatus.PAID:
        all_approved = all(i.is_approved for i in order.items)
        if all_approved:
            order.status = models.OrderStatus.SHIPPED
            db.commit()
            
    return {"status": "success", "is_approved": True}

@app.post("/sellers/{seller_id}/items/{item_id}/deliver")
def deliver_order_item(seller_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.OrderItem).filter(models.OrderItem.id == item_id, models.OrderItem.seller_id == seller_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found or does not belong to this seller")
    
    if not item.is_approved:
        raise HTTPException(status_code=400, detail="Order item must be approved before it can be delivered")

    item.is_delivered = True
    db.commit()
    
    # Check if all items in the order are delivered
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == item.order_id).first()
    if order and order.status in [models.OrderStatus.PAID, models.OrderStatus.SHIPPED]:
        all_delivered = all(i.is_delivered for i in order.items)
        if all_delivered:
            order.status = models.OrderStatus.DELIVERED
            db.commit()
            
    return {"status": "success", "is_delivered": True}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
