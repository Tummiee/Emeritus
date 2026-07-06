"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export type RepairAdminState = { status: "idle" | "success" | "error"; message?: string }

export async function manageRepair(_: RepairAdminState, formData: FormData): Promise<RepairAdminState> {
  await requireAdmin()
  const parsed = z.object({
    id: z.string().uuid(),
    status: z.enum(["approved", "rejected", "rescheduled", "diagnosing", "awaiting_approval", "repairing", "ready", "completed", "cancelled"]),
    message: z.string().trim().min(3).max(1000),
    date: z.string().optional(),
    time: z.string().optional(),
  }).safeParse({
    id: formData.get("id"), status: formData.get("status"), message: formData.get("message"),
    date: formData.get("date") || undefined, time: formData.get("time") || undefined,
  })
  if (!parsed.success) return { status: "error", message: "Choose an action and enter a customer message." }
  if (parsed.data.status === "rescheduled") {
    if (!z.iso.date().safeParse(parsed.data.date).success || !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.data.time ?? "")) {
      return { status: "error", message: "Choose a valid new date and time." }
    }
    if ((parsed.data.date ?? "") < new Date().toISOString().slice(0, 10)) return { status: "error", message: "The new date cannot be in the past." }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc("manage_repair_booking", {
    p_booking_id: parsed.data.id,
    p_status: parsed.data.status,
    p_message: parsed.data.message,
    p_booking_date: parsed.data.status === "rescheduled" ? parsed.data.date : null,
    p_booking_time: parsed.data.status === "rescheduled" ? parsed.data.time : null,
  })
  if (error) return { status: "error", message: "The booking could not be updated." }
  revalidatePath("/admin/repairs")
  revalidatePath("/account/repairs")
  revalidatePath("/account/notifications")
  return { status: "success", message: "Booking updated and customer notified." }
}
