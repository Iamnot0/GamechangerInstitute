import logging
from http import HTTPStatus
from typing import Annotated, Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.admin_schemas import (
    EnquiryDetail,
    EnquiryListItem,
    EnquiryPage,
    EnquirySummary,
    StatusChange,
)
from app.api.cursors import decode_cursor
from app.api.staff_actions import log_staff_action
from app.dependencies import EnquiryRepositoryDep, StaffDep, require_json_body, require_staff
from app.domain import EnquiryKind, EnquiryStatus
from app.problems import problem_responses
from app.repositories.enquiries import StatusChangeOutcome

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/enquiries",
    tags=["admin"],
    dependencies=[Depends(require_staff)],
    responses=problem_responses(401, 403, 503),
)

_NOT_FOUND_DETAIL: Final = "This enquiry does not exist."
_CONFLICT_DETAIL: Final = "Someone else changed this enquiry. Reload it and try again."


@router.get("", responses=problem_responses(422))
async def list_enquiries(
    staff: StaffDep,
    repository: EnquiryRepositoryDep,
    status: EnquiryStatus | None = None,
    kind: EnquiryKind | None = None,
    q: Annotated[str | None, Query(max_length=200, description="Matches name, email or organisation.")] = None,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> EnquiryPage:
    page = await repository.page(
        status=status,
        kind=kind,
        search=q.strip() if q and q.strip() else None,
        after=decode_cursor(cursor),
        limit=limit,
    )
    log_staff_action(logger, staff, "list_enquiries")
    return EnquiryPage(
        items=[EnquiryListItem.model_validate(enquiry) for enquiry in page.enquiries],
        next_cursor=page.next_cursor.encode() if page.next_cursor else None,
    )


@router.get("/summary")
async def summarise_enquiries(staff: StaffDep, repository: EnquiryRepositoryDep) -> EnquirySummary:
    counts = await repository.counts()
    log_staff_action(logger, staff, "summarise_enquiries")
    return EnquirySummary(total=sum(counts.by_status.values()), by_status=counts.by_status, by_kind=counts.by_kind)


@router.get("/{enquiry_id}", responses=problem_responses(404, 422))
async def get_enquiry(enquiry_id: UUID, staff: StaffDep, repository: EnquiryRepositoryDep) -> EnquiryDetail:
    enquiry = await repository.detail(enquiry_id)
    if enquiry is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    log_staff_action(logger, staff, "view_enquiry", enquiry_id=enquiry_id)
    return EnquiryDetail.model_validate(enquiry)


@router.patch(
    "/{enquiry_id}",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def change_enquiry_status(
    enquiry_id: UUID, change: StatusChange, staff: StaffDep, repository: EnquiryRepositoryDep
) -> EnquiryDetail:
    outcome = await repository.change_status(
        enquiry_id,
        expected=change.expected_status,
        new=change.status,
        actor_sub=staff.subject,
        actor_email=staff.email,
        note=change.note,
    )
    if outcome is StatusChangeOutcome.NOT_FOUND:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    if outcome is StatusChangeOutcome.CONFLICT:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_CONFLICT_DETAIL)

    log_staff_action(logger, staff, "change_status", enquiry_id=enquiry_id)
    enquiry = await repository.detail(enquiry_id)
    if enquiry is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    return EnquiryDetail.model_validate(enquiry)
