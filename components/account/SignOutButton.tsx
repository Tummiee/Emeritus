"use client"

import { signOut } from "@/lib/auth/actions"

export function SignOutButton() {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        localStorage.removeItem("emeritus-cart:guest")
        localStorage.removeItem("emeritus-coupon:guest")
        localStorage.removeItem("cart")
        localStorage.removeItem("coupon")
        localStorage.removeItem("wishlist")
        window.dispatchEvent(new Event("emeritus:signout"))
      }}
    >
      <button className="whitespace-nowrap rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 lg:text-sm">Sign out</button>
    </form>
  )
}
