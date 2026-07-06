import { Bell } from "lucide-react"

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/account/actions"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function NotificationsPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)
  const hasUnread = data?.some((item) => !item.read_at)

  return (
    <div>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="mt-2 text-muted-foreground">Account and order updates.</p>
        </div>
        {hasUnread && (
          <form action={markAllNotificationsRead} data-navigation-feedback="page">
            <button className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">Mark all read</button>
          </form>
        )}
      </div>
      <div className="mt-6 space-y-2 sm:mt-8">
        {!data?.length && (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <Bell className="mx-auto size-10 text-muted-foreground" />
            <p className="mt-4">You are all caught up.</p>
          </div>
        )}
        {data?.map((item) => (
          <article key={item.id}>
            <form action={markNotificationRead} data-navigation-feedback="page">
              <input type="hidden" name="id" value={item.id} />
              <button
                className={`w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40 ${
                  item.read_at ? "border-border" : "border-primary/30 bg-primary/5"
                }`}
                aria-label={`${item.read_at ? "Open" : "Mark as read and open"} notification: ${item.title}`}
              >
                <span className="flex items-start justify-between gap-4">
                  <span className="font-semibold">{item.title}</span>
                  {!item.read_at && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                  )}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.message}</span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </button>
            </form>
          </article>
        ))}
      </div>
    </div>
  )
}
