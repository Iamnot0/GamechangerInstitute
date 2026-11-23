import hashlib
import hmac
import logging
from dataclasses import dataclass
from enum import StrEnum

from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)


class RateLimitScope(StrEnum):
    CLIENT = "client"
    GLOBAL = "global"


@dataclass(frozen=True, slots=True)
class FixedWindow:
    limit: int
    seconds: int


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    exceeded: RateLimitScope | None = None
    retry_after_seconds: int = 0


_ALLOWED = RateLimitDecision()


class FixedWindowRateLimiter:
    """Applies a per-client window and then a global window, each opening on its first hit, counted in Redis.

    Clients are keyed by an HMAC of their identity, so Redis never holds an IP or a hash that brute force can reverse.
    Clients without a usable identity share one bucket. Only hits that pass the client window count towards the global
    window, so a single noisy client cannot exhaust it. When Redis is unavailable every hit is allowed: losing an
    enquiry costs more than an unthrottled spell.
    """

    def __init__(
        self, redis: Redis, *, namespace: str, per_client: FixedWindow, overall: FixedWindow, hash_key: bytes
    ) -> None:
        self._redis = redis
        self._namespace = namespace
        self._per_client = per_client
        self._overall = overall
        self._hash_key = hash_key

    async def hit(self, client_identity: str | None) -> RateLimitDecision:
        try:
            client_count, client_ttl = await self._increment(self._client_key(client_identity), self._per_client)
            if client_count > self._per_client.limit:
                return _blocked(RateLimitScope.CLIENT, client_ttl, self._per_client)

            overall_count, overall_ttl = await self._increment(f"{self._namespace}:global", self._overall)
        except RedisError as exc:
            logger.warning("rate limit skipped: redis unavailable", extra={"error": type(exc).__name__})
            return _ALLOWED

        if overall_count > self._overall.limit:
            logger.warning("global rate limit reached")
            return _blocked(RateLimitScope.GLOBAL, overall_ttl, self._overall)
        return _ALLOWED

    def _client_key(self, client_identity: str | None) -> str:
        if client_identity is None:
            logger.warning("rate limit applied to unknown client")
            return f"{self._namespace}:client:unknown"
        digest = hmac.new(self._hash_key, client_identity.encode(), hashlib.sha256).hexdigest()
        return f"{self._namespace}:client:{digest}"

    async def _increment(self, key: str, window: FixedWindow) -> tuple[int, int]:
        async with self._redis.pipeline(transaction=True) as pipeline:
            pipeline.incr(key)
            pipeline.expire(key, window.seconds, nx=True)
            pipeline.ttl(key)
            count, _, ttl = await pipeline.execute()
        return int(count), int(ttl)


def _blocked(scope: RateLimitScope, ttl: int, window: FixedWindow) -> RateLimitDecision:
    return RateLimitDecision(exceeded=scope, retry_after_seconds=ttl if ttl > 0 else window.seconds)
