from collections.abc import AsyncIterator
from typing import Annotated, cast

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.client_ip import client_ip
from app.repositories.enquiries import EnquiryRepository
from app.services.notifier import EnquiryNotifier
from app.services.rate_limit import FixedWindowRateLimiter
from app.state import AppState


async def require_json_body(request: Request) -> None:
    media_type = request.headers.get("content-type", "").partition(";")[0].strip().lower()
    if media_type != "application/json":
        raise HTTPException(status_code=415)


def _app_state(request: Request) -> AppState:
    return cast(AppState, request.scope["state"])


async def get_engine(request: Request) -> AsyncEngine:
    return _app_state(request)["engine"]


async def get_redis(request: Request) -> Redis:
    return _app_state(request)["redis"]


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with _app_state(request)["session_factory"]() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session, scope="function")]


async def get_enquiry_repository(session: SessionDep) -> EnquiryRepository:
    return EnquiryRepository(session)


async def get_client_ip(request: Request) -> str | None:
    return client_ip(request, _app_state(request)["settings"].trusted_client_ip_header)


async def get_rate_limiter(request: Request) -> FixedWindowRateLimiter:
    return _app_state(request)["rate_limiter"]


async def get_notifier(request: Request) -> EnquiryNotifier:
    return _app_state(request)["notifier"]


EngineDep = Annotated[AsyncEngine, Depends(get_engine)]
RedisDep = Annotated[Redis, Depends(get_redis)]
EnquiryRepositoryDep = Annotated[EnquiryRepository, Depends(get_enquiry_repository)]
ClientIpDep = Annotated[str | None, Depends(get_client_ip)]
RateLimiterDep = Annotated[FixedWindowRateLimiter, Depends(get_rate_limiter)]
NotifierDep = Annotated[EnquiryNotifier, Depends(get_notifier)]
