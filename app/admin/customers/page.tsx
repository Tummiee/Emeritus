import {PageNavigation} from "@/components/PageNavigation"
import {pageNumber} from "@/lib/pagination"
import { CustomerEditor } from "@/components/admin/CustomerEditor"
import { createClient } from "@/lib/supabase/server"

export default async function CustomersPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=pageNumber((await searchParams).page)
  const supabase=await createClient()
  const {data:profiles,error}=await supabase.rpc("admin_customer_page",{p_page:page})
  if(error)throw new Error("Customers could not be loaded")
  return (
    <main className="p-5 lg:p-8">
      <h1 className="text-3xl font-bold">Customers</h1>
      <p className="mt-2 text-slate-500">Customer profiles and lifetime value.</p>
      <div className="mt-7 grid gap-4 xl:grid-cols-2">
        {profiles?.map((profile: {id:string;first_name:string;last_name:string;phone:string|null;orders:number;spent:number}) => {
          const total = {orders:Number(profile.orders),spent:Number(profile.spent)}
          return (
            <CustomerEditor
              key={profile.id}
              profile={profile}
              orders={total.orders}
              spent={new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(total.spent)}
            />
          )
        })}
      </div>
      <PageNavigation page={page} hasNext={profiles?.length===25} path="/admin/customers" />
    </main>
  )
}
