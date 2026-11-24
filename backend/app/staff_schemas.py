from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, StringConstraints

from app.domain import StaffRole
from app.schemas import Email

OtpCode = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{6}$")]


class CodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: Email


class CodeRequested(BaseModel):
    sent: bool = True


class CodeVerification(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: Email
    code: OtpCode


class StaffIdentity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: StaffRole


class AuthenticatedSession(BaseModel):
    token: str
    expires_at: AwareDatetime
    user: StaffIdentity


class StaffUserItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: StaffRole
    created_at: AwareDatetime
    last_signed_in_at: AwareDatetime | None


class StaffUserList(BaseModel):
    items: list[StaffUserItem]


class CreateStaffUser(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    email: Email
    role: StaffRole = StaffRole.STAFF
