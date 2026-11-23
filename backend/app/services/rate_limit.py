import hashlib
import hmac
import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Final

from app.repositories.rate_limit_windows import RateLimitWindows
from app.services.cadence import Cadence
from app.services.fixed_window import FixedWindow

logger = logging.getLogger(__name__)

_PURGE_EXPIRED_FOR: Final = timedelta(days=1)
_PURGE_BATCH_SIZE: Final = 500


@dataclass(frozen=True, slots=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


@dataclass(frozen=True, slots=True)
class RateLimitPolicy:
    namespace: str
    window: FixedWindow
    hash_key: bytes = field(repr=False)


class FixedWindowRateLimiter:
    """Limits submissions per client in a PostgreSQL window that opens on the client's first hit.

    Clients are keyed by an HMAC of their identity, so the database never holds an IP or a hash that brute force can
    reverse. Clients without a usable identity share one bucket. The hit joins the caller's transaction, so a request
    that fails or is refused leaves no count behind. Now and then a hit also purges windows that expired long ago.
    """

    def __init__(self, windows: RateLimitWindows, policy: RateLimitPolicy, purge_cadence: Cadence) -> None:
        self._windows = windows
        self._policy = policy
        self._purge_cadence = purge_cadence

    async def hit(self, client_identity: str | None) -> RateLimitDecision:
        hit = await self._windows.hit(self._client_key(client_identity), self._policy.window.duration)
        if self._purge_cadence.due():
            purged = await self._windows.purge_expired(expired_for=_PURGE_EXPIRED_FOR, batch_size=_PURGE_BATCH_SIZE)
            if purged:
                logger.info("expired rate-limit windows purged", extra={"purged": purged})
        if hit.count <= self._policy.window.limit:
            return RateLimitDecision(allowed=True)
        return RateLimitDecision(allowed=False, retry_after_seconds=max(hit.seconds_left, 1))

    def _client_key(self, client_identity: str | None) -> str:
        if client_identity is None:
            logger.warning("rate limit applied to unknown client")
            return f"{self._policy.namespace}:client:unknown"
        digest = hmac.new(self._policy.hash_key, client_identity.encode(), hashlib.sha256).hexdigest()
        return f"{self._policy.namespace}:client:{digest}"
