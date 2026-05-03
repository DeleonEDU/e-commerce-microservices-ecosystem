from typing import List, Optional
from sqlalchemy.orm import Session
import models

class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_payment(self, payment: models.Payment) -> models.Payment:
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def get_payment_by_id(self, payment_id: int) -> Optional[models.Payment]:
        return self.db.query(models.Payment).filter(models.Payment.id == payment_id).first()

    def get_payment_by_stripe_id(self, stripe_id: str) -> Optional[models.Payment]:
        return self.db.query(models.Payment).filter(models.Payment.stripe_payment_intent_id == stripe_id).first()

    def get_payments_by_user(self, user_id: int) -> List[models.Payment]:
        return (
            self.db.query(models.Payment)
            .filter(models.Payment.user_id == user_id)
            .order_by(models.Payment.created_at.desc())
            .all()
        )

    def update_payment(self, payment: models.Payment):
        self.db.commit()
        self.db.refresh(payment)

    def get_subscription_by_user(self, user_id: int) -> Optional[models.Subscription]:
        return self.db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()

    def create_subscription(self, subscription: models.Subscription) -> models.Subscription:
        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)
        return subscription

    def update_subscription(self, subscription: models.Subscription):
        self.db.commit()
        self.db.refresh(subscription)
