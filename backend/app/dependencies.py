import logging
from collections.abc import AsyncIterator
from typing import Annotated, cast

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.auth.jwks import SigningKeysUnavailableError
from app.auth.verifier import InvalidTokenError, NotStaffError, StaffMember, StaffTokenVerifier
from app.client_ip import client_identity
from app.repositories.enquiries import EnquiryRepository
from app.services.notifier import EnquiryNotifier
from app.services.rate_limit import FixedWindowRateLimiter
from app.state import AppState

logger = logging.getLogger(__name__)


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


async def get_client_identity(request: Request) -> str | None:
    trusted_header = _app_state(request)["settings"].trusted_client_ip_header
    identity = client_identity(request, trusted_header)
    if identity is None and trusted_header is not None:
        logger.warning("request rejected: trusted client ip header missing or invalid")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="We could not verify your request.")
    return identity


async def get_rate_limiter(request: Request) -> FixedWindowRateLimiter:
    return _app_state(request)["rate_limiter"]


async def get_notifier(request: Request) -> EnquiryNotifier:
    return _app_state(request)["notifier"]


async def get_staff_verifier(request: Request) -> StaffTokenVerifier:
    return _app_state(request)["staff_verifier"]


async def require_staff(
    request: Request, verifier: Annotated[StaffTokenVerifier, Depends(get_staff_verifier)]
) -> StaffMember:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await verifier.verify(token.strip())
    except InvalidTokenError as exc:
        logger.info("staff token rejected", extra={"reason": exc.reason})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired. Sign in again.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from None
    except NotStaffError as exc:
        logger.warning("staff access denied", extra={"actor_sub": exc.subject})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account does not have access to the staff console.",
        ) from None
    except SigningKeysUnavailableError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Sign-in cannot be verified right now. Please try again shortly.",
        ) from None


EngineDep = Annotated[AsyncEngine, Depends(get_engine)]
RedisDep = Annotated[Redis, Depends(get_redis)]
EnquiryRepositoryDep = Annotated[EnquiryRepository, Depends(get_enquiry_repository)]
ClientIdentityDep = Annotated[str | None, Depends(get_client_identity)]
RateLimiterDep = Annotated[FixedWindowRateLimiter, Depends(get_rate_limiter)]
NotifierDep = Annotated[EnquiryNotifier, Depends(get_notifier)]
StaffDep = Annotated[StaffMember, Depends(require_staff)]
