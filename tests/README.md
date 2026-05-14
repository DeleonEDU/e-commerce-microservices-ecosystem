# Глобальні тести репозиторію (`tests/`)

Цей каталог містить **екосистемні** (не сервісні) перевірки. Вони доповнюють `services/*/tests/` і узгоджені з:

- `.cursorrules` — TDD-культура, типізація, моки зовнішніх API (`pytest-mock`, `respx` / `responses`), ізоляція сервісів;
- `.cursor/rules/testing_strategy.md` — `pytest`, заборона реальних викликів Stripe у тестах, мок міжсервісного HTTP;
- `.cursor/rules/architecture.md` — bounded contexts під `services/<name>/`, власні залежності та тести на сервіс;
- `docs/code_quality.md` — згадки про pytest / SOLID як частина контролю документації.

## Що саме перевіряється

| Файл тестів | Зміст |
|-------------|--------|
| `test_repo_layout.py` | Наявність очікуваних мікросервісів, `requirements.txt`, тестових дерев |
| `test_rules_and_docs_markers.py` | Ключові фрази в `architecture.md`, `testing_strategy.md`, `docs/code_quality.md` |
| `test_stripe_policy_in_services.py` | У Python-файлах тестів сервісів немає хостів на кшталт `api.stripe.com` |
| `test_inter_service_http_mocked_with_respx.py` | Приклад перехоплення `httpx` через `respx` (без мережі) |
| `test_pytest_mock_usage.py` | Приклад `pytest-mock` |
| `test_repo_governance_units.py` | Юніт-покриття модуля `repo_governance/` (гілки помилок на тимчасових деревцях файлів) |

Логіка перевірок з типізацією винесена в пакет `repo_governance/` у корені репозиторію.

## Запуск

З кореня репозиторію:

```bash
pip install -r tests/requirements.txt
export PYTHONPATH="$(pwd)"
pytest tests/
```

Звіт покриття для SonarQube / локального HTML (як у стратегії тестування):

```bash
pytest tests/ --cov=repo_governance --cov-report=xml --cov-report=html --cov-fail-under=90
```

У CI пайплайні відповідає job **`test-ecosystem`** у `.github/workflows/ci.yml`.
