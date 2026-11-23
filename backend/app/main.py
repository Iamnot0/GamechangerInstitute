from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from importlib.metadata import version
from typing import Final

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware

from app.api import admin, enquiries, health
from app.auth.verifier import create_staff_verifier
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
from app.services.cadence import Cadence
from app.services.fixed_window import FixedWindow
from app.services.notification_budget import BudgetPolicy
from app.services.rate_limit import RateLimitPolicy
from app.state import AppState

_MAX_REQUEST_BODY_BYTES: Final = 16 * 1024
_SECONDS_PER_HOUR: Final = 3600
_JWKS_FETCH_TIMEOUT_SECONDS: Final = 5.0
_PURGE_INTERVAL_SECONDS: Final = 600


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
        async with AsyncExitStack() as resources:
            engine = create_engine(settings)
            resources.push_async_callback(engine.dispose)
            state = AppState(
                settings=settings,
                engine=engine,
                session_factory=create_session_factory(engine),
                rate_limit_policy=RateLimitPolicy(
                    namespace="rate-limit:enquiries",
                    window=FixedWindow(settings.rate_limit_per_ip, settings.rate_limit_window_seconds),
                    hash_key=settings.rate_limit_hash_key.get_secret_value().encode(),
                ),
                purge_cadence=Cadence(_PURGE_INTERVAL_SECONDS),
                notification_budget_policy=BudgetPolicy(
                    key="notification-budget:enquiries",
                    window=FixedWindow(settings.notifications_per_hour, _SECONDS_PER_HOUR),
                ),
            )
            if (auth := settings.auth) is not None:
                http = await resources.enter_async_context(httpx.AsyncClient(timeout=_JWKS_FETCH_TIMEOUT_SECONDS))
                state["staff_verifier"] = create_staff_verifier(auth, http)
            yield state

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
    if settings.auth is not None:
        app.include_router(admin.router)
    return app
