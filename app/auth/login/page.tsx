import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { AuthForm } from "@/components/auth/AuthForm"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/account"
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <AuthForm mode="login" next={next} />
      </main>
      <Footer />
    </div>
  )
}
