"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { useCart } from "@/lib/contexts/CartContext";
import { useWishlist } from "@/lib/contexts/WishlistContext";
import { Check, Heart, ShoppingCart, Star, X } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    fetch(`/api/products/${encodeURIComponent(productId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Product not found");
        setProduct(result.data ?? null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(
          error instanceof Error ? error.message : "Could not load this product",
        );
        setProduct(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [productId]);

  const { addItem } = useCart();
  const {
    items: wishlistItems,
    removeItem,
    addItem: addWishlistItem,
  } = useWishlist();
  const isWishlisted = wishlistItems.includes(productId);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const productReviews = product?.reviewsList ?? [];

  if (loading || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#ffffff_0%,_#f8f5ff_100%)]">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-slate-600">
              {loading ? "Loading product…" : loadError || "Product not found"}
            </p>
            <Link
              href="/shop"
              className="font-semibold text-purple-700 hover:text-purple-800"
            >
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(productId, quantity);
  };

  const images = [product.image, product.image, product.image];

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#ffffff_0%,_#f8f5ff_100%)]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <motion.div
            className="mb-8 flex items-center gap-2 text-sm text-slate-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Link href="/" className="hover:text-purple-700">
              Home
            </Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-purple-700">
              Shop
            </Link>
            <span>/</span>
            <span className="text-slate-950">{product.name}</span>
          </motion.div>

          <div className="mb-12 grid gap-8 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4 overflow-hidden rounded-[2rem] border border-purple-100 bg-white p-3 shadow-[0_30px_80px_-40px_rgba(92,63,187,0.3)]">
                <Image
                  src={images[selectedImage]}
                  alt={product.name}
                  width={1200}
                  height={900}
                  className="h-[440px] w-full rounded-[1.5rem] object-cover"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`overflow-hidden rounded-2xl border-2 ${selectedImage === idx ? "border-purple-700" : "border-slate-200"}`}
                  >
                    <Image
                      src={img}
                      alt=""
                      width={400}
                      height={400}
                      className="h-24 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="rounded-[2rem] border border-purple-100 bg-white/80 p-8 shadow-[0_30px_80px_-40px_rgba(92,63,187,0.2)] backdrop-blur"
            >
              {product.comparePrice && (
                <span className="mb-4 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
                  Featured offer
                </span>
              )}
              <h1 className="text-3xl font-semibold text-slate-950 sm:text-4xl">
                {product.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-600">
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              <div className="mt-6 flex items-end gap-3">
                <span className="text-4xl font-semibold text-slate-950">
                  ₦{product.price.toLocaleString()}
                </span>
                {product.comparePrice && (
                  <span className="text-xl text-slate-400 line-through">
                    ₦{product.comparePrice.toLocaleString()}
                  </span>
                )}
              </div>

              <p className="mt-6 text-lg leading-8 text-slate-600">
                Premium quality gadget with a refined finish, strong performance
                and the kind of craftsmanship buyers expect from a specialist
                retailer.
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-600">
                {product.inStock ? (
                  <>
                    <Check className="h-5 w-5" /> In stock and ready for
                    dispatch
                  </>
                ) : (
                  <>
                    <X className="h-5 w-5" /> Currently unavailable
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm font-semibold text-slate-700">
                  Quantity
                </span>
                <div className="flex items-center overflow-hidden rounded-full border border-slate-300 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 text-lg text-slate-700 transition hover:bg-slate-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    className="w-14 border-x border-slate-200 bg-white py-2 text-center text-gray-900 text-sm"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 text-lg text-slate-700 transition hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-purple-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShoppingCart className="h-4 w-4" /> Add to cart
                </button>
                <button
                  onClick={() =>
                    isWishlisted
                      ? removeItem(productId)
                      : addWishlistItem(productId)
                  }
                  className={`rounded-full border px-5 py-3 transition ${isWishlisted ? "border-red-200 bg-red-50 text-red-600" : "border-slate-300 text-slate-700 hover:border-purple-300 hover:text-purple-700"}`}
                >
                  <Heart
                    className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`}
                  />
                </button>
              </div>

              <div className="mt-8 rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-slate-950">
                  Why buyers trust this item
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                    Guaranteed authenticity and premium condition.
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                    Warranty support and professional after-sales guidance.
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
                    Fast local delivery and secure checkout options.
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-[2rem] border border-purple-100 bg-white/80 p-8 shadow-[0_30px_80px_-40px_rgba(92,63,187,0.2)] backdrop-blur"
          >
            <h2 className="text-2xl font-semibold text-slate-950">
              Customer reviews
            </h2>
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
              <div>
                {productReviews.length > 0 ? (
                  <div className="grid gap-6">
                    {productReviews.map((review: any) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                    <p className="font-semibold text-slate-900">No approved reviews yet.</p>
                    <p className="mt-2 text-sm text-slate-600">Be the first customer to share an experience with this product.</p>
                  </div>
                )}
              </div>
              <ReviewForm productId={product.id} returnPath={`/product/${product.slug}`} />
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
