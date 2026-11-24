import re
import unicodedata
from collections.abc import Iterator
from typing import Final

SLUG_MAX_LENGTH: Final = 80
SLUG_PATTERN: Final = r"[a-z0-9]+(?:-[a-z0-9]+)*"

_NOT_SLUG_CHARACTERS: Final = re.compile(r"[^a-z0-9]+")
_GENERATED_ATTEMPTS: Final = 20


def slugify(text: str) -> str:
    """Lowercase ASCII words joined by hyphens; empty when the text has no letters or digits that survive."""
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return _NOT_SLUG_CHARACTERS.sub("-", ascii_text.lower()).strip("-")[:SLUG_MAX_LENGTH].rstrip("-")


def slug_candidates(base: str) -> Iterator[str]:
    """The slug itself, then numbered variants within the length limit, for when earlier ones are taken."""
    yield base
    for number in range(2, _GENERATED_ATTEMPTS + 1):
        suffix = f"-{number}"
        yield f"{base[: SLUG_MAX_LENGTH - len(suffix)].rstrip('-')}{suffix}"
