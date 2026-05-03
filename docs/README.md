# E-commerce Microservices Ecosystem - Документація

Цей каталог містить вичерпну документацію щодо архітектури, якості коду та процесів розгортання проєкту. Система розроблена як сучасна платформа електронної комерції з використанням мікросервісного підходу.

## 📑 Зміст документації

1. [Архітектура, Шаблони та Бази Даних (architecture.md)](./architecture.md)
   - Детальний опис кожного мікросервісу та їх обов'язків.
   - Архітектурний стиль (Microservices, Layered Architecture, MVC).
   - Шаблони проєктування (Repository, Singleton, Dependency Injection).
   - Аналіз дотримання принципів SOLID.
   - Структура бази даних, ER-діаграма та Database-per-service підхід.
   - Механізми безпеки (JWT, RBAC, XSS/SQL Injection protection).
   - Діаграма взаємодії компонентів (Sequence & Component diagrams).
2. [Забезпечення якості коду (code_quality.md)](./code_quality.md)
   - Ідентифікація запахів коду (Code Smells) та їх усунення.
   - Рефакторинг згідно Clean Code (виділення Service / Repository шарів).
   - Тестування: Модульне (Unit) та Інтеграційне за допомогою PyTest та моків.
   - Статичний аналіз (Лінтери).
3. [DevOps, CI/CD, Docker та Розгортання (deployment.md)](./deployment.md)
   - Контейнеризація за допомогою Docker та docker-compose.
   - Налаштування безперервної інтеграції (CI) через GitHub Actions.
   - Покрокові інструкції з локального розгортання та міграцій.
   - Стратегія розгалуження (GitFlow).

## Опис системи
Проєкт є повноцінною платформою електронної комерції (маркетплейсом), розділеною на незалежні мікросервіси. 
Бекенд написаний на **Python** з використанням:
- **FastAPI** (`order_service`, `payment_service`, `rating_service`) - для високої продуктивності та асинхронності.
- **Django/DRF** (`auth_service`, `product_service`) - для швидкої розробки складних адмін-панелей та управління сутностями.

Фронтенд реалізований як Single Page Application (SPA) на **React** та **TypeScript** (з Vite та Tailwind CSS). 
Кожен сервіс взаємодіє з іншими через HTTP/REST API (синхронно) та RabbitMQ (асинхронно). В якості єдиної точки входу (API Gateway) використовується **Nginx**.

## 📖 OpenAPI / Swagger Документація API

FastAPI автоматично генерує живу документацію OpenAPI (Swagger).
Після розгортання системи (див. [deployment.md](./deployment.md)), документацію для API мікросервісів можна переглянути за наступними адресами (прокинуті порти вказані в `docker-compose.yml`):
- **Order Service:** `http://localhost:8002/docs`
- **Payment Service:** `http://localhost:8004/docs`
- **Rating Service:** `http://localhost:8005/docs`
