# Google-only authentication

Google is the only active sign-in and account-creation method. The existing
Supabase browser OAuth/PKCE flow, Google account chooser, session cookies,
administrator routing, and logout are retained.

## Application behavior

`EMAIL_PASSWORD_AUTH_ENABLED` in `lib/auth/policy.ts` is deliberately `false`.
It cannot be overridden through environment variables or client input.
The original email/password implementations remain behind early server guards.
Legacy authentication pages redirect to Google sign-in, preserving a safe local
`next` destination. Legacy signup and recovery callbacks are rejected without
exchanging codes. Existing sessions are not revoked or restricted by provider.

Email/password actions and password updates return a disabled-method error.
The retained `POST /api/auth/login` and `POST /api/auth/register` endpoints return
HTTP 403 with code `password-auth-disabled`, without calling Supabase or the
database rate limiter. The earlier signup verification bypass and its
`AUTH_REQUIRE_EMAIL_VERIFICATION` setting have been removed.

## Required provider configuration

The code change does not configure the hosted Supabase project. Coordinate these
steps with deployment; hiding or blocking application forms alone does not stop
clients calling Supabase directly.

1. Verify the existing Google provider credentials, Supabase callback URL in
   Google, application Site URL, and redirect allowlists for staging, localhost,
   and production. Keep the working Google credentials unchanged.
2. Verify an administrator can use Google to access the same existing account
   and administrator role before switching off the old method.
3. Keep Google enabled. Disable the **Email provider**, not just email signup or
   Confirm Email. Disable any other sign-in providers as well.
4. Keep general new-user signup enabled so first-time Google users can create
   accounts. Do not disable all signups at the project level.
5. Verify direct email/password signup, login, and password recovery requests
   are rejected at the provider. Do not assume provider settings from app UI.

Provider configuration reference:
<https://supabase.com/docs/guides/auth/general-configuration>

## Existing accounts

Do not delete credentials, merge account records, bulk-confirm users, or revoke
sessions. Existing authenticated users can continue; their next sign-in uses
Google. Test session refresh after changing the provider configuration.

Supabase can automatically link a Google identity to an existing account with
the same email, subject to its linking and verification rules. Verify matching
account IDs, profile data, orders, and roles in staging. Do not promise continuity
for a different Google email. Users without access to a matching Google identity
need account-support assistance; there is no automated migration in this change.

Identity linking reference:
<https://supabase.com/docs/guides/auth/auth-identity-linking>

## Release checks

- Test new and returning Google users, a matching-email password account, and
  an administrator against real Supabase. Confirm account data and roles remain.
- Verify sign-in from checkout returns to checkout, unsafe destinations fall
  back to `/account`, and logout ends the session.
- Verify cancellation, invalid/expired callbacks, retry, mobile/desktop layout,
  keyboard focus, and pending-button behavior.
- Verify no app path requests signup verification, recovery, or password emails.
- Check disabled APIs return 403 even with malformed bodies or unavailable
  database rate limiting.
- Run lint, TypeScript, automated tests, and the production build. Automated
  provider simulations do not replace live Google/Supabase acceptance checks.
- Deploy application and provider changes together; monitor sanitized callback
  errors. Never log OAuth codes, passwords, or access/refresh tokens.

## Future email/password restoration

Deliberately enable the server policy, restore the original login UI and legacy
routes/callback behavior, and re-enable the Email provider with confirmation,
email delivery, and recovery configured. Run all authentication checks again.
There is no automatic environment-variable escape hatch. The removed signup
verification bypass is not part of restoration. No database migration is needed.
