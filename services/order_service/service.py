import requests
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from repository import OrderRepository
from redis_client import distributed_lock

class OrderService:
    def __init__(self, repository: OrderRepository):
        self.repository = repository

    def add_to_cart(self, user_id: int, item_data: schemas.CartItemCreate) -> models.CartItem:
        cart = self.repository.get_cart_by_user(user_id)
        if not cart:
            cart = self.repository.create_cart(user_id)
        
        cart_item = models.CartItem(cart_id=cart.id, **item_data.model_dump())
        return self.repository.add_item_to_cart(cart_item)

    def get_cart(self, user_id: int) -> models.Cart:
        cart = self.repository.get_cart_by_user(user_id)
        if not cart:
            cart = self.repository.create_cart(user_id)
        return cart

    def create_order(self, order_data: schemas.OrderCreate) -> models.Order:
        if order_data.items:
            items_data = order_data.items
            cart = None
        else:
            cart = self.repository.get_cart_by_user(order_data.user_id)
            if not cart or not cart.items:
                raise HTTPException(status_code=400, detail="Cart is empty")
            items_data = cart.items

        product_ids = [item.product_id for item in items_data]
        
        # External service call (Product Service)
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
        order_items = []

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
                
                # External service call (Decrement stock)
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
            zip_code=order_data.zip_code,
            payment_method=order_data.payment_method
        )
        created_order = self.repository.create_order(new_order)

        for oi in order_items:
            oi.order_id = created_order.id
        self.repository.create_order_items(order_items)

        if cart:
            self.repository.clear_cart_items(cart.id)

        loaded_order = self.repository.get_order_by_id(created_order.id)
        if not loaded_order:
            raise HTTPException(status_code=500, detail="Failed to load created order")
        return loaded_order

    def approve_item(self, seller_id: int, item_id: int) -> dict:
        item = self.repository.get_order_item_for_seller(item_id, seller_id)
        if not item:
            raise HTTPException(status_code=404, detail="Order item not found or does not belong to this seller")
        
        order = self.repository.get_order_by_id(item.order_id)
        if not order or (order.status == models.OrderStatus.PENDING and order.payment_method != "cash"):
            raise HTTPException(status_code=400, detail="Cannot approve an item for an unpaid order")
        
        item.is_approved = True
        self.repository.update_order_item(item)
        
        if order and (order.status == models.OrderStatus.PAID or (order.status == models.OrderStatus.PENDING and order.payment_method == "cash")):
            all_approved = all(i.is_approved for i in order.items)
            if all_approved:
                order.status = models.OrderStatus.SHIPPED
                self.repository.update_order(order)
                
        return {"status": "success", "is_approved": True}

    def deliver_item(self, seller_id: int, item_id: int) -> dict:
        item = self.repository.get_order_item_for_seller(item_id, seller_id)
        if not item:
            raise HTTPException(status_code=404, detail="Order item not found or does not belong to this seller")
        
        order = self.repository.get_order_by_id(item.order_id)
        if not order or (order.status == models.OrderStatus.PENDING and order.payment_method != "cash"):
            raise HTTPException(status_code=400, detail="Cannot deliver an item for an unpaid order")
        
        if not item.is_approved:
            raise HTTPException(status_code=400, detail="Order item must be approved before it can be delivered")

        item.is_delivered = True
        self.repository.update_order_item(item)
        
        if order and (order.status in [models.OrderStatus.PAID, models.OrderStatus.SHIPPED] or (order.status == models.OrderStatus.PENDING and order.payment_method == "cash")):
            all_delivered = all(i.is_delivered for i in order.items)
            if all_delivered:
                order.status = models.OrderStatus.DELIVERED
                self.repository.update_order(order)
                
        return {"status": "success", "is_delivered": True}

    def get_seller_analytics(self, seller_id: int) -> dict:
        from collections import defaultdict
        from datetime import datetime, timedelta

        items = self.repository.get_seller_analytics_items(seller_id)
        
        total_revenue = sum(item.price * item.quantity for item in items)
        total_sales = sum(item.quantity for item in items)
        
        sales_by_date_dict = defaultdict(lambda: {"revenue": 0.0, "sales": 0})
        top_products_dict = defaultdict(lambda: {"revenue": 0.0, "sales": 0})
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        for item in items:
            top_products_dict[item.product_id]["revenue"] += item.price * item.quantity
            top_products_dict[item.product_id]["sales"] += item.quantity
            
            if item.order and item.order.created_at and item.order.created_at >= thirty_days_ago:
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
