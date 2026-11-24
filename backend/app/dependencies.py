import logging
from collections.abc import AsyncIterator
from typing import Annotated, cast

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.auth.verifier import StaffMember, hash_session_token
from app.client_ip import client_identity
from app.domain import StaffRole
from app.repositories.enquiries import EnquiryRepository
from app.repositories.photos import PhotoRepository
from app.repositories.posts import PostRepository
from app.repositories.rate_limit_windows import RateLimitWindows
from app.repositories.staff import StaffRepository
from app.services.auth_mailer import StaffAuthMailer
from app.services.notification_budget import NotificationBudget
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


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Binds the request's session to one connection, so its transactions share it even without a client-side pool."""
    state = _app_state(request)
    async with state["engine"].connect() as connection, state["session_factory"](bind=connection) as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session, scope="function")]


async def get_enquiry_repository(session: SessionDep) -> EnquiryRepository:
    return EnquiryRepository(session)


async def get_photo_repository(session: SessionDep) -> PhotoRepository:
    return PhotoRepository(session)


async def get_post_repository(session: SessionDep) -> PostRepository:
    return PostRepository(session)


async def get_staff_repository(session: SessionDep) -> StaffRepository:
    return StaffRepository(session)


async def get_media_allowed_hosts(request: Request) -> tuple[str, ...]:
    return _app_state(request)["settings"].media_allowed_hosts


async def get_client_identity(request: Request) -> str | None:
    trusted_header = _app_state(request)["settings"].trusted_client_ip_header
    identity = client_identity(request, trusted_header)
    if identity is None and trusted_header is not None:
        logger.warning("request rejected: trusted client ip header missing or invalid")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="We could not verify your request.")
    return identity


async def get_rate_limiter(request: Request, session: SessionDep) -> FixedWindowRateLimiter:
    state = _app_state(request)
    return FixedWindowRateLimiter(RateLimitWindows(session), state["rate_limit_policy"], state["purge_cadence"])


async def get_auth_rate_limiter(request: Request, session: SessionDep) -> FixedWindowRateLimiter:
    state = _app_state(request)
    return FixedWindowRateLimiter(RateLimitWindows(session), state["auth_rate_limit_policy"], state["purge_cadence"])


async def get_notifier(request: Request, session: SessionDep) -> EnquiryNotifier:
    state = _app_state(request)
    budget = NotificationBudget(session, state["notification_budget_policy"])
    return EnquiryNotifier(state["settings"].smtp, budget, EnquiryRepository(session))


async def get_auth_mailer(request: Request, session: SessionDep) -> StaffAuthMailer:
    state = _app_state(request)
    settings = state["settings"]
    budget = NotificationBudget(session, state["staff_mail_budget_policy"])
    return StaffAuthMailer(settings.smtp, settings.auth_sender, settings.site_url, budget)


async def get_staff_auth_secret(request: Request) -> bytes:
    secret = _app_state(request)["settings"].staff_auth_secret
    if secret is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return secret.get_secret_value().encode()


def bearer_token_from_request(request: Request) -> str | None:
    scheme, _, token = request.headers.get("authorization", "").partition(" ")
    cleaned = token.strip()
    if scheme.lower() != "bearer" or not cleaned:
        return None
    return cleaned


async def require_staff(
    request: Request,
    repository: Annotated[StaffRepository, Depends(get_staff_repository)],
) -> StaffMember:
    token = bearer_token_from_request(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    staff = await repository.resolve_session(hash_session_token(token))
    if staff is None:
        logger.info("staff session rejected")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or has expired. Sign in again.",
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        )
    return staff


async def require_admin(staff: Annotated[StaffMember, Depends(require_staff)]) -> StaffMember:
    if staff.role is not StaffRole.ADMIN:
        logger.warning("staff admin action denied", extra={"actor_sub": staff.subject})
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an administrator can manage staff accounts.",
        )
    return staff


EngineDep = Annotated[AsyncEngine, Depends(get_engine)]
EnquiryRepositoryDep = Annotated[EnquiryRepository, Depends(get_enquiry_repository)]
PhotoRepositoryDep = Annotated[PhotoRepository, Depends(get_photo_repository)]
PostRepositoryDep = Annotated[PostRepository, Depends(get_post_repository)]
StaffRepositoryDep = Annotated[StaffRepository, Depends(get_staff_repository)]
MediaAllowedHostsDep = Annotated[tuple[str, ...], Depends(get_media_allowed_hosts)]
ClientIdentityDep = Annotated[str | None, Depends(get_client_identity)]
RateLimiterDep = Annotated[FixedWindowRateLimiter, Depends(get_rate_limiter)]
AuthRateLimiterDep = Annotated[FixedWindowRateLimiter, Depends(get_auth_rate_limiter)]
NotifierDep = Annotated[EnquiryNotifier, Depends(get_notifier)]
AuthMailerDep = Annotated[StaffAuthMailer, Depends(get_auth_mailer)]
StaffAuthSecretDep = Annotated[bytes, Depends(get_staff_auth_secret)]
StaffDep = Annotated[StaffMember, Depends(require_staff)]
AdminDep = Annotated[StaffMember, Depends(require_admin)]
