import logging
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.dependencies import (
    ClientIdentityDep,
    EnquiryRepositoryDep,
    NotifierDep,
    RateLimiterDep,
    require_json_body,
)
from app.problems import PROBLEM_RESPONSES
from app.schemas import EnquiryReceipt, EnquirySubmission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/enquiries", tags=["enquiries"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_json_body)],
    responses=PROBLEM_RESPONSES,
)
async def submit_enquiry(
    submission: EnquirySubmission,
    client_identity: ClientIdentityDep,
    repository: EnquiryRepositoryDep,
    rate_limiter: RateLimiterDep,
    notifier: NotifierDep,
    idempotency_key: Annotated[uuid.UUID | None, Header(alias="Idempotency-Key")] = None,
) -> EnquiryReceipt:
    if submission.is_honeypot_filled:
        logger.info("honeypot")
        return EnquiryReceipt(id=uuid.uuid7(), received_at=datetime.now(UTC))

    decision = await rate_limiter.hit(client_identity)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many enquiries from this network. Please try again later.",
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    stored = await repository.add(submission, idempotency_key)
    logger.info(
        "enquiry accepted",
        extra={"enquiry_id": str(stored.enquiry.id), "kind": stored.enquiry.kind, "replayed": not stored.created},
    )
    if stored.created:
        # Serverless runtimes may freeze the instance once the response is sent, so the email goes out first.
        await notifier.notify(stored.enquiry)
    return EnquiryReceipt(id=stored.enquiry.id, received_at=stored.enquiry.created_at)
