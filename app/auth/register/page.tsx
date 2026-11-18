import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthForm } from "@/components/auth/AuthForm";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/policy";
import { redirectLegacyAuth } from "@/lib/auth/legacy";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  if (!EMAIL_PASSWORD_AUTH_ENABLED) redirectLegacyAuth(params.next);
  const next =
    params.next?.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/account";
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="register" next={next} />
      </main>
      <Footer />
    </div>
  );
}
