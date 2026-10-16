"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import {
  categoryMatchesIntent,
  isCatalogIntent,
  normalizeCatalogText,
  type CatalogIntent,
} from "@/lib/catalog-intents";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";

type ShopCategory = {
  id: string;
  name: string;
  slug: string;
};

const PRODUCTS_PER_PAGE = 12;

function ShopPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [brands, setBrands] = useState<Array<{ name: string; slug: string }>>(
    [],
  );
  const [catalogMaxPrice, setCatalogMaxPrice] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const selectedCategory = params.get("category");
  const selectedBrand = params.get("brand");
  const selectedIntent = isCatalogIntent(params.get("intent"))
    ? (params.get("intent") as CatalogIntent)
    : null;
  const selectedMaxPrice = params.has("maxPrice")
    ? Number(params.get("maxPrice"))
    : null;
  const sortBy = params.get("sortBy") || "newest";
  const searchQuery = params.get("q") || "";
  const deferredSearchQuery = searchQuery;
  const currentPage = Math.max(1, Number(params.get("page")) || 1);
  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key === "category") next.delete("intent");
    window.history.pushState(
      null,
      "",
      pathname + (next.size ? "?" + next.toString() : ""),
    );
  }
  const setSelectedCategory = (value: string | null) =>
    setFilter("category", value);
  const setSelectedBrand = (value: string | null) => setFilter("brand", value);
  const setSelectedMaxPrice = (value: number | null) =>
    setFilter("maxPrice", value === null ? null : String(value));
  const setSortBy = (value: string) => setFilter("sortBy", value);
  const setSearchQuery = (value: string) => setFilter("q", value);
  const setCurrentPage = (value: number) =>
    setFilter("page", value > 1 ? String(value) : null);
  const normalize = (value: string) => normalizeCatalogText(value);
  const query = params.toString();
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    const queryParams = new URLSearchParams(query);
    queryParams.set("limit", String(PRODUCTS_PER_PAGE));
    const timer = setTimeout(() => {
      void fetch("/api/products?" + queryParams, { signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.error || "Catalog unavailable");
          if (controller.signal.aborted) return;
          if (payload.totalPages && currentPage > payload.totalPages) {
            const corrected = new URLSearchParams(query);
            corrected.set("page", String(payload.totalPages));
            window.history.replaceState(
              null,
              "",
              pathname + "?" + corrected.toString(),
            );
            return;
          }
          setProducts(payload.data);
          setTotalCount(payload.count);
          setCategories(payload.facets.categories);
          setBrands(payload.facets.brands);
          setCatalogMaxPrice(
            Math.ceil(Number(payload.facets.maxPrice) / 10000) * 10000,
          );
          setLoadError("");
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setLoadError(
              error instanceof Error ? error.message : "Catalog unavailable",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, currentPage, pathname]);
  const sortedProducts = products;
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCTS_PER_PAGE));
  const displayedPage = currentPage;
  const paginatedProducts = products;
  const paginationPages = getPaginationPages(displayedPage, totalPages);
  function resetPagination() {}

  function goToPage(page: number) {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    window.requestAnimationFrame(() => {
      productsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(135deg,_#ffffff_0%,_#f8f5ff_100%)]">
      <Header />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 rounded-[2rem] border border-purple-100 bg-white/80 p-8 shadow-[0_30px_80px_-40px_rgba(92,63,187,0.25)] backdrop-blur"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-700">
              Emeritus collection
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
              Curated tech for professionals, creators and discerning buyers.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Browse genuine devices and premium accessories selected for
              performance, quality and long-term confidence.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-4">
            <motion.aside
              className={`${showFilters ? "block" : "hidden"} lg:block rounded-[1.4rem] border border-purple-100 bg-white/80 p-6 shadow-sm backdrop-blur lg:h-fit`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-950">
                  Filters
                </h2>
                <button
                  onClick={() => router.push(pathname)}
                  className="text-sm font-semibold text-purple-700"
                >
                  Reset
                </button>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Category
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="category"
                      checked={
                        selectedCategory === null && selectedIntent === null
                      }
                      onChange={() => {
                        setSelectedCategory(null);
                        resetPagination();
                      }}
                      className="h-4 w-4"
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={
                          !selectedIntent &&
                          normalizeCatalogText(selectedCategory ?? "") ===
                            normalizeCatalogText(cat.slug)
                        }
                        onChange={() => {
                          setSelectedCategory(cat.slug);
                          resetPagination();
                        }}
                        className="h-4 w-4"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Brand
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="brand"
                      checked={selectedBrand === null}
                      onChange={() => {
                        setSelectedBrand(null);
                        resetPagination();
                      }}
                      className="h-4 w-4"
                    />
                    <span>All Brands</span>
                  </label>
                  {brands.map((brand) => (
                    <label
                      key={brand.name}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="radio"
                        name="brand"
                        checked={
                          selectedBrand !== null &&
                          normalize(selectedBrand) === normalize(brand.slug)
                        }
                        onChange={() => {
                          setSelectedBrand(brand.slug);
                          resetPagination();
                        }}
                        className="h-4 w-4"
                      />
                      <span>{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Price range
                </h3>
                <input
                  type="range"
                  min="0"
                  max={catalogMaxPrice || 1}
                  value={selectedMaxPrice ?? catalogMaxPrice}
                  onChange={(e) => {
                    setSelectedMaxPrice(Number(e.target.value));
                    resetPagination();
                  }}
                  className="w-full"
                />
                <div className="mt-2 flex justify-between text-sm text-slate-600">
                  <span>₦0</span>
                  <span>
                    ₦{(selectedMaxPrice ?? catalogMaxPrice).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.aside>

            <div className="lg:col-span-3">
              {loadError && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {loadError}
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative mb-4"
              >
                <label htmlFor="shop-search" className="sr-only">
                  Search products
                </label>
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="shop-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    resetPagination();
                  }}
                  placeholder="Search products, brands or categories…"
                  autoComplete="off"
                  className="h-12 w-full rounded-2xl border border-purple-100 bg-white/90 pl-12 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      resetPagination();
                    }}
                    aria-label="Clear product search"
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <SlidersHorizontal className="h-4 w-4 text-purple-700" />
                  <span>
                    {isLoading
                      ? "Loading products…"
                      : sortedProducts.length
                        ? `Showing ${(displayedPage - 1) * PRODUCTS_PER_PAGE + 1}–${Math.min(displayedPage * PRODUCTS_PER_PAGE, totalCount)} of ${totalCount} products`
                        : "Showing 0 products"}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 lg:hidden"
                  >
                    Filters
                  </button>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        resetPagination();
                      }}
                      className="appearance-none rounded-full border border-slate-300 bg-white px-4 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-200"
                    >
                      <option value="newest">Newest</option>
                      <option value="popular">Most Popular</option>
                      <option value="rating">Highest Rated</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                ref={productsSectionRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
              >
                {paginatedProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    viewport={{ once: true }}
                  >
                    <ProductCard
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      price={product.price}
                      comparePrice={product.comparePrice}
                      image={product.image}
                      rating={product.rating}
                      reviews={product.reviews}
                      inStock={product.inStock}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {!isLoading && !loadError && totalPages > 1 && (
                <nav
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Product pagination"
                >
                  <button
                    type="button"
                    disabled={displayedPage === 1}
                    onClick={() => goToPage(displayedPage - 1)}
                    className="rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {paginationPages.map((page, index) =>
                    page === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-sm text-slate-400"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => goToPage(page)}
                        aria-current={
                          page === displayedPage ? "page" : undefined
                        }
                        className={`grid size-10 place-items-center rounded-full border text-sm font-semibold transition ${
                          page === displayedPage
                            ? "border-purple-700 bg-purple-700 text-white"
                            : "border-purple-200 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    disabled={displayedPage === totalPages}
                    onClick={() => goToPage(displayedPage + 1)}
                    className="rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </nav>
              )}

              {!isLoading && !loadError && sortedProducts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-[1.4rem] border border-dashed border-purple-200 bg-white/80 p-10 text-center text-slate-600"
                >
                  <p className="mb-3 font-semibold text-slate-900">
                    {deferredSearchQuery.trim()
                      ? `No products found for “${deferredSearchQuery.trim()}”.`
                      : "No products match these filters."}
                  </p>
                  {deferredSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        resetPagination();
                      }}
                      className="mr-2 rounded-full border border-purple-200 bg-white px-5 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-50"
                    >
                      Clear search
                    </button>
                  )}
                  <button
                    onClick={() => router.push(pathname)}
                    className="rounded-full bg-purple-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-purple-800"
                  >
                    Clear filters
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function getPaginationPages(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 3) pages.push("ellipsis");
  else {
    for (let page = 2; page < start; page += 1) pages.push(page);
  }

  for (let page = start; page <= end; page += 1) pages.push(page);

  if (end < totalPages - 2) pages.push("ellipsis");
  else {
    for (let page = end + 1; page < totalPages; page += 1) pages.push(page);
  }
  pages.push(totalPages);
  return pages;
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={<div className="p-12 text-center">Loading catalog...</div>}
    >
      <ShopPageContent />
    </Suspense>
  );
}
