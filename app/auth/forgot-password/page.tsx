import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthForm } from "@/components/auth/AuthForm";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/policy";
import { redirectLegacyAuth } from "@/lib/auth/legacy";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  if (!EMAIL_PASSWORD_AUTH_ENABLED) redirectLegacyAuth(params.next);
  const notice =
    params.error === "recovery-link"
      ? "That password-reset link is invalid or has expired. Request a new one."
      : undefined;
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="forgot" notice={notice} />
      </main>
      <Footer />
    </div>
  );
}
