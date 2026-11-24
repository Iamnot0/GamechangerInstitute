from typing import Annotated
from uuid import UUID

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictInt,
    StringConstraints,
    ValidationInfo,
    field_validator,
)
from pydantic_core import PydanticCustomError

from app.domain import EnquiryAction, EnquiryKind, EnquiryStatus, RoleTransition
from app.validators import BlankAsNone, plain_text

StatusNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=1000), AfterValidator(plain_text)]


class EnquiryListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: EnquiryKind
    full_name: str
    email: str
    organisation: str | None
    role_title: str | None
    status: EnquiryStatus
    created_at: AwareDatetime
    notified_at: AwareDatetime | None


class EnquiryPage(BaseModel):
    items: list[EnquiryListItem]
    next_cursor: str | None


class EnquirySummary(BaseModel):
    total: int
    by_status: dict[EnquiryStatus, int]
    by_kind: dict[EnquiryKind, int]


class EnquiryEventView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action: EnquiryAction
    from_status: EnquiryStatus | None
    to_status: EnquiryStatus | None
    note: str | None
    actor_sub: str
    actor_email: str | None
    created_at: AwareDatetime


class EnquiryDetail(EnquiryListItem):
    role_transition: RoleTransition | None
    cohort_size: int | None
    message: str | None
    consent_version: str
    consent_at: AwareDatetime
    updated_at: AwareDatetime
    events: list[EnquiryEventView]


class StatusChange(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    expected_status: EnquiryStatus
    status: EnquiryStatus
    note: Annotated[StatusNote | None, BlankAsNone] = None

    @field_validator("status")
    @classmethod
    def _must_differ_from_expected(cls, status: EnquiryStatus, info: ValidationInfo) -> EnquiryStatus:
        if status is info.data.get("expected_status"):
            raise PydanticCustomError("status_unchanged", "Choose a different status.")
        return status


class VersionGuard(BaseModel):
    """The version the client last read; a write goes through only while the record is still at it."""

    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    expected_version: Annotated[StrictInt, Field(ge=0)]
