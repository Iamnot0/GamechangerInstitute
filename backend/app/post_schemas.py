import re
from datetime import date
from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, StringConstraints
from pydantic_core import PydanticCustomError

from app.admin_schemas import VersionGuard
from app.domain import PostStatus
from app.media_schemas import Photo, VideoLink
from app.slugs import SLUG_MAX_LENGTH, SLUG_PATTERN
from app.validators import BlankAsNone, UnixNewlines, plain_text, required_text, single_line

PostTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=120),
    AfterValidator(single_line),
    AfterValidator(required_text),
]
PostSummary = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=300),
    AfterValidator(single_line),
    AfterValidator(required_text),
]
PostBody = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=10000),
    UnixNewlines,
    AfterValidator(plain_text),
    AfterValidator(required_text),
]


def _slug(value: str) -> str:
    if not re.fullmatch(SLUG_PATTERN, value):
        raise PydanticCustomError("slug", "Use lowercase letters, numbers and single hyphens, such as open-day-2027.")
    return value


Slug = Annotated[str, StringConstraints(strip_whitespace=True, max_length=SLUG_MAX_LENGTH), AfterValidator(_slug)]


class PostSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    title: PostTitle
    summary: PostSummary
    body: PostBody
    slug: Annotated[Slug | None, BlankAsNone] = None
    event_date: Annotated[date | None, BlankAsNone] = None
    cover_media_id: Annotated[UUID | None, BlankAsNone] = None
    video_media_id: Annotated[UUID | None, BlankAsNone] = None


class PostRevision(PostSubmission, VersionGuard):
    pass


class AdminPost(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    summary: str
    body: str
    event_date: date | None
    cover_media_id: UUID | None
    video_media_id: UUID | None
    status: PostStatus
    published_at: AwareDatetime | None
    version: int
    created_at: AwareDatetime
    updated_at: AwareDatetime
    updated_by_email: str | None
    cover: Photo | None
    video: VideoLink | None


class AdminPostPage(BaseModel):
    items: list[AdminPost]
    next_cursor: str | None


class PublicPost(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slug: str
    title: str
    summary: str
    body: str
    event_date: date | None
    published_at: AwareDatetime
    cover: Photo | None
    video: VideoLink | None


class PublicPostList(BaseModel):
    items: list[PublicPost]
