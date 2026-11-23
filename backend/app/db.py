import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import Settings


def _unique_prepared_statement_name() -> str:
    return f"__asyncpg_{uuid.uuid4()}__"


def asyncpg_connect_args() -> dict[str, Any]:
    """Driver options that stay correct behind PgBouncer in transaction mode, such as Neon's pooled endpoint.

    A transaction-mode pooler may run consecutive statements on different server connections, so neither asyncpg's
    statement cache nor SQLAlchemy's may be relied on, and prepared statement names must never collide.
    """
    return {
        "timeout": 5,
        "command_timeout": 10,
        "server_settings": {"application_name": "gci-backend"},
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": _unique_prepared_statement_name,
    }


def create_engine(settings: Settings) -> AsyncEngine:
    pooling: dict[str, Any] = (
        {"poolclass": NullPool}
        if settings.database_pool_size == 0
        else {
            "pool_size": settings.database_pool_size,
            "max_overflow": settings.database_max_overflow,
            "pool_pre_ping": True,
        }
    )
    return create_async_engine(
        str(settings.database_url),
        hide_parameters=True,
        connect_args=asyncpg_connect_args(),
        **pooling,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)
