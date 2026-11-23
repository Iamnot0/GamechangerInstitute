import asyncio
import logging
import time
from collections.abc import Callable

import httpx
import jwt

logger = logging.getLogger(__name__)


class SigningKeysUnavailableError(Exception):
    """The identity provider's signing keys have never been loaded, so no token can be checked."""


class JwksCache:
    """Keeps the identity provider's signing keys in memory.

    Keys load on first use, then reload when older than ``max_age_seconds`` or when a token names an unknown key. Load
    attempts happen at most once per ``min_reload_interval_seconds``, so neither forged key ids nor a provider outage
    turn requests into fetches. A failed reload keeps serving the keys already held.
    """

    def __init__(
        self,
        url: str,
        http: httpx.AsyncClient,
        *,
        max_age_seconds: float = 3600,
        min_reload_interval_seconds: float = 60,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._url = url
        self._http = http
        self._max_age_seconds = max_age_seconds
        self._min_reload_interval_seconds = min_reload_interval_seconds
        self._clock = clock
        self._keys: dict[str, jwt.PyJWK] = {}
        self._loaded_at: float | None = None
        self._attempted_at: float | None = None
        self._lock = asyncio.Lock()

    async def signing_key(self, kid: str) -> jwt.PyJWK | None:
        now = self._clock()
        stale = self._loaded_at is None or now - self._loaded_at >= self._max_age_seconds
        reload_allowed = self._attempted_at is None or now - self._attempted_at >= self._min_reload_interval_seconds
        if (stale or kid not in self._keys) and reload_allowed:
            await self._reload(requested_at=now)
        if self._loaded_at is None:
            raise SigningKeysUnavailableError
        return self._keys.get(kid)

    async def _reload(self, *, requested_at: float) -> None:
        async with self._lock:
            if self._attempted_at is not None and self._attempted_at >= requested_at:
                return
            self._attempted_at = self._clock()
            try:
                response = await self._http.get(self._url)
                response.raise_for_status()
                keys = _signing_keys(response.json())
            except (httpx.HTTPError, ValueError, jwt.PyJWTError) as exc:
                logger.error("signing keys could not be loaded", extra={"error": type(exc).__name__})
                return
            self._keys = keys
            self._loaded_at = self._attempted_at


def _signing_keys(document: object) -> dict[str, jwt.PyJWK]:
    if not isinstance(document, dict):
        raise ValueError("JWKS document must be a JSON object")
    key_set = jwt.PyJWKSet.from_dict(document)
    return {key.key_id: key for key in key_set.keys if key.key_id and key.public_key_use in (None, "sig")}
