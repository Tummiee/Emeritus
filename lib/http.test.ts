import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async () => ({ data: false, error: null }),
  }),
}));
import { readJson, rateLimit } from "./http";
it("rejects malformed JSON and oversized bodies", async () => {
  await expect(
    readJson(new Request("http://local", { method: "POST", body: "invalid" })),
  ).rejects.toMatchObject({ status: 400 });
  await expect(
    readJson(
      new Request("http://local", {
        method: "POST",
        body: '"' + "x".repeat(40) + '"',
      }),
      10,
    ),
  ).rejects.toMatchObject({ status: 413 });
});
it("returns a rate-limit failure when the durable counter rejects a request", async () => {
  await expect(
    rateLimit(new Request("http://local"), "test", 5),
  ).rejects.toMatchObject({ status: 429 });
});
