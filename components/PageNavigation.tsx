import Link from "next/link";
export function PageNavigation({
  page,
  hasNext,
  path,
}: {
  page: number;
  hasNext: boolean;
  path: string;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-center gap-5 text-sm"
    >
      {page > 1 && (
        <Link
          className="rounded-lg border px-4 py-2"
          href={`${path}?page=${page - 1}`}
        >
          Previous
        </Link>
      )}
      <span>Page {page}</span>
      {hasNext && (
        <Link
          className="rounded-lg border px-4 py-2"
          href={`${path}?page=${page + 1}`}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
