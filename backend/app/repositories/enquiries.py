from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain import CONSENT_VERSION
from app.models import Enquiry
from app.schemas import EnquirySubmission


@dataclass(frozen=True, slots=True)
class StoredEnquiry:
    enquiry: Enquiry
    created: bool


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
