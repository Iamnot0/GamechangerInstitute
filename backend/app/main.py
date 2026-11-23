from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware

from app.api import enquiries, health
from app.config import Settings
from app.db import create_engine, create_session_factory
from app.logging import configure_logging
from app.middleware import (
    REQUEST_ID_HEADER,
    BodySizeLimitMiddleware,
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
    UnhandledErrorMiddleware,
)
from app.problems import EXCEPTION_HANDLERS
from app.redis_client import create_redis_client
from app.services.notifier import EnquiryNotifier
from app.services.rate_limit import FixedWindowRateLimiter
from app.state import AppState

_MAX_REQUEST_BODY_BYTES: Final = 16 * 1024


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
        engine = create_engine(settings)
        session_factory = create_session_factory(engine)
        redis = create_redis_client(settings)
        try:
            yield AppState(
                settings=settings,
                engine=engine,
                session_factory=session_factory,
                redis=redis,
                rate_limiter=FixedWindowRateLimiter(
                    redis,
                    namespace="rate-limit:enquiries",
                    limit=settings.rate_limit_per_ip,
                    window_seconds=settings.rate_limit_window_seconds,
                    hash_key=settings.rate_limit_hash_key.get_secret_value().encode(),
                ),
                notifier=EnquiryNotifier(settings.smtp, session_factory),
            )
        finally:
            await redis.aclose()
            await engine.dispose()

    app = FastAPI(
        title="GameChanger Institute API",
        version=version("gci-backend"),
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.is_development else None,
        exception_handlers=EXCEPTION_HANDLERS,
        middleware=[
            Middleware(RequestContextMiddleware),
            Middleware(SecurityHeadersMiddleware),
            Middleware(
                CORSMiddleware,
                allow_origins=settings.cors_origins,
                allow_methods=("GET", "POST", "OPTIONS"),
                allow_headers=("Content-Type", "Idempotency-Key"),
                expose_headers=(REQUEST_ID_HEADER, "Retry-After"),
                max_age=600,
            ),
            Middleware(UnhandledErrorMiddleware),
            Middleware(BodySizeLimitMiddleware, max_body_bytes=_MAX_REQUEST_BODY_BYTES),
        ],
    )
    app.include_router(health.router)
    app.include_router(enquiries.router)
    return app
