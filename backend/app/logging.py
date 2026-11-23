import json
import logging
import logging.config
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

request_id: ContextVar[str | None] = ContextVar("request_id", default=None)

_UVICORN_ANSI_MESSAGE = "color_message"
_RECORD_ATTRIBUTES = frozenset(vars(logging.makeLogRecord({}))) | {"message", "asctime", _UVICORN_ANSI_MESSAGE}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
        }
        if (current_request_id := request_id.get()) is not None:
            entry["request_id"] = current_request_id
        entry.update((key, value) for key, value in vars(record).items() if key not in _RECORD_ATTRIBUTES)
        if record.exc_info:
            entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)


def configure_logging(level: str) -> None:
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {"json": {"()": JsonFormatter}},
            "handlers": {
                "stdout": {"class": "logging.StreamHandler", "formatter": "json", "stream": "ext://sys.stdout"},
                "discard": {"class": "logging.NullHandler"},
            },
            "root": {"level": level, "handlers": ["stdout"]},
            "loggers": {
                "uvicorn": {"handlers": [], "propagate": True},
                "uvicorn.error": {"handlers": [], "propagate": True},
                # Uvicorn's access log records client IPs; RequestContextMiddleware logs requests without them.
                "uvicorn.access": {"handlers": ["discard"], "propagate": False},
            },
        }
    )
