import { NextRequest, NextResponse } from "next/server";
import { getCatalogPage } from "@/lib/catalog-repository";
import { catalogQuerySchema } from "@/lib/catalog-query";
import { HttpError, httpError } from "@/lib/http";
export async function GET(request: NextRequest) {
  try {
    const parsed = catalogQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success)
      throw new HttpError("Invalid product filters or pagination");
    return NextResponse.json(await getCatalogPage(parsed.data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return httpError(error);
  }
}
