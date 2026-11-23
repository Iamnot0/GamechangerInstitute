import hashlib
import hmac
import logging
from dataclasses import dataclass

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


_ALLOWED = RateLimitDecision(allowed=True)


class FixedWindowRateLimiter:
    """Counts hits per client in Redis windows that open on the first hit; fails open when Redis is unavailable.

    Clients are keyed by an HMAC of their IP, so Redis never holds an IP or a hash that brute force can reverse.
    """

    def __init__(self, redis: Redis, *, namespace: str, limit: int, window_seconds: int, hash_key: bytes) -> None:
        self._redis = redis
        self._namespace = namespace
        self._limit = limit
        self._window_seconds = window_seconds
        self._hash_key = hash_key

    async def hit(self, client_ip: str | None) -> RateLimitDecision:
        if client_ip is None:
            logger.warning("rate limit skipped: client address unknown")
            return _ALLOWED

        key = f"{self._namespace}:{hmac.new(self._hash_key, client_ip.encode(), hashlib.sha256).hexdigest()}"
        try:
            async with self._redis.pipeline(transaction=True) as pipeline:
                pipeline.incr(key)
                pipeline.expire(key, self._window_seconds, nx=True)
                pipeline.ttl(key)
                count, _, ttl = await pipeline.execute()
        except RedisError as exc:
            logger.warning("rate limit skipped: redis unavailable", extra={"error": type(exc).__name__})
            return _ALLOWED

        if count <= self._limit:
            return _ALLOWED
        return RateLimitDecision(allowed=False, retry_after_seconds=ttl if ttl > 0 else self._window_seconds)
