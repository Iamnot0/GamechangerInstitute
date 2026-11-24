from typing import Annotated
from uuid import UUID

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
)
from pydantic_core import PydanticCustomError

from app.domain import ImageContentType, MediaKind
from app.media_urls import https_file_host, youtube_video_id
from app.validators import required_text, single_line

AltText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300), AfterValidator(single_line)]
MediaTitle = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120), AfterValidator(single_line)]
PixelSize = Annotated[StrictInt, Field(ge=1, le=12000)]


def _https_file_url(value: str) -> str:
    if https_file_host(value) is None:
        raise PydanticCustomError("image_url", "Use the https address of an uploaded photo.")
    return value


def _youtube_id(value: str) -> str:
    video_id = youtube_video_id(value)
    if video_id is None:
        raise PydanticCustomError("youtube_url", "Paste a YouTube link, such as https://youtu.be/dQw4w9WgXcQ.")
    return video_id


def _no_alt_text(value: str) -> str:
    if value:
        raise PydanticCustomError("alt_not_allowed", "Videos do not take alternative text.")
    return value


ImageUrl = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048), AfterValidator(_https_file_url)]
YoutubeLink = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500), AfterValidator(_youtube_id)]


class MediaSubmission(BaseModel):
    """The discriminator of a new asset; the remaining fields are validated by the model for its kind."""

    model_config = ConfigDict(extra="allow", hide_input_in_errors=True)

    kind: MediaKind


class ImageSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    url: ImageUrl
    content_type: ImageContentType
    size_bytes: Annotated[StrictInt, Field(ge=1, le=10 * 1024 * 1024)]
    width: PixelSize
    height: PixelSize
    alt: Annotated[AltText, AfterValidator(required_text)]
    title: MediaTitle = ""


class VideoSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    youtube_id: YoutubeLink = Field(validation_alias="youtube_url")
    title: Annotated[MediaTitle, AfterValidator(required_text)]


class MediaChange(BaseModel):
    """What may change on any asset; `ImageChange` and `VideoChange` hold the rules for each kind."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    alt: AltText | None = None
    title: MediaTitle | None = None


class ImageChange(BaseModel):
    alt: Annotated[AltText, AfterValidator(required_text)] | None = None
    title: MediaTitle | None = None


class VideoChange(BaseModel):
    alt: Annotated[str, AfterValidator(_no_alt_text)] | None = None
    title: Annotated[MediaTitle, AfterValidator(required_text)] | None = None


class MediaView(BaseModel):
    id: UUID
    kind: MediaKind
    url: str
    content_type: ImageContentType | None
    size_bytes: int | None
    width: int | None
    height: int | None
    alt: str
    title: str
    youtube_id: str | None
    created_at: AwareDatetime
    created_by_email: str | None
    used_in: list[str]


class MediaPage(BaseModel):
    items: list[MediaView]
    next_cursor: str | None


class Photo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    src: str = Field(validation_alias="url")
    width: int
    height: int
    alt: str


class VideoLink(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    youtube_id: str
    title: str
