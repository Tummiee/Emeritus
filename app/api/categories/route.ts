import { NextResponse } from "next/server";
import { getCatalogFacets } from "@/lib/catalog-repository";
import { httpError } from "@/lib/http";
export async function GET() {
  try {
    const data = await getCatalogFacets();
    return NextResponse.json(
      { success: true, data: data.categories, count: data.categories.length },
      { headers: { "Cache-Control": "public, max-age=30" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
