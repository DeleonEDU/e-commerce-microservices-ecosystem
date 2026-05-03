from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

import models
import schemas

class OrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_order_by_id(self, order_id: int) -> Optional[models.Order]:
        return (
            self.db.query(models.Order)
            .options(joinedload(models.Order.items))
            .filter(models.Order.id == order_id)
            .first()
        )

    def get_orders_by_user(self, user_id: int) -> List[models.Order]:
        return (
            self.db.query(models.Order)
            .options(joinedload(models.Order.items))
            .filter(models.Order.user_id == user_id)
            .order_by(models.Order.created_at.desc())
            .all()
        )

    def create_order(self, order: models.Order) -> models.Order:
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def create_order_items(self, items: List[models.OrderItem]):
        for item in items:
            self.db.add(item)
        self.db.commit()

    def get_cart_by_user(self, user_id: int) -> Optional[models.Cart]:
        return (
            self.db.query(models.Cart)
            .options(joinedload(models.Cart.items))
            .filter(models.Cart.user_id == user_id)
            .first()
        )

    def create_cart(self, user_id: int) -> models.Cart:
        cart = models.Cart(user_id=user_id)
        self.db.add(cart)
        self.db.commit()
        self.db.refresh(cart)
        return cart

    def add_item_to_cart(self, cart_item: models.CartItem) -> models.CartItem:
        self.db.add(cart_item)
        self.db.commit()
        self.db.refresh(cart_item)
        return cart_item

    def clear_cart_items(self, cart_id: int):
        self.db.query(models.CartItem).filter(models.CartItem.cart_id == cart_id).delete()
        self.db.commit()

    def has_bought_product(self, user_id: int, product_id: int) -> bool:
        return self.db.query(models.OrderItem).join(models.Order).filter(
            models.Order.user_id == user_id,
            models.OrderItem.product_id == product_id,
            or_(
                models.Order.status.in_([models.OrderStatus.PAID, models.OrderStatus.SHIPPED, models.OrderStatus.DELIVERED]),
                models.Order.payment_method == "cash"
            )
        ).first() is not None

    def get_order_item_for_seller(self, item_id: int, seller_id: int) -> Optional[models.OrderItem]:
        return self.db.query(models.OrderItem).filter(
            models.OrderItem.id == item_id,
            models.OrderItem.seller_id == seller_id
        ).first()

    def update_order_item(self, item: models.OrderItem):
        self.db.commit()
        
    def update_order(self, order: models.Order):
        self.db.commit()

    def get_seller_analytics_items(self, seller_id: int) -> List[models.OrderItem]:
        return (
            self.db.query(models.OrderItem)
            .join(models.Order)
            .options(joinedload(models.OrderItem.order))
            .filter(models.OrderItem.seller_id == seller_id)
            .filter(
                or_(
                    models.Order.status.in_([models.OrderStatus.PAID, models.OrderStatus.SHIPPED, models.OrderStatus.DELIVERED]),
                    models.Order.payment_method == "cash"
                )
            )
            .all()
        )
