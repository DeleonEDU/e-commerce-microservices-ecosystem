from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime
from models import OrderStatus

class CartItemBase(BaseModel):
    product_id: int
    quantity: int

class CartItemCreate(CartItemBase):
    pass

class CartItem(CartItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Cart(BaseModel):
    id: int
    user_id: int
    items: List[CartItem]
    model_config = ConfigDict(from_attributes=True)

class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float
    is_approved: bool | None = False
    model_config = ConfigDict(from_attributes=True)

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    user_id: int
    items: List[OrderItemCreate] | None = None

class Order(BaseModel):
    id: int
    user_id: int
    total_price: float
    status: OrderStatus
    created_at: datetime
    items: List[OrderItemBase]
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)
