"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { Star } from "lucide-react"
import { useToast } from "@/components/ui/toast"

export function ReviewForm({ productId, returnPath }: { productId: string; returnPath: string }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [needsLogin, setNeedsLogin] = useState(false)
  const [success, setSuccess] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setNeedsLogin(false)
    if (!rating) {
      setMessage("Choose a star rating")
      showToast({ kind: "warning", title: "Choose a star rating" })
      return
    }

    const form = event.currentTarget
    const values = new FormData(form)
    setPending(true)
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: values.get("title"),
          content: values.get("content"),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setNeedsLogin(response.status === 401)
        throw new Error(result.error || "Could not submit your review")
      }
      setSuccess(true)
      setMessage(result.message)
      showToast({ kind: "success", title: "Review received", description: "It will appear after approval." })
      form.reset()
      setRating(0)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not submit your review"
      setMessage(errorMessage)
      showToast({ kind: "error", title: "Review not submitted", description: errorMessage })
    } finally {
      setPending(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <h3 className="font-semibold">Review received</h3>
        <p className="mt-1 text-sm">{message} It will appear after an administrator approves it.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-lg font-semibold text-slate-950">Write a review</h3>
      <p className="mt-1 text-sm text-slate-600">Share your experience. Reviews are checked before publication.</p>
      <fieldset className="mt-5">
        <legend className="text-sm font-medium text-slate-800">Rating</legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHoveredRating(0)}>
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1
            const active = value <= (hoveredRating || rating)
            return (
              <button
                key={value}
                type="button"
                onMouseEnter={() => setHoveredRating(value)}
                onClick={() => setRating(value)}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                aria-pressed={rating === value}
                className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Star className={`size-6 ${active ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`} />
              </button>
            )
          })}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-medium text-slate-800">
        Review title
        <input name="title" required minLength={3} maxLength={100} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" />
      </label>
      <label className="mt-4 block text-sm font-medium text-slate-800">
        Your review
        <textarea name="content" required minLength={10} maxLength={2000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" />
      </label>
      {message && !needsLogin && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
      {needsLogin && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          Sign in before submitting.{" "}
          <Link href={`/auth/login?next=${encodeURIComponent(returnPath)}`} className="font-semibold underline">Sign in</Link>
        </p>
      )}
      <button disabled={pending} className="mt-5 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  )
}
