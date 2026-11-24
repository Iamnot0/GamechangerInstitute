import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Annotated, Literal, Self

from pydantic import (
    EmailStr,
    Field,
    PositiveFloat,
    PositiveInt,
    PostgresDsn,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from app.database_url import asyncpg_database_url

_ORIGIN = re.compile(r"https?://[^/\s]+")
_HEADER_NAME = re.compile(r"[A-Za-z0-9-]+")
_HTTPS_URL = re.compile(r"https://[^/\s]+(/\S*)?")
_LOOPBACK_HTTP_URL = re.compile(r"http://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/\S*)?")
_HOST_LABEL = r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
_HOST_OR_SUFFIX = re.compile(rf"\.?{_HOST_LABEL}(?:\.{_HOST_LABEL})+")


class Environment(StrEnum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"


@dataclass(frozen=True, slots=True)
class SmtpConfig:
    host: str
    port: int
    username: str | None
    password: str | None = field(repr=False)
    starttls: bool
    timeout_seconds: float
    mail_from: str
    notify_to: str


@dataclass(frozen=True, slots=True)
class AuthConfig:
    issuer: str
    jwks_url: str
    authorized_parties: frozenset[str]
    staff_roles: frozenset[str]
    staff_organization_id: str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(frozen=True, env_ignore_empty=True, hide_input_in_errors=True)

    environment: Environment = Environment.DEVELOPMENT
    database_url: PostgresDsn
    database_pool_size: int = Field(default=2, ge=0, description="0 disables client-side pooling.")
    database_max_overflow: int = Field(default=3, ge=0)
    cors_origins: Annotated[tuple[str, ...], NoDecode] = ("http://localhost:3000",)
    trusted_client_ip_header: str | None = None
    rate_limit_per_ip: PositiveInt = 5
    rate_limit_window_seconds: PositiveInt = 600
    rate_limit_hash_key: Annotated[SecretStr, Field(min_length=32)]
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str | None = None
    smtp_password: SecretStr | None = None
    smtp_starttls: bool = True
    smtp_timeout_seconds: PositiveFloat = 10
    notifications_per_hour: PositiveInt = 200
    mail_from: EmailStr | None = None
    notify_to: EmailStr | None = None
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    api_root_path: str = Field(default="", description="Public prefix stripped before routing (/api on Vercel).")
    auth_issuer: str | None = None
    auth_jwks_url: str | None = None
    auth_authorized_parties: Annotated[tuple[str, ...], NoDecode] = ()
    auth_staff_roles: Annotated[tuple[str, ...], NoDecode] = ("admin", "staff")
    auth_staff_organization_id: str | None = None
    media_allowed_hosts: Annotated[tuple[str, ...], NoDecode] = Field(
        default=(".public.blob.vercel-storage.com",),
        description="Hosts photo URLs may use; a leading dot also admits subdomains.",
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _use_asyncpg_driver(cls, value: object) -> object:
        return asyncpg_database_url(value) if isinstance(value, str) else value

    @field_validator(
        "cors_origins", "auth_authorized_parties", "auth_staff_roles", "media_allowed_hosts", mode="before"
    )
    @classmethod
    def _split_comma_separated(cls, value: object) -> object:
        if isinstance(value, str):
            return tuple(item.strip() for item in value.split(",") if item.strip())
        return value

    @field_validator("cors_origins", "auth_authorized_parties")
    @classmethod
    def _require_exact_origins(cls, origins: tuple[str, ...]) -> tuple[str, ...]:
        if not all(_ORIGIN.fullmatch(origin) for origin in origins):
            raise ValueError("Origins must be scheme://host[:port] without a path")
        return origins

    @field_validator("api_root_path")
    @classmethod
    def _require_clean_root_path(cls, root_path: str) -> str:
        if root_path and (not root_path.startswith("/") or root_path.endswith("/") or "//" in root_path):
            raise ValueError("API_ROOT_PATH must be empty or a path like /api, without a trailing slash")
        return root_path

    @field_validator("auth_issuer")
    @classmethod
    def _require_https_issuer(cls, issuer: str | None) -> str | None:
        if issuer is not None and (not _HTTPS_URL.fullmatch(issuer) or issuer.endswith("/")):
            raise ValueError("AUTH_ISSUER must be an https URL without a trailing slash, matching the token's iss")
        return issuer

    @field_validator("auth_staff_organization_id")
    @classmethod
    def _require_exact_organization_id(cls, organization_id: str | None) -> str | None:
        if organization_id is not None and (not organization_id or organization_id != organization_id.strip()):
            raise ValueError(
                "AUTH_STAFF_ORGANIZATION_ID must be a non-blank organization id without surrounding spaces"
            )
        return organization_id

    @field_validator("auth_jwks_url")
    @classmethod
    def _require_secure_jwks_url(cls, url: str | None) -> str | None:
        if url is not None and not (_HTTPS_URL.fullmatch(url) or _LOOPBACK_HTTP_URL.fullmatch(url)):
            raise ValueError("AUTH_JWKS_URL must be an https URL")
        return url

    @field_validator("media_allowed_hosts")
    @classmethod
    def _require_host_names(cls, hosts: tuple[str, ...]) -> tuple[str, ...]:
        if not all(_HOST_OR_SUFFIX.fullmatch(host) for host in hosts):
            raise ValueError(
                "MEDIA_ALLOWED_HOSTS must be lowercase host names such as cdn.example.com, "
                "or .example.com to admit its subdomains"
            )
        return hosts

    @field_validator("trusted_client_ip_header")
    @classmethod
    def _require_header_name(cls, header: str | None) -> str | None:
        if header is not None and not _HEADER_NAME.fullmatch(header):
            raise ValueError("TRUSTED_CLIENT_IP_HEADER must be a single header name, such as x-real-ip")
        return header

    @model_validator(mode="after")
    def _require_complete_smtp(self) -> Self:
        if self.smtp_host and not (self.mail_from and self.notify_to):
            raise ValueError("SMTP_HOST requires MAIL_FROM and NOTIFY_TO")
        return self

    @model_validator(mode="after")
    def _require_complete_auth(self) -> Self:
        if self.auth_issuer and not (
            self.auth_authorized_parties and self.auth_staff_roles and self.auth_staff_organization_id
        ):
            raise ValueError(
                "AUTH_ISSUER requires AUTH_AUTHORIZED_PARTIES, AUTH_STAFF_ROLES and AUTH_STAFF_ORGANIZATION_ID"
            )
        return self

    @property
    def is_development(self) -> bool:
        return self.environment is Environment.DEVELOPMENT

    @property
    def smtp(self) -> SmtpConfig | None:
        if self.smtp_host is None or self.mail_from is None or self.notify_to is None:
            return None
        return SmtpConfig(
            host=self.smtp_host,
            port=self.smtp_port,
            username=self.smtp_username,
            password=self.smtp_password.get_secret_value() if self.smtp_password else None,
            starttls=self.smtp_starttls,
            timeout_seconds=self.smtp_timeout_seconds,
            mail_from=self.mail_from,
            notify_to=self.notify_to,
        )

    @property
    def auth(self) -> AuthConfig | None:
        if self.auth_issuer is None or self.auth_staff_organization_id is None:
            return None
        return AuthConfig(
            issuer=self.auth_issuer,
            jwks_url=self.auth_jwks_url or f"{self.auth_issuer}/.well-known/jwks.json",
            authorized_parties=frozenset(self.auth_authorized_parties),
            staff_roles=frozenset(self.auth_staff_roles),
            staff_organization_id=self.auth_staff_organization_id,
        )
