import logging

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.services.fixed_window import FixedWindow, count_hit

logger = logging.getLogger(__name__)


class NotificationBudget:
    """Caps notification emails across all clients so a distributed flood cannot bury the Institute's inbox.

    The budget never blocks a submission; it only decides whether one more email may go out. When Redis is
    unavailable the email is sent, since a missed lead costs more than an occasional extra message.
    """

    def __init__(self, redis: Redis, *, key: str, window: FixedWindow) -> None:
        self._redis = redis
        self._key = key
        self._window = window

    async def spend(self) -> bool:
        try:
            count, _ = await count_hit(self._redis, self._key, self._window)
        except RedisError as exc:
            logger.warning("notification budget unchecked: redis unavailable", extra={"error": type(exc).__name__})
            return True
        return count <= self._window.limit
