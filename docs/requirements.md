# E-Commerce Microservices Platform Requirements

## 1. Actors
- **Buyer**: A user who browses products, manages a shopping cart, places orders, and makes payments.
- **Admin**: A user who manages products, reviews orders, and monitors system health.
- **System**: Background processes that handle asynchronous tasks like order state changes, notifications, and analytics.

## 2. Key Use Cases
1. **Registration & Authorization**: A new Buyer registers, verifies their email, and logs in using JWT/OAuth2. The Auth Service provides tokens for subsequent requests.
2. **Browsing & Dynamic Ranking**: A Buyer views products. The Product Service returns products sorted dynamically based on user preferences, ratings, and availability.
3. **Adding to Cart**: A Buyer adds products to their cart. The cart state is maintained temporarily (e.g., in Redis via Order Service).
4. **Order Placement**: A Buyer checks out. The Order Service verifies product availability (via Product Service), calculates total (including discounts/taxes), and creates an order with a "Pending" status.
5. **Payment Processing**: The Buyer initiates payment. The Payment Service interacts securely with Stripe. Upon success, an event is emitted to update the order status to "Paid".
6. **Order Fulfillment & Notifications**: The System updates the order status to "Shipped". An observer pattern triggers email notifications to the Buyer.
7. **Product Rating**: After receiving the order, the Buyer submits a rating. The Rating Service recalculates the product's average score and updates the Product Service asynchronously.

## 3. Logical Problems Detailed

### Dynamic Ranking of Products
- **Problem**: Products need to be sorted not just by price, but by relevance, rating, and stock availability.
- **Algorithm Strategy**: Implement a `Strategy` pattern where the ranking algorithm can be selected based on the user's context (e.g., `HighestRatedStrategy`, `NewestArrivalsStrategy`, `PersonalizedStrategy`).
- **Data Flow**: The Product Service queries the Rating Service to fetch aggregated scores and applies the chosen ranking strategy before returning the list to the client.

### Order Processing Workflow
- **Problem**: Order creation spans multiple domains (Inventory validation, Pricing, Payment).
- **Workflow**:
  1. Receive Order Request.
  2. Synchronous check to Product Service: Are items in stock? Reserve inventory.
  3. Calculate final price (apply discounts, taxes).
  4. Create Order in DB (Status: `PENDING_PAYMENT`).
  5. Return Order ID and Payment Intent to client.
- **Resilience**: If payment fails or times out, the system must release the reserved inventory (Compensating Transaction / Saga Pattern).

### Secure Stripe Payment Integration
- **Problem**: Handling sensitive payment data securely without storing credit card details on our servers.
- **Implementation**:
  - The client requests a `ClientSecret` from the Payment Service.
  - The Payment Service calls Stripe API to create a `PaymentIntent` linked to the Order ID.
  - The client completes the payment directly with Stripe using Stripe.js.
  - Stripe sends a webhook to our Payment Service (or we poll/verify).
  - The Payment Service verifies the webhook signature and publishes a `PaymentSucceeded` event to notify the Order Service.
