from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StrictInt, StringConstraints
from pydantic_core import PydanticCustomError

from app.domain import ImageContentType
from app.media_urls import https_file_host
from app.validators import required_text, single_line

PixelSize = Annotated[StrictInt, Field(ge=1, le=12000)]


def _https_file_url(value: str) -> str:
    if https_file_host(value) is None:
        raise PydanticCustomError("image_url", "Use the https address of an uploaded photo.")
    return value


class PhotoSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    url: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2048), AfterValidator(_https_file_url)]
    content_type: ImageContentType
    size_bytes: Annotated[StrictInt, Field(ge=1, le=10 * 1024 * 1024)]
    width: PixelSize
    height: PixelSize
    alt: Annotated[
        str,
        StringConstraints(strip_whitespace=True, max_length=300),
        AfterValidator(single_line),
        AfterValidator(required_text),
    ]


class Photo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    src: str = Field(validation_alias="url")
    width: int
    height: int
    alt: str


class StoredPhoto(Photo):
    id: UUID


class DeletedPhoto(BaseModel):
    """Where the deleted photo's file is kept, so the caller can remove exactly that file from storage."""

    src: str
