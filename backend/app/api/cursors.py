from fastapi.exceptions import RequestValidationError

from app.pagination import PageCursor


def decode_cursor(cursor: str | None) -> PageCursor | None:
    if cursor is None:
        return None
    try:
        return PageCursor.decode(cursor)
    except ValueError:
        raise RequestValidationError(
            [
                {
                    "type": "cursor_invalid",
                    "loc": ("query", "cursor"),
                    "msg": "This page link is no longer valid. Start again from the first page.",
                    "input": cursor,
                }
            ]
        ) from None
