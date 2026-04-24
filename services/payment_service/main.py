import os
import requests
from typing import List

import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Body
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db
from models import Base
from rabbitmq_client import publish_message

load_dotenv()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock_key")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_mock_secret")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payment Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "payments"}


def _create_payment_intent(
    payment_data: schemas.PaymentCreate,
    db: Session,
) -> schemas.PaymentResponse:
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
    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)

    return schemas.PaymentResponse(
        id=new_payment.id,
        client_secret=intent.client_secret or "",
        status="pending",
    )


@app.post("/payment-intents", response_model=schemas.PaymentResponse)
def create_payment_intent(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db),
):
    return _create_payment_intent(payment_data, db)


@app.post("/payments/create-intent", response_model=schemas.PaymentResponse, include_in_schema=False)
def create_payment_intent_legacy(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db),
):
    return _create_payment_intent(payment_data, db)


@app.post("/subscription-intents", response_model=schemas.PaymentResponse)
def create_subscription_intent(
    sub_data: schemas.SubscriptionIntentCreate,
    db: Session = Depends(get_db),
):
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
        id=0, # We don't store it in payments table, we handle it via webhook
        client_secret=intent.client_secret or "",
        status="pending",
    )


@app.get("/users/{user_id}/payments", response_model=List[schemas.PaymentRead])
def list_user_payments(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Payment)
        .filter(models.Payment.user_id == user_id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )


@app.get("/payments/{payment_id}", response_model=schemas.PaymentRead)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    row = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    return row


def _set_subscription_tier(user_id: int, tier: models.SubscriptionTier, db: Session) -> models.Subscription:
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()
    if not sub:
        sub = models.Subscription(user_id=user_id, tier=tier)
        db.add(sub)
    else:
        sub.tier = tier
    db.commit()
    db.refresh(sub)
    
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


@app.put("/users/{user_id}/subscription", response_model=schemas.SubscriptionRead)
def upsert_subscription(
    user_id: int,
    body: schemas.SubscriptionTierBody,
    db: Session = Depends(get_db),
):
    sub = _set_subscription_tier(user_id, body.tier, db)
    return sub


@app.post("/subscriptions/upgrade", response_model=schemas.SubscriptionRead, include_in_schema=False)
def upgrade_subscription_legacy(
    sub_data: schemas.SubscriptionUpdate,
    db: Session = Depends(get_db),
):
    sub = _set_subscription_tier(sub_data.user_id, sub_data.tier, db)
    return sub


@app.get("/users/{user_id}/subscription", response_model=schemas.SubscriptionRead)
def get_user_subscription(user_id: int, db: Session = Depends(get_db)):
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub


@app.post("/payments/confirm")
def confirm_payment(
    payment_intent_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if intent.status == "succeeded":
        # Check if it's a subscription payment
        metadata = intent.get("metadata", {})
        if metadata.get("type") == "subscription":
            user_id = int(metadata.get("user_id"))
            tier_str = metadata.get("tier")
            try:
                tier = models.SubscriptionTier(tier_str)
                _set_subscription_tier(user_id, tier, db)
            except ValueError:
                pass
            return {"status": "success"}

        payment = (
            db.query(models.Payment)
            .filter(models.Payment.stripe_payment_intent_id == intent.id)
            .first()
        )
        if payment and payment.status != models.PaymentStatus.COMPLETED:
            payment.status = models.PaymentStatus.COMPLETED
            db.commit()
            publish_message(
                "order_payments",
                {"order_id": payment.order_id, "status": "paid"},
            )
            
    return {"status": "success"}


@app.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload") from e
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature") from e

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        
        # Check if it's a subscription payment
        metadata = intent.get("metadata", {})
        if metadata.get("type") == "subscription":
            user_id = int(metadata.get("user_id"))
            tier_str = metadata.get("tier")
            try:
                tier = models.SubscriptionTier(tier_str)
                _set_subscription_tier(user_id, tier, db)
            except ValueError:
                pass
            return {"status": "success"}

        payment = (
            db.query(models.Payment)
            .filter(models.Payment.stripe_payment_intent_id == intent["id"])
            .first()
        )
        if payment:
            payment.status = models.PaymentStatus.COMPLETED
            db.commit()
            publish_message(
                "order_payments",
                {"order_id": payment.order_id, "status": "paid"},
            )

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        payment = (
            db.query(models.Payment)
            .filter(models.Payment.stripe_payment_intent_id == intent["id"])
            .first()
        )
        if payment:
            payment.status = models.PaymentStatus.FAILED
            db.commit()

    return {"status": "success"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
