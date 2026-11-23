from typing import Final

from redis.asyncio import Redis

from app.config import Settings

_TIMEOUT_SECONDS: Final = 1.0
_HEALTH_CHECK_INTERVAL_SECONDS: Final = 30


def create_redis_client(settings: Settings) -> Redis:
    """Uses TLS for rediss:// URLs; health checks replace connections dropped while a serverless instance idled."""
    return Redis.from_url(
        str(settings.redis_url),
        socket_connect_timeout=_TIMEOUT_SECONDS,
        socket_timeout=_TIMEOUT_SECONDS,
        health_check_interval=_HEALTH_CHECK_INTERVAL_SECONDS,
    )
