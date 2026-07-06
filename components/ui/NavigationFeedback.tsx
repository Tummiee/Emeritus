"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

const MINIMUM_VISIBLE_MS = 280
const MAXIMUM_VISIBLE_MS = 12_000

export function NavigationFeedback() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const activeRef = useRef(false)
  const startedAt = useRef(0)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingControl = useRef<HTMLElement | null>(null)
  const initialPath = useRef(pathname)

  const finish = useCallback(() => {
    const elapsed = Date.now() - startedAt.current
    const delay = Math.max(0, MINIMUM_VISIBLE_MS - elapsed)

    if (finishTimer.current) clearTimeout(finishTimer.current)
    finishTimer.current = setTimeout(() => {
      setActive(false)
      activeRef.current = false
      document.documentElement.removeAttribute("data-navigation-pending")
      pendingControl.current?.classList.remove("eg-pending-action")
      pendingControl.current?.removeAttribute("aria-busy")
      pendingControl.current = null
    }, delay)
  }, [])

  const start = useCallback((control?: HTMLElement | null) => {
    if (finishTimer.current) clearTimeout(finishTimer.current)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)

    startedAt.current = Date.now()
    setActive(true)
    activeRef.current = true
    document.documentElement.setAttribute("data-navigation-pending", "true")

    if (control) {
      pendingControl.current?.classList.remove("eg-pending-action")
      pendingControl.current?.removeAttribute("aria-busy")
      pendingControl.current = control
      control.classList.add("eg-pending-action")
      control.setAttribute("aria-busy", "true")
    }

    safetyTimer.current = setTimeout(finish, MAXIMUM_VISIBLE_MS)
  }, [finish])

  useEffect(() => {
    if (initialPath.current !== pathname) {
      initialPath.current = pathname
      finish()
    }
  }, [finish, pathname])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented
        || event.button !== 0
        || event.metaKey
        || event.ctrlKey
        || event.shiftKey
        || event.altKey
      ) return

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]")
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return

      const target = new URL(anchor.href, window.location.href)
      if (
        target.origin !== window.location.origin
        || target.href === window.location.href
        || (target.pathname === window.location.pathname && target.hash)
      ) return

      start(anchor)
    }

    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return
      const form = event.target instanceof HTMLFormElement ? event.target : null
      const usePageIndicatorOnly = form?.dataset.navigationFeedback === "page"
      start(
        !usePageIndicatorOnly && event.submitter instanceof HTMLElement
          ? event.submitter
          : null,
      )
    }

    const onPageShow = () => finish()

    document.addEventListener("click", onClick, true)
    document.addEventListener("submit", onSubmit, true)
    window.addEventListener("pageshow", onPageShow)
    const observer = new MutationObserver((mutations) => {
      if (!activeRef.current || Date.now() - startedAt.current < MINIMUM_VISIBLE_MS) return
      const pageChanged = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) =>
          !(node instanceof Element) || !node.closest(".navigation-progress"),
        ),
      )
      if (pageChanged) finish()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("submit", onSubmit, true)
      window.removeEventListener("pageshow", onPageShow)
      observer.disconnect()
      if (finishTimer.current) clearTimeout(finishTimer.current)
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
    }
  }, [finish, start])

  return (
    <div
      aria-hidden="true"
      className={`navigation-progress ${active ? "navigation-progress--active" : ""}`}
    >
      <span />
    </div>
  )
}
