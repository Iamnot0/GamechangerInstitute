import base64
import binascii
from dataclasses import dataclass
from datetime import datetime
from typing import Self
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PageCursor:
    """Position after the last row of a page ordered by (created_at desc, id desc), encoded as an opaque token."""

    created_at: datetime
    id: UUID

    def encode(self) -> str:
        raw = f"{self.created_at.isoformat()}|{self.id}".encode()
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    @classmethod
    def decode(cls, token: str) -> Self:
        try:
            raw = base64.b64decode(token + "=" * (-len(token) % 4), altchars=b"-_", validate=True).decode()
        except binascii.Error as exc:
            raise ValueError("cursor is not base64url") from exc
        created_at, separator, identifier = raw.partition("|")
        if not separator:
            raise ValueError("cursor has no separator")
        moment = datetime.fromisoformat(created_at)
        if moment.tzinfo is None:
            raise ValueError("cursor timestamp has no time zone")
        return cls(created_at=moment, id=UUID(identifier))
