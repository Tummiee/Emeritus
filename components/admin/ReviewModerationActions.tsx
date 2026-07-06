import { Check, X } from "lucide-react"

import { moderateReview } from "@/lib/admin/review-actions"

export function ReviewModerationActions({ id, status }: { id: string; status: string }) {
  return (
    <>
      {status !== "approved" && (
        <form action={moderateReview}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="approved" />
          <button aria-label="Approve review" title="Approve" className="rounded-lg border border-emerald-200 p-2 text-emerald-700 hover:bg-emerald-50">
            <Check className="size-4" />
          </button>
        </form>
      )}
      {status !== "rejected" && (
        <form action={moderateReview}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="rejected" />
          <button aria-label="Reject review" title="Reject" className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50">
            <X className="size-4" />
          </button>
        </form>
      )}
    </>
  )
}
