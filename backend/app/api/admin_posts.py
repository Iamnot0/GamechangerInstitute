import logging
from collections.abc import Iterable, Mapping, Sequence
from http import HTTPStatus
from typing import Annotated, Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.admin_schemas import VersionGuard
from app.api.cursors import decode_cursor
from app.api.staff_actions import log_staff_action
from app.dependencies import (
    MediaAllowedHostsDep,
    PhotoRepositoryDep,
    PostRepositoryDep,
    StaffDep,
    require_json_body,
    require_staff,
)
from app.domain import PostDocument, PostStatus
from app.media_urls import is_stored_file_url
from app.post_schemas import AdminPost, AdminPostPage, PostRevision, PostSubmission
from app.problems import InvalidField, invalid_fields, problem_responses
from app.repositories.photos import PhotoRepository
from app.repositories.posts import PostContent, PostRepository, PostWriteOutcome
from app.slugs import slug_candidates, slugify

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/v1/admin/posts",
    tags=["admin"],
    dependencies=[Depends(require_staff)],
    responses=problem_responses(401, 403, 503),
)

_NOT_FOUND_DETAIL: Final = "This post does not exist."
_CONFLICT_DETAIL: Final = "Someone else changed this post. Reload it and try again."
_ALREADY_PUBLISHED_DETAIL: Final = "This post is already published."
_NOT_PUBLISHED_DETAIL: Final = "This post is not published."
_SLUG_FIELD: Final = ("slug",)
_SLUG_TAKEN: Final = InvalidField(
    _SLUG_FIELD, "slug_taken", "Another post already uses this address. Choose a different one."
)
_SLUG_NEEDED: Final = InvalidField(
    _SLUG_FIELD, "slug_needed", "Enter an address for this post, using lowercase letters, numbers and hyphens."
)
_SLUG_FIXED: Final = InvalidField(
    _SLUG_FIELD, "slug_fixed", "The address of a post cannot change once it has been published."
)
_DOCUMENT_URL_FIELD: Final = ("document", "url")
_DOCUMENT_TAKEN: Final = InvalidField(
    _DOCUMENT_URL_FIELD, "document_taken", "This PDF is already attached to another post."
)
_DOCUMENT_ELSEWHERE: Final = InvalidField(
    _DOCUMENT_URL_FIELD, "document_host", "Use a PDF uploaded from the post form."
)
_TAKEN: Final[Mapping[PostWriteOutcome, InvalidField]] = {
    PostWriteOutcome.SLUG_TAKEN: _SLUG_TAKEN,
    PostWriteOutcome.DOCUMENT_TAKEN: _DOCUMENT_TAKEN,
}


@router.get("", responses=problem_responses(422))
async def list_posts(
    staff: StaffDep,
    posts: PostRepositoryDep,
    status: PostStatus | None = None,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> AdminPostPage:
    page = await posts.page(status=status, after=decode_cursor(cursor), limit=limit)
    log_staff_action(logger, staff, "list_posts")
    return AdminPostPage(
        items=[AdminPost.model_validate(post) for post in page.posts],
        next_cursor=page.next_cursor.encode() if page.next_cursor else None,
    )


@router.post(
    "",
    status_code=HTTPStatus.CREATED,
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 413, 415, 422),
)
async def create_post(
    submission: PostSubmission,
    staff: StaffDep,
    posts: PostRepositoryDep,
    photos: PhotoRepositoryDep,
    allowed_hosts: MediaAllowedHostsDep,
) -> AdminPost:
    slugs = _slugs_for(submission)
    _require_stored_document(submission, allowed_hosts)
    await _require_free_photos(photos, submission.photo_ids)
    created = await posts.create(_content(submission), slugs=slugs, actor_email=staff.email)
    if isinstance(created, PostWriteOutcome):
        raise invalid_fields(_TAKEN[created])
    log_staff_action(logger, staff, "create_post", post_id=created)
    return await _detail(posts, created)


@router.get("/{post_id}", responses=problem_responses(404, 422))
async def get_post(post_id: UUID, staff: StaffDep, posts: PostRepositoryDep) -> AdminPost:
    post = await _detail(posts, post_id)
    log_staff_action(logger, staff, "view_post", post_id=post_id)
    return post


@router.put(
    "/{post_id}",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def revise_post(
    post_id: UUID,
    revision: PostRevision,
    staff: StaffDep,
    posts: PostRepositoryDep,
    photos: PhotoRepositoryDep,
    allowed_hosts: MediaAllowedHostsDep,
) -> AdminPost:
    _require_stored_document(revision, allowed_hosts)
    current = await posts.hold(post_id)
    if current is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    if current.version != revision.expected_version:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_CONFLICT_DETAIL)
    slug = revision.slug or current.slug
    if slug != current.slug and current.published_at is not None:
        raise invalid_fields(_SLUG_FIXED)
    await _require_free_photos(photos, revision.photo_ids, post_id=post_id)
    outcome = await posts.revise(
        post_id, _content(revision), slug=slug, expected_version=revision.expected_version, actor_email=staff.email
    )
    if outcome in _TAKEN:
        raise invalid_fields(_TAKEN[outcome])
    _require_written(outcome, wrong_status_detail=_CONFLICT_DETAIL)
    log_staff_action(logger, staff, "revise_post", post_id=post_id)
    return await _detail(posts, post_id)


@router.post(
    "/{post_id}/publish",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def publish_post(post_id: UUID, guard: VersionGuard, staff: StaffDep, posts: PostRepositoryDep) -> AdminPost:
    outcome = await posts.publish(post_id, expected_version=guard.expected_version, actor_email=staff.email)
    _require_written(outcome, wrong_status_detail=_ALREADY_PUBLISHED_DETAIL)
    log_staff_action(logger, staff, "publish_post", post_id=post_id)
    return await _detail(posts, post_id)


@router.post(
    "/{post_id}/unpublish",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 404, 409, 413, 415, 422),
)
async def unpublish_post(post_id: UUID, guard: VersionGuard, staff: StaffDep, posts: PostRepositoryDep) -> AdminPost:
    outcome = await posts.unpublish(post_id, expected_version=guard.expected_version, actor_email=staff.email)
    _require_written(outcome, wrong_status_detail=_NOT_PUBLISHED_DETAIL)
    log_staff_action(logger, staff, "unpublish_post", post_id=post_id)
    return await _detail(posts, post_id)


@router.delete("/{post_id}", status_code=HTTPStatus.NO_CONTENT, responses=problem_responses(404, 422))
async def delete_post(post_id: UUID, staff: StaffDep, posts: PostRepositoryDep) -> None:
    if not await posts.delete(post_id):
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    log_staff_action(logger, staff, "delete_post", post_id=post_id)


async def _detail(posts: PostRepository, post_id: UUID) -> AdminPost:
    post = await posts.detail(post_id)
    if post is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    return AdminPost.model_validate(post)


def _slugs_for(submission: PostSubmission) -> Iterable[str]:
    if submission.slug is not None:
        return [submission.slug]
    generated = slugify(submission.title)
    if not generated:
        raise invalid_fields(_SLUG_NEEDED)
    return slug_candidates(generated)


def _require_stored_document(submission: PostSubmission, allowed_hosts: Sequence[str]) -> None:
    if submission.document is not None and not is_stored_file_url(submission.document.url, allowed_hosts):
        raise invalid_fields(_DOCUMENT_ELSEWHERE)


async def _require_free_photos(
    photos: PhotoRepository, photo_ids: Sequence[UUID], *, post_id: UUID | None = None
) -> None:
    """Rejects photos listed twice, missing, or shown by a post other than `post_id`, and holds the rest."""
    owners = await photos.hold(set(photo_ids))
    errors = [
        InvalidField(("photo_ids", index), *problem)
        for index, photo_id in enumerate(photo_ids)
        if (problem := _photo_problem(photo_id, photo_ids[:index], owners, post_id)) is not None
    ]
    if errors:
        raise invalid_fields(*errors)


def _photo_problem(
    photo_id: UUID, listed_before: Sequence[UUID], owners: Mapping[UUID, UUID | None], post_id: UUID | None
) -> tuple[str, str] | None:
    if photo_id in listed_before:
        return "photo_repeated", "This photo is listed more than once."
    if photo_id not in owners:
        return "photo_missing", "This photo is no longer available. Upload it again."
    if owners[photo_id] not in (None, post_id):
        return "photo_taken", "This photo already belongs to another post."
    return None


def _content(submission: PostSubmission) -> PostContent:
    document = submission.document
    return PostContent(
        title=submission.title,
        body=submission.body,
        event_date=submission.event_date,
        youtube_id=submission.youtube_id,
        photo_ids=submission.photo_ids,
        document=PostDocument(document.url, document.name, document.size_bytes) if document else None,
    )


def _require_written(outcome: PostWriteOutcome, *, wrong_status_detail: str) -> None:
    if outcome is PostWriteOutcome.NOT_FOUND:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    if outcome is PostWriteOutcome.CONFLICT:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=_CONFLICT_DETAIL)
    if outcome is PostWriteOutcome.WRONG_STATUS:
        raise HTTPException(status_code=HTTPStatus.CONFLICT, detail=wrong_status_detail)
