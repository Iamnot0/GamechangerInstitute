import logging
from dataclasses import dataclass

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.rate_limit_windows import RateLimitWindows
from app.services.fixed_window import FixedWindow

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class BudgetPolicy:
    key: str
    window: FixedWindow


class NotificationBudget:
    """Caps notification emails across all clients so a distributed flood cannot bury the Institute's inbox.

    The budget never blocks a submission; it only decides whether one more email may go out. Each spend commits on
    its own straight away, so the shared counter is never held locked while an email is sent. If the counter cannot
    be updated the email is sent, since a missed lead costs more than an occasional extra message.
    """

    def __init__(self, session: AsyncSession, policy: BudgetPolicy) -> None:
        self._session = session
        self._policy = policy

    async def spend(self) -> bool:
        try:
            hit = await RateLimitWindows(self._session).hit(self._policy.key, self._policy.window.duration)
            await self._session.commit()
        except SQLAlchemyError as exc:
            await self._session.rollback()
            logger.warning("notification budget unchecked: database error", extra={"error": type(exc).__name__})
            return True
        return hit.count <= self._policy.window.limit
