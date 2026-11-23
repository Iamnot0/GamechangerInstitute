# GameChanger Institute API

Accepts enquiries from the website, stores them in PostgreSQL and emails each new one to the Institute's inbox.

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/enquiries` | Submit an enquiry (`202 {"id", "received_at"}`, errors as `application/problem+json`) |
| `GET /healthz` | Liveness, no dependencies |
| `GET /readyz` | Readiness of PostgreSQL and Redis (`503` when either fails) |

OpenAPI docs (`/docs`, `/openapi.json`) are served only when `ENVIRONMENT=development`.

The ASGI app is built by `app.main:create_app` (factory, used by uvicorn) and exposed as `app.asgi:app` for runtimes that import a module-level app, such as Vercel.

## Run

Requires Python 3.14 and [uv](https://docs.astral.sh/uv/).

```sh
uv sync
cp .env.example .env            # set RATE_LIMIT_HASH_KEY, adjust the rest
uv run --env-file .env alembic upgrade head
uv run --env-file .env uvicorn app.main:create_app --factory --port 8000
```

## Migrate

```sh
uv run --env-file .env alembic upgrade head      # apply
uv run --env-file .env alembic check             # fail if models and migrations drift
uv run --env-file .env alembic revision -m "describe change"
```

Migrations connect with `DATABASE_URL_UNPOOLED` when it is set, otherwise `DATABASE_URL`, normalised the same way as the app's URL.

## Environment

| Variable | Default | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `development` | `development` or `production`. The Docker image sets `production`; set it explicitly everywhere else. |
| `DATABASE_URL` | required | `postgresql+asyncpg://`, `postgresql://` or `postgres://`. `sslmode` becomes asyncpg's `ssl`; `channel_binding` is dropped because asyncpg has no equivalent. |
| `DATABASE_URL_UNPOOLED` | unset | Direct connection for migrations when `DATABASE_URL` points at PgBouncer |
| `DATABASE_POOL_SIZE` | `2` | Connections kept per process. `0` opens a connection per checkout, which SQLAlchemy recommends behind PgBouncer. |
| `DATABASE_MAX_OVERFLOW` | `3` | Extra connections beyond the pool under load |
| `REDIS_URL` | required | `redis://host:6379/0`, or `rediss://` for TLS with certificate verification |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated exact origins, no paths or wildcards |
| `TRUSTED_CLIENT_IP_HEADER` | unset | Header holding the client IP, set by an edge that overwrites any client-supplied value (`x-real-ip` on Vercel). Unset uses the peer address from uvicorn. |
| `RATE_LIMIT_PER_IP` | `5` | Valid submissions per client per window (honeypot hits are not counted). A client is an IPv4 address or an IPv6 /64; requests without a usable IP share one bucket. |
| `RATE_LIMIT_WINDOW_SECONDS` | `600` | Window length |
| `RATE_LIMIT_GLOBAL_PER_HOUR` | `200` | Submissions accepted per hour across all clients, which caps notification emails during a distributed flood. Requests already over their client limit do not count. |
| `RATE_LIMIT_HASH_KEY` | required | Secret, at least 32 characters. Keys the HMAC-SHA256 that identifies a client IP in Redis. The app refuses to start without it, in every environment. Rotating it resets open windows. |
| `SMTP_HOST` | unset | Unset disables notification emails |
| `SMTP_PORT` | `587` | |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | unset | Sent only when set |
| `SMTP_STARTTLS` | `true` | Implicit TLS (port 465) is not supported; use STARTTLS |
| `SMTP_TIMEOUT_SECONDS` | `10` | Upper bound on sending one notification; the submission response waits for it |
| `MAIL_FROM` | unset | Required when `SMTP_HOST` is set |
| `NOTIFY_TO` | unset | Required when `SMTP_HOST` is set |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` in the image | Read by uvicorn: proxies trusted to set `X-Forwarded-For` |

## Deploy

### Vercel (Services)

- Service root `backend/`, entrypoint `app.asgi:app`. Python 3.14 comes from `.python-version` and `requires-python`; dependencies install from `pyproject.toml` and `uv.lock`.
- The service must see the paths it serves (`/v1/enquiries`, `/healthz`, `/readyz`), so strip any public prefix with a `request.path` transform in the service's routes.
- Set `ENVIRONMENT=production`, `TRUSTED_CLIENT_IP_HEADER=x-real-ip`, `DATABASE_POOL_SIZE=0`, `RATE_LIMIT_HASH_KEY` and the SMTP variables. The Neon and Upstash integrations provide `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and the `rediss://` URL.
- Run `alembic upgrade head` against `DATABASE_URL_UNPOOLED` before promoting a deployment that changes the schema.
- The notification email is sent before the `202` is returned, because the runtime may suspend the instance after the response.

### Container

```sh
docker build -t gci-backend .
docker run --rm --env-file prod.env gci-backend alembic upgrade head   # release step, before rollout
docker run -d -p 8000:8000 --env-file prod.env gci-backend
```

- The image runs as a non-root user, listens on port 8000 and health-checks `/healthz`. Point the orchestrator's readiness probe at `/readyz`.
- Run one uvicorn process per container and scale with replicas; set `WEB_CONCURRENCY` only if a single container must use several cores.
- Terminate TLS at the proxy and set `FORWARDED_ALLOW_IPS` to the proxy's address or CIDR. Rate limiting keys on the client IP uvicorn derives from `X-Forwarded-For`, so a wrong value either limits every visitor as one client or lets clients forge their IP. Use `*` only when the container is unreachable except through the proxy.

### Everywhere

- Logs are JSON lines on stdout. They carry request id, enquiry id, kind, status and latency, never names, emails, messages or IPs. Uvicorn's own access log is discarded because it records client IPs.
- Rate limiting runs two fixed windows in Redis: per client, then global. Requests without a usable client IP are limited together in an `unknown` bucket and logged as a warning.
- Redis outages never block submissions: both windows fail open and log a warning. This is a deliberate availability trade-off; during an outage, submissions and emails are unthrottled. PostgreSQL is the source of truth; an enquiry whose email failed or timed out keeps `notified_at` empty.
- Configuration errors never echo the values supplied, so a failed start cannot leak secrets into logs.
