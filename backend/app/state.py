from typing import NotRequired, TypedDict

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.auth.verifier import StaffTokenVerifier
from app.config import Settings
from app.services.cadence import Cadence
from app.services.notification_budget import BudgetPolicy
from app.services.rate_limit import RateLimitPolicy


class AppState(TypedDict):
    """Resources opened by the lifespan and exposed to requests as ``request.state``."""

    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    rate_limit_policy: RateLimitPolicy
    purge_cadence: Cadence
    notification_budget_policy: BudgetPolicy
    staff_verifier: NotRequired[StaffTokenVerifier]
