from sqlalchemy import Column, Integer, String, Float, DateTime, Enum, ForeignKey
from database import Base
import datetime
import enum

class SubscriptionTier(enum.Enum):
    FREE = "free"
    PLUS = "plus"
    PRO = "pro"
    VIP = "vip"

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    stripe_subscription_id = Column(String, nullable=True)
    status = Column(String, default="active")
    expires_at = Column(DateTime, nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, index=True)
    user_id = Column(Integer)
    amount = Column(Float)
    currency = Column(String, default="usd")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    stripe_payment_intent_id = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
