import hashlib
import hmac
import secrets
from dataclasses import dataclass
from uuid import UUID

from app.domain import StaffRole


@dataclass(frozen=True, slots=True)
class StaffMember:
    id: UUID
    email: str
    role: StaffRole

    @property
    def subject(self) -> str:
        return str(self.id)


def generate_login_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_login_code(secret: bytes, email: str, code: str) -> str:
    return hmac.new(secret, f"{email.lower()}:{code}".encode(), hashlib.sha256).hexdigest()


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
