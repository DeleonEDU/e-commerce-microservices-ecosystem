# Microservices Testing Strategy

## 1. General Rules
- **TDD (Test-Driven Development)** MUST be followed. Write tests before implementing business logic.
- Target code coverage is **70% minimum** across each service.
- We aim for at least **200+ unit and integration tests** globally.

## 2. Tools
- Python services MUST use `pytest` as the primary test runner.
- Code coverage via `pytest-cov`.
- Mocking via `pytest-mock`.
- Inter-service HTTP requests MUST be mocked using `httpx-mock` or `responses`. No actual HTTP requests to other microservices during unit testing.

## 3. Stripe & External APIs
- Direct requests to real external APIs (like Stripe) are STRICTLY FORBIDDEN during CI testing.
- Create Mock implementations or use a library (like `responses`) to simulate Stripe API responses.
- Ensure to test edge cases: API timeouts, HTTP 500 errors, invalid credentials, and Stripe webhook signature verification failures.

## 4. Test Reporting
- Each microservice must generate test reports.
- Output `coverage.xml` for SonarQube integration (`--cov-report=xml`).
- Output HTML reports for local developer inspection (`--cov-report=html`).

## 5. Mocking Inter-service calls
- If `Order Service` calls `Product Service` to verify inventory, the `httpx` call MUST be intercepted and mocked to return a predefined JSON response.
- Test scenarios where the `Product Service` returns an error or timeout.
