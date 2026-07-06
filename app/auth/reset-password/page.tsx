import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { AuthForm } from "@/components/auth/AuthForm"

export default function ResetPasswordPage() {
  return <div className="flex min-h-screen flex-col"><Header /><main className="flex flex-1 items-center justify-center px-4 py-12"><AuthForm mode="reset" /></main><Footer /></div>
}
