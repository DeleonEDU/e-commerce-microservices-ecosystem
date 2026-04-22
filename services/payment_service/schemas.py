from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from models import PaymentStatus, SubscriptionTier


class PaymentCreate(BaseModel):
    order_id: int
    user_id: int
    amount: float


class PaymentResponse(BaseModel):
    id: int
    client_secret: str
    status: str


class PaymentRead(BaseModel):
    id: int
    order_id: int
    user_id: int
    amount: float
    currency: str
    status: PaymentStatus
    stripe_payment_intent_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class SubscriptionUpdate(BaseModel):
    user_id: int
    tier: SubscriptionTier


class SubscriptionTierBody(BaseModel):
    tier: SubscriptionTier


class SubscriptionRead(BaseModel):
    id: int
    user_id: int
    tier: SubscriptionTier
    status: str
    stripe_subscription_id: Optional[str] = None
    expires_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class WebhookResponse(BaseModel):
    status: str
