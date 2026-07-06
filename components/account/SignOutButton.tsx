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
      <button className="px-3 text-sm font-medium text-destructive hover:underline">Sign out</button>
    </form>
  )
}
