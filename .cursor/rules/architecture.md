# E-Commerce Microservices Architecture Rules

## 1. Separation of Concerns
- The system is divided into bounded contexts: `Auth`, `Product`, `Order`, `Payment`, `Rating`.
- Each service MUST own its database schema. There MUST BE NO shared databases between microservices.
- Data required from other services must be fetched via REST/HTTP or through an event bus (Pub/Sub).

## 2. Inter-Service Communication
- **Synchronous**: REST APIs via HTTP. Used for immediate consistency needs (e.g., fetching product details to validate an order).
- **Asynchronous**: Events / Pub/Sub (e.g., RabbitMQ, Redis PubSub, or Kafka). Used for non-blocking operations like sending emails or updating stats.
- All inter-service calls MUST handle timeouts, retries, and circuit breaking.

## 3. Technology Stack
- `auth_service`: Django + Django REST Framework (Provides robust built-in Auth & Admin).
- `product_service`: FastAPI (High performance, async capabilities for catalog reads).
- `order_service`: FastAPI / Django (Complex transactions).
- `payment_service`: FastAPI (Stripe webhooks and async payment handling).

## 4. Design Patterns
- **Strategy Pattern**: Implement for calculating taxes, discounts, or sorting algorithms within the product service.
- **Observer Pattern**: Implement an event dispatcher within services to publish state changes (e.g., `OrderPaid` event).

## 5. API Gateway (Future/Optional)
- All client (frontend) requests route through an API gateway or reverse proxy which forwards requests to specific services based on the URL path.
