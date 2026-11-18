import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { safeNextPath } from "@/lib/auth/helpers";

const notices: Record<string, string> = {
  "confirmation-link": "Use Google for account creation and sign-in.",
  oauth: "Google sign-in could not be completed. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <GoogleSignIn
          next={safeNextPath(params.next)}
          notice={
            params.error
              ? notices[params.error]
              : params.notice === "google-only"
                ? "Use Google for account creation and sign-in."
                : undefined
          }
        />
      </main>
      <Footer />
    </div>
  );
}
