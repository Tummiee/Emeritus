import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import type { Readable, Writable } from "node:stream";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  client: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  revalidate: vi.fn(),
  optimize: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/lib/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/admin/image-optimization", () => ({
  optimizeAdminImage: mocks.optimize,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error(url), { redirect: true });
  },
  unstable_rethrow: (error: { redirect?: boolean }) => {
    if (error.redirect) throw error;
  },
}));

import { saveEntity } from "./entity-actions";
import {
  initialEntityFormState,
  entityDatabaseError,
} from "./entity-form-state";
import { entities } from "./entities";

const recordId = "00000000-0000-4000-8000-000000000001";
function form(entity: string, values: Record<string, string> = {}) {
  const data = new FormData();
  data.set("entity", entity);
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: recordId });
  mocks.write.mockResolvedValue({ data: recordId, error: null });
  mocks.read.mockResolvedValue({
    data: { id: recordId, slug: "Solar Iron" },
    error: null,
  });
  mocks.client.mockResolvedValue({
    rpc: mocks.write,
    from: () => ({
      insert: mocks.write,
      update: (values: unknown) => ({ eq: () => mocks.write(values) }),
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
    }),
  });
});

describe("admin save feedback", () => {
  it("keeps the product image when an untouched input passes through Next's multipart parser", async () => {
    const imageUrl = "https://legacy-cdn.example/iron.jpg";
    mocks.read.mockResolvedValueOnce({
      data: { id: recordId, slug: "solar-iron", image_url: imageUrl },
      error: null,
    });
    const data = form("products", {
      id: recordId,
      name: "Updated iron",
      slug: "solar-iron",
      sku: "IRON-1",
      price: "125",
      image_url: imageUrl,
    });
    data.set(
      "image_url__file",
      new File([], "", { type: "application/octet-stream" }),
    );
    const request = new Request("http://localhost", {
      method: "POST",
      body: data,
    });
    const busboy = createRequire(import.meta.url)(
      "next/dist/compiled/busboy",
    ) as (options: { headers: Record<string, string> }) => Writable;
    const parser = busboy({
      headers: { "content-type": request.headers.get("content-type")! },
    });
    const decoded = new FormData();
    parser.on("field", (name: string, value: string) =>
      decoded.append(name, value),
    );
    parser.on(
      "file",
      (
        name: string,
        stream: Readable,
        info: { filename?: string; mimeType: string },
      ) => {
        stream.resume();
        // Mirror React's decodeReplyFromBusboy construction for this empty part.
        decoded.append(
          name,
          new File([], info.filename as string, { type: info.mimeType }),
        );
      },
    );
    const finished = new Promise<void>((resolve, reject) => {
      parser.once("finish", resolve);
      parser.once("error", reject);
    });
    parser.end(Buffer.from(await request.arrayBuffer()));
    await finished;
    expect((decoded.get("image_url__file") as File).name).toBe("undefined");
    await expect(saveEntity(initialEntityFormState, decoded)).rejects.toThrow(
      "/admin/products?saved=1",
    );
    expect(mocks.write).toHaveBeenCalledWith(
      "admin_save_product",
      expect.objectContaining({
        p_values: expect.objectContaining({
          image_url: imageUrl,
          price: 125,
          name: "Updated iron",
        }),
      }),
    );
    expect(mocks.optimize).not.toHaveBeenCalled();
  });

  it("still rejects a genuinely empty replacement image", async () => {
    const data = form("products", {
      id: recordId,
      name: "Solar iron",
      slug: "solar-iron",
      sku: "IRON-1",
      price: "125",
      image_url: "/images/iron.jpg",
    });
    data.set(
      "image_url__file",
      new File([], "replacement.png", { type: "image/png" }),
    );
    const state = await saveEntity(initialEntityFormState, data);
    expect(state.fieldErrors.image_url).toEqual([
      "This image is empty. Choose a different file.",
    ]);
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it.each(["products", "categories", "brands"])(
    "returns specific field errors for invalid %s without writing",
    async (entity) => {
      const result = await saveEntity(
        initialEntityFormState,
        form(entity, {
          name: "Solar Iron",
          slug: "Solar Iron",
          sku: "IRON-1",
          price: "-5",
          display_order: "1.5",
        }),
      );
      expect(result.fieldErrors.slug.join(" ")).toContain("solar-iron");
      if (entity === "products")
        expect(result.fieldErrors.price.join(" ")).toContain("positive");
      else
        expect(result.fieldErrors.display_order.join(" ")).toContain(
          "whole number",
        );
      expect(mocks.write).not.toHaveBeenCalled();
      expect(result.submission).toBe(1);
    },
  );

  it.each([
    [
      "products",
      {
        name: "Solar Iron",
        slug: "solar-iron",
        sku: "IRON-1",
        price: "100.50",
        image_url: "/images/iron.jpg",
      },
    ],
    [
      "categories",
      { name: "Solar", slug: "solar", image_url: "/images/solar.jpg" },
    ],
    ["brands", { name: "Itel", slug: "itel" }],
    [
      "hero",
      {
        title: "Solar",
        image_url: "/images/solar.jpg",
        image_alt: "Solar equipment",
      },
    ],
    [
      "homepage",
      {
        section_key: "featured",
        title: "Featured",
        content: '{"title":"Featured"}',
      },
    ],
    [
      "coupons",
      {
        code: "solar",
        discount_type: "percentage",
        discount_value: "10",
        usage_limit: "",
      },
    ],
    [
      "reviews",
      {
        product_id: recordId,
        rating: "5",
        body: "Good product",
        status: "approved",
      },
    ],
  ] as const)(
    "accepts realistic %s forms with blank optional fields",
    async (entity, values) => {
      await expect(
        saveEntity(initialEntityFormState, form(entity, values)),
      ).rejects.toThrow(`/admin/${entity}?saved=1`);
      expect(mocks.write).toHaveBeenCalledOnce();
    },
  );

  it("allows unchanged legacy slugs while rejecting newly changed invalid slugs", async () => {
    const data = form("products", {
      id: recordId,
      name: "Solar Iron",
      slug: "Solar Iron",
      sku: "IRON-1",
      price: "100",
    });
    await expect(saveEntity(initialEntityFormState, data)).rejects.toThrow(
      "saved=1",
    );
    data.set("slug", "Another Iron");
    const result = await saveEntity(initialEntityFormState, data);
    expect(result.fieldErrors.slug.join(" ")).toContain("Do not use spaces");
    expect(mocks.write).toHaveBeenCalledOnce();
  });

  it("explains missing fields, invalid JSON and invalid dates without throwing", async () => {
    const homepage = await saveEntity(
      initialEntityFormState,
      form("homepage", { content: "{bad}" }),
    );
    expect(homepage.fieldErrors.title.join(" ")).toContain("Enter title");
    expect(homepage.fieldErrors.content.join(" ")).toContain("valid JSON");
    const coupon = await saveEntity(
      initialEntityFormState,
      form("coupons", {
        code: "BAD",
        discount_type: "percentage",
        discount_value: "10",
        starts_at: "bad-date",
      }),
    );
    expect(coupon.fieldErrors.starts_at.join(" ")).toContain("Nigeria time");
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("identifies coupon ranges and expired windows by field", async () => {
    const result = await saveEntity(
      initialEntityFormState,
      form("coupons", {
        code: "BAD",
        discount_type: "percentage",
        discount_value: "120",
        usage_limit: "0",
        starts_at: "2026-10-20T15:00",
        expires_at: "2026-10-20T14:00",
      }),
    );
    expect(result.fieldErrors.discount_value.join(" ")).toContain("0 and 100");
    expect(result.fieldErrors.usage_limit.join(" ")).toContain("at least 1");
    expect(result.fieldErrors.expires_at.join(" ")).toContain("later than");
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("explains image file and URL problems", async () => {
    const data = form("brands", { name: "Itel", slug: "itel" });
    data.set(
      "logo_url__file",
      new File(["svg"], "logo.svg", { type: "image/svg+xml" }),
    );
    const fileResult = await saveEntity(initialEntityFormState, data);
    expect(fileResult.fieldErrors.logo_url.join(" ")).toContain(
      "JPG, PNG, WebP or GIF",
    );
    data.delete("logo_url__file");
    data.set("logo_url", "https://unconfigured.invalid/logo.jpg");
    const urlResult = await saveEntity(initialEntityFormState, data);
    expect(urlResult.fieldErrors.logo_url.join(" ")).toContain(
      "configured storage or CDN",
    );
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("returns a duplicate slug correction and permits resubmission", async () => {
    mocks.write.mockResolvedValueOnce({
      error: {
        code: "23505",
        message: 'duplicate key violates constraint "brands_slug_key"',
        details: "Key (slug)=(itel) already exists.",
      },
    });
    const data = form("brands", { name: "Itel", slug: "itel" });
    const state = await saveEntity(initialEntityFormState, data);
    expect(state.fieldErrors.slug.join(" ")).toContain(
      "Slug is already in use",
    );
    data.set("slug", "itel-new");
    await expect(saveEntity(state, data)).rejects.toThrow("saved=1");
  });

  it("checks authorization before saving and preserves authentication redirects", async () => {
    mocks.requireAdmin.mockRejectedValue(
      Object.assign(new Error("/auth/login"), { redirect: true }),
    );
    await expect(
      saveEntity(
        initialEntityFormState,
        form("brands", { name: "Itel", slug: "itel" }),
      ),
    ).rejects.toThrow("/auth/login");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });

  it("explains when an edited record has been deleted", async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: null });
    const state = await saveEntity(
      initialEntityFormState,
      form("brands", { id: recordId, name: "Itel", slug: "itel" }),
    );
    expect(state.message).toContain("no longer exists");
    expect(mocks.write).not.toHaveBeenCalled();
  });

  it("reports connection failures without claiming that the write did not happen", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.write.mockRejectedValueOnce(new TypeError("fetch failed"));
    try {
      const state = await saveEntity(
        initialEntityFormState,
        form("brands", { name: "Itel", slug: "itel" }),
      );
      expect(state.message).toContain("fetch failed");
      expect(state.message).toContain("check the record list before retrying");
      expect(state.submission).toBe(1);
    } finally {
      log.mockRestore();
    }
  });

  it("explains missing database setup, permissions and unavailable references distinctly", () => {
    expect(
      entityDatabaseError(
        {
          code: "23505",
          message: 'duplicate key violates constraint "brands_slug_key"',
          details: "Key (slug)=(name) already exists.",
        },
        entities.brands,
      ).fieldErrors.slug[0],
    ).toContain("Slug is already in use");
    expect(
      entityDatabaseError(
        { code: "PGRST202", message: "function missing" },
        entities.products,
      ).message,
    ).toContain("pending migrations");
    expect(
      entityDatabaseError(
        { code: "42501", message: "denied" },
        entities.categories,
      ).message,
    ).toContain("administrator account");
    expect(
      entityDatabaseError(
        { code: "23503", message: "products_category_id_fkey" },
        entities.products,
      ).fieldErrors.category_id[0],
    ).toContain("select it again");
  });
});
