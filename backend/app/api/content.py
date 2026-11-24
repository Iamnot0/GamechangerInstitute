import logging
from collections.abc import Mapping
from http import HTTPStatus
from typing import Annotated, Any, Final
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ValidationError

from app.block_schemas import BLOCK_MODELS, PublicBlocks, PublicContent, referenced_media_ids
from app.dependencies import ContentRepositoryDep, MediaRepositoryDep, PostRepositoryDep
from app.domain import BlockKey
from app.media_schemas import Photo
from app.post_schemas import PublicPost, PublicPostList
from app.problems import problem_responses

logger = logging.getLogger(__name__)

_CACHE_CONTROL: Final = "public, max-age=0, s-maxage=60, stale-while-revalidate=600"
_POST_NOT_FOUND_DETAIL: Final = "This post does not exist."


async def _cache_at_the_edge(response: Response) -> None:
    response.headers["Cache-Control"] = _CACHE_CONTROL


router = APIRouter(prefix="/v1", tags=["content"], dependencies=[Depends(_cache_at_the_edge)])


@router.get("/content", response_model_exclude_unset=True)
async def read_content(content: ContentRepositoryDep, media: MediaRepositoryDep) -> PublicContent:
    published = await content.published()
    images = await media.images(referenced_media_ids(list(published.values())))
    photos = {image.id: Photo.model_validate(image) for image in images}
    resolved = {key.value: _resolved(key, data, photos) for key, data in published.items()}
    return PublicContent(
        blocks=PublicBlocks.model_validate({key: block for key, block in resolved.items() if block is not None})
    )


@router.get("/posts", responses=problem_responses(422))
async def list_posts(posts: PostRepositoryDep, limit: Annotated[int, Query(ge=1, le=50)] = 50) -> PublicPostList:
    return PublicPostList(items=[PublicPost.model_validate(post) for post in await posts.published(limit=limit)])


@router.get("/posts/{slug}", responses=problem_responses(404, 422))
async def read_post(slug: str, posts: PostRepositoryDep) -> PublicPost:
    post = await posts.published_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_POST_NOT_FOUND_DETAIL)
    return PublicPost.model_validate(post)


def _resolved(key: BlockKey, data: dict[str, Any], photos: Mapping[UUID, Photo]) -> BaseModel | None:
    """The public form of a published block, or nothing when it no longer fits the schema or lacks a photo."""
    try:
        return BLOCK_MODELS[key].model_validate(data).resolve(photos)
    except (ValidationError, KeyError) as error:
        logger.error("published block unreadable", extra={"block_key": key.value, "error": type(error).__name__})
        return None
