"use server";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "@/lib/cache";
import { redirect } from "next/navigation";
export async function deactivateAllProducts() {
  await requireAdmin();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("products")
    .update({ active: false, featured: false }, { count: "exact" })
    .eq("active", true);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  redirect(`/admin/products?bulk=deactivated&count=${count ?? 0}`);
}
