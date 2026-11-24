from collections.abc import Mapping, Sequence
from typing import Final
from uuid import UUID

from app.domain import MediaKind
from app.problems import InvalidField, invalid_fields
from app.repositories.media import MediaRepository

type MediaReference = tuple[tuple[int | str, ...], UUID, MediaKind]

_MESSAGES: Final[Mapping[MediaKind, str]] = {
    MediaKind.IMAGE: "Choose an image from the media library.",
    MediaKind.VIDEO: "Choose a video from the media library.",
}


async def require_media(media: MediaRepository, references: Sequence[MediaReference]) -> None:
    """Rejects references to assets that are missing or of the wrong kind, and holds the rest against deletion."""
    kinds = await media.hold_for_reference({media_id for _, media_id, _ in references})
    errors = [
        InvalidField(location, "media_reference", _MESSAGES[kind])
        for location, media_id, kind in references
        if kinds.get(media_id) is not kind
    ]
    if errors:
        raise invalid_fields(*errors)
