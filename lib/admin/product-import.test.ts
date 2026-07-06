import { describe, expect, it } from "vitest";

import {
  csvToProductRows,
  parseBoolean,
  parseCsv,
  slugify,
} from "./product-import";

describe("product CSV import", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv('name,description\nPhone,"Fast, compact ""Pro"" model"')).toEqual([
      ["name", "description"],
      ["Phone", 'Fast, compact "Pro" model'],
    ]);
  });

  it("maps required columns and strips a UTF-8 BOM", () => {
    const [row] = csvToProductRows(
      "\uFEFFname,slug,sku,price,featured\nPhone,phone,SKU-1,1000,yes",
    );

    expect(row).toMatchObject({
      name: "Phone",
      slug: "phone",
      sku: "SKU-1",
      price: "1000",
      featured: "yes",
    });
  });

  it("rejects missing required columns and unclosed quotes", () => {
    expect(() => csvToProductRows("name,sku\nPhone,SKU-1")).toThrow(
      "Missing required columns",
    );
    expect(() => parseCsv('name\n"Phone')).toThrow("unclosed quoted value");
  });

  it("normalizes booleans and slugs", () => {
    expect(parseBoolean("ACTIVE", false)).toBe(true);
    expect(parseBoolean("no", true)).toBe(false);
    expect(parseBoolean("sometimes", false)).toBeNull();
    expect(slugify("  iPhone 15 Pro / Max  ")).toBe("iphone-15-pro-max");
  });
});
