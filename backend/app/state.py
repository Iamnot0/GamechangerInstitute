from typing import TypedDict

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.config import Settings
from app.services.notifier import EnquiryNotifier
from app.services.rate_limit import FixedWindowRateLimiter


class AppState(TypedDict):
    """Resources opened by the lifespan and exposed to requests as ``request.state``."""

    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    redis: Redis
    rate_limiter: FixedWindowRateLimiter
    notifier: EnquiryNotifier
