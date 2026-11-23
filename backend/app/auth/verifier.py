from dataclasses import dataclass
from typing import Final

import httpx
import jwt

from app.auth.jwks import JwksCache
from app.config import AuthConfig

_ALGORITHM: Final = "RS256"
_REQUIRED_CLAIMS: Final = ["exp", "iat", "nbf", "iss", "sub"]


@dataclass(frozen=True, slots=True)
class StaffMember:
    subject: str
    email: str | None
    role: str


class InvalidTokenError(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class NotStaffError(Exception):
    def __init__(self, subject: str) -> None:
        super().__init__(subject)
        self.subject = subject


class StaffTokenVerifier:
    """Verifies OIDC session tokens (RS256 JWTs) and admits only members holding a staff role.

    Provider-specific claims are limited to ``role`` and ``email``, which the identity provider's session token
    template must add.
    """

    def __init__(self, config: AuthConfig, keys: JwksCache, *, leeway_seconds: float = 10) -> None:
        self._config = config
        self._keys = keys
        self._leeway_seconds = leeway_seconds

    async def verify(self, token: str) -> StaffMember:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise InvalidTokenError("malformed") from exc
        kid = header.get("kid")
        if header.get("alg") != _ALGORITHM or not isinstance(kid, str):
            raise InvalidTokenError("unsupported header")

        key = await self._keys.signing_key(kid)
        if key is None:
            raise InvalidTokenError("unknown signing key")
        try:
            claims = jwt.decode(
                token,
                key,
                algorithms=[_ALGORITHM],
                issuer=self._config.issuer,
                leeway=self._leeway_seconds,
                options={"require": _REQUIRED_CLAIMS},
            )
        except jwt.PyJWTError as exc:
            raise InvalidTokenError(type(exc).__name__) from exc

        authorized_party = claims.get("azp")
        if not isinstance(authorized_party, str) or authorized_party not in self._config.authorized_parties:
            raise InvalidTokenError("unauthorized party")
        subject = claims["sub"]
        if not isinstance(subject, str) or not subject:
            raise InvalidTokenError("missing subject")
        role = claims.get("role")
        if not isinstance(role, str) or role not in self._config.staff_roles:
            raise NotStaffError(subject)
        email = claims.get("email")
        return StaffMember(subject=subject, email=email if isinstance(email, str) and email else None, role=role)


def create_staff_verifier(config: AuthConfig, http: httpx.AsyncClient) -> StaffTokenVerifier:
    return StaffTokenVerifier(config, JwksCache(config.jwks_url, http))
