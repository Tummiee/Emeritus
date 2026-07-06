import { z } from "zod"

export const reviewSubmissionSchema = z.object({
  productId: z.string().uuid("Invalid product"),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3, "Add a short review title").max(100),
  content: z.string().trim().min(10, "Review must be at least 10 characters").max(2000),
})

export function reviewErrorMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check your review and try again"
}
