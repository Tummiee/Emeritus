"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/contexts/WishlistContext";
import { useCart } from "@/lib/contexts/CartContext";

interface ProductCardProps {
  id: string;
  slug?: string;
  name: string;
  price: number;
  comparePrice?: number;
  image: string | { url: string; alt: string };
  rating: number;
  reviews?: number;
  inStock?: boolean;
  badge?: string;
  availability?: "in-stock" | "low-stock" | "out-of-stock";
  action?: React.ReactNode;
}

function normalizeImage(image: ProductCardProps["image"]) {
  if (typeof image === "string") {
    return { url: image, alt: "" };
  }

  return image;
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  comparePrice,
  image,
  rating,
  reviews = 0,
  inStock = true,
  badge,
  availability,
  action,
}: ProductCardProps) {
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isWishlisted,
  } = useWishlist();
  const { addItem: addToCart } = useCart();
  const wishlisted = isWishlisted(id);
  const normalizedImage = normalizeImage(image);
  const resolvedAvailability =
    availability ?? (inStock === false ? "out-of-stock" : "in-stock");

  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

  const formattedCompareAtPrice = comparePrice
    ? new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(comparePrice)
    : undefined;

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={normalizedImage.url || "/product-placeholder.svg"}
          alt={normalizedImage.alt || name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 ease-[cubic-bezier(.77,0,.18,1)] group-hover:scale-105"
          onError={(event) => {
            const target = event.target as HTMLImageElement;
            target.src = "/product-placeholder.svg";
          }}
        />

        <div className="absolute right-3 top-3 flex gap-2">
          {badge && (
            <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
              {badge}
            </span>
          )}

          <button
            onClick={() =>
              wishlisted ? removeFromWishlist(id) : addToWishlist(id)
            }
            className={cn(
              "rounded-full bg-background/60 p-1.5 backdrop-blur-sm transition-colors",
              "hover:bg-destructive hover:text-destructive-foreground",
              wishlisted && "bg-destructive text-destructive-foreground",
            )}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={cn("size-3.5", wishlisted ? "fill-current" : "")}
            />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 rounded-t-xl border-t border-white/15 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 opacity-100 transition-opacity md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100">
          <div className="flex justify-center gap-2">
            <button
              type="button"
              disabled={resolvedAvailability === "out-of-stock"}
              onClick={() => void addToCart(slug ?? id, 1)}
              aria-label={`Add ${name} to cart`}
              className="rounded-full border border-white/70 bg-white p-2 text-primary shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="size-4" />
            </button>
            <Link
              href={`/product/${slug ?? id}`}
              className="rounded-full border border-primary bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              View details
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/product/${slug ?? id}`}
          className="text-left font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {name}
        </Link>

        {typeof rating === "number" && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-label={`${rating} out of 5 stars`}
          >
            <Star
              className="size-3.5 fill-warning text-warning"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {rating.toFixed(1)}
            </span>
            <span>({reviews})</span>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-base font-semibold tracking-[-0.025em]">
            {formattedPrice}
          </span>
          {formattedCompareAtPrice && (
            <span className="font-mono text-xs text-muted-foreground line-through">
              {formattedCompareAtPrice}
            </span>
          )}
        </div>

        <div className="mt-3 flex min-h-8 items-center justify-between gap-3">
          <span
            className={cn(
              "text-xs font-medium",
              resolvedAvailability === "in-stock" && "text-success",
              resolvedAvailability === "low-stock" && "text-warning",
              resolvedAvailability === "out-of-stock" && "text-destructive",
            )}
          >
            {resolvedAvailability === "in-stock" && "In stock"}
            {resolvedAvailability === "low-stock" && "Low stock"}
            {resolvedAvailability === "out-of-stock" && "Out of stock"}
          </span>
          <div>{action}</div>
        </div>
      </div>
    </Card>
  );
}
