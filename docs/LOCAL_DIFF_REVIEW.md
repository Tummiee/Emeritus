# Local diff regression review

Reviewed the changed storefront, image configuration, API handlers, payment lifecycle, pricing migrations, account state, admin writes, and catalog/report consumers on 2026-10-16.

Corrections made during this review:

- Migration compatibility: retired checkout/bulk-delete RPCs can be absent or have different overloads across installations. Legacy revocation now checks the catalog, and newly created internal order/settlement functions explicitly revoke customer execution. The upgrade test removes those legacy functions and verifies both retained catalog/inventory values and restricted privileges.

- The image optimizer allowlist omitted the OpenAI host already used by homepage content. Configuration, admin validation, and rendering now share one origin policy. Bundled Unsplash/OpenAI hosts remain available when extra CDNs are configured. Unknown or unavailable image sources use the local placeholder. Browser object URLs remain supported for file previews.
- The homepage requests image quality 85, which the new Next.js default allowlist excluded. The optimizer now explicitly allows the two used qualities, 75 and 85.
- The new admin slug schema rejected existing product slugs containing underscores. Existing URLs can now be edited without changing their slug.
- An idempotent retry could reuse an older pending order after the customer reviewed a newly priced quote. Migration `202610160004_checkout_quote_reuse.sql` rejects that mismatch instead of opening the old charge. This is a follow-up migration for installations that already applied the first three commerce migrations.
- A stale cart hydration could merge guest quantities after an authentication/effect generation changed. It now checks the generation before writing the merge.

Regression coverage includes all bundled homepage image URLs, exact origin/port matching, unconfigured image rendering, upload-preview object URLs, existing underscore slugs, and changed-quote retry rejection. The browser suite now includes homepage rendering as well as the existing product viewer, catalog navigation, tax states, and sign-in checks.

Verification completed: production build and TypeScript pass; 77 automated tests pass across 22 files; all 10 desktop/mobile browser checks pass. Lint reports zero errors and 44 warnings. Browser tests use local mock services and do not establish live backend readiness. Remaining browser diagnostics include logo sizing/loading warnings.

The review does not establish that a live database has the required migrations, grants, or storage policies. See [COMMERCE_ROLLOUT.md](COMMERCE_ROLLOUT.md) for live Supabase, concurrency, SMTP, and provider sandbox release checks. Source checks and mocked browser tests cannot rule out every production error.
