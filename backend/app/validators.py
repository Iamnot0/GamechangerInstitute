import re

from email_validator import EmailNotValidError, validate_email
from pydantic import BeforeValidator
from pydantic_core import PydanticCustomError

_LINE_BREAKS_AND_CONTROLS = re.compile(r"[\x00-\x1f\x7f]")
_CONTROLS_EXCEPT_WHITESPACE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def single_line(value: str) -> str:
    if _LINE_BREAKS_AND_CONTROLS.search(value):
        raise PydanticCustomError("single_line", "Use a single line of plain text.")
    return value


def plain_text(value: str) -> str:
    if _CONTROLS_EXCEPT_WHITESPACE.search(value):
        raise PydanticCustomError("plain_text", "Remove unsupported characters.")
    return value


def normalised_email(value: str) -> str:
    try:
        return validate_email(value, check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise PydanticCustomError("email", "Enter a valid email address.") from None


def _blank_as_none(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value


BlankAsNone = BeforeValidator(_blank_as_none)
