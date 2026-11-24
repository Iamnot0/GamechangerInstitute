"""What each kind of post must carry and what does not belong on it."""

from collections.abc import Callable, Mapping, Sequence
from typing import Final

from app.domain import PostKind
from app.post_schemas import PostFields
from app.problems import InvalidField

MAX_DOCUMENT_NOTE: Final = 300

_NAMES: Final[Mapping[PostKind, str]] = {
    PostKind.ARTICLE: "an article",
    PostKind.VIDEO: "a video",
    PostKind.DOCUMENT: "a PDF",
}
_UNSUITED: Final[Mapping[PostKind, Sequence[str]]] = {
    PostKind.ARTICLE: ("youtube_url", "video_url"),
    PostKind.VIDEO: ("document", "event_date"),
    PostKind.DOCUMENT: ("photo_ids", "youtube_url", "video_url", "event_date"),
}


def _article(fields: PostFields) -> list[InvalidField]:
    return [] if fields.body else [InvalidField(("body",), "body_needed", "Write the article text.")]


def _video(fields: PostFields) -> list[InvalidField]:
    problems = []
    if fields.youtube_id is None and fields.video_url is None:
        problems.append(InvalidField(("youtube_url",), "video_needed", "Add a YouTube link or upload a video file."))
    if fields.youtube_id is not None and fields.video_url is not None:
        problems.append(
            InvalidField(("video_url",), "video_twice", "Use a YouTube link or an uploaded file, not both.")
        )
    if len(fields.photo_ids) > 1:
        problems.append(InvalidField(("photo_ids",), "one_thumbnail", "A video has one thumbnail."))
    return problems


def _document(fields: PostFields) -> list[InvalidField]:
    problems = []
    if fields.document is None:
        problems.append(InvalidField(("document",), "document_needed", "Upload a PDF."))
    if len(fields.body) > MAX_DOCUMENT_NOTE or "\n" in fields.body:
        problems.append(
            InvalidField(("body",), "note_length", f"Keep this to one line of up to {MAX_DOCUMENT_NOTE} characters.")
        )
    return problems


_REQUIRED: Final[Mapping[PostKind, Callable[[PostFields], list[InvalidField]]]] = {
    PostKind.ARTICLE: _article,
    PostKind.VIDEO: _video,
    PostKind.DOCUMENT: _document,
}


def kind_problems(kind: PostKind, fields: PostFields) -> list[InvalidField]:
    carried = {
        "event_date": fields.event_date is not None,
        "youtube_url": fields.youtube_id is not None,
        "video_url": fields.video_url is not None,
        "photo_ids": bool(fields.photo_ids),
        "document": fields.document is not None,
    }
    unsuited = [
        InvalidField((field,), "not_for_kind", f"This does not belong on {_NAMES[kind]}.")
        for field in _UNSUITED[kind]
        if carried[field]
    ]
    return [*unsuited, *_REQUIRED[kind](fields)]
