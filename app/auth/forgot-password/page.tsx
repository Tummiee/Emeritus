import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { AuthForm } from "@/components/auth/AuthForm"

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const notice = params.error === "recovery-link"
    ? "That password-reset link is invalid or has expired. Request a new one."
    : undefined
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="forgot" notice={notice} />
      </main>
      <Footer />
    </div>
  )
}
