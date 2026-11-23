from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import Integer, case, cast, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RateLimitWindow


@dataclass(frozen=True, slots=True)
class WindowHit:
    count: int
    seconds_left: int


class RateLimitWindows:
    """Fixed windows counted in PostgreSQL against the database clock, so every app instance agrees on time."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def hit(self, key: str, window: timedelta) -> WindowHit:
        """Counts one hit in a single atomic upsert; a window that has run out restarts at 1."""
        proposed = insert(RateLimitWindow).values(key=key, count=1, expires_at=func.now() + window)
        expired = RateLimitWindow.expires_at <= func.now()
        statement = proposed.on_conflict_do_update(
            index_elements=[RateLimitWindow.key],
            set_={
                RateLimitWindow.count: case((expired, 1), else_=RateLimitWindow.count + 1),
                RateLimitWindow.expires_at: case(
                    (expired, proposed.excluded.expires_at), else_=RateLimitWindow.expires_at
                ),
            },
        ).returning(
            RateLimitWindow.count,
            cast(func.ceil(func.extract("epoch", RateLimitWindow.expires_at - func.now())), Integer),
        )
        count, seconds_left = (await self._session.execute(statement)).one()
        return WindowHit(count=count, seconds_left=seconds_left)

    async def purge_expired(self, *, expired_for: timedelta, batch_size: int) -> int:
        """Deletes up to ``batch_size`` windows that ran out more than ``expired_for`` ago, skipping locked rows."""
        doomed = (
            select(RateLimitWindow.key)
            .where(RateLimitWindow.expires_at < func.now() - expired_for)
            .order_by(RateLimitWindow.expires_at)
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
        statement = (
            delete(RateLimitWindow)
            .where(RateLimitWindow.key.in_(doomed.scalar_subquery()))
            .returning(RateLimitWindow.key)
            .execution_options(synchronize_session=False)
        )
        return len((await self._session.scalars(statement)).all())
