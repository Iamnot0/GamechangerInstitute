import logging
from http import HTTPStatus
from typing import Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.staff_actions import log_staff_action
from app.dependencies import MediaAllowedHostsDep, PhotoRepositoryDep, StaffDep, require_json_body, require_staff
from app.media_urls import is_stored_file_url
from app.models import MediaAsset
from app.photo_schemas import PhotoSubmission, StoredPhoto
from app.problems import InvalidField, invalid_fields, problem_responses
from app.repositories.photos import PhotoDeletionOutcome

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/photos",
    tags=["admin"],
    dependencies=[Depends(require_staff)],
    responses=problem_responses(401, 403, 503),
)

_URL_FIELD: Final = ("url",)


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 413, 415, 422),
)
async def add_photo(
    submission: PhotoSubmission, staff: StaffDep, photos: PhotoRepositoryDep, allowed_hosts: MediaAllowedHostsDep
) -> StoredPhoto:
    if not is_stored_file_url(submission.url, allowed_hosts):
        raise invalid_fields(InvalidField(_URL_FIELD, "image_host", "Use a photo uploaded from the post form."))
    photo = await photos.add(
        MediaAsset(
            url=submission.url,
            content_type=submission.content_type,
            size_bytes=submission.size_bytes,
            width=submission.width,
            height=submission.height,
            alt=submission.alt,
        ),
        actor_sub=staff.subject,
        actor_email=staff.email,
    )
    if photo is None:
        raise invalid_fields(InvalidField(_URL_FIELD, "photo_duplicate", "This photo is already uploaded."))
    log_staff_action(logger, staff, "add_photo", photo_id=photo.id)
    return StoredPhoto.model_validate(photo)


@router.delete("/{photo_id}", status_code=HTTPStatus.NO_CONTENT, responses=problem_responses(404, 409, 422))
async def delete_photo(photo_id: UUID, staff: StaffDep, photos: PhotoRepositoryDep) -> None:
    outcome = await photos.delete(photo_id)
    if outcome is PhotoDeletionOutcome.NOT_FOUND:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail="This photo does not exist.")
    if outcome is PhotoDeletionOutcome.ATTACHED:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT, detail="This photo is part of a post. Remove it from the post instead."
        )
    log_staff_action(logger, staff, "delete_photo", photo_id=photo_id)
