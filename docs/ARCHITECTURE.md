# Application architecture

This repository is a single Next.js App Router application, using React, TypeScript, Tailwind, and Supabase Auth/PostgreSQL/Storage. It is not a Prisma/Express monorepo. npm and `package-lock.json` define the reproducible dependency installation.

## Boundaries

Local development uses `npm run dev` with Webpack. This bypasses a Turbopack task-storage panic observed after the dependency upgrade (`task is missing in memory or persistent storage`). Browser fixtures use the same development bundler. Restart an already running dev server after changing the script; the production build command is configured separately.

- `app/` owns storefront, account and admin pages, API routes, and health probes. Protected pages validate sessions and admin actions validate roles again. Supabase row policies and column/table grants enforce access independently of the UI.
- `lib/supabase/server.ts` creates request-scoped authenticated clients. `public.ts` creates a sessionless public client for shared catalog caches. `admin.ts` is server-only and is used for verified payment operations, bounded background jobs, and protected system writes.
- `lib/commerce/contracts.ts` defines checkout/quote inputs. PostgreSQL owns authoritative pricing, stock locks, coupon reservations, immutable order snapshots, and payment settlement. Browser prices and quantities are never accepted as proof of payment.
- `lib/payments/service.ts` validates an attempt against its order before contacting Paystack or Monnify. Hosted checkout is initialized under a lease; webhook and callback confirmation share the same settlement path. Reconciliation outcomes are separate from order fulfillment.
- `lib/contexts/` owns browser cart/wishlist state. Account identity scopes storage and asynchronous generations. Cart mutations are serialized per product. Successful payment refreshes the remaining backend cart rather than clearing unrelated items.
- `lib/catalog-repository.ts` caches public catalog pages/facets for 30 seconds under explicit invalidation tags. Checkout and account data remain uncached. Catalog pages are filtered/sorted/paginated in PostgreSQL; approved reviews are aggregated there.

## Background work and operations

Settlement transactionally creates independent customer/admin jobs in `email_outbox`. Authenticated `/api/jobs` invocations process leased email jobs and overdue provider reconciliation in bounded batches. Schedule it every five minutes; see `vercel.json` and the rollout instructions. SMTP failures do not block settlement or permanently suppress retries.

Admin order transitions, product/inventory writes, promotions, and default-address updates use transactional database functions. Costs are stored in the private `product_costs` relation. Financial summaries derive from successful payment attempts and recorded settlement dates. Account/admin list views use pagination.

## Schema and verification

`supabase/migration-manifest.json` preserves the explicit migration order, including historical duplicate prefixes. Manual maintenance scripts are kept outside migrations. New migrations are additive except for moving the private cost column and replacing unsafe grants/functions. Coordinate their deployment with the new application as described in [COMMERCE_ROLLOUT.md](COMMERCE_ROLLOUT.md).

Vitest runs pure-domain, service, and embedded PostgreSQL regression tests, including clean replay and upgrade fixtures. Playwright exercises desktop/mobile storefront behavior against an isolated local fixture. CI runs lint, TypeScript, tests, production compilation, and browser checks. Staging checks against real Supabase policies/REST/Storage and provider sandboxes remain a release requirement.
