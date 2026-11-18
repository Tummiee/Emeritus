import { describe, expect, it } from "vitest";
import { safeNextPath } from "./helpers";

describe("redirect boundaries", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "https://evil.example",
    "/\u0000x",
  ])("rejects %s", (input) => {
    expect(safeNextPath(input)).toBe("/account");
  });
  it("preserves local destinations", () => {
    expect(safeNextPath("/checkout?code=abc#delivery")).toBe(
      "/checkout?code=abc#delivery",
    );
  });
});
