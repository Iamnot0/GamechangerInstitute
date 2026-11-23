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
    RedisDsn,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from app.database_url import asyncpg_database_url

_ORIGIN = re.compile(r"https?://[^/\s]+")
_HEADER_NAME = re.compile(r"[A-Za-z0-9-]+")


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
    model_config = SettingsConfigDict(frozen=True, env_ignore_empty=True)

    environment: Environment = Environment.DEVELOPMENT
    database_url: PostgresDsn
    database_pool_size: int = Field(default=2, ge=0, description="0 disables client-side pooling.")
    database_max_overflow: int = Field(default=3, ge=0)
    redis_url: RedisDsn
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
    mail_from: EmailStr | None = None
    notify_to: EmailStr | None = None
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    @field_validator("database_url", mode="before")
    @classmethod
    def _use_asyncpg_driver(cls, value: object) -> object:
        return asyncpg_database_url(value) if isinstance(value, str) else value

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return tuple(origin.strip() for origin in value.split(",") if origin.strip())
        return value

    @field_validator("cors_origins")
    @classmethod
    def _require_exact_origins(cls, origins: tuple[str, ...]) -> tuple[str, ...]:
        invalid = [origin for origin in origins if not _ORIGIN.fullmatch(origin)]
        if invalid:
            raise ValueError(f"CORS origins must be scheme://host[:port] without a path: {invalid}")
        return origins

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
