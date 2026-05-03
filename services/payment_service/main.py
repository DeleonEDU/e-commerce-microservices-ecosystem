import os
import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Body
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db
from models import Base
from repository import PaymentRepository
from service import PaymentService

load_dotenv()

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_mock_secret")

if not os.getenv("TESTING"):
    Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payment Service", version="1.0.0")

def get_payment_service(db: Session = Depends(get_db)) -> PaymentService:
    repository = PaymentRepository(db)
    return PaymentService(repository)

@app.get("/health")
def health():
    return {"status": "ok", "service": "payments"}

@app.post("/payment-intents", response_model=schemas.PaymentResponse)
def create_payment_intent(
    payment_data: schemas.PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
):
    return service.create_payment_intent(payment_data)

@app.post("/payments/create-intent", response_model=schemas.PaymentResponse, include_in_schema=False)
def create_payment_intent_legacy(
    payment_data: schemas.PaymentCreate,
    service: PaymentService = Depends(get_payment_service),
):
    return service.create_payment_intent(payment_data)

@app.post("/subscription-intents", response_model=schemas.PaymentResponse)
def create_subscription_intent(
    sub_data: schemas.SubscriptionIntentCreate,
    service: PaymentService = Depends(get_payment_service),
):
    return service.create_subscription_intent(sub_data)

@app.get("/users/{user_id}/payments", response_model=List[schemas.PaymentRead])
def list_user_payments(user_id: int, service: PaymentService = Depends(get_payment_service)):
    return service.repository.get_payments_by_user(user_id)

@app.get("/payments/{payment_id}", response_model=schemas.PaymentRead)
def get_payment(payment_id: int, service: PaymentService = Depends(get_payment_service)):
    row = service.repository.get_payment_by_id(payment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Payment not found")
    return row

@app.put("/users/{user_id}/subscription", response_model=schemas.SubscriptionRead)
def upsert_subscription(
    user_id: int,
    body: schemas.SubscriptionTierBody,
    service: PaymentService = Depends(get_payment_service),
):
    return service.set_subscription_tier(user_id, body.tier)

@app.post("/subscriptions/upgrade", response_model=schemas.SubscriptionRead, include_in_schema=False)
def upgrade_subscription_legacy(
    sub_data: schemas.SubscriptionUpdate,
    service: PaymentService = Depends(get_payment_service),
):
    return service.set_subscription_tier(sub_data.user_id, sub_data.tier)

@app.get("/users/{user_id}/subscription", response_model=schemas.SubscriptionRead)
def get_user_subscription(user_id: int, service: PaymentService = Depends(get_payment_service)):
    sub = service.repository.get_subscription_by_user(user_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return sub

@app.post("/payments/confirm")
def confirm_payment(
    payment_intent_id: str = Body(..., embed=True),
    service: PaymentService = Depends(get_payment_service),
):
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    service.confirm_payment(intent)
    return {"status": "success"}

@app.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="stripe-signature"),
    service: PaymentService = Depends(get_payment_service),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload") from e
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature") from e

    if event["type"] in ["payment_intent.succeeded", "payment_intent.payment_failed"]:
        intent = event["data"]["object"]
        service.confirm_payment(intent)

    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
