import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNextPath } from "@/lib/auth/helpers";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/policy";
import { redirectLegacyAuth } from "@/lib/auth/legacy";

export default async function ResendVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (!EMAIL_PASSWORD_AUTH_ENABLED) redirectLegacyAuth(params.next);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm
          mode="resend"
          initialEmail={params.email ?? ""}
          next={safeNextPath(params.next)}
        />
      </main>
      <Footer />
    </div>
  );
}
