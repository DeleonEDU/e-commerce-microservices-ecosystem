import os
import stripe
import requests
from fastapi import HTTPException
from rabbitmq_client import publish_message

import models
import schemas
from repository import PaymentRepository

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")

class PaymentService:
    def __init__(self, repository: PaymentRepository):
        self.repository = repository

    def create_payment_intent(self, payment_data: schemas.PaymentCreate) -> schemas.PaymentResponse:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(payment_data.amount * 100),
                currency="usd",
                metadata={
                    "order_id": str(payment_data.order_id),
                    "user_id": str(payment_data.user_id),
                },
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        new_payment = models.Payment(
            order_id=payment_data.order_id,
            user_id=payment_data.user_id,
            amount=payment_data.amount,
            stripe_payment_intent_id=intent.id,
            status=models.PaymentStatus.PENDING,
        )
        created_payment = self.repository.create_payment(new_payment)

        return schemas.PaymentResponse(
            id=created_payment.id,
            client_secret=intent.client_secret or "",
            status="pending",
        )

    def create_subscription_intent(self, sub_data: schemas.SubscriptionIntentCreate) -> schemas.PaymentResponse:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(sub_data.amount * 100),
                currency="usd",
                metadata={
                    "type": "subscription",
                    "user_id": str(sub_data.user_id),
                    "tier": sub_data.tier.value,
                },
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e)) from e

        return schemas.PaymentResponse(
            id=0,
            client_secret=intent.client_secret or "",
            status="pending",
        )

    def set_subscription_tier(self, user_id: int, tier: models.SubscriptionTier) -> models.Subscription:
        sub = self.repository.get_subscription_by_user(user_id)
        if not sub:
            sub = models.Subscription(user_id=user_id, tier=tier)
            sub = self.repository.create_subscription(sub)
        else:
            sub.tier = tier
            self.repository.update_subscription(sub)
            
        # Notify product_service about the premium status change
        is_premium = tier in [models.SubscriptionTier.PRO, models.SubscriptionTier.VIP]
        try:
            requests.post(
                "http://productservice:8003/products/update-seller-premium/",
                json={"seller_id": user_id, "is_premium": is_premium},
                timeout=5
            )
        except Exception as e:
            print(f"Failed to notify product_service about premium update: {e}")
            
        return sub

    def confirm_payment(self, intent: stripe.PaymentIntent):
        if intent.status == "succeeded":
            metadata = getattr(intent, "metadata", {})
            if isinstance(metadata, dict) and metadata.get("type") == "subscription":
                user_id_str = metadata.get("user_id")
                tier_str = metadata.get("tier")
                if user_id_str and tier_str:
                    try:
                        user_id = int(user_id_str)
                        tier = models.SubscriptionTier(tier_str)
                        self.set_subscription_tier(user_id, tier)
                    except ValueError:
                        pass
                return

            payment = self.repository.get_payment_by_stripe_id(intent.id)
            if payment and payment.status != models.PaymentStatus.COMPLETED:
                payment.status = models.PaymentStatus.COMPLETED
                self.repository.update_payment(payment)
                publish_message(
                    "order_payments",
                    {"order_id": payment.order_id, "status": "paid"},
                )
        elif getattr(intent, "status", "") == "requires_payment_method" or intent.status == "failed":
             payment = self.repository.get_payment_by_stripe_id(intent.id)
             if payment:
                 payment.status = models.PaymentStatus.FAILED
                 self.repository.update_payment(payment)
