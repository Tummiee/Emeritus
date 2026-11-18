import { AddressCard, AddressForm } from "@/components/account/AccountForms"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function AddressesPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: addresses } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at")
  return <div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">Addresses</h1><p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">Delivery and billing locations.</p><div className="mb-6 grid min-w-0 gap-3 sm:grid-cols-2">{addresses?.map((address) => <AddressCard key={address.id} address={address} />)}</div><AddressForm /></div>
}
