import logging
from http import HTTPStatus
from typing import Final

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.verifier import (
    generate_login_code,
    generate_session_token,
    hash_login_code,
    hash_session_token,
)
from app.dependencies import (
    AuthMailerDep,
    AuthRateLimiterDep,
    ClientIdentityDep,
    StaffAuthSecretDep,
    StaffDep,
    StaffRepositoryDep,
    bearer_token_from_request,
    require_json_body,
)
from app.domain import StaffRole
from app.problems import problem_responses
from app.staff_schemas import (
    AuthenticatedSession,
    CodeRequest,
    CodeRequested,
    CodeVerification,
    StaffIdentity,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/auth", tags=["auth"])

_RATE_LIMIT_DETAIL: Final = "Too many sign-in attempts from this network. Please wait a few minutes and try again."
_INVALID_CODE_DETAIL: Final = "That code is invalid or has expired. Request a new code and try again."


@router.post(
    "/request-code",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 413, 415, 422, 429),
)
async def request_login_code(
    payload: CodeRequest,
    client_identity: ClientIdentityDep,
    rate_limiter: AuthRateLimiterDep,
    repository: StaffRepositoryDep,
    mailer: AuthMailerDep,
    secret: StaffAuthSecretDep,
) -> CodeRequested:
    decision = await rate_limiter.hit(client_identity)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_RATE_LIMIT_DETAIL,
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    user = await repository.find_by_email(payload.email)
    if user is not None:
        code = generate_login_code()
        code_hash = hash_login_code(secret, user.email, code)
        await repository.store_login_code(user.email, code_hash)
        await mailer.send_login_code(user.email, code)
        logger.info("staff login code issued", extra={"actor_sub": str(user.id)})
    else:
        logger.info("staff login code ignored: unknown email")

    return CodeRequested()


@router.post(
    "/verify-code",
    dependencies=[Depends(require_json_body)],
    responses=problem_responses(400, 401, 413, 415, 422, 429),
)
async def verify_login_code(
    payload: CodeVerification,
    client_identity: ClientIdentityDep,
    rate_limiter: AuthRateLimiterDep,
    repository: StaffRepositoryDep,
    secret: StaffAuthSecretDep,
) -> AuthenticatedSession:
    decision = await rate_limiter.hit(client_identity)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_RATE_LIMIT_DETAIL,
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    candidate_hash = hash_login_code(secret, payload.email, payload.code)
    user = await repository.verify_and_consume_code(payload.email, candidate_hash)
    if user is None:
        logger.info("staff login code rejected")
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail=_INVALID_CODE_DETAIL)

    raw_token = generate_session_token()
    expires_at = await repository.create_session(user.id, hash_session_token(raw_token))
    logger.info("staff session created", extra={"actor_sub": str(user.id)})
    return AuthenticatedSession(
        token=raw_token,
        expires_at=expires_at,
        user=StaffIdentity(id=user.id, email=user.email, role=StaffRole(user.role)),
    )


@router.get("/session", responses=problem_responses(401))
async def current_session(staff: StaffDep) -> StaffIdentity:
    return StaffIdentity(id=staff.id, email=staff.email, role=staff.role)


@router.post("/logout", status_code=HTTPStatus.NO_CONTENT)
async def logout(request: Request, repository: StaffRepositoryDep) -> None:
    token = bearer_token_from_request(request)
    if token is not None:
        await repository.revoke_session(hash_session_token(token))
