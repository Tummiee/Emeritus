import Image, { type ImageProps } from "next/image"
import * as React from "react"
import { Heart, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ProductCardProps = Omit<React.ComponentProps<typeof Card>, "children"> & {
  name: string
  image: ImageProps["src"]
  imageAlt?: string
  formattedPrice: string
  formattedCompareAtPrice?: string
  rating?: number
  reviewCount?: number
  label?: string
  availability?: "in-stock" | "low-stock" | "out-of-stock"
  wishlisted?: boolean
  priority?: boolean
  onSelect?: () => void
  onWishlistChange?: (wishlisted: boolean) => void
  action?: React.ReactNode
}

function ProductCard({
  className,
  name,
  image,
  imageAlt = name,
  formattedPrice,
  formattedCompareAtPrice,
  rating,
  reviewCount,
  label,
  availability = "in-stock",
  wishlisted = false,
  priority,
  onSelect,
  onWishlistChange,
  action,
  ...props
}: ProductCardProps) {
  const disabled = availability === "out-of-stock"

  return (
    <Card
      data-slot="product-card"
      interactive
      className={cn("group overflow-hidden rounded-2xl", className)}
      {...props}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-6 transition-transform duration-400 ease-[var(--ease-out-expo)] group-hover:scale-[1.035]"
        />
        {label && <Badge className="absolute left-3 top-3">{label}</Badge>}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={wishlisted ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
          aria-pressed={wishlisted}
          onClick={() => onWishlistChange?.(!wishlisted)}
          className="absolute right-3 top-3 border-white/30 bg-background/75 shadow-sm backdrop-blur-md"
        >
          <Heart className={cn(wishlisted && "fill-destructive text-destructive")} />
        </Button>
      </div>

      <div className="grid gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={onSelect}
          className="line-clamp-2 min-h-10 text-left text-sm font-medium leading-5 tracking-[-0.015em] outline-none hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
        >
          {name}
        </button>

        {typeof rating === "number" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label={`${rating} out of 5 stars`}>
            <Star className="size-3.5 fill-warning text-warning" aria-hidden="true" />
            <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
            {typeof reviewCount === "number" && <span>({reviewCount})</span>}
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-base font-semibold tracking-[-0.025em]">{formattedPrice}</span>
          {formattedCompareAtPrice && (
            <span className="font-mono text-xs text-muted-foreground line-through">{formattedCompareAtPrice}</span>
          )}
        </div>

        <div className="flex min-h-9 items-center justify-between gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              availability === "in-stock" && "text-success",
              availability === "low-stock" && "text-warning",
              disabled && "text-muted-foreground",
            )}
          >
            {availability === "in-stock" && "In stock"}
            {availability === "low-stock" && "Low stock"}
            {disabled && "Out of stock"}
          </span>
          <div aria-disabled={disabled || undefined}>{action}</div>
        </div>
      </div>
    </Card>
  )
}

export { ProductCard, type ProductCardProps }
