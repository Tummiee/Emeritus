import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readBytes(
  request: Request,
  maxBytes = 32_768,
): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError("Request is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("JSON body required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError("Request is too large", 413);
      }
      chunks.push(value);
    }
    return new Uint8Array(Buffer.concat(chunks));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("Invalid JSON");
  }
}
export async function readText(request: Request, maxBytes = 32768) {
  return Buffer.from(await readBytes(request, maxBytes)).toString("utf8");
}
export async function readJson(
  request: Request,
  maxBytes = 32768,
): Promise<unknown> {
  const raw = await readText(request, maxBytes);
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError("Invalid JSON");
  }
}
export function httpError(error: unknown) {
  if (!(error instanceof HttpError))
    console.error("[API] request failed", error);
  return NextResponse.json(
    {
      error:
        error instanceof HttpError
          ? error.message
          : "Service temporarily unavailable",
    },
    {
      status: error instanceof HttpError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  identity?: string,
) {
  // Configure the trusted proxy header for the deployment; never accept arbitrary forwarded chains.
  const address =
    identity ??
    request.headers.get(process.env.TRUSTED_CLIENT_IP_HEADER || "x-real-ip") ??
    "unknown";
  const key = createHash("sha256").update(`${scope}:${address}`).digest("hex");
  const { data, error } = await createAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: 60,
  });
  if (error) throw new HttpError("Service temporarily unavailable", 503);
  if (!data) throw new HttpError("Too many requests. Try again shortly.", 429);
}
