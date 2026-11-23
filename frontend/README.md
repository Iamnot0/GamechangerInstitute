# GameChanger Institute: frontend

Next.js 16 (App Router), React 19, Tailwind CSS 4. Deployed on Vercel together with the API (see root `vercel.json`).

## Run

```sh
cp .env.example .env.local   # NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build
```

## Layout

| Path | Holds |
|---|---|
| `src/app/` | Routes, root layout, `globals.css` (the only stylesheet) |
| `src/components/layout/` | Header, navigation, footer, theme toggle, smooth scroll |
| `src/components/sections/` | One file per page section |
| `src/components/figures/` | Gap figure, lens stack, journey timeline, hero video |
| `src/components/forms/` | Registration form and its fields |
| `src/components/ui/` | Shared primitives: buttons, headings, tables, photos |
| `src/content/` | All copy and data, typed |
| `src/lib/` | API client, enquiry validation, theme |

## Rules

- All styling lives in `src/app/globals.css`. Tailwind runs with `source(none)`, so utility classes in markup have no effect; components use the class names defined there.
- Copy comes from `src/content/`. Never "WHO-certified", "accredited" or "endorsed"; the programme is ICF-informed.
- Light and dark themes switch role tokens only (`--color-canvas`, `--color-fg`, ...). Brand colours stay fixed.

## Deploy notes

- Security headers (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy) are set in `next.config.ts`.
- On Vercel leave `NEXT_PUBLIC_API_URL` unset: the API is served same-origin under `/api`.
