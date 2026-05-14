# E-commerce Microservices Ecosystem

[![CI Pipeline](https://github.com/DeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml/badge.svg)](https://github.com/DeleonEDU/e-commerce-microservices-ecosystem/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DeleonEDU_e-commerce-microservices-ecosystem&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DeleonEDU_e-commerce-microservices-ecosystem)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DeleonEDU_e-commerce-microservices-ecosystem&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DeleonEDU_e-commerce-microservices-ecosystem)

Цей проєкт є екосистемою мікросервісів для E-commerce платформи, розробленою з використанням підходів чистої архітектури, патернів проєктування (GoF), SOLID та Test-Driven Development (TDD). Також тут впроваджено автономні AI-правила для генерації коду, CI/CD з аналізом якості через SonarQube.

## 📖 Документація

Детальна документація проєкту знаходиться у папці `/docs/`:
1. [Архітектура, Шаблони та БД](./docs/architecture.md)
2. [Якість коду, Тестування та Рефакторинг](./docs/code_quality.md)
3. [DevOps, CI/CD, Docker та Розгортання](./docs/deployment.md)

Звіт про виконану роботу: [project_report.md](./project_report.md).

## 🏛 Архітектура та Патерни (Етап 2)

- **Layered Architecture**: Розділення коду на логічні шари: Models, Services, Schemas/DTO, Repositories.
- **In-Memory Repositories**: Використовуються для ізоляції баз даних між мікросервісами та спрощення модульного тестування (`test.db`, `test_e2e.db`).
- **Патерни (GoF)**:
  - **Strategy**: Реалізовано різні алгоритми для системи рейтингів/ранжування (`RankingStrategy` в каталозі).
  - **Observer**: Система сповіщень при зміні статусів замовлення (`OrderObserver`).
- **SOLID**: Чітке дотримання інверсії залежностей та ізоляції бізнес-логіки.

## 🤖 AI-Driven Setup (Етап 3)

Проєкт містить конфігурацію для автономних ШІ-агентів (Cursor, Claude, Copilot):
- **`.cursorrules`**: Глобальні заборони та вимоги щодо написання коду (TDD, Pydantic, відсутність прямих викликів зовнішніх API).
- **`.cursor/rules/architecture.md`**: Контекст щодо In-Memory архітектури та ізоляції баз даних.
- **`.cursor/rules/testing_strategy.md`**: Правила генерування модульних тестів та звітів покриття (pytest, pytest-cov).

## 🧪 Тестування та Бізнес-логіка (Етап 4)

- **Модульне та Інтеграційне тестування**: Розроблено розширену базу з понад 200 модульних/інтеграційних тестів для покриття Edge Cases.
- **Мокування API**: Жодних реальних запитів до зовнішніх сервісів (Stripe тощо) у тестовому середовищі. Використані `pytest-mock`, `respx`.
- **Test Reports**: Згенеровані звіти зберігаються як у форматі `coverage.xml` (для SonarQube), так і в HTML (`htmlcov/`) для візуального аналізу непокритих рядків.

## 🚀 CI/CD, SonarQube та Artifacts (Етап 5)

- **GitHub Actions Пайплайн**: Налаштовано `.github/workflows/ci.yml`. При пушах та PR-ах автоматично запускаються процеси збірки (Build) та тестування (Test).
- **Збереження Артефактів**: Всі згенеровані HTML/XML звіти про тести зберігаються в CI/CD Artifacts як ZIP-архіви і доступні для завантаження будь-якому учаснику команди.
- **Quality Gate**: Інтеграція зі статичним аналізатором коду SonarCloud. Пайплайн блокує PR у випадку невідповідності Quality Gate (якщо покриття тестами падає нижче 70%).

---

## 📂 Структура репозиторію

```text
|-- .cursor/                  
|   |-- rules/                # AI-контекст та правила
|   |   |-- architecture.md
|   |   |-- testing_strategy.md
|-- .github/
|   |-- workflows/
|   |   |-- ci.yml            # CI/CD пайплайн з SonarQube
|-- docs/                     # Документація проєкту
|-- frontend/                 # React SPA 
|-- gateway/                  # API Gateway (Nginx)
|-- scripts/                  # Допоміжні bash-скрипти
|-- services/                 # Backend мікросервіси
|   |-- auth_service/         # Сервіс автентифікації
|   |-- order_service/        # Сервіс замовлень
|   |-- payment_service/      # Сервіс платежів
|   |-- product_service/      # Сервіс каталогу продуктів
|   |-- rating_service/       # Сервіс рейтингів
|   |   |-- models.py         # Моделі даних
|   |   |-- schemas.py        # DTO (Pydantic)
|   |   |-- repository.py     # In-Memory Database патерн
|   |   |-- service.py        # Бізнес-логіка
|   |   |-- tests/            # 200+ модульних та інтеграційних тестів
|-- repo_governance/          # Допоміжні перевірки для кореневого pytest (типізований Python)
|-- tests/                    # Глобальні pytest: структура репо, правила `.cursor/rules`, Stripe/respx
|-- .cursorrules              # Системні ШІ-інструкції (TDD, SOLID)
|-- docker-compose.yml        # Конфігурація інфраструктури
|-- sonar-project.properties  # Налаштування SonarQube
|-- project_report.md         # Звіт про виконання
|-- README.md                 # Головний опис проєкту
```

## 🛠 Інструкція із запуску

### Запуск інфраструктури та мікросервісів локально

1. **Налаштування змінних оточення:**
   Скопіюйте `.env.example` у `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Запуск за допомогою Docker Compose:**
   ```bash
   docker-compose up --build -d
   ```
   Це автоматично збере образи для кожного мікросервісу та запустить їх у фоновому режимі.

### Запуск тестів та генерація звітів (локально)

Для запуску тестів у конкретному сервісі та генерування HTML/XML звітів (наприклад, для `payment_service`):
```bash
cd services/payment_service
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ --cov=. --cov-report=xml --cov-report=html
```
Після виконання HTML звіт буде доступний у папці `htmlcov/index.html`.

### Глобальні (екосистемні) тести в корені репозиторію

Ці тести доповнюють сервісні suite: перевіряють структуру `services/`, наявність ключових маркерів у `.cursor/rules/*.md` та `docs/code_quality.md`, заборону «живих» хостів Stripe у файлах тестів сервісів, а також демонструють `pytest-mock` і `respx` згідно з `.cursorrules` і `testing_strategy.md`. Деталі — у [tests/README.md](./tests/README.md).

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tests/requirements.txt
export PYTHONPATH="$(pwd)"
pytest tests/ --cov=repo_governance --cov-report=xml --cov-report=html --cov-fail-under=90
```
