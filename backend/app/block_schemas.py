from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Annotated, Any, Final
from uuid import UUID

from pydantic import AfterValidator, AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

from app.admin_schemas import VersionGuard
from app.domain import BlockKey
from app.media_schemas import Photo
from app.validators import required_text, single_line

BLOCK_LABELS: Final[Mapping[BlockKey, str]] = {
    BlockKey.SUCCESS_STORIES: "Success stories",
    BlockKey.CLIENT_LOGOS: "Client logos",
    BlockKey.FOUNDER: "Founder",
    BlockKey.STEWARDS: "Stewards",
    BlockKey.PLATFORMS: "Platforms",
    BlockKey.PATRON: "Patron",
}

type ImageField = tuple[tuple[int | str, ...], UUID]

Line20 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20), AfterValidator(single_line)]
Line80 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80), AfterValidator(single_line)]
Line120 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120), AfterValidator(single_line)]
Line300 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300), AfterValidator(single_line)]
Line400 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=400), AfterValidator(single_line)]
Line600 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=600), AfterValidator(single_line)]
Line800 = Annotated[str, StringConstraints(strip_whitespace=True, max_length=800), AfterValidator(single_line)]
Required = AfterValidator(required_text)


class SuccessStoriesView(BaseModel):
    lede: str
    photos: list[Photo]


class ClientLogoView(BaseModel):
    name: str
    src: str
    width: int
    height: int


class ClientLogosView(BaseModel):
    clients: list[ClientLogoView]


class FounderView(BaseModel):
    name: str
    short_name: str
    title: str
    role: str
    feature: str
    portrait: Photo


class StewardsView(BaseModel):
    title: str
    body: str


class PlatformView(BaseModel):
    name: str
    body: str
    photo: Photo


class PlatformsView(BaseModel):
    items: list[PlatformView]


class PatronView(BaseModel):
    name: str
    role: str
    quote: str
    photo: Photo


class Block(BaseModel, ABC):
    """The stored shape of one content block. Media is held by id and resolved to photos for the public site."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    def image_fields(self) -> list[ImageField]:
        return []

    @abstractmethod
    def resolve(self, photos: Mapping[UUID, Photo]) -> BaseModel: ...


class _StoredPhoto(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    media_id: UUID


class SuccessStories(Block):
    lede: Annotated[Line300, Required]
    photos: Annotated[list[_StoredPhoto], Field(min_length=1, max_length=8)]

    def image_fields(self) -> list[ImageField]:
        return [(("photos", index, "media_id"), photo.media_id) for index, photo in enumerate(self.photos)]

    def resolve(self, photos: Mapping[UUID, Photo]) -> SuccessStoriesView:
        return SuccessStoriesView(lede=self.lede, photos=[photos[photo.media_id] for photo in self.photos])


class _StoredClient(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    name: Annotated[Line80, Required]
    media_id: UUID


class ClientLogos(Block):
    clients: Annotated[list[_StoredClient], Field(max_length=12)]

    def image_fields(self) -> list[ImageField]:
        return [(("clients", index, "media_id"), client.media_id) for index, client in enumerate(self.clients)]

    def resolve(self, photos: Mapping[UUID, Photo]) -> ClientLogosView:
        return ClientLogosView(
            clients=[
                ClientLogoView(name=client.name, src=logo.src, width=logo.width, height=logo.height)
                for client in self.clients
                for logo in [photos[client.media_id]]
            ]
        )


class Founder(Block):
    name: Annotated[Line80, Required]
    short_name: Line20
    title: Annotated[Line120, Required]
    role: Annotated[Line600, Required]
    feature: Line400
    portrait_media_id: UUID

    def image_fields(self) -> list[ImageField]:
        return [(("portrait_media_id",), self.portrait_media_id)]

    def resolve(self, photos: Mapping[UUID, Photo]) -> FounderView:
        return FounderView(
            name=self.name,
            short_name=self.short_name,
            title=self.title,
            role=self.role,
            feature=self.feature,
            portrait=photos[self.portrait_media_id],
        )


class Stewards(Block):
    title: Annotated[Line120, Required]
    body: Annotated[Line800, Required]

    def resolve(self, photos: Mapping[UUID, Photo]) -> StewardsView:
        return StewardsView(title=self.title, body=self.body)


class _StoredPlatform(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    name: Annotated[Line80, Required]
    body: Annotated[Line400, Required]
    media_id: UUID


class Platforms(Block):
    items: Annotated[list[_StoredPlatform], Field(min_length=1, max_length=6)]

    def image_fields(self) -> list[ImageField]:
        return [(("items", index, "media_id"), item.media_id) for index, item in enumerate(self.items)]

    def resolve(self, photos: Mapping[UUID, Photo]) -> PlatformsView:
        return PlatformsView(
            items=[PlatformView(name=item.name, body=item.body, photo=photos[item.media_id]) for item in self.items]
        )


class Patron(Block):
    name: Annotated[Line80, Required]
    role: Annotated[Line80, Required]
    quote: Annotated[Line400, Required]
    media_id: UUID

    def image_fields(self) -> list[ImageField]:
        return [(("media_id",), self.media_id)]

    def resolve(self, photos: Mapping[UUID, Photo]) -> PatronView:
        return PatronView(name=self.name, role=self.role, quote=self.quote, photo=photos[self.media_id])


BLOCK_MODELS: Final[Mapping[BlockKey, type[Block]]] = {
    BlockKey.SUCCESS_STORIES: SuccessStories,
    BlockKey.CLIENT_LOGOS: ClientLogos,
    BlockKey.FOUNDER: Founder,
    BlockKey.STEWARDS: Stewards,
    BlockKey.PLATFORMS: Platforms,
    BlockKey.PATRON: Patron,
}


def referenced_media_ids(data: object) -> set[UUID]:
    """Every media id held anywhere in stored block data, whatever schema version wrote it."""
    if isinstance(data, list):
        return set().union(*(referenced_media_ids(item) for item in data))
    if not isinstance(data, dict):
        return set()
    found: set[UUID] = set()
    for name, value in data.items():
        if isinstance(value, str) and (name == "media_id" or name.endswith("_media_id")):
            found |= _parsed_id(value)
        else:
            found |= referenced_media_ids(value)
    return found


def _parsed_id(value: str) -> set[UUID]:
    try:
        return {UUID(value)}
    except ValueError:
        return set()


class BlockSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: BlockKey
    version: int
    has_draft: bool
    draft_updated_at: AwareDatetime | None
    draft_updated_by_email: str | None
    published_at: AwareDatetime | None
    published_by_email: str | None


class BlockList(BaseModel):
    items: list[BlockSummary]


class BlockDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    key: BlockKey
    version: int
    draft: dict[str, Any] | None
    published: dict[str, Any] | None
    draft_updated_at: AwareDatetime | None
    draft_updated_by_email: str | None
    published_at: AwareDatetime | None
    published_by_email: str | None


class DraftSave(VersionGuard):
    data: dict[str, Any]


class PublicBlocks(BaseModel):
    success_stories: SuccessStoriesView | None = None
    client_logos: ClientLogosView | None = None
    founder: FounderView | None = None
    stewards: StewardsView | None = None
    platforms: PlatformsView | None = None
    patron: PatronView | None = None


class PublicContent(BaseModel):
    blocks: PublicBlocks
