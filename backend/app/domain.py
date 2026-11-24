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


class MediaKind(StrEnum):
    IMAGE = "image"
    VIDEO = "video"


class ImageContentType(StrEnum):
    JPEG = "image/jpeg"
    PNG = "image/png"
    WEBP = "image/webp"


class BlockKey(StrEnum):
    SUCCESS_STORIES = "success_stories"
    CLIENT_LOGOS = "client_logos"
    FOUNDER = "founder"
    STEWARDS = "stewards"
    PLATFORMS = "platforms"
    PATRON = "patron"


class PostStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
