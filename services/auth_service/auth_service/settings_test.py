"""SQLite settings for pytest / CI without PostgreSQL."""

from .settings import *  # noqa: F401, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test_auth.sqlite3",
    }
}
