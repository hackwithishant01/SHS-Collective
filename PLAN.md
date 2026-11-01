# SHS Collective — implementation plan

## Audit result (Phase 1)

- `C:\Projects\SHS-Collective` was empty and not a Git repository.
- No existing project, dependencies, database, auth, routes, or assets to preserve.
- Node.js v24.20.0, npm 11.19.0, Git 2.55.0 available.
- `create-next-app` (Next.js 16.4.3, React 19.3, Tailwind 4, TypeScript strict, App Router, `src/`) was used as the base.
- No brand logo files or real product photography were supplied; the UI uses a typographic wordmark and clearly-labelled demo imagery. Real photography must be uploaded by the owner.

## Architecture

- Next.js App Router + React Server Components, Cache Components enabled.
- PostgreSQL for production (Supabase-compatible migrations, RLS enabled/deny-by-default).
- Embedded PGlite database for local development and automated tests, using the **same SQL migrations**. This keeps the app runnable and testable without provisioning a Supabase project.
- Server-only Data Access Layer. The browser never receives database credentials.
- Admin authentication: email + password (scrypt), opaque HTTP-only session cookie, hashed tokens in `admin_sessions`, rate limiting. Chosen over Supabase Auth because it is fully testable here and does not depend on unprovisioned credentials; it can be swapped without touching the DAL. Documented in `SECURITY.md`.
- Images: local disk in development, Supabase Storage in production behind one storage interface. Uploads are re-encoded with `sharp` and served through an authenticated/keyed route.
- Money stored as integer paise. No floating point totals.
- Cart/wishlist/recently-viewed are client conveniences; every order is re-priced and re-validated on the server.
- Default stock policy is **enquiry**: an order is pending until the owner confirms, then stock is deducted transactionally. An optional **reserve** policy deducts stock at order creation with an explicit expiry and automatic release.

## Phases

1. Audit and checkpoint — complete.
2. Design foundation — tokens, typography, shell, primitives.
3. Database, migrations, seed, auth, authorization.
4. Admin dashboard — products, variants, images, inventory, orders, settings.
5. Storefront — home, shop, category, product, cart, checkout, content pages.
6. Orders + WhatsApp — server validation, pending orders, idempotency, rate limits, message build.
7. SEO, sitemap, structured data, accessibility, performance.
8. Verification — unit, integration, e2e, lint, typecheck, production build.
9. Deployment preparation — docs and configuration checks; no public deployment without owner approval.

## Risks / constraints

- No Supabase project, production database, domain, real inventory, photography, or approved policies were provided. These block a real launch, not local development.
- Local PGlite is single-node and is not a production database. Production requires `DATABASE_URL`.
- WhatsApp opening cannot prove delivery; orders stay `pending_confirmation` until the owner changes them.
- Prices/stock shown in cached catalogue reads can lag by the cache lifetime; the server always re-validates at order time.
- Payment is not collected online. No payment claims are made.
