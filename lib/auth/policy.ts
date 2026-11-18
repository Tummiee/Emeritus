import "server-only";

// Deliberately disabled in code. Re-enabling also requires Supabase provider setup.
export const EMAIL_PASSWORD_AUTH_ENABLED: boolean = false;
export const PASSWORD_AUTH_DISABLED_MESSAGE =
  "Email and password authentication is disabled. Continue with Google.";
export const passwordAuthDisabledState = {
  status: "error",
  code: "password-auth-disabled",
  message: PASSWORD_AUTH_DISABLED_MESSAGE,
} as const;
