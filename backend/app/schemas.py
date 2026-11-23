from typing import Annotated
from uuid import UUID

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictInt,
    StringConstraints,
    ValidationInfo,
    field_validator,
)
from pydantic_core import PydanticCustomError

from app.domain import EnquiryKind, RoleTransition
from app.validators import BlankAsNone, normalised_email, plain_text, single_line

FullName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120), AfterValidator(single_line)
]
Email = Annotated[str, StringConstraints(strip_whitespace=True, max_length=254), AfterValidator(normalised_email)]
OrganisationName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160), AfterValidator(single_line)]
RoleTitle = Annotated[str, StringConstraints(strip_whitespace=True, max_length=120), AfterValidator(single_line)]
CohortSize = Annotated[StrictInt, Field(ge=1, le=500)]
Message = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000), AfterValidator(plain_text)]


class EnquirySubmission(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    kind: EnquiryKind
    full_name: FullName
    email: Email
    organisation: Annotated[OrganisationName | None, BlankAsNone] = Field(
        default=None, validate_default=True, description="Required when kind is organisation."
    )
    role_title: Annotated[RoleTitle | None, BlankAsNone] = None
    role_transition: Annotated[RoleTransition | None, BlankAsNone] = Field(
        default=None, description="Allowed only when kind is individual."
    )
    cohort_size: Annotated[CohortSize | None, BlankAsNone] = Field(
        default=None, description="Allowed only when kind is organisation."
    )
    message: Annotated[Message | None, BlankAsNone] = None
    consent: StrictBool = Field(description="Must be true.")
    website: Annotated[str | None, BlankAsNone] = Field(default=None, description="Leave empty.")

    @field_validator("organisation")
    @classmethod
    def _organisation_required_for_organisations(cls, value: str | None, info: ValidationInfo) -> str | None:
        if value is None and info.data.get("kind") is EnquiryKind.ORGANISATION:
            raise PydanticCustomError("organisation_required", "Enter your organisation name.")
        return value

    @field_validator("role_transition")
    @classmethod
    def _role_transition_only_for_individuals(
        cls, value: RoleTransition | None, info: ValidationInfo
    ) -> RoleTransition | None:
        kind = info.data.get("kind")
        if value is not None and kind is not None and kind is not EnquiryKind.INDIVIDUAL:
            raise PydanticCustomError(
                "role_transition_not_allowed", "Only individual enquiries can include a role transition."
            )
        return value

    @field_validator("cohort_size")
    @classmethod
    def _cohort_size_only_for_organisations(cls, value: int | None, info: ValidationInfo) -> int | None:
        kind = info.data.get("kind")
        if value is not None and kind is not None and kind is not EnquiryKind.ORGANISATION:
            raise PydanticCustomError(
                "cohort_size_not_allowed", "Only organisation enquiries can include a cohort size."
            )
        return value

    @field_validator("consent")
    @classmethod
    def _consent_given(cls, value: bool) -> bool:
        if not value:
            raise PydanticCustomError("consent_required", "Consent is required to submit an enquiry.")
        return value

    @property
    def is_honeypot_filled(self) -> bool:
        return self.website is not None


class EnquiryReceipt(BaseModel):
    id: UUID
    received_at: AwareDatetime
