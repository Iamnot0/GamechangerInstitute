import re
from datetime import date
from typing import Annotated, Final
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field, StrictInt, StringConstraints
from pydantic_core import PydanticCustomError

from app.admin_schemas import VersionGuard
from app.domain import PostKind, PostStatus
from app.media_urls import https_file_host, youtube_video_id
from app.photo_schemas import Photo, StoredPhoto
from app.slugs import SLUG_MAX_LENGTH, SLUG_PATTERN
from app.validators import BlankAsNone, UnixNewlines, plain_text, required_text, single_line

MAX_PHOTOS: Final = 12
MAX_DOCUMENT_BYTES: Final = 20 * 1024 * 1024

Line120 = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=120),
    AfterValidator(single_line),
    AfterValidator(required_text),
]
PostBody = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=10000),
    UnixNewlines,
    AfterValidator(plain_text),
]


def _slug(value: str) -> str:
    if not re.fullmatch(SLUG_PATTERN, value):
        raise PydanticCustomError("slug", "Use lowercase letters, numbers and single hyphens, such as open-day-2027.")
    return value


def _youtube_id(value: str) -> str:
    video_id = youtube_video_id(value)
    if video_id is None:
        raise PydanticCustomError("youtube_url", "Paste a YouTube link, such as https://youtu.be/dQw4w9WgXcQ.")
    return video_id


def _https_pdf_url(value: str) -> str:
    if https_file_host(value) is None or not value.endswith(".pdf"):
        raise PydanticCustomError("pdf_url", "Use the https address of an uploaded PDF.")
    return value


def _https_mp4_url(value: str) -> str:
    if https_file_host(value) is None or not value.endswith(".mp4"):
        raise PydanticCustomError("video_url", "Use the https address of an uploaded MP4 video.")
    return value


Slug = Annotated[str, StringConstraints(strip_whitespace=True, max_length=SLUG_MAX_LENGTH), AfterValidator(_slug)]
YoutubeLink = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500), AfterValidator(_youtube_id)]


class DocumentSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    url: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048), AfterValidator(_https_pdf_url)]
    name: Line120
    size_bytes: Annotated[StrictInt, Field(ge=1, le=MAX_DOCUMENT_BYTES)]


VideoFile = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048), AfterValidator(_https_mp4_url)]


class PostFields(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    title: Line120
    body: PostBody = ""
    event_date: Annotated[date | None, BlankAsNone] = None
    youtube_id: Annotated[YoutubeLink | None, BlankAsNone] = Field(default=None, validation_alias="youtube_url")
    video_url: Annotated[VideoFile | None, BlankAsNone] = None
    photo_ids: Annotated[list[UUID], Field(max_length=MAX_PHOTOS)] = []
    document: DocumentSubmission | None = None
    slug: Annotated[Slug | None, BlankAsNone] = None


class PostSubmission(PostFields):
    kind: PostKind


class PostRevision(PostFields, VersionGuard):
    """A post keeps the kind it was created with, so a revision does not name one."""


class Document(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    url: str
    name: str
    size_bytes: int


class AdminPost(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: PostKind
    slug: str
    title: str
    body: str
    event_date: date | None
    youtube_id: str | None
    video_url: str | None
    status: PostStatus
    published_at: AwareDatetime | None
    version: int
    created_at: AwareDatetime
    updated_at: AwareDatetime
    updated_by_email: str | None
    photos: list[StoredPhoto]
    document: Document | None


class AdminPostPage(BaseModel):
    items: list[AdminPost]
    next_cursor: str | None


class PublicPost(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: PostKind
    slug: str
    title: str
    body: str
    event_date: date | None
    published_at: AwareDatetime
    youtube_id: str | None
    video_url: str | None
    photos: list[Photo]
    document: Document | None


class PublicPostList(BaseModel):
    items: list[PublicPost]
