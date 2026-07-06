import { ProfileForm } from "@/components/account/AccountForms"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("first_name,last_name,phone").eq("id", user.id).maybeSingle()
  const profile = data ?? { first_name: user.user_metadata.first_name ?? "", last_name: user.user_metadata.last_name ?? "", phone: "" }
  return <div><h1 className="text-3xl font-bold">Profile</h1><p className="mb-8 mt-2 text-muted-foreground">Keep your contact information up to date.</p><ProfileForm profile={profile} email={user.email ?? ""} /></div>
}
