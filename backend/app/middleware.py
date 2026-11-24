import logging
import re
import time
import uuid
from collections.abc import Mapping
from typing import Final

from starlette.datastructures import Headers, MutableHeaders
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.logging import request_id
from app.problems import problem_response

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER: Final = "X-Request-ID"
_VALID_REQUEST_ID: Final = re.compile(r"[A-Za-z0-9._-]{1,128}")
_SECURITY_HEADERS: Final = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
}
_DEFAULT_CACHE_CONTROL: Final = "no-store"


class RootPathMiddleware:
    """Declares the public path prefix the platform routes to this service, as `uvicorn --root-path` would.

    Starlette strips the root path before matching routes, so `/api/v1/...` from the edge and `/v1/...` from
    private service-to-service calls reach the same handlers.
    """

    def __init__(self, app: ASGIApp, root_path: str) -> None:
        self.app = app
        self.root_path = root_path

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] in ("http", "websocket"):
            scope["root_path"] = self.root_path
        await self.app(scope, receive, send)


class RequestContextMiddleware:
    """Binds a request id to the response and the logs, and writes one access log line per request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = Headers(scope=scope).get(REQUEST_ID_HEADER)
        current_id = incoming if incoming and _VALID_REQUEST_ID.fullmatch(incoming) else str(uuid.uuid7())
        token = request_id.set(current_id)
        started = time.perf_counter()
        status: int | None = None
        logged = False

        def log_request() -> None:
            nonlocal logged
            logged = True
            route = scope.get("route")
            logger.info(
                "request",
                extra={
                    "method": scope["method"],
                    "route": getattr(route, "path", None),
                    "status": status,
                    "latency_ms": round((time.perf_counter() - started) * 1000, 2),
                },
            )

        async def send_with_request_id(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                MutableHeaders(scope=message)[REQUEST_ID_HEADER] = current_id
            await send(message)
            if message["type"] == "http.response.body" and not message.get("more_body", False):
                log_request()

        try:
            await self.app(scope, receive, send_with_request_id)
        finally:
            if not logged:
                log_request()
            request_id.reset(token)


class SecurityHeadersMiddleware:
    """Hardens every response, and keeps it out of caches unless the route set its own Cache-Control."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in _SECURITY_HEADERS.items():
                    headers[name] = value
                headers.setdefault("Cache-Control", _DEFAULT_CACHE_CONTROL)
            await send(message)

        await self.app(scope, receive, send_with_security_headers)


class BodySizeLimitMiddleware:
    """Rejects request bodies over the limit, judged by the declared Content-Length and by the bytes received.

    Routes at or under a prefix in `route_limits` take that prefix's limit instead of the default.
    """

    def __init__(self, app: ASGIApp, *, max_body_bytes: int, route_limits: Mapping[str, int] | None = None) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.route_limits = dict(route_limits or {})

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = self._limit_for(_route_path(scope))
        detail = f"The request body must not exceed {limit // 1024} KiB."
        declared_length = Headers(scope=scope).get("content-length", "")
        if declared_length.isdigit() and int(declared_length) > limit:
            await problem_response(413, detail)(scope, receive, send)
            return

        received_bytes = 0

        async def receive_within_limit() -> Message:
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > limit:
                    raise HTTPException(status_code=413, detail=detail)
            return message

        await self.app(scope, receive_within_limit, send)

    def _limit_for(self, route_path: str) -> int:
        for prefix, limit in self.route_limits.items():
            if route_path == prefix or route_path.startswith(f"{prefix}/"):
                return limit
        return self.max_body_bytes


def _route_path(scope: Scope) -> str:
    path: str = scope["path"]
    root_path: str = scope.get("root_path", "")
    return path[len(root_path) :] if root_path and path.startswith(f"{root_path}/") else path


class UnhandledErrorMiddleware:
    """Turns unexpected exceptions into a problem response that still passes through the outer middleware."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def send_tracking_start(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_tracking_start)
        except Exception:
            if response_started:
                raise
            logger.exception("unhandled error")
            await problem_response(500)(scope, receive, send)
