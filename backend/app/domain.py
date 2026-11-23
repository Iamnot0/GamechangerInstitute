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
