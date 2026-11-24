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
    auth_mail_from: EmailStr | None = None
    staff_auth_secret: Annotated[SecretStr, Field(min_length=32)] | None = None
    site_url: str = "https://gamechanger.institute"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    api_root_path: str = Field(default="", description="Public prefix stripped before routing (/api on Vercel).")
    media_allowed_hosts: Annotated[tuple[str, ...], NoDecode] = Field(
        default=(),
        description=(
            "Hosts photo and PDF URLs may use: this project's own storage host. Empty refuses every file, "
            "so an unset value fails closed rather than trusting every tenant of a shared storage domain."
        ),
    )

    @field_validator("database_url", mode="before")
    @classmethod
    def _use_asyncpg_driver(cls, value: object) -> object:
        return asyncpg_database_url(value) if isinstance(value, str) else value

    @field_validator("cors_origins", "media_allowed_hosts", mode="before")
    @classmethod
    def _split_comma_separated(cls, value: object) -> object:
        if isinstance(value, str):
            return tuple(item.strip() for item in value.split(",") if item.strip())
        return value

    @field_validator("cors_origins")
    @classmethod
    def _require_exact_origins(cls, origins: tuple[str, ...]) -> tuple[str, ...]:
        if not all(_ORIGIN.fullmatch(origin) for origin in origins):
            raise ValueError("Origins must be scheme://host[:port] without a path")
        return origins

    @field_validator("site_url")
    @classmethod
    def _require_site_origin(cls, origin: str) -> str:
        cleaned = origin.rstrip("/")
        if not _ORIGIN.fullmatch(cleaned):
            raise ValueError("SITE_URL must be scheme://host[:port]")
        return cleaned

    @field_validator("api_root_path")
    @classmethod
    def _require_clean_root_path(cls, root_path: str) -> str:
        if root_path and (not root_path.startswith("/") or root_path.endswith("/") or "//" in root_path):
            raise ValueError("API_ROOT_PATH must be empty or a path like /api, without a trailing slash")
        return root_path

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

    @property
    def is_development(self) -> bool:
        return self.environment is Environment.DEVELOPMENT

    @property
    def staff_auth_enabled(self) -> bool:
        return self.staff_auth_secret is not None

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
    def auth_sender(self) -> str | None:
        if self.auth_mail_from is not None:
            return str(self.auth_mail_from)
        if self.mail_from is not None:
            domain = str(self.mail_from).rpartition("@")[2]
            return f"noreply@{domain}"
        return None
