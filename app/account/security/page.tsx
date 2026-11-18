import { PasswordForm } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/auth/session";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/policy";

export default async function SecurityPage() {
  await requireUser();
  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold sm:text-3xl">Security</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8">
        Manage how you access your account.
      </p>
      <div className="max-w-xl rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Sign-in method</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Google is the only sign-in method available.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Manage your Google password and security through your Google Account.
        </p>
        <a
          href="https://myaccount.google.com/security"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Google Account security
        </a>
      </div>
      {EMAIL_PASSWORD_AUTH_ENABLED && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Change password</h2>
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
