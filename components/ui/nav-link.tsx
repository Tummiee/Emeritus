import Link, { type LinkProps } from "next/link"
import * as React from "react"

import { cn } from "@/lib/utils"

type NavLinkProps = LinkProps &
  Omit<React.ComponentProps<"a">, keyof LinkProps> & {
    active?: boolean
  }

function NavLink({ className, active, children, ...props }: NavLinkProps) {
  return (
    <Link
      data-slot="nav-link"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30",
        active && "bg-muted text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}

export { NavLink }
