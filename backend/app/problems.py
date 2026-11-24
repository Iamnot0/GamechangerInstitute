from collections.abc import Callable, Coroutine, Mapping, Sequence
from http import HTTPStatus
from typing import Any, Final, NamedTuple, get_args

from fastapi import Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from pydantic_core.core_schema import ErrorType
from starlette.exceptions import HTTPException

PROBLEM_MEDIA_TYPE: Final = "application/problem+json"

_DEFAULT_DETAILS: Final[Mapping[int, str]] = {
    400: "The request could not be understood.",
    404: "The requested resource does not exist.",
    405: "This method is not supported for the requested resource.",
    413: "The request body is too large.",
    415: "Send the request body as application/json.",
    500: "Something went wrong on our side. Please try again later.",
}

_PARAMETER_LOCATIONS: Final = frozenset({"body", "header", "query", "path", "cookie"})
_PYDANTIC_ERROR_TYPES: Final = frozenset(get_args(ErrorType))
_FIELD_MESSAGES: Final[Mapping[str, str]] = {
    "missing": "This field is required.",
    "extra_forbidden": "This field is not accepted.",
    "string_type": "Enter text.",
    "string_too_short": "Enter at least {min_length} characters.",
    "string_too_long": "Enter no more than {max_length} characters.",
    "enum": "Choose one of the available options.",
    "int_type": "Enter a whole number.",
    "greater_than_equal": "Enter a number no lower than {ge}.",
    "less_than_equal": "Enter a number no higher than {le}.",
    "bool_type": "Answer true or false.",
    "uuid_parsing": "Use a valid UUID.",
    "uuid_type": "Use a valid UUID.",
    "model_type": "Send the details as a JSON object.",
    "model_attributes_type": "Send the details as a JSON object.",
    "dict_type": "Send the details as a JSON object.",
    "too_short": "Add at least {min_length}.",
    "too_long": "Keep no more than {max_length}.",
    "date_type": "Use a date such as 2026-11-24.",
    "date_parsing": "Use a date such as 2026-11-24.",
    "date_from_datetime_parsing": "Use a date such as 2026-11-24.",
    "date_from_datetime_inexact": "Use a date such as 2026-11-24.",
}
_FALLBACK_FIELD_MESSAGE: Final = "This value is not valid."


class FieldError(BaseModel):
    field: str
    message: str


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str
    errors: list[FieldError] | None = None


class ProblemResponse(JSONResponse):
    media_type = PROBLEM_MEDIA_TYPE


def problem_response(
    status: int,
    detail: str | None = None,
    *,
    errors: Sequence[FieldError] | None = None,
    headers: Mapping[str, str] | None = None,
) -> ProblemResponse:
    problem = Problem(
        title=HTTPStatus(status).phrase,
        status=status,
        detail=detail or _DEFAULT_DETAILS.get(status, HTTPStatus(status).description),
        errors=list(errors) if errors is not None else None,
    )
    return ProblemResponse(problem.model_dump(mode="json", exclude_none=True), status_code=status, headers=headers)


def _field_name(location: Sequence[int | str]) -> str:
    path = location[1:] if location and location[0] in _PARAMETER_LOCATIONS else location
    return ".".join(str(part) for part in path) or "body"


def _field_message(error: Mapping[str, Any]) -> str:
    error_type = error["type"]
    if template := _FIELD_MESSAGES.get(error_type):
        return template.format(**error.get("ctx", {}))
    if error_type in _PYDANTIC_ERROR_TYPES:
        return _FALLBACK_FIELD_MESSAGE
    return str(error["msg"])


async def _handle_http_exception(_: Request, exc: HTTPException) -> ProblemResponse:
    explicit_detail = exc.detail if exc.detail != HTTPStatus(exc.status_code).phrase else None
    return problem_response(exc.status_code, explicit_detail, headers=exc.headers)


async def _handle_validation_error(_: Request, exc: RequestValidationError) -> ProblemResponse:
    errors = exc.errors()
    if any(error["type"] == "json_invalid" for error in errors):
        return problem_response(400, "The request body is not valid JSON.")
    return problem_response(
        422,
        "Some fields need attention.",
        errors=[FieldError(field=_field_name(error["loc"]), message=_field_message(error)) for error in errors],
    )


EXCEPTION_HANDLERS: Final[dict[int | type[Exception], Callable[[Request, Any], Coroutine[Any, Any, Response]]]] = {
    HTTPException: _handle_http_exception,
    RequestValidationError: _handle_validation_error,
}


class InvalidField(NamedTuple):
    location: tuple[int | str, ...]
    code: str
    message: str


def invalid_fields(*fields: InvalidField) -> RequestValidationError:
    """Reports body fields that fit their schema but break a rule checked after parsing."""
    return RequestValidationError(
        [{"type": field.code, "loc": ("body", *field.location), "msg": field.message} for field in fields]
    )


def invalid_body(error: ValidationError, *prefix: str) -> RequestValidationError:
    """Reports a model validated outside FastAPI's own body parsing as field errors under `prefix`."""
    return RequestValidationError(
        [
            detail | {"loc": ("body", *prefix, *detail["loc"])}
            for detail in error.errors(include_url=False, include_input=False)
        ]
    )


def problem_responses(*statuses: int) -> dict[int | str, dict[str, Any]]:
    return {
        status: {"model": Problem, "content": {PROBLEM_MEDIA_TYPE: {}}, "description": HTTPStatus(status).phrase}
        for status in statuses
    }
