import logging
from collections.abc import Mapping, Sequence
from http import HTTPStatus
from typing import Annotated, Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ValidationError

from app.api.cursors import decode_cursor
from app.api.staff_actions import log_staff_action
from app.dependencies import MediaAllowedHostsDep, MediaRepositoryDep, StaffDep, require_json_body, require_staff
from app.domain import MediaKind
from app.media_schemas import (
    ImageChange,
    ImageSubmission,
    MediaChange,
    MediaPage,
    MediaSubmission,
    MediaView,
    VideoChange,
    VideoSubmission,
)
from app.media_urls import https_file_host, is_allowed_host, youtube_watch_url
from app.models import MediaAsset
from app.problems import InvalidField, invalid_body, invalid_fields, problem_responses
from app.repositories.media import MediaDeletionOutcome

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/media",
    tags=["admin"],
    dependencies=[Depends(require_staff)],
    responses=problem_responses(401, 403, 503),
)

_NOT_FOUND_DETAIL: Final = "This media item does not exist."
_CHANGE_RULES: Final[Mapping[MediaKind, type[BaseModel]]] = {
    MediaKind.IMAGE: ImageChange,
    MediaKind.VIDEO: VideoChange,
}


@router.get("", responses=problem_responses(422))
async def list_media(
    staff: StaffDep,
    repository: MediaRepositoryDep,
    kind: MediaKind | None = None,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> MediaPage:
    page = await repository.page(kind=kind, after=decode_cursor(cursor), limit=limit)
    usage = await repository.usage([asset.id for asset in page.assets])
    log_staff_action(logger, staff, "list_media")
    return MediaPage(
        items=[_view(asset, usage[asset.id]) for asset in page.assets],
        next_cursor=page.next_cursor.encode() if page.next_cursor else None,
    )


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 413, 415, 422),
)
async def add_media(
    submission: MediaSubmission, staff: StaffDep, repository: MediaRepositoryDep, allowed_hosts: MediaAllowedHostsDep
) -> MediaView:
    asset = await repository.add(
        _new_asset(submission, allowed_hosts), actor_sub=staff.subject, actor_email=staff.email
    )
    log_staff_action(logger, staff, "add_media", media_id=asset.id)
    return _view(asset, [])


@router.patch(
    "/{media_id}",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 413, 415, 422),
)
async def change_media(
    media_id: UUID, change: MediaChange, staff: StaffDep, repository: MediaRepositoryDep
) -> MediaView:
    asset = await repository.get(media_id)
    if asset is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    changes = _allowed_changes(MediaKind(asset.kind), change)
    if changes:
        asset = await repository.change(media_id, changes)
        if asset is None:
            raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    log_staff_action(logger, staff, "change_media", media_id=media_id)
    return _view(asset, (await repository.usage([media_id]))[media_id])


@router.delete("/{media_id}", status_code=HTTPStatus.NO_CONTENT, responses=problem_responses(404, 409, 422))
async def delete_media(media_id: UUID, staff: StaffDep, repository: MediaRepositoryDep) -> None:
    deletion = await repository.delete(media_id)
    if deletion.outcome is MediaDeletionOutcome.NOT_FOUND:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    if deletion.outcome is MediaDeletionOutcome.IN_USE:
        raise HTTPException(
            status_code=HTTPStatus.CONFLICT,
            detail=f"This item is still used in: {', '.join(deletion.used_in)}. Remove it there first.",
        )
    log_staff_action(logger, staff, "delete_media", media_id=media_id)


def _new_asset(submission: MediaSubmission, allowed_hosts: Sequence[str]) -> MediaAsset:
    fields = submission.model_extra or {}
    try:
        if submission.kind is MediaKind.IMAGE:
            return _image_asset(ImageSubmission.model_validate(fields), allowed_hosts)
        return _video_asset(VideoSubmission.model_validate(fields))
    except ValidationError as error:
        raise invalid_body(error) from None


def _image_asset(image: ImageSubmission, allowed_hosts: Sequence[str]) -> MediaAsset:
    host = https_file_host(image.url)
    if host is None or not is_allowed_host(host, allowed_hosts):
        raise invalid_fields(InvalidField(("url",), "image_host", "Use a photo uploaded through the media library."))
    return MediaAsset(
        kind=MediaKind.IMAGE,
        url=image.url,
        content_type=image.content_type,
        size_bytes=image.size_bytes,
        width=image.width,
        height=image.height,
        alt=image.alt,
        title=image.title,
    )


def _video_asset(video: VideoSubmission) -> MediaAsset:
    return MediaAsset(
        kind=MediaKind.VIDEO,
        url=youtube_watch_url(video.youtube_id),
        youtube_id=video.youtube_id,
        alt="",
        title=video.title,
    )


def _allowed_changes(kind: MediaKind, change: MediaChange) -> dict[str, str]:
    requested = change.model_dump(exclude_none=True)
    try:
        return _CHANGE_RULES[kind].model_validate(requested).model_dump(exclude_none=True)
    except ValidationError as error:
        raise invalid_body(error) from None


def _view(asset: MediaAsset, used_in: Sequence[str]) -> MediaView:
    return MediaView(
        id=asset.id,
        kind=MediaKind(asset.kind),
        url=asset.url,
        content_type=asset.content_type,
        size_bytes=asset.size_bytes,
        width=asset.width,
        height=asset.height,
        alt=asset.alt,
        title=asset.title,
        youtube_id=asset.youtube_id,
        created_at=asset.created_at,
        created_by_email=asset.created_by_email,
        used_in=list(used_in),
    )
