import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { AuthForm } from "@/components/auth/AuthForm"
import { safeNextPath } from "@/lib/auth/helpers"

const notices: Record<string, string> = {
  "confirmation-link": "That verification link is invalid or has expired. Request a new verification email.",
  oauth: "Google sign-in could not be completed. Please try again.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm
          mode="login"
          next={safeNextPath(params.next)}
          notice={params.error ? notices[params.error] : undefined}
        />
      </main>
      <Footer />
    </div>
  )
}
