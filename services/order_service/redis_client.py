import redis
import os
import time
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))

redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

@contextmanager
def distributed_lock(lock_name: str, expire: int = 10):
    """
    Проста реалізація розподіленого блокування через Redis.
    """
    lock_id = str(time.time())
    acquired = False
    try:
        acquired = bool(redis_client.set(lock_name, lock_id, ex=expire, nx=True))
        yield acquired
    finally:
        if acquired and redis_client.get(lock_name) == lock_id:
            redis_client.delete(lock_name)
