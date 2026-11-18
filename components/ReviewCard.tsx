import React from 'react'
import { Star } from 'lucide-react'

interface Review {
  id: string
  productId: string
  author: string
  rating: number
  title: string
  content: string
  date: string
  verified: boolean
}

interface ReviewCardProps {
  review: Review
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{review.author}</p>
          <p className="text-sm text-muted-foreground">{new Date(review.date).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
        </div>
        {review.verified && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            Verified Purchase
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < review.rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>

      <h4 className="font-semibold text-foreground mb-2">{review.title}</h4>
      <p className="text-sm text-muted-foreground">{review.content}</p>
    </div>
  )
}
