from http import HTTPStatus
from typing import Annotated, Final

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.dependencies import PostRepositoryDep
from app.post_schemas import PublicPost, PublicPostList
from app.problems import problem_responses

_CACHE_CONTROL: Final = "public, max-age=0, s-maxage=60, stale-while-revalidate=600"
_NOT_FOUND_DETAIL: Final = "This post does not exist."


async def _cache_at_the_edge(response: Response) -> None:
    response.headers["Cache-Control"] = _CACHE_CONTROL


router = APIRouter(prefix="/v1/posts", tags=["posts"], dependencies=[Depends(_cache_at_the_edge)])


@router.get("", responses=problem_responses(422))
async def list_posts(posts: PostRepositoryDep, limit: Annotated[int, Query(ge=1, le=50)] = 50) -> PublicPostList:
    return PublicPostList(items=[PublicPost.model_validate(post) for post in await posts.published(limit=limit)])


@router.get("/{slug}", responses=problem_responses(404, 422))
async def read_post(slug: str, posts: PostRepositoryDep) -> PublicPost:
    post = await posts.published_by_slug(slug)
    if post is None:
        raise HTTPException(status_code=HTTPStatus.NOT_FOUND, detail=_NOT_FOUND_DETAIL)
    return PublicPost.model_validate(post)
