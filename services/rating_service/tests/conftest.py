import os

# Applied before importing app modules so database.py binds to SQLite in tests.
os.environ.setdefault("RATING_DATABASE_URL", "sqlite:///:memory:")
