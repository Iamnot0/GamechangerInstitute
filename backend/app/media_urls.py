import re
from collections.abc import Iterable
from typing import Final
from urllib.parse import SplitResult, parse_qs, urlsplit

_YOUTUBE_ID: Final = r"[A-Za-z0-9_-]{11}"
_YOUTUBE_HOST: Final = re.compile(r"(?:www\.|m\.)?youtube\.com")
_YOUTUBE_SHORT_HOST: Final = "youtu.be"
_YOUTUBE_SHORT_PATH: Final = re.compile(rf"/({_YOUTUBE_ID})/?")
_YOUTUBE_NAMED_PATH: Final = re.compile(rf"/(?:shorts|embed)/({_YOUTUBE_ID})/?")
_YOUTUBE_WATCH_PATH: Final = re.compile(r"/watch/?")
_UNSAFE_URL_CHARACTERS: Final = re.compile(r"[\s\\\x00-\x1f\x7f]")
_CANONICAL_FILE_URL: Final = re.compile(
    r"https://(?P<host>[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+)(?P<path>(?:/[A-Za-z0-9._-]+)+)"
)
_DOT_SEGMENTS: Final = frozenset({".", ".."})


def _split(url: str) -> SplitResult | None:
    """Splits a URL, or returns nothing when it carries credentials, a port or characters browsers would rewrite."""
    if _UNSAFE_URL_CHARACTERS.search(url):
        return None
    try:
        parts = urlsplit(url)
        has_port = parts.port is not None
    except ValueError:
        return None
    if parts.hostname is None or has_port or parts.username is not None or parts.password is not None:
        return None
    return parts


def youtube_video_id(url: str) -> str | None:
    parts = _split(url if "://" in url else f"https://{url}")
    if parts is None or parts.hostname is None or parts.scheme not in ("http", "https"):
        return None
    if parts.hostname == _YOUTUBE_SHORT_HOST:
        match = _YOUTUBE_SHORT_PATH.fullmatch(parts.path)
        return match.group(1) if match else None
    if not _YOUTUBE_HOST.fullmatch(parts.hostname):
        return None
    if _YOUTUBE_WATCH_PATH.fullmatch(parts.path):
        candidate = parse_qs(parts.query).get("v", [""])[0]
        return candidate if re.fullmatch(_YOUTUBE_ID, candidate) else None
    match = _YOUTUBE_NAMED_PATH.fullmatch(parts.path)
    return match.group(1) if match else None


def youtube_watch_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={video_id}"


def https_file_host(url: str) -> str | None:
    """The host of an https file URL already in its one canonical spelling, or nothing for anything else.

    A file must have exactly one accepted address, so that "one record per URL" means one record
    per file: lowercase scheme and host, plain path segments, and no port, credentials, query,
    fragment, percent-encoding or dot segments.
    """
    match = _CANONICAL_FILE_URL.fullmatch(url)
    if match is None or not _DOT_SEGMENTS.isdisjoint(match["path"].split("/")):
        return None
    return match["host"]


def is_allowed_host(host: str, allowed: Iterable[str]) -> bool:
    """Matches a host exactly, or as a subdomain of an entry written with a leading dot."""
    return any(
        (host.endswith(entry) and len(host) > len(entry)) if entry.startswith(".") else host == entry
        for entry in allowed
    )
