import Footer from "@/components/Footer"
import Header from "@/components/Header"
import { AuthForm } from "@/components/auth/AuthForm"
import { safeNextPath } from "@/lib/auth/helpers"

export default async function ResendVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>
}) {
  const params = await searchParams
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
  )
}
