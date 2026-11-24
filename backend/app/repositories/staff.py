import hmac
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Final
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.verifier import StaffMember
from app.domain import StaffRole
from app.models import StaffLoginCode, StaffSession, StaffUser

LOGIN_CODE_TTL: Final = timedelta(minutes=10)
SESSION_TTL: Final = timedelta(days=14)
MAX_CODE_ATTEMPTS: Final = 5


class StaffDeleteOutcome(StrEnum):
    DELETED = "deleted"
    NOT_FOUND = "not_found"
    SELF_DELETE = "self_delete"
    ACTOR_REMOVED = "actor_removed"


class StaffRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_email(self, email: str) -> StaffUser | None:
        return await self._session.scalar(select(StaffUser).where(StaffUser.email == email.lower()))

    async def list_all(self) -> Sequence[StaffUser]:
        rows = await self._session.scalars(select(StaffUser).order_by(StaffUser.created_at.asc(), StaffUser.id.asc()))
        return rows.all()

    async def create_user(self, email: str, role: StaffRole) -> StaffUser | None:
        statement = (
            insert(StaffUser)
            .values(email=email.lower(), role=role.value)
            .on_conflict_do_nothing(index_elements=[StaffUser.email])
            .returning(StaffUser)
        )
        created = await self._session.scalar(statement)
        await self._session.commit()
        return created

    async def delete_user(self, user_id: UUID, *, actor_id: UUID) -> StaffDeleteOutcome:
        """Removes a member on behalf of `actor_id`.

        Both rows are locked, in id order, before anything is deleted. Two administrators removing each other
        therefore queue, and the second finds their own access already gone instead of emptying the table.
        """
        if user_id == actor_id:
            return StaffDeleteOutcome.SELF_DELETE
        held = set(
            await self._session.scalars(
                select(StaffUser.id)
                .where(StaffUser.id.in_([user_id, actor_id]))
                .order_by(StaffUser.id)
                .with_for_update()
            )
        )
        if actor_id not in held or user_id not in held:
            await self._session.rollback()
            return StaffDeleteOutcome.ACTOR_REMOVED if actor_id not in held else StaffDeleteOutcome.NOT_FOUND
        await self._session.execute(delete(StaffUser).where(StaffUser.id == user_id))
        await self._session.commit()
        return StaffDeleteOutcome.DELETED

    async def store_login_code(self, email: str, code_hash: str) -> datetime:
        expires_at = datetime.now(UTC) + LOGIN_CODE_TTL
        statement = (
            insert(StaffLoginCode)
            .values(email=email.lower(), code_hash=code_hash, attempts=0, expires_at=expires_at, created_at=func.now())
            .on_conflict_do_update(
                index_elements=[StaffLoginCode.email],
                set_={
                    "code_hash": code_hash,
                    "attempts": 0,
                    "expires_at": expires_at,
                    "created_at": func.now(),
                },
            )
        )
        await self._session.execute(statement)
        await self._session.commit()
        return expires_at

    async def verify_and_consume_code(self, email: str, candidate_hash: str) -> StaffUser | None:
        normalised = email.lower()
        now = datetime.now(UTC)
        record = await self._session.scalar(
            select(StaffLoginCode).where(StaffLoginCode.email == normalised).with_for_update()
        )
        if record is None:
            return None
        if record.expires_at <= now or record.attempts >= MAX_CODE_ATTEMPTS:
            await self._session.execute(delete(StaffLoginCode).where(StaffLoginCode.email == normalised))
            await self._session.commit()
            return None

        if not hmac.compare_digest(record.code_hash, candidate_hash):
            next_attempts = record.attempts + 1
            if next_attempts >= MAX_CODE_ATTEMPTS:
                await self._session.execute(delete(StaffLoginCode).where(StaffLoginCode.email == normalised))
            else:
                await self._session.execute(
                    update(StaffLoginCode).where(StaffLoginCode.email == normalised).values(attempts=next_attempts)
                )
            await self._session.commit()
            return None

        await self._session.execute(delete(StaffLoginCode).where(StaffLoginCode.email == normalised))
        user = await self._session.scalar(
            update(StaffUser)
            .where(StaffUser.email == normalised)
            .values(last_signed_in_at=func.now())
            .returning(StaffUser)
        )
        await self._session.commit()
        return user

    async def create_session(self, user_id: UUID, token_hash: str) -> datetime:
        now = datetime.now(UTC)
        expires_at = now + SESSION_TTL
        await self._session.execute(delete(StaffLoginCode).where(StaffLoginCode.expires_at <= now))
        await self._session.execute(delete(StaffSession).where(StaffSession.expires_at <= now))
        self._session.add(StaffSession(token_hash=token_hash, user_id=user_id, expires_at=expires_at))
        await self._session.commit()
        return expires_at

    async def resolve_session(self, token_hash: str) -> StaffMember | None:
        statement = (
            select(StaffUser.id, StaffUser.email, StaffUser.role)
            .join(StaffSession, StaffSession.user_id == StaffUser.id)
            .where(StaffSession.token_hash == token_hash, StaffSession.expires_at > func.now())
        )
        row = (await self._session.execute(statement)).one_or_none()
        if row is None:
            return None
        return StaffMember(id=row[0], email=row[1], role=StaffRole(row[2]))

    async def revoke_session(self, token_hash: str) -> None:
        await self._session.execute(delete(StaffSession).where(StaffSession.token_hash == token_hash))
        await self._session.commit()
