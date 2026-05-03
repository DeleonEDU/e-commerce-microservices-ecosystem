# E-commerce Microservices Ecosystem

[![CI Pipeline](https://github.com/DeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/DeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml)

## 📖 Документація (Documentation)

Повна документація до проєкту (згідно з академічними вимогами курсу) знаходиться у папці `/docs/`. 
Будь ласка, ознайомтесь з:
1. [Архітектурою, Шаблонами та БД (Layered Architecture, Repository, SOLID, ER Diagram)](./docs/architecture.md)
2. [Якість коду, Тестування та Рефакторинг](./docs/code_quality.md)
3. [DevOps, CI/CD, Docker та Розгортання](./docs/deployment.md)

## Frontend (React SPA)

### Структура проекту
```text
src/
├── api/             # RTK Query API slices (authApiSlice, productApiSlice, etc.)
├── components/      # Спільні UI компоненти (ProductCard, PaymentModal, etc.)
│   └── ui/          # Базові компоненти (Button, AlertModal)
├── features/        # Логіка за фічами (auth, cart, favorites)
├── pages/           # Компоненти сторінок (CatalogPage, DashboardPage, etc.)
├── store/           # Конфігурація Redux Store (store.ts, apiSlice.ts)
├── types/           # TypeScript інтерфейси (product.ts, user.ts, etc.)
├── utils/           # Допоміжні функції (format.ts, cn.ts)
├── App.tsx          # Головний компонент та роутинг
├── index.css        # Глобальні стилі (Tailwind)
└── main.tsx         # Точка входу
```

### Інструкція із запуску Frontend
1. Встановіть залежності: `npm install`
2. Запустіть в режимі розробки: `npm run dev`
3. Додаток буде доступний на `http://localhost:3000`.

---

## Бекенд (Microservices)

### Структура проекту
```text
.
├── services/
│   ├── auth_service/        # Django DRF (Auth & Users)
│   │   ├── auth_service/
│   │   │   ├── settings.py
│   │   │   └── urls.py
│   │   ├── users/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── urls.py
│   │   ├── tests/           # Unit та Integration тести
│   │   └── requirements.txt
│   ├── product_service/     # Django DRF (Catalog)
│   │   ├── product_service/
│   │   │   ├── settings.py
│   │   │   └── urls.py
│   │   ├── catalog/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   └── views.py
│   │   ├── tests/           # Unit та Integration тести
│   │   └── requirements.txt
│   ├── order_service/       # FastAPI (Orders & Cart)
│   │   ├── main.py
│   │   ├── worker.py          # RabbitMQ Consumer
│   │   ├── service.py         # Бізнес логіка
│   │   ├── repository.py      # Патерн Repository
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── redis_client.py
│   │   ├── tests/           # Unit, Integration, E2E тести
│   │   └── requirements.txt
│   ├── payment_service/     # FastAPI (Stripe & Subscriptions)
│   │   ├── main.py
│   │   ├── service.py         # Бізнес логіка
│   │   ├── repository.py      # Патерн Repository
│   │   ├── rabbitmq_client.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── tests/           # Unit, Integration, E2E тести
│   │   └── requirements.txt
│   ├── rating_service/      # FastAPI (Reviews & Ratings)
│   │   ├── main.py
│   │   ├── service.py         # Бізнес логіка
│   │   ├── repository.py      # Патерн Repository
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── tests/           # Unit, Integration, E2E тести
│   │   └── requirements.txt
├── gateway/                 # Nginx API Gateway
│   └── nginx.conf           # Конфігурація маршрутизації
├── scripts/                 # Допоміжні скрипти
│   └── init-db.sh           # Скрипт ініціалізації БД
├── docs/                    # Документація проекту
│   ├── architecture.md      # Архітектура, патерни та БД
│   ├── code_quality.md      # Якість коду та тестування
│   └── deployment.md        # CI/CD, DevOps
├── .github/workflows/       # CI/CD пайплайни
│   └── ci.yml
├── docker-compose.yml       # Спільна інфраструктура
├── .env.example             # Приклад змінних оточення
└── README.md
```

### Інструкція із запуску інфраструктури

1. **Налаштування змінних оточення:**
   Скопіюйте `.env.example` у `.env` та налаштуйте паролі (за замовчуванням встановлено `postgres/postgres` та `guest/guest`).

2. **Запуск всієї системи:**
   Виконайте команду в корені проекту:
   ```bash
   docker-compose up --build -d
   ```
   Це автоматично збере образи для кожного мікросервісу та запустить їх разом з інфраструктурою.