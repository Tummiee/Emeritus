import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div
      className="app-loading bg-background"
      role="status"
      aria-label="Loading shop"
    >
      <main className="app-container py-12 sm:py-16">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-12 w-full max-w-2xl sm:h-16" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-4"
            >
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="mt-5 h-4 w-4/5" />
              <Skeleton className="mt-3 h-4 w-2/5" />
              <Skeleton className="mt-5 h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </main>
      <span className="sr-only">Loading shop content…</span>
    </div>
  );
}
