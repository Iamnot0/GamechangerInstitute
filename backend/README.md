# GameChanger Institute API

Accepts enquiries from the website, stores them in PostgreSQL and emails each new one to the Institute's inbox. Invited staff review and progress them through the admin API, where they also write the news posts the website reads from the public endpoints.

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/enquiries` | Submit an enquiry (`202 {"id", "received_at"}`, errors as `application/problem+json`) |
| `GET /healthz` | Liveness, no dependencies |
| `GET /readyz` | Readiness of PostgreSQL (`503` when it cannot be reached) |
| `GET /v1/admin/enquiries` | Staff: list, newest first. `status`, `kind`, `q` (name, email or organisation), `limit` (1-100, default 25), `cursor` (the previous page's `next_cursor`) |
| `GET /v1/admin/enquiries/summary` | Staff: totals by status and by kind |
| `GET /v1/admin/enquiries/{id}` | Staff: every field plus status events, newest first |
| `PATCH /v1/admin/enquiries/{id}` | Staff: `{"status", "expected_status", "note"?}`. `409` when the enquiry is no longer in `expected_status`; `422` when the status would not change |
| `GET /v1/posts` | Published posts with their photos, YouTube id and PDF, newest event date first (publication day when a post has none). `limit` (1-50, default 50) |
| `GET /v1/posts/{slug}` | One published post, or `404` |
| `POST /v1/admin/photos` | Staff: record a photo the console uploaded to storage: `{"url", "content_type", "size_bytes", "width", "height", "alt"}`. `201 {"id", "src", "width", "height", "alt"}`; `422` when the URL is not a canonical https address on an allowed host or is already recorded |
| `DELETE /v1/admin/photos/{id}` | Staff: remove an upload that was never attached. `409` when a post shows it |
| `GET /v1/admin/posts` | Staff: posts, most recently updated first. `status`, `limit` (1-100, default 25), `cursor` |
| `POST /v1/admin/posts` | Staff: create a draft from `{"title", "body"?, "event_date"?, "youtube_url"?, "photo_ids"?, "document"?, "slug"?}`. The slug comes from the title unless given |
| `GET`, `PUT`, `DELETE /v1/admin/posts/{id}` | Staff: read, replace (the same fields plus `expected_version`; `409` when stale; `422` when the slug of a post that was ever published would change) or delete |
| `POST /v1/admin/posts/{id}/publish`, `/unpublish` | Staff: `{"expected_version"}`. `409` when stale or already in that state |

The admin endpoints exist only when `AUTH_ISSUER` is set; otherwise they return `404`.

Every response is sent with `Cache-Control: no-store`, except successful public post responses, which carry `public, max-age=0, s-maxage=60, stale-while-revalidate=600` so the edge can serve them. Request bodies are limited to 16 KiB, and to 64 KiB on `/v1/admin/posts`, where a body of 10,000 characters must fit in any script.

A post's version starts at 1 and rises by one on every replace, publish or unpublish. Those writes carry the version the client last read and are refused with `409` when it is stale.

A post shows up to twelve photos in the order of `photo_ids`, and a photo belongs to one post. `PUT` replaces the whole post: a field left out returns to empty, a photo left out of `photo_ids` has its record deleted in the same transaction, and deleting a post deletes the records of its photos. A post may also carry one PDF, `document: {"url", "name", "size_bytes"}`, whose URL follows the photo rules, ends in `.pdf` and is attached to one post only.

The backend never receives files: the console uploads photos and PDFs to blob storage and records the resulting URLs here, and it removes the stored files once their records are gone.

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
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated exact origins, no paths or wildcards |
| `TRUSTED_CLIENT_IP_HEADER` | unset | Header holding the client IP, set by an edge that overwrites any client-supplied value (`x-real-ip` on Vercel). A submission without a valid value is rejected with `400`, since it did not come through the edge. Unset uses the peer address from uvicorn. |
| `RATE_LIMIT_PER_IP` | `5` | Valid submissions per client per window (honeypot hits are not counted). A client is an IPv4 address or an IPv6 /64. |
| `RATE_LIMIT_WINDOW_SECONDS` | `600` | Window length |
| `RATE_LIMIT_HASH_KEY` | required | Secret, at least 32 characters. Keys the HMAC-SHA256 that identifies a client in the `rate_limit_windows` table. The app refuses to start without it, in every environment. Rotating it resets open windows. |
| `SMTP_HOST` | unset | Unset disables notification emails |
| `SMTP_PORT` | `587` | |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | unset | Sent only when set |
| `SMTP_STARTTLS` | `true` | Implicit TLS (port 465) is not supported; use STARTTLS |
| `SMTP_TIMEOUT_SECONDS` | `10` | Upper bound on sending one notification; the submission response waits for it |
| `NOTIFICATIONS_PER_HOUR` | `200` | Notification emails per hour across all clients. Past it, enquiries are still stored and acknowledged, but no email is sent and `notified_at` stays empty. |
| `MAIL_FROM` | unset | Required when `SMTP_HOST` is set |
| `NOTIFY_TO` | unset | Required when `SMTP_HOST` is set |
| `API_ROOT_PATH` | empty | Public prefix stripped before routing. `/api` on Vercel, where `/api/*` routes to this service; internal calls without the prefix still match |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` in the image | Read by uvicorn: proxies trusted to set `X-Forwarded-For` |
| `AUTH_ISSUER` | unset | OIDC issuer of staff session tokens, exactly as in their `iss` claim (`https://<instance>.clerk.accounts.dev`). Unset disables the admin API. |
| `AUTH_JWKS_URL` | `{AUTH_ISSUER}/.well-known/jwks.json` | Where the issuer publishes its signing keys. Must be https. |
| `AUTH_AUTHORIZED_PARTIES` | required with `AUTH_ISSUER` | Comma-separated exact origins accepted in the token's `azp` claim, normally the staff console's origin |
| `AUTH_STAFF_ROLES` | `admin,staff` | Values of the token's `role` claim that grant access |
| `AUTH_STAFF_ORGANIZATION_ID` | required with `AUTH_ISSUER` | The staff organization's id (`org_...`). Only tokens whose `org_id` claim equals it are staff. |
| `MEDIA_ALLOWED_HOSTS` | empty | The exact storage host recorded photo and PDF URLs may use, always over https: this project's Blob store, such as `abc123.public.blob.vercel-storage.com`. Empty refuses every photo and PDF. Avoid a leading-dot suffix on a shared storage domain: it would trust every other tenant's files. |

## Staff authentication

The admin API accepts `Authorization: Bearer <session JWT>` from any OIDC provider that signs with RS256 and publishes a JWKS. With Clerk, add these claims to the session token template (Configure → Sessions → Customize session token):

```json
{
  "email": "{{user.primary_email_address}}",
  "role": "{{org.role}}",
  "org_id": "{{org.id}}"
}
```

Staff are members of the Institute's Clerk organization, and the console must make it the session's active organization. Because any user of the Clerk app can create an organization and be its `org:admin`, the role alone proves nothing, so the organization check is mandatory: the app refuses to start with `AUTH_ISSUER` but without `AUTH_STAFF_ORGANIZATION_ID`. A token is accepted when:

- its signature verifies against a key from the issuer's JWKS (RS256 only),
- `iss` equals `AUTH_ISSUER`, `azp` is one of `AUTH_AUTHORIZED_PARTIES`, and `sub` is present,
- `exp`, `nbf` and `iat` hold within a 10-second leeway,
- `org_id` equals `AUTH_STAFF_ORGANIZATION_ID`,
- `role` is one of `AUTH_STAFF_ROLES`. A missing role grants nothing.

Missing, malformed, expired or foreign tokens get `401` with `WWW-Authenticate: Bearer`; valid tokens from another organization or without a staff role get `403`, logged with the reason; if the signing keys have never loaded, `503`. Keys are cached in memory, reloaded hourly or when a token names an unknown key (at most once a minute), and fetched with a 5-second timeout, so requests never wait on the provider once keys are held. Tokens are never logged; staff actions are logged with the actor's `sub`.

The console calls the admin API server to server. CORS does not allow the `Authorization` header or the `PATCH`, `PUT` and `DELETE` methods, so browsers cannot call it directly.

## Deploy

### Vercel (Services)

- Service root `backend/`, entrypoint `app.asgi:app`. Python 3.14 comes from `.python-version` and `requires-python`; dependencies install from `pyproject.toml` and `uv.lock`.
- The service must see the paths it serves (`/v1/...`, `/healthz`, `/readyz`), so strip any public prefix with a `request.path` transform in the service's routes.
- Set `ENVIRONMENT=production`, `TRUSTED_CLIENT_IP_HEADER=x-real-ip`, `DATABASE_POOL_SIZE=0`, `RATE_LIMIT_HASH_KEY` and the SMTP variables. The Neon integration provides `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- For the staff console, set `AUTH_ISSUER` to the Clerk instance URL, `AUTH_AUTHORIZED_PARTIES` to the production origin, `AUTH_STAFF_ROLES=org:admin,org:member` and `AUTH_STAFF_ORGANIZATION_ID` to the Institute's Clerk organization id (`org_...`).
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
- PostgreSQL is the only backing store. Each request works on one database connection, even with `DATABASE_POOL_SIZE=0`.
- Rate limits live in `rate_limit_windows`, one row per key. A hit is a single `INSERT ... ON CONFLICT DO UPDATE` that restarts an expired window or increments the current one, timed by the database clock. Keys are `rate-limit:enquiries:client:<HMAC>` and the fixed `notification-budget:enquiries`; no IP is stored.
- The per-client hit runs in the same transaction as the enquiry insert, so a refused or failed request leaves no count behind. If that statement fails, the request fails like any other database error. Without a trusted header, a peer with no usable IP (which uvicorn does not produce over TCP) is limited in a shared `unknown` bucket and logged as a warning.
- No global limit ever rejects a submission, so a botnet cannot lock legitimate visitors out. The hourly notification budget protects the inbox instead: enquiries past it are stored and logged as `notification budget exceeded`, and rows with an empty `notified_at` are the ones to review. The budget commits on its own before the email is sent, so the shared row is never locked during SMTP; if its statement fails, the email is sent anyway and a warning is logged.
- Expired windows are cleaned up without a scheduler: at most once every 10 minutes per process, a hit also deletes up to 500 windows that expired more than a day ago, oldest first, skipping rows other requests hold. The cost stays bounded and rare, recent windows are never touched, and the table cannot grow without limit.
- PostgreSQL is the source of truth; an enquiry whose email failed, timed out or exceeded the budget keeps `notified_at` empty.
- Configuration errors never echo the values supplied, so a failed start cannot leak secrets into logs.
