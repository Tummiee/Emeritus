# Commerce integrity rollout

The application now requires all four `20261016000*` migrations before serving checkout. Source changes alone do not fix live database grants. No live migration or provider transaction is performed by the test suite. If the first three migrations are already applied, apply only `202610160004_checkout_quote_reuse.sql` from this update.

Use the latest file contents when pasting migrations into the SQL Editor. Migration 001 and the legacy cleanup in 003 now discover existing legacy function overloads instead of assuming a specific retired function exists. If an earlier copy of 001 failed with `42883` for `create_checkout_payment`, replace the editor contents with the updated complete file and rerun 001 from the beginning before proceeding to 002–004. That early failure occurs before the cost-price data move. Existing successful migrations must not be rerun.

## Deployment order

1. Back up the database and pause checkout and admin commerce writes during the coordinated schema/application release. The old checkout RPC is deliberately revoked by the first migration, so the old application must not continue taking payments after that migration.
2. Review the output of `node scripts/render-migrations.mjs --upgrade`. Apply the unapplied new migrations in manifest order with an administrator database connection. Existing orders keep their recorded prices. Review `payment_reconciliation` for historical amount/ownership mismatches; do not rewrite or automatically settle those records.
3. Deploy the corresponding application version. Verify `/health/ready`, anonymous catalog access, customer cart isolation, and customer denial of direct payment inserts and `product_costs` reads in staging.
4. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin, provider keys, SMTP credentials, `ADMIN_ORDER_EMAIL`, and a random `CRON_SECRET`. Set `IMAGE_CDN_ORIGINS` to comma-separated HTTPS image origins and configure `TRUSTED_CLIENT_IP_HEADER` to the header overwritten by your trusted ingress. Strip client-supplied versions of that header at ingress. Do not expose service-role credentials in public variables.
5. Register `GET /api/jobs` every five minutes with `Authorization: Bearer <CRON_SECRET>`. `vercel.json` includes the schedule for Vercel deployments; confirm the hosting plan supports it. Other hosts must register the equivalent authenticated schedule. Confirm successful runs in hosting logs before enabling checkout.
6. Run sandbox checkout for both providers, including duplicate callbacks, a gateway timeout, and delayed confirmation. Confirm only one stock deduction and one outbox job per recipient. Enable checkout after these checks.

## Clean databases and migration history

`supabase/migration-manifest.json` is authoritative. Run `node scripts/render-migrations.mjs` to produce a clean-install SQL stream for review. Never glob every SQL file or renumber historical migrations that have already been applied. Historical filenames contain duplicate version prefixes and cannot be fed directly to a timestamp-only migration runner.

The clean-install stream disables function-body checks only while replaying legacy migrations. Some historical order functions contain invalid, superseded record assignments. The current migrations replace/revoke those functions with body checks enabled. PostgreSQL regression tests execute the current checkout, authorization, settlement, and catalog functions after the complete replay. Auth and Storage are provided by Supabase in a deployed environment; embedded test fixtures model their schemas and roles but do not replace live Supabase REST/Storage verification.

Reset and account-promotion utilities live under `supabase/scripts/` and are manual maintenance only. Do not run them as application migrations. New migrations have unique version numbers.

## Pricing and state rules

- Lowest active valid promotion price wins. A valid coupon applies afterwards. Tax applies to discounted merchandise; shipping is excluded from tax. One active rule is allowed per country. Missing tax and explicit zero tax remain distinct.
- Quotes are estimates until the server creates the order. The reviewed quote identity is checked again during order creation. Changed prices require another review; payment is never silently retried against a newly priced order.
- Orders snapshot line prices, promotions, tax, discount, shipping, currency, and request identity. Order pricing is immutable. Historical successful attempts without `paid_at` use their recorded update time as the best available settlement-time estimate.
- Zero-total orders settle locally. External provider payment amounts must match the immutable order, its owner, and its currency.
- An expired merchant session is reconciled with the provider. Verified unpaid/terminal attempts release stock; processing or unavailable provider states retain it and remain visible to operators. Late or duplicate payments enter reconciliation and must not be presented as fulfilled orders.
- Cart settlement subtracts purchased quantities. Additions made during hosted checkout remain in the cart. Existing unscoped account-cart caches are no longer treated as authoritative.

## Operations and recovery

`/admin/payments` displays unresolved reconciliation records, overdue attempts, and pending email deliveries. Investigate rising counts, repeated job failures, checkout error rates, and database latency. The worker processes bounded batches and defers attempted records to prevent one unavailable provider reference from starving the queue.

For a reconciliation record, compare the provider reference, actual receipt, order snapshot, and stock state. Record any refund/fulfillment decision in the provider and order audit trail. Do not automatically retry a charge or decrement inventory to dismiss an alert. Mark a record resolved only after the financial outcome has been verified. Refund status changes require provider refund evidence; the application does not initiate refunds automatically or automatically restock returned goods.

Email jobs are independent for customer and admin recipients. Each job is leased and retries with exponential backoff up to a daily interval. Configure SMTP first; do not delete jobs to recover from a temporary outage. SMTP cannot guarantee exactly-once delivery after an ambiguous timeout between sending and recording completion. There is no misleading `email_sent` event written before delivery.

If a storage cleanup fails after a successful database change, retain the orphan object for manual cleanup. Referenced media cannot be deleted through the application. Repair-image cleanup is limited to a customer's own unattached uploads.

## Verification

Local verification on 2026-10-16: production build and TypeScript pass; 77 automated tests pass across 22 files; lint reports zero errors and 44 warnings. The production dependency audit reports zero vulnerabilities. The full dependency audit still reports 10 development-tool advisories (2 moderate, 8 high), including the ESLint glob dependency chain and Vitest mocking utilities. Do not use the development server or test tooling as a public production service. Recheck and update these tools when compatible fixes are available; do not force the suggested Next ESLint configuration downgrade.

All 10 desktop/mobile browser fixture checks pass, including homepage image rendering. Catalog and cart checks wait for the corresponding data responses before asserting UI state. Run the browser suite separately from heavy build/database checks on constrained workstations; cold development compilation can exceed the default five-second UI assertion window.

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- `npm run test:e2e` uses an isolated local HTTP fixture and separate `.next-e2e` output. It does not contact live Supabase or payment providers. Install Chromium with `npx playwright install chromium`, or set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome browser.
- Database tests cover both clean replay and upgrade with existing financial records, customer grants, immutable pricing, tax, sales/coupons, coupon capacity, zero totals, idempotency, settlement, outbox leases, and catalog ranges over 1,000 rows.
- Complete sandbox-provider and real Supabase REST/Storage checks in staging before production. Do not downgrade the database schema to roll back this release; fix forward while retaining order and provider evidence.
- Staging must also exercise simultaneous requests over separate database connections: checkout/expiry/settlement lock contention, coupon quota contention, address defaults, duplicate webhooks, and interrupted initialization. Embedded PostgreSQL tests verify transaction behavior but do not establish production concurrency or query latency.
- Browser fixtures cover storefront image viewing, URL navigation, tax states, and sign-in gating. Verify authenticated account switching, rapid cart changes, additions during hosted payment, upload cleanup, and sandbox checkout against staging before enabling checkout.
