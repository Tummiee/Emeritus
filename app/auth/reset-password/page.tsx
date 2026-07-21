import Link from "next/link"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import { AuthForm } from "@/components/auth/AuthForm"
import { createClient } from "@/lib/supabase/server"

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {user ? (
          <AuthForm mode="reset" />
        ) : (
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <h1 className="text-2xl font-bold">Reset link required</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This reset session is missing or has expired. Request a new password-reset email.
            </p>
            <Link href="/auth/forgot-password" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Request another link
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
