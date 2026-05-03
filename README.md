# E-commerce Microservices Ecosystem

[![CI Pipeline](https://github.comDeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/DeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml)

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
├── api/             # RTK Query API slices
├── components/      # Спільні UI компоненти
├── features/        # Логіка за фічами (auth, cart, catalog)
├── pages/           # Компоненти сторінок
├── store/           # Конфігурація Redux Store
├── types/           # TypeScript інтерфейси
├── utils/           # Допоміжні функції
├── App.tsx          # Головний компонент та роутинг
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
│   │   └── requirements.txt
│   ├── product_service/     # Django DRF (Catalog)
│   │   ├── product_service/
│   │   │   ├── settings.py
│   │   │   └── urls.py
│   │   ├── catalog/
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   └── views.py
│   │   └── requirements.txt
│   ├── order_service/       # FastAPI (Orders & Cart)
│   │   ├── main.py
│   │   ├── worker.py          # RabbitMQ Consumer
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   ├── redis_client.py
│   │   └── requirements.txt
│   ├── payment_service/     # FastAPI (Stripe & Subscriptions)
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── requirements.txt
│   ├── rating_service/      # FastAPI (Reviews & Ratings)
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── database.py
│   │   └── requirements.txt
├── gateway/                 # Nginx API Gateway
│   └── nginx.conf           # Конфігурація маршрутизації
├── scripts/
│   └── init-db.sh           # Скрипт ініціалізації БД
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

3. **Перевірка:**
   - **Gateway:** `http://localhost` (порт 80)
   - **RabbitMQ Management:** `http://localhost:15672`

---
**Наступний крок:** Який мікросервіс ми будемо розробляти наступним?
- Auth & User Service (Django DRF)
- Product Service (Django DRF)
- Order Service (FastAPI)
- Payment Service (FastAPI)
