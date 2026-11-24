from dataclasses import dataclass
from enum import StrEnum

CONSENT_VERSION = "2026-11-23"


class EnquiryKind(StrEnum):
    INDIVIDUAL = "individual"
    ORGANISATION = "organisation"
    GENERAL = "general"


class RoleTransition(StrEnum):
    FIRST_TIME_MANAGER = "first_time_manager"
    FOUNDER = "founder"
    NEW_EXECUTIVE = "new_executive"
    SUCCESSOR = "successor"
    RETURNER = "returner"
    OTHER = "other"


class EnquiryStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    CLOSED = "closed"


class EnquiryAction(StrEnum):
    STATUS_CHANGED = "status_changed"


class ImageContentType(StrEnum):
    JPEG = "image/jpeg"
    PNG = "image/png"
    WEBP = "image/webp"


class PostStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class StaffRole(StrEnum):
    ADMIN = "admin"
    STAFF = "staff"


@dataclass(frozen=True, slots=True)
class PostDocument:
    """The one PDF a post may offer for download: where it is stored, the name readers see, and its size."""

    url: str
    name: str
    size_bytes: int
