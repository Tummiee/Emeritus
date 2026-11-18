import { NextRequest, NextResponse } from "next/server";
import { catalogQuerySchema } from "@/lib/catalog-query";
import { getCatalogPage } from "@/lib/catalog-repository";
import { httpError } from "@/lib/http";

export async function GET(request: NextRequest) {
  const parsed = catalogQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
    limit: request.nextUrl.searchParams.get("limit") ?? 10,
  });
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          "Search must be at most 120 characters and limit a whole number between 1 and 50.",
      },
      { status: 400 },
    );
  const term = parsed.data.q ?? "";
  if (term.length < 2)
    return NextResponse.json({ success: true, data: [], count: 0 });
  try {
    const result = await getCatalogPage(parsed.data);
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
      query: term,
    });
  } catch (error) {
    return httpError(error);
  }
}
