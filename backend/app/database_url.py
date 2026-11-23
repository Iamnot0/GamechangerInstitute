from typing import Final

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

_ASYNCPG_DRIVER: Final = "postgresql+asyncpg"
_POSTGRES_DRIVERS: Final = frozenset({"postgres", "postgresql", _ASYNCPG_DRIVER})
_LIBPQ_ONLY_PARAMETERS: Final = frozenset({"channel_binding"})


def asyncpg_database_url(url: str) -> str:
    """Rewrites a libpq-style PostgreSQL URL, as issued by Neon and most hosts, into the form asyncpg accepts."""
    try:
        parsed = make_url(url)
    except ArgumentError as exc:
        raise ValueError("DATABASE_URL is not a valid URL") from exc
    if parsed.drivername not in _POSTGRES_DRIVERS:
        raise ValueError("DATABASE_URL must be a PostgreSQL URL")

    query = {key: value for key, value in parsed.query.items() if key not in _LIBPQ_ONLY_PARAMETERS}
    if "sslmode" in query:
        query.setdefault("ssl", query.pop("sslmode"))
    return parsed.set(drivername=_ASYNCPG_DRIVER, query=query).render_as_string(hide_password=False)
