# Emeritus Global Gadgets — Production Architecture

## 1. Architectural decision

Emeritus Global Gadgets is a pnpm monorepo with independently deployable web and API applications:

- `apps/web`: Next.js 15 App Router application. It owns rendering, route composition, browser state, and the customer/admin user experience.
- `apps/api`: Node.js/Express application. It owns business use cases, authorization, payments, webhooks, media signatures, and persistence orchestration.
- `packages/database`: Prisma schema, PostgreSQL migrations, generated client, seed tooling, and transaction helpers.
- `packages/contracts`: framework-independent request/response schemas and shared domain primitives.
- `packages/config`: validated environment configuration and shared tooling configuration.
- `packages/observability`: structured logging, tracing, metrics, and error reporting adapters.

Supabase provides managed PostgreSQL and authentication. Prisma is the only application data-access layer. Supabase Storage is not used for catalog media; Cloudinary owns media assets and transformations. Paystack is called only by the API.

The web application never imports Prisma, Paystack, Cloudinary server credentials, or Supabase service-role credentials.

## 2. Complete target structure

```text
emeritus-global-gadgets/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (customer)/
│   │   │   │   ├── (auth)/
│   │   │   │   ├── (admin)/
│   │   │   │   ├── api/
│   │   │   │   │   └── auth/
│   │   │   │   │       └── callback/route.ts
│   │   │   │   ├── error.tsx
│   │   │   │   ├── global-error.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   └── robots.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── api/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── schemas/
│   │   │   │   │   ├── services/
│   │   │   │   │   ├── state/
│   │   │   │   │   ├── types/
│   │   │   │   │   └── index.ts
│   │   │   │   ├── products/
│   │   │   │   ├── cart/
│   │   │   │   ├── orders/
│   │   │   │   ├── repairs/
│   │   │   │   ├── media/
│   │   │   │   ├── reviews/
│   │   │   │   ├── coupons/
│   │   │   │   ├── checkout/
│   │   │   │   ├── customer/
│   │   │   │   └── admin/
│   │   │   ├── components/
│   │   │   │   ├── ui/
│   │   │   │   ├── layout/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── env/
│   │   │   │   ├── supabase/
│   │   │   │   └── utilities/
│   │   │   ├── providers/
│   │   │   ├── state/
│   │   │   ├── styles/
│   │   │   ├── constants/
│   │   │   ├── types/
│   │   │   └── middleware.ts
│   │   ├── components.json
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── postcss.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── api/
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── config/
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   └── health.routes.ts
│       │   ├── middleware/
│       │   │   ├── authenticate.ts
│       │   │   ├── authorize.ts
│       │   │   ├── correlation-id.ts
│       │   │   ├── error-handler.ts
│       │   │   ├── idempotency.ts
│       │   │   ├── rate-limit.ts
│       │   │   ├── request-logger.ts
│       │   │   ├── security.ts
│       │   │   └── validate.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── products/
│       │   │   ├── carts/
│       │   │   ├── orders/
│       │   │   ├── repairs/
│       │   │   ├── media/
│       │   │   ├── reviews/
│       │   │   ├── coupons/
│       │   │   ├── payments/
│       │   │   ├── customers/
│       │   │   └── admin/
│       │   ├── integrations/
│       │   │   ├── cloudinary/
│       │   │   ├── paystack/
│       │   │   └── supabase/
│       │   ├── shared/
│       │   │   ├── errors/
│       │   │   ├── events/
│       │   │   ├── http/
│       │   │   ├── pagination/
│       │   │   ├── security/
│       │   │   └── utilities/
│       │   └── types/
│       ├── tests/
│       │   ├── integration/
│       │   ├── contract/
│       │   └── fixtures/
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── carts/
│   │   │   ├── orders/
│   │   │   ├── repairs/
│   │   │   ├── media/
│   │   │   ├── reviews/
│   │   │   ├── coupons/
│   │   │   ├── payments/
│   │   │   ├── admin/
│   │   │   └── common/
│   │   └── package.json
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── transaction.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── config/
│   │   ├── src/
│   │   │   ├── api-env.ts
│   │   │   ├── web-env.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── observability/
│   │   ├── src/
│   │   │   ├── logger.ts
│   │   │   ├── metrics.ts
│   │   │   ├── tracing.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── eslint-config/
│   └── typescript-config/
├── tooling/
│   ├── scripts/
│   └── docker/
│       ├── api.Dockerfile
│       └── compose.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── api/
│   ├── adr/
│   ├── operations/
│   └── security/
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── migrate.yml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

No empty folders should be committed. A folder is introduced with its first production implementation.

## 3. Feature module shape

Every API feature uses the same inward dependency direction:

```text
modules/<feature>/
├── <feature>.routes.ts       # URL, middleware, response mapping
├── <feature>.controller.ts   # HTTP input/output only
├── <feature>.service.ts      # use cases and transaction boundaries
├── <feature>.repository.ts   # Prisma queries owned by the feature
├── <feature>.policy.ts       # resource authorization
├── <feature>.schemas.ts      # API-only validation composition
├── <feature>.events.ts       # emitted/consumed domain events
├── <feature>.errors.ts       # typed domain failures
└── index.ts                  # explicit public API
```

The web counterpart is:

```text
features/<feature>/
├── api/                      # typed calls and query-key factories
├── components/               # feature-owned UI
├── hooks/                    # browser orchestration
├── schemas/                  # form/view validation
├── services/                 # browser-safe transformations
├── state/                    # feature client state only
├── types/                    # view models, never Prisma models
└── index.ts                  # explicit public API
```

Not every module needs every file. Files exist only when they contain working behavior.

### Dependency rules

1. `app` composes features; it contains no business logic.
2. Features may import shared components and libraries, but never another feature's internals.
3. Cross-feature access goes through a feature's `index.ts`, a service interface, or a domain event.
4. Controllers never query Prisma or call vendors.
5. Repositories contain persistence logic only and do not know HTTP.
6. Shared packages never import from either application.
7. Prisma-generated types do not cross the API boundary.
8. Server-only modules use `server-only` guards in the web app and are excluded from client barrels.
9. Circular dependencies fail CI through an import-boundary check.

## 4. Domain ownership

### Authentication

Supabase Auth owns credentials, sessions, password reset, email verification, and optional OAuth/MFA. PostgreSQL owns the application profile and roles.

- Browser: Supabase publishable client, cookie-backed SSR session.
- Web server: Supabase server client reads and refreshes cookies.
- API: verifies the Supabase JWT against the project's JWKS; it never trusts role claims supplied by the browser.
- Authorization: `UserRole` and account state are loaded from the database after token verification.
- Roles: `CUSTOMER`, `SUPPORT`, `CATALOG_MANAGER`, `ORDER_MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- Admin authorization uses explicit permissions, not a single `isAdmin` boolean.
- A database trigger or verified signup handler creates exactly one `UserProfile` for each Supabase identity.

`authenticate` establishes identity. `authorize(permission)` checks coarse permissions. Each module policy checks ownership and resource-specific access.

### Products

Owns categories, brands, products, variants, specifications, pricing, inventory, and catalog publication state. Monetary values are integer minor units (`BigInt` in persistence, serialized as decimal strings or safe integers by contract). Inventory is never derived from cart state.

Product publication states are `DRAFT`, `ACTIVE`, `ARCHIVED`. SKU and slug are unique. Product deletion is archival when referenced by an order.

### Cart

Owns guest and authenticated carts, line quantities, price snapshots for display, and cart merging after sign-in. The server recalculates all authoritative prices, discounts, stock, and totals before checkout.

- Guest cart ID is an opaque, signed, secure cookie.
- Authenticated carts belong to one customer.
- Mutations use optimistic concurrency through a cart version.
- A unique constraint prevents duplicate `(cartId, variantId)` lines.
- Cart operations never reserve inventory.

### Orders

Owns checkout, immutable order line snapshots, addresses, totals, inventory reservation, fulfillment state, and the order audit trail.

Checkout is a database transaction that:

1. locks/revalidates purchasable variants;
2. validates coupon eligibility;
3. calculates totals server-side;
4. creates the order and immutable lines;
5. creates inventory reservations with expiry;
6. records coupon redemption intent;
7. creates a pending payment attempt.

Order and payment states are separate. State transitions are validated and append an `OrderStatusHistory` record.

### Repairs

Owns repair requests, device details, diagnostics, quotes, approvals, assigned technicians, status history, attachments, and customer communication metadata.

Repair states are `SUBMITTED`, `AWAITING_DEVICE`, `DIAGNOSING`, `QUOTE_PENDING`, `QUOTE_APPROVED`, `IN_REPAIR`, `READY`, `COMPLETED`, `CANCELLED`. Every transition is policy-checked and audited. Quotes are immutable after customer approval; revisions create a new quote version.

### Media

Owns Cloudinary upload signatures, asset metadata, ownership, moderation state, transformations, and deletion. Browser uploads use short-lived signed parameters from the API. Only public IDs and metadata are stored in PostgreSQL; delivery URLs are generated from controlled transformations. Asset deletion uses an outbox job so database state and vendor cleanup can recover independently.

### Reviews

Owns product ratings, moderation, verified-purchase status, helpful votes, and aggregate updates. One review per customer per purchased product is enforced by a database constraint. Aggregates are updated transactionally or from an idempotent outbox consumer.

### Coupons

Owns coupon definitions, eligibility rules, usage limits, redemption records, and discount calculation. Coupon codes are normalized before lookup. Redemption is committed only after successful payment, with uniqueness and transaction locking preventing overuse.

### Admin

Admin is a delivery/composition feature, not an alternate data layer. It invokes product, order, repair, coupon, review, media, and customer services under admin policies. Every mutation writes an `AuditLog` containing actor, action, resource, correlation ID, timestamp, and safe before/after metadata.

### Customer

Owns profiles, addresses, preferences, wishlists, and account lifecycle. It does not own authentication credentials, orders, or reviews. Account deletion is a workflow that anonymizes legally retainable commerce records and removes non-required personal data.

## 5. Data model boundaries

The Prisma schema is organized with comment sections by aggregate. Core models:

```text
Identity:       UserProfile, Role, Permission, RolePermission, UserRole
Catalog:        Category, Brand, Product, ProductVariant, ProductImage,
                ProductSpecification, Inventory, InventoryMovement
Cart:           Cart, CartItem
Commerce:       Order, OrderItem, AddressSnapshot, OrderStatusHistory,
                InventoryReservation
Payment:        PaymentAttempt, PaymentEvent, Refund
Promotion:      Coupon, CouponRule, CouponRedemption
Review:         Review, ReviewVote
Repair:         RepairRequest, RepairDevice, RepairDiagnostic, RepairQuote,
                RepairQuoteItem, RepairStatusHistory
Customer:       CustomerAddress, Wishlist, WishlistItem
Media:          MediaAsset
Operations:     IdempotencyKey, WebhookEvent, OutboxEvent, AuditLog
```

Required database conventions:

- UUID primary keys generated in PostgreSQL.
- `createdAt` and `updatedAt` are UTC `timestamptz`.
- Explicit indexes for foreign keys and high-frequency filters.
- Composite uniqueness for business invariants.
- Soft deletion only where recovery/history is required; otherwise use archival states.
- Referential actions are explicit; no implicit cascading of commerce history.
- Raw SQL migrations add constraints Prisma cannot express, including non-negative stock and monetary values.
- PgBouncer-compatible runtime connection and a direct connection for migrations.
- Row-level security is enabled for any table exposed through Supabase Data API; the application otherwise accesses data through the API service role and performs policy checks in code.

## 6. API architecture

Base path: `/v1`. Contracts are defined with Zod in `@emeritus/contracts`; OpenAPI is generated from the same schemas.

Response envelope:

```ts
type ApiSuccess<T> = {
  data: T;
  meta?: { requestId: string; nextCursor?: string };
};

type ApiFailure = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fields?: Record<string, string[]>;
  };
};
```

Collections use cursor pagination. Public product reads may be cached; account, cart, admin, repair, and order responses are private/no-store. API versioning is URL-based. Breaking contract changes require a new version.

Middleware order:

1. proxy trust and correlation ID;
2. security headers and CORS allowlist;
3. raw-body capture for webhook routes;
4. JSON size limits;
5. structured request logging;
6. rate limiting;
7. authentication;
8. authorization;
9. schema validation;
10. controller;
11. not-found and centralized error handling.

All mutating checkout/payment/refund endpoints require an idempotency key. Vendor timeouts, bounded retries, and circuit-breaking policies are configured centrally.

## 7. Paystack payment flow

1. API creates an order and a unique pending `PaymentAttempt`.
2. API initializes Paystack using its own generated reference and the order total.
3. Browser redirects or opens the supported Paystack flow.
4. Callback status is treated as informational only.
5. Paystack webhook signature is verified against the exact raw body before JSON processing.
6. `WebhookEvent` stores the provider event ID/hash under a unique constraint.
7. API verifies the transaction directly with Paystack and compares reference, amount, currency, and expected order.
8. A single database transaction marks payment successful, confirms the order, consumes reservations, records coupon redemption, and emits outbox events.
9. Duplicate or out-of-order webhooks return success after idempotent handling.

Secrets exist only in the API environment. Logs redact authorization headers, cookies, customer PII, and payment payload fields.

## 8. State management

- Server state: fetched in Server Components where possible; client-side server state uses a query cache with feature-owned key factories.
- Local interactive state: component state.
- Shared browser workflow state: Zustand stores, split by feature (`cart`, checkout UI, admin filters).
- URL state: search, filters, sort, and pagination.
- Forms: React Hook Form with Zod contracts adapted to view needs.

No API response is copied into a global store. The cart store may retain a guest cart identifier and optimistic view state, but the API remains authoritative.

## 9. UI and component boundaries

No page designs are part of this architecture phase.

- `components/ui`: shadcn primitives only.
- `components/layout`: shell-level composition shared across routes.
- `components/shared`: domain-neutral composed components.
- `features/*/components`: domain-aware components.
- Route files compose features and own metadata/loading/error boundaries.
- Framer Motion is isolated behind motion primitives and respects reduced-motion preferences.
- Accessibility checks and keyboard behavior are required at the primitive and feature levels.

Admin and customer routes use separate route groups and layouts. This gives each surface independent navigation, authorization gates, error boundaries, and bundle composition without creating a second frontend application.

## 10. Security baseline

- Environment variables are validated at process startup with separate server/public schemas.
- Public environment values must use the `NEXT_PUBLIC_` prefix; secrets are rejected from the web bundle.
- Cookies are `HttpOnly`, `Secure` in production, and use an explicit `SameSite` policy.
- CSRF protection is required for cookie-authenticated state mutations.
- CORS allows only configured storefront/admin origins.
- Helmet/CSP, request size limits, brute-force controls, and endpoint-specific rate limits are enabled.
- User-provided rich text is sanitized; uploads are type/size constrained and scanned or moderated.
- SQL is parameterized through Prisma; raw queries require review.
- Webhook signatures use timing-safe comparison.
- Sensitive admin actions support step-up authentication.
- Dependency, secret, SAST, migration, and license checks run in CI.

## 11. Reliability and operations

- `/health/live` checks the process; `/health/ready` checks required dependencies.
- JSON logs include request ID, actor ID, route, latency, and outcome.
- OpenTelemetry traces span web, API, Prisma, Paystack, and Cloudinary calls.
- An outbox table guarantees eventual dispatch of email, analytics, media cleanup, and inventory events.
- Background workers claim outbox rows with `FOR UPDATE SKIP LOCKED`.
- Dead-letter handling and replay tooling are mandatory.
- PostgreSQL backups, point-in-time recovery, restore drills, and migration rollback/runbooks are documented.
- Deployments run backward-compatible expand/migrate/contract database changes.
- Web and API have independent autoscaling and deployment pipelines.

## 12. Testing strategy

- Unit: policies, calculations, state transitions, coupon rules, and serializers.
- Repository integration: real PostgreSQL with isolated schemas or containers.
- API integration: Express app with real middleware and database, vendors stubbed at adapter boundaries.
- Contract: generated OpenAPI and consumer compatibility.
- End-to-end: authentication, guest cart merge, checkout, webhook replay, refund, review eligibility, repair lifecycle, and admin authorization.
- Security: authorization matrix, webhook tampering, CSRF, rate limits, upload validation, and PII redaction.

CI gates are typecheck, lint, unit/integration tests, Prisma schema validation, migration drift detection, production builds, dependency audit, and architecture-boundary checks.

## 13. Migration from the current repository

The current root application remains intact until behavior is characterized. Migration is incremental:

1. Pin the requested runtime versions and establish workspace/tooling configuration.
2. Add `packages/contracts`, validated configuration, and database schema.
3. Build the Express composition root, authentication middleware, health checks, and error contract.
4. Move one backend feature at a time from `app/api` into `apps/api`, starting with products and ending with payments.
5. Move UI code into `apps/web` without visual changes; replace root contexts and mock data with feature APIs/state.
6. Run old and new contract tests during transition.
7. Remove legacy roots only after route parity, data migration, and deployment verification.

This sequence avoids a destructive big-bang move and preserves the current application while the production backend is introduced.

## 14. Architectural enforcement

The following are rejected in review and CI:

- business logic in route handlers, React components, or controllers;
- direct Prisma access outside repositories and transaction services;
- direct Paystack/Cloudinary calls outside integration adapters;
- imports from another feature's internal files;
- use of floating point for money;
- trusting browser totals, roles, inventory, coupon eligibility, or payment status;
- unaudited admin mutations;
- unverified or non-idempotent webhook processing;
- exposing database entities as API contracts;
- placeholder modules or empty committed directories.
