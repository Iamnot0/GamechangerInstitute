from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from importlib.metadata import version
from typing import Final

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware

from app.api import admin, admin_photos, admin_posts, admin_staff, enquiries, health, posts, staff_auth
from app.config import Settings
from app.db import create_engine, create_session_factory
from app.logging import configure_logging
from app.middleware import (
    REQUEST_ID_HEADER,
    BodySizeLimitMiddleware,
    RequestContextMiddleware,
    RootPathMiddleware,
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
_MAX_POST_BODY_BYTES: Final = 64 * 1024
_SECONDS_PER_HOUR: Final = 3600
_PURGE_INTERVAL_SECONDS: Final = 600
_AUTH_ATTEMPTS_PER_WINDOW: Final = 10
_AUTH_WINDOW_SECONDS: Final = 600


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    configure_logging(settings.log_level)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[AppState]:
        async with AsyncExitStack() as resources:
            engine = create_engine(settings)
            resources.push_async_callback(engine.dispose)
            hash_key = settings.rate_limit_hash_key.get_secret_value().encode()
            state = AppState(
                settings=settings,
                engine=engine,
                session_factory=create_session_factory(engine),
                rate_limit_policy=RateLimitPolicy(
                    namespace="rate-limit:enquiries",
                    window=FixedWindow(settings.rate_limit_per_ip, settings.rate_limit_window_seconds),
                    hash_key=hash_key,
                ),
                auth_rate_limit_policy=RateLimitPolicy(
                    namespace="rate-limit:staff-auth",
                    window=FixedWindow(_AUTH_ATTEMPTS_PER_WINDOW, _AUTH_WINDOW_SECONDS),
                    hash_key=hash_key,
                ),
                purge_cadence=Cadence(_PURGE_INTERVAL_SECONDS),
                notification_budget_policy=BudgetPolicy(
                    key="notification-budget:enquiries",
                    window=FixedWindow(settings.notifications_per_hour, _SECONDS_PER_HOUR),
                ),
            )
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
            Middleware(RootPathMiddleware, root_path=settings.api_root_path),
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
            Middleware(
                BodySizeLimitMiddleware,
                max_body_bytes=_MAX_REQUEST_BODY_BYTES,
                # A post body of 10,000 characters can take four bytes each.
                route_limits={admin_posts.router.prefix: _MAX_POST_BODY_BYTES},
            ),
        ],
    )
    app.include_router(health.router)
    app.include_router(enquiries.router)
    app.include_router(posts.router)
    if settings.staff_auth_enabled:
        app.include_router(staff_auth.router)
        app.include_router(admin.router)
        app.include_router(admin_photos.router)
        app.include_router(admin_posts.router)
        app.include_router(admin_staff.router)
    return app
