from collections.abc import Sequence
from dataclasses import dataclass
from enum import StrEnum
from uuid import UUID

from sqlalchemy import func, or_, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain import CONSENT_VERSION, EnquiryAction, EnquiryKind, EnquiryStatus
from app.models import Enquiry, EnquiryEvent
from app.pagination import PageCursor
from app.schemas import EnquirySubmission


@dataclass(frozen=True, slots=True)
class StoredEnquiry:
    enquiry: Enquiry
    created: bool


@dataclass(frozen=True, slots=True)
class EnquiryPage:
    enquiries: Sequence[Enquiry]
    next_cursor: PageCursor | None


@dataclass(frozen=True, slots=True)
class EnquiryCounts:
    by_status: dict[EnquiryStatus, int]
    by_kind: dict[EnquiryKind, int]


class StatusChangeOutcome(StrEnum):
    CHANGED = "changed"
    CONFLICT = "conflict"
    NOT_FOUND = "not_found"


class EnquiryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, submission: EnquirySubmission, idempotency_key: UUID | None) -> StoredEnquiry:
        statement = (
            insert(Enquiry)
            .values(
                kind=submission.kind,
                full_name=submission.full_name,
                email=submission.email,
                organisation=submission.organisation,
                role_title=submission.role_title,
                role_transition=submission.role_transition,
                cohort_size=submission.cohort_size,
                message=submission.message,
                consent_version=CONSENT_VERSION,
                consent_at=func.now(),
                idempotency_key=idempotency_key,
            )
            .on_conflict_do_nothing(index_elements=[Enquiry.idempotency_key])
            .returning(Enquiry)
        )
        inserted = await self._session.scalar(statement)
        if inserted is None:
            replayed = await self._session.scalars(select(Enquiry).where(Enquiry.idempotency_key == idempotency_key))
            stored = StoredEnquiry(enquiry=replayed.one(), created=False)
        else:
            stored = StoredEnquiry(enquiry=inserted, created=True)
        await self._session.commit()
        return stored

    async def mark_notified(self, enquiry_id: UUID) -> None:
        await self._session.execute(update(Enquiry).where(Enquiry.id == enquiry_id).values(notified_at=func.now()))
        await self._session.commit()

    async def page(
        self,
        *,
        status: EnquiryStatus | None,
        kind: EnquiryKind | None,
        search: str | None,
        after: PageCursor | None,
        limit: int,
    ) -> EnquiryPage:
        statement = select(Enquiry).order_by(Enquiry.created_at.desc(), Enquiry.id.desc()).limit(limit + 1)
        if status is not None:
            statement = statement.where(Enquiry.status == status)
        if kind is not None:
            statement = statement.where(Enquiry.kind == kind)
        if search is not None:
            pattern = f"%{_escape_like(search)}%"
            statement = statement.where(
                or_(
                    Enquiry.full_name.ilike(pattern, escape="\\"),
                    Enquiry.email.ilike(pattern, escape="\\"),
                    Enquiry.organisation.ilike(pattern, escape="\\"),
                )
            )
        if after is not None:
            statement = statement.where(tuple_(Enquiry.created_at, Enquiry.id) < tuple_(after.created_at, after.id))

        rows = (await self._session.scalars(statement)).all()
        if len(rows) <= limit:
            return EnquiryPage(enquiries=rows, next_cursor=None)
        last = rows[limit - 1]
        return EnquiryPage(enquiries=rows[:limit], next_cursor=PageCursor(created_at=last.created_at, id=last.id))

    async def counts(self) -> EnquiryCounts:
        by_status = await self._session.execute(select(Enquiry.status, func.count()).group_by(Enquiry.status))
        by_kind = await self._session.execute(select(Enquiry.kind, func.count()).group_by(Enquiry.kind))
        return EnquiryCounts(
            by_status={status: 0 for status in EnquiryStatus} | {EnquiryStatus(row[0]): row[1] for row in by_status},
            by_kind={kind: 0 for kind in EnquiryKind} | {EnquiryKind(row[0]): row[1] for row in by_kind},
        )

    async def detail(self, enquiry_id: UUID) -> Enquiry | None:
        statement = (
            select(Enquiry)
            .where(Enquiry.id == enquiry_id)
            .options(selectinload(Enquiry.events))
            .execution_options(populate_existing=True)
        )
        return await self._session.scalar(statement)

    async def change_status(
        self,
        enquiry_id: UUID,
        *,
        expected: EnquiryStatus,
        new: EnquiryStatus,
        actor_sub: str,
        actor_email: str | None,
        note: str | None,
    ) -> StatusChangeOutcome:
        changed = await self._session.scalar(
            update(Enquiry)
            .where(Enquiry.id == enquiry_id, Enquiry.status == expected)
            .values(status=new)
            .returning(Enquiry.id)
        )
        if changed is None:
            exists = await self._session.scalar(select(Enquiry.id).where(Enquiry.id == enquiry_id))
            await self._session.rollback()
            return StatusChangeOutcome.NOT_FOUND if exists is None else StatusChangeOutcome.CONFLICT

        self._session.add(
            EnquiryEvent(
                enquiry_id=enquiry_id,
                actor_sub=actor_sub,
                actor_email=actor_email,
                action=EnquiryAction.STATUS_CHANGED,
                from_status=expected,
                to_status=new,
                note=note,
            )
        )
        await self._session.commit()
        return StatusChangeOutcome.CHANGED


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
