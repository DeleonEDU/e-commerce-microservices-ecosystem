# Архітектура та Дизайн (E-commerce Microservices Ecosystem)

## 1. Архітектурний стиль та Загальний огляд системи

**Вибір:** Мікросервісна архітектура з багатошаровим (Layered/MVC) підходом всередині кожного сервісу.

**Загальний огляд (High-Level Architecture):**
Система складається з Frontend-додатку (React SPA), єдиної точки входу API Gateway (Nginx) та набору ізольованих мікросервісів, які взаємодіють між собою через REST API (синхронно) та RabbitMQ/Redis (асинхронно та кешування). Дані зберігаються в PostgreSQL за принципом "одна база даних на сервіс" (Database per Service).

### C4 Model: Контекст системи (System Context Diagram)

```mermaid
flowchart TD
    customer["🧑 Customer<br/>(A customer who buys products, leaves reviews.)"]
    seller["🧑 Seller<br/>(A seller who manages products, inventory, and fulfills orders.)"]
    admin["🧑 Admin<br/>(Manages the platform, users, and overall system.)"]

    ecommerce_system["⚙️ E-Commerce System<br/>(Allows customers to buy products, sellers to manage inventory, and handles payments.)"]
    
    stripe["💳 Stripe Payment Gateway<br/>(External system for handling credit card payments.)"]

    customer -->|"Browses products, places orders, pays, reviews"| ecommerce_system
    seller -->|"Manages catalog, views analytics, approves shipments"| ecommerce_system
    admin -->|"Administers platform"| ecommerce_system
    ecommerce_system -->|"Processes payments"| stripe

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef system fill:#1168bd,color:#fff,stroke:#0b4884
    classDef ext_system fill:#999999,color:#fff,stroke:#6b6b6b

    class customer,seller,admin person
    class ecommerce_system system
    class stripe ext_system
```

### Опис Мікросервісів

1. **API Gateway (Nginx):** 
   - Виступає як Reverse Proxy.
   - Маршрутизує зовнішні HTTP-запити від Frontend до відповідних мікросервісів (наприклад, `/api/auth/` направляється на `auth_service`).
2. **Auth Service (`auth_service`):** 
   - Відповідає за реєстрацію, автентифікацію (JWT) та управління користувачами (ролі: Buyer, Seller, Admin).
   - **База даних:** `auth_db` (PostgreSQL) — зберігає облікові дані та профілі користувачів.
3. **Product Service (`product_service`):** 
   - Керує каталогом товарів, категоріями, інвентарем (stock) та цінами.
   - **База даних:** `product_db` (PostgreSQL) — містить таблиці продуктів, категорій.
   - **Кешування/Блокування:** Використовує Redis для розподілених блокувань під час зміни залишків товарів.
4. **Order Service (`order_service`):** 
   - Обробляє життєвий цикл замовлення (від створення кошика до підтвердження продавцем та доставки). Включає також `order_worker` для фонової обробки через RabbitMQ.
   - **База даних:** `order_db` (PostgreSQL) — зберігає замовлення (Orders), позиції замовлення (Order Items) та кошики (Carts).
5. **Payment Service (`payment_service`):** 
   - Відповідає за обробку транзакцій (інтеграція з платіжними шлюзами).
   - **База даних:** `payment_db` (PostgreSQL) — фіксує статуси транзакцій та історію платежів.
6. **Rating Service (`rating_service`):** 
   - Дозволяє покупцям залишати відгуки та оцінки на придбані товари.
   - **База даних:** `rating_db` (PostgreSQL) — зберігає відгуки та середні рейтинги.

**Обґрунтування підходу (Database-per-service):** 
Розподіл на незалежні сервіси з власними базами даних забезпечує повну ізоляцію, легке масштабування окремих компонентів та запобігає каскадним відмовам (якщо відмовить сервіс рейтингів, оформлення замовлень працюватиме далі).

---

## 2. Шаблони проєктування (Design Patterns) та Архітектура Компонентів (C4 Component)

В межах кожного мікросервісу (наприклад, `order_service`) використовується багатошарова архітектура (Layered Architecture):

### C4 Model: Діаграма Компонентів (на прикладі Order Service)

```mermaid
flowchart TD
    api_gateway["API Gateway<br/>[Container: Nginx]<br/>Routes incoming requests"]
    db_order[("Order Database<br/>[Container: PostgreSQL]<br/>Stores orders and carts")]
    product_service["Product Service<br/>[Container: Django]<br/>Manages inventory"]

    subgraph order_service ["Order Service (FastAPI)"]
        routers["API Routers<br/>[Component: FastAPI Routes]<br/>Handles HTTP requests, JSON validation via Pydantic."]
        service_layer["Order Service Layer<br/>[Component: Python Class]<br/>Contains core business logic. Coordinates repositories and external services."]
        repository["Order Repository<br/>[Component: Python Class]<br/>Abstracts SQLAlchemy ORM. Executes SQL queries against the database."]
        redis_lock["Distributed Lock<br/>[Component: Redis Client]<br/>Ensures atomic stock decrement operations."]
    end

    api_gateway -->|"Makes HTTP calls to<br/>[JSON/HTTPS]"| routers
    routers -->|"Uses<br/>[Dependency Injection]"| service_layer
    service_layer -->|"Uses<br/>[Dependency Injection]"| repository
    service_layer -->|"Acquires lock before external call"| redis_lock
    service_layer -->|"Calls /decrement_stock API<br/>[HTTP]"| product_service
    repository -->|"Reads/Writes via SQLAlchemy"| db_order

    classDef container fill:#438dd5,color:#fff,stroke:#2e6295
    classDef database fill:#3b82f6,color:#fff,stroke:#1d4ed8
    classDef component fill:#85bbf0,color:#000,stroke:#5d82a8
    
    class api_gateway,product_service container
    class db_order database
    class routers,service_layer,repository,redis_lock component
```

У проєкті застосовано наступні шаблони (Gang of Four):
1. **Repository Pattern:** Використовується для абстрагування логіки доступу до бази даних. Наприклад, `OrderRepository` інкапсулює SQL-запити через SQLAlchemy, тому Service Layer не залежить від конкретної бази даних.
2. **Singleton Pattern:** Застосовується для керування підключеннями до бази даних (`engine` в SQLAlchemy) та підключенням до Redis. Об'єкт підключення створюється один раз і перевикористовується для всіх запитів.
3. **Dependency Injection (DI):** Широко використовується через FastAPI `Depends()`, що дозволяє прокидати сесії бази даних та сервіси у контролери, полегшуючи модульне тестування (можна підмінити залежності моками).

---

## 3. Аналіз та дотримання SOLID

- **Single Responsibility Principle (SRP):** Кожен клас/модуль має одну відповідальність. Контролери лише обробляють HTTP, Сервіси - бізнес-логіку, Репозиторії - базу даних.
- **Open/Closed Principle (OCP):** Сутності бази даних (Models) розширюються без зміни існуючого коду. Валідатори Pydantic (DTO) дозволяють розширювати схеми запитів через наслідування.
- **Liskov Substitution Principle (LSP):** Використання абстрактних базових класів (Base в SQLAlchemy) дозволяє замінювати та розширювати моделі без порушення логіки ORM.
- **Interface Segregation Principle (ISP):** Інтерфейси репозиторіїв та сервісів розділені логічно за доменними сутностями.
- **Dependency Inversion Principle (DIP):** Контролери залежать від абстракцій (через FastAPI DI параметри), а не від конкретних реалізацій інстансів класів або з'єднань БД.

---

## 4. Робота з даними, Проєктування БД

**Підхід:** Реляційна SQL база даних (PostgreSQL через єдиний сервер, але з логічним розділенням на `auth_db`, `product_db`, `order_db` тощо).
**Обґрунтування:** E-commerce процеси (особливо замовлення, залишки товарів, платежі) вимагають жорсткої узгодженості даних (ACID), підтримки транзакцій та гарантій консистентності, що робить реляційні SQL бази ідеальним вибором у порівнянні з NoSQL.

### Структура БД (ER-діаграма загальної екосистеми - логічні зв'язки)

Зверніть увагу: фізично бази розділені (Microservice Database Pattern), але логічно сутності пов'язані ідентифікаторами (foreign keys зберігаються як звичайні `INTEGER` поля без жорсткого constraints між БД).

```mermaid
erDiagram
    %% Auth Service DB
    USER {
        int id PK
        string username
        string email
        string role "BUYER, SELLER, ADMIN"
        string password_hash
        string store_name
    }
    
    %% Product Service DB
    PRODUCT {
        int id PK
        string name
        float price
        int stock
        boolean is_active
        boolean is_premium
        int seller_id FK "Логічно вказує на USER.id"
    }

    CATEGORY {
        int id PK
        string name
        string slug
    }

    PRODUCT }|--|| CATEGORY : belongs_to

    %% Order Service DB
    ORDER ||--o{ ORDER_ITEM : "contains"
    ORDER {
        int id PK
        int user_id FK "Логічно вказує на USER.id"
        string status "PENDING, PAID, SHIPPED, DELIVERED"
        float total_price
        datetime created_at
        string payment_method
        string address
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK "Логічно вказує на PRODUCT.id"
        int seller_id FK "Логічно вказує на USER.id"
        int quantity
        float price
        boolean is_approved
        boolean is_delivered
    }

    %% Payment Service DB
    PAYMENT {
        int id PK
        int order_id FK "Логічно вказує на ORDER.id"
        int user_id FK "Логічно вказує на USER.id"
        float amount
        string status "PENDING, COMPLETED, FAILED"
        string stripe_payment_intent_id
    }

    %% Rating Service DB
    REVIEW {
        int id PK
        int product_id FK "Логічно вказує на PRODUCT.id"
        int user_id FK "Логічно вказує на USER.id"
        int rating
        string comment
    }
    
    PRODUCT_RATING {
        int id PK
        int product_id FK "Логічно вказує на PRODUCT.id"
        float average_rating
        int review_count
    }
```

Для взаємодії з БД використовується **SQLAlchemy (ORM)**. 
**DTO (Data Transfer Objects):** Використовується `Pydantic` моделі для передачі та валідації даних між Frontend <-> Controllers <-> Service Layer.

---

## 6. Взаємодія між сервісами (Service Communication) та Паттерни

Система використовує змішаний підхід до взаємодії, імплементуючи **API Gateway Pattern** та **Event-Driven Architecture**:

### C4 Model: Діаграма контейнерів (Container Diagram)

```mermaid
flowchart TD
    customer["🧑 Customer<br/>(Buys products)"]
    seller["🧑 Seller<br/>(Sells products)"]

    spa["📱 Single Page Application<br/>[Container: React, TypeScript]<br/>Provides all functionality to customers and sellers via their browser."]
    api_gateway["🔀 API Gateway<br/>[Container: Nginx]<br/>Routes requests to the correct microservice based on the path."]

    auth_service["🔐 Auth Service<br/>[Container: Django REST Framework]<br/>Handles user registration, authentication (JWT), and roles."]
    db_auth[("🗄️ Auth Database<br/>[Container: PostgreSQL]<br/>Stores user credentials and profiles.")]

    product_service["📦 Product Service<br/>[Container: Django REST Framework]<br/>Manages product catalog and inventory."]
    db_product[("🗄️ Product Database<br/>[Container: PostgreSQL]<br/>Stores products and categories.")]
    redis_cache[("⚡ Redis Cache<br/>[Container: Redis]<br/>Distributed locks for stock management.")]

    order_service["🛒 Order Service<br/>[Container: FastAPI]<br/>Manages shopping carts and order fulfillment."]
    db_order[("🗄️ Order Database<br/>[Container: PostgreSQL]<br/>Stores orders and carts.")]

    payment_service["💳 Payment Service<br/>[Container: FastAPI]<br/>Handles payment intents and webhooks."]
    db_payment[("🗄️ Payment Database<br/>[Container: PostgreSQL]<br/>Stores payment transactions.")]

    rating_service["⭐ Rating Service<br/>[Container: FastAPI]<br/>Manages product reviews and ratings."]
    db_rating[("🗄️ Rating Database<br/>[Container: PostgreSQL]<br/>Stores reviews and ratings cache.")]

    rabbitmq{{"📨 Message Broker<br/>[Container: RabbitMQ]<br/>Asynchronous communication bus."}}
    order_worker["⚙️ Order Worker<br/>[Container: Python]<br/>Background worker listening to RabbitMQ to update order statuses."]

    stripe["🏦 Stripe<br/>[External System]<br/>Payment Gateway"]

    customer -->|"Uses [HTTPS]"| spa
    seller -->|"Uses [HTTPS]"| spa
    
    spa -->|"Makes API calls to [JSON/HTTPS]"| api_gateway
    
    api_gateway -->|"Routes to [HTTP]"| auth_service
    api_gateway -->|"Routes to [HTTP]"| product_service
    api_gateway -->|"Routes to [HTTP]"| order_service
    api_gateway -->|"Routes to [HTTP]"| payment_service
    api_gateway -->|"Routes to [HTTP]"| rating_service

    auth_service -->|"Reads/Writes"| db_auth
    product_service -->|"Reads/Writes"| db_product
    product_service -->|"Uses for distributed locks"| redis_cache
    order_service -->|"Reads/Writes"| db_order
    payment_service -->|"Reads/Writes"| db_payment
    rating_service -->|"Reads/Writes"| db_rating
    order_worker -->|"Writes"| db_order

    order_service -->|"Checks and decrements stock [REST/HTTP]"| product_service
    rating_service -->|"Verifies purchase [REST/HTTP]"| order_service
    payment_service -->|"Updates seller premium status [REST/HTTP]"| product_service

    payment_service -->|"Creates PaymentIntent [HTTPS]"| stripe
    stripe -->|"Sends Webhook [HTTPS]"| payment_service

    payment_service -->|"Publishes 'order_paid' event"| rabbitmq
    rabbitmq -->|"Consumes 'order_paid' event"| order_worker

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef container fill:#438dd5,color:#fff,stroke:#2e6295
    classDef database fill:#3b82f6,color:#fff,stroke:#1d4ed8
    classDef ext_system fill:#999999,color:#fff,stroke:#6b6b6b
    classDef queue fill:#e09a34,color:#fff,stroke:#a66c1b
    classDef redis fill:#ef4444,color:#fff,stroke:#b91c1c

    class customer,seller person
    class spa,api_gateway,auth_service,product_service,order_service,payment_service,rating_service,order_worker container
    class db_auth,db_product,db_order,db_payment,db_rating database
    class stripe ext_system
    class rabbitmq queue
    class redis_cache redis
```

### Синхронна взаємодія (REST API / HTTP)
Використовується там, де необхідна миттєва відповідь для користувача або іншого сервісу:
- **API Gateway -> Microservices:** Всі запити від клієнта (фронтенду) проходять через Nginx, який працює як reverse proxy.
- **Order Service -> Product Service:** При оформленні замовлення `order_service` робить синхронний запит до `product_service` для перевірки наявності товарів та синхронного зменшення їх кількості (за допомогою Redis-блокувань, щоб уникнути race conditions).
- **Rating Service -> Order Service:** Перед тим, як дозволити користувачу залишити відгук, `rating_service` перевіряє через HTTP-запит до `order_service`, чи дійсно користувач придбав цей товар.

### Асинхронна взаємодія (RabbitMQ)
Використовується для фонової обробки, де немає необхідності миттєво чекати результату:
- **Payment Service -> RabbitMQ -> Order Worker:** Після того, як `payment_service` підтверджує оплату через Stripe Webhook, він публікує повідомлення в RabbitMQ (черга `order_payments`). `order_worker` (частина `order_service`) отримує це повідомлення і асинхронно оновлює статус замовлення на `PAID`.

### Діаграма взаємодії (Sequence Diagram) - Оформлення та оплата замовлення

```mermaid
sequenceDiagram
    participant C as Client (Frontend)
    participant G as API Gateway
    participant O as Order Service
    participant P as Product Service
    participant Pay as Payment Service
    participant S as Stripe
    participant R as RabbitMQ (Message Broker)
    participant W as Order Worker

    C->>G: POST /api/orders (Create Order)
    G->>O: Forward Request
    O->>P: HTTP POST /products/bulk (Check availability)
    P-->>O: Return product data
    O->>P: HTTP POST /products/{id}/decrement_stock
    P-->>O: Stock updated (Redis Locked)
    O-->>G: Return created Order
    G-->>C: Display Order Data

    C->>G: POST /api/payments/payment-intents (Pay Order)
    G->>Pay: Forward Request
    Pay->>S: Create Stripe PaymentIntent
    S-->>Pay: Client Secret
    Pay-->>G: Return Client Secret
    G-->>C: Handle Stripe Elements

    C->>S: Confirm Payment (from frontend)
    S-->>C: Success
    
    S->>Pay: Stripe Webhook (payment_intent.succeeded)
    Pay->>Pay: Update DB (Status: COMPLETED)
    Pay->>R: Publish Event (order_payments, status=paid)
    R-->>W: Consume Event
    W->>W: Update Order DB (Status: PAID)
```

## 7. Безпека

- **Автентифікація та Авторизація:** Використовується механізм бездержавних сесій через JWT (JSON Web Tokens). Токен генерується в `auth_service` і передається в HTTP-заголовках до інших сервісів для ідентифікації користувача.
- **Ролі та Політики доступу (RBAC):** Доступ до певних ендпоінтів жорстко обмежений ролями (наприклад, тільки `Seller` може затверджувати відправку товару, тільки `Admin` може керувати користувачами).
- **Захист від SQL Injection:** Використання ORM (SQLAlchemy та Django ORM) замість "сирих" SQL-запитів автоматично екранує вхідні параметри, роблячи SQL-ін'єкції неможливими на рівні запитів.
- **Захист від XSS:** FastAPI/Pydantic та Django автоматично валідують та очищають вхідні дані на backend. На стороні frontend React автоматично екранує вивід змінних у DOM, запобігаючи XSS-атакам.
- **Управління секретами:** Усі паролі хешуються (Bcrypt/PBKDF2). Паролі до баз даних, JWT секрети та налаштування RabbitMQ не зберігаються в коді, а прокидаються через `.env` файли (Environment Variables) за принципами 12-factor app.