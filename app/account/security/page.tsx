import { PasswordForm } from "@/components/account/AccountForms"
import { requireUser } from "@/lib/auth/session"

export default async function SecurityPage() {
  const user = await requireUser()
  return <div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">Security</h1><p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">Password and sign-in protection.</p><div className="mb-8 rounded-2xl border border-border p-4 sm:p-5"><p className="font-semibold">Email verification</p><p className="mt-1 break-words text-sm text-muted-foreground">{user.email_confirmed_at ? `Verified on ${new Date(user.email_confirmed_at).toLocaleDateString()}` : "Email verification is pending."}</p></div><h2 className="mb-4 text-lg font-semibold">Change password</h2><PasswordForm /></div>
}
