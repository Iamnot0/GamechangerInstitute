import hashlib
import hmac
import logging
from dataclasses import dataclass

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.services.fixed_window import FixedWindow, count_hit

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


_ALLOWED = RateLimitDecision(allowed=True)


class FixedWindowRateLimiter:
    """Limits submissions per client in a Redis window that opens on the client's first hit.

    Clients are keyed by an HMAC of their identity, so Redis never holds an IP or a hash that brute force can reverse.
    Clients without a usable identity share one bucket. When Redis is unavailable every hit is allowed: losing an
    enquiry costs more than an unthrottled spell.
    """

    def __init__(self, redis: Redis, *, namespace: str, window: FixedWindow, hash_key: bytes) -> None:
        self._redis = redis
        self._namespace = namespace
        self._window = window
        self._hash_key = hash_key

    async def hit(self, client_identity: str | None) -> RateLimitDecision:
        try:
            count, seconds_left = await count_hit(self._redis, self._client_key(client_identity), self._window)
        except RedisError as exc:
            logger.warning("rate limit skipped: redis unavailable", extra={"error": type(exc).__name__})
            return _ALLOWED

        if count <= self._window.limit:
            return _ALLOWED
        return RateLimitDecision(allowed=False, retry_after_seconds=seconds_left)

    def _client_key(self, client_identity: str | None) -> str:
        if client_identity is None:
            logger.warning("rate limit applied to unknown client")
            return f"{self._namespace}:client:unknown"
        digest = hmac.new(self._hash_key, client_identity.encode(), hashlib.sha256).hexdigest()
        return f"{self._namespace}:client:{digest}"
