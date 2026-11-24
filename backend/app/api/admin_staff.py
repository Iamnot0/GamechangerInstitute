import logging
from http import HTTPStatus
from typing import Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.staff_actions import log_staff_action
from app.dependencies import AdminDep, AuthMailerDep, StaffRepositoryDep, require_admin, require_json_body
from app.problems import problem_responses
from app.repositories.staff import StaffDeleteOutcome
from app.staff_schemas import CreateStaffUser, StaffUserItem, StaffUserList

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/staff",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
    responses=problem_responses(401, 403),
)

_ALREADY_EXISTS_DETAIL: Final = "A staff member with that email address already has access."
_NOT_FOUND_DETAIL: Final = "This staff member does not exist."
_SELF_DELETE_DETAIL: Final = "You cannot remove your own staff access."
_ACCESS_ENDED_DETAIL: Final = "Your staff access has been removed. Sign in again."


@router.get("")
async def list_staff(admin: AdminDep, repository: StaffRepositoryDep) -> StaffUserList:
    users = await repository.list_all()
    log_staff_action(logger, admin, "list_staff")
    return StaffUserList(items=[StaffUserItem.model_validate(user) for user in users])


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 409, 413, 415, 422),
)
async def add_staff(
    submission: CreateStaffUser,
    admin: AdminDep,
    repository: StaffRepositoryDep,
    mailer: AuthMailerDep,
) -> StaffUserItem:
    created = await repository.create_user(submission.email, submission.role)
    if created is None:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_ALREADY_EXISTS_DETAIL)
    await mailer.send_invitation(created.email, created.role)
    log_staff_action(logger, admin, "add_staff", staff_user_id=created.id)
    return StaffUserItem.model_validate(created)


@router.delete("/{user_id}", status_code=HTTPStatus.NO_CONTENT, responses=problem_responses(404, 409, 422))
async def remove_staff(user_id: UUID, admin: AdminDep, repository: StaffRepositoryDep) -> None:
    outcome = await repository.delete_user(user_id, actor_id=admin.id)
    if outcome is StaffDeleteOutcome.SELF_DELETE:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_SELF_DELETE_DETAIL)
    if outcome is StaffDeleteOutcome.NOT_FOUND:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    if outcome is StaffDeleteOutcome.ACTOR_REMOVED:
        raise HTTPException(
            status_code=HTTPStatus.UNAUTHORIZED,
            detail=_ACCESS_ENDED_DETAIL,
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    log_staff_action(logger, admin, "remove_staff", staff_user_id=user_id)
