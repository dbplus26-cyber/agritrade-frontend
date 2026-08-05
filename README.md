# DB Plus — web

Three surfaces for **DB Plus Trading Ltd** (Tamale), served by one Next.js app
against the `agritrade-backend` API:

| Surface | Routes | Who |
| --- | --- | --- |
| **Public site** | `/`, `/commodities`, `/land`, `/farming-investment`, `/about`, `/contact`, `/reviews`, `/privacy`, `/terms` | anyone |
| **Admin console** | `/admin/*` (~100 routes) | owner and office staff |
| **Agent field app** | `/agent/*` | field buyers |

The business is bulk maize, soya beans and groundnuts bought at the farm gate
across the Northern Region and trucked south by the load, plus land sales and a
farm input-lending book. The console runs all of it; the public site is the
shop window onto the parts that are published.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
shadcn/ui (radix) · RTK Query · react-hook-form + Zod · Vitest**, following the
conventions shared with `dms-frontend` and `khadys-kitchen-frontend`.

## Getting started

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SERVER_URI must point at the backend
npm run dev
```

`NEXT_PUBLIC_SERVER_URI` is **required**. `src/lib/env.ts` validates it at
import and throws when it is missing, so a misconfigured deployment fails at
load rather than quietly issuing requests to `undefined/api/v1`. There is no
stub-API fallback: run `agritrade-backend` alongside this app.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm test` / `test:watch` | Vitest (unit + component, jsdom) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Design

The public site implements the **"Pale Husk v2.1"** design system: a
trading-house paperwork aesthetic, with husk surfaces, viridian bands,
ochre-gold nailed tags, ledger rules, document cards with hard offset shadows,
rubber stamps, and the signature warehouse **availability board**. The console
wears the **Meridian** skin over the same tokens: denser, quieter, built for
reading numbers rather than selling.

- Tokens live in `src/app/globals.css` (`@theme` brand colors mapped onto the
  shadcn variables). Site: `bg-forest`, `text-soil`, `shadow-doc`, `.stencil`,
  `.texture-grain`. Console: the `adm-*` and `console` families.
- Fonts: Bricolage Grotesque (display) · Public Sans (body) · Stardos Stencil
  (stencil utility), loaded via `next/font`.
- `/style-guide` (noindexed) renders the full live component sheet.
- Mobile is the primary layout, not a fallback. `ConsoleDataTable` switches
  between a real table and stacked cards on its own **container** width rather
  than the viewport, because a tablet has about half its width left once the
  sidebar is open.

## Architecture notes

- **Server Components by default**; `"use client"` on interactive leaves. The
  console is largely client-side (it is an authenticated app talking to RTK
  Query); the public site is server-rendered and cached.
- **Data layer**: one `createApi` in `src/redux/api-slice.ts`. Features attach
  via `injectEndpoints` — never a second slice. The store is a per-request
  `makeStore()` factory mounted by `store-provider.tsx`.
- **Auth**: httpOnly cookies issued by the API. `src/proxy.ts` is a cheap
  presence gate that bounces `/admin` and `/agent` to `/login` before the
  bundle ships; `RequireAuth` does the real `GET /auth/me` validation and is
  the authority. The gate is deliberately one-directional, since a present
  cookie is not proof of a live session and bouncing both ways would loop.
  A 401 anywhere else is retried once behind a mutex, so concurrent failures
  raise one refresh rather than a stampede the backend reads as token replay.
- **Public data and caching**: public pages fetch server-side under the tags in
  `src/config/cache-tags.ts` with a 1-hour ISR backstop. The backend POSTs
  `/api/revalidate` after every admin write that changes published content, so
  the site follows the records within seconds. The endpoint compares
  `REVALIDATE_SECRET` in constant time and fails closed when it is unset.
  Emptiness is honest by design: an unreachable API renders the designed empty
  board, never a stand-in that makes the warehouse look stocked.
- **Forms**: react-hook-form + Zod (`src/validations/`), submit via
  `mutation(...).unwrap()`, errors through `extractApiError` → inline field
  errors plus a `notify` toast for transport failures. Field caps mirror the
  backend's column widths from one place (`src/lib/limits.ts`).
- **SEO**: `pageMetadata()` (`src/lib/seo.ts`) clamps titles/descriptions and
  sets canonicals; `opengraph-image.tsx` + `icon.tsx` generate brand images at
  runtime; `manifest.ts`, `sitemap.ts`, `robots.ts` complete the set. The
  console and agent app are noindexed.
- **System states**: `LoadingScreen` (the plank-board loader),
  `ConsoleTableSkeleton`, `FormSkeleton`, `EmptyState` ("nothing on file"),
  `ErrorMessage` ("NOT PROCESSED" stamp), `ConfirmationDialog` +
  `useConfirm()` — all on `/style-guide`.

## Environment

| Variable | Required | What for |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URI` | yes | Origin of the API. Validated at import. |
| `NEXT_PUBLIC_BASE_URL` | no | Canonical site origin for metadata and sitemap. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | Bot protection on public forms. Unset disables the widget; the backend skips verification without its secret too, so set both or neither. |
| `REVALIDATE_SECRET` | no | Server-only. Must match the backend. Unset means published pages refresh only on their ISR window. |

Photography: Wikimedia Commons contributors (CC BY-SA), credited in the footer.
