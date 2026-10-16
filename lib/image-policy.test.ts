import { expect, it } from "vitest";
import { configuredImageOrigins, imageSourceAllowed } from "./image-policy.mjs";
import { homepageSeed } from "./homepage/content";
import { validateEntityValues } from "./admin/entity-validation";
import { entities } from "./admin/entities";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SafeImage from "../components/SafeImage";

it("allows every built-in homepage image with the default optimizer policy", () => {
  function check(value: unknown) {
    if (Array.isArray(value)) value.forEach(check);
    else if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        if (key === "url" && typeof entry === "string")
          expect(imageSourceAllowed(entry)).toBe(true);
        else check(entry);
      }
    }
  }
  check(homepageSeed);
});
it("keeps bundled image hosts when extra CDNs are configured and trims entries", () => {
  const origins = configuredImageOrigins(
    "https://shop.supabase.co",
    " https://cdn.example.com:8443 , ",
  );
  expect(
    imageSourceAllowed(
      "https://images.openai.com/static-rsc-4/example?purpose=fullsize",
      origins,
    ),
  ).toBe(true);
  expect(
    imageSourceAllowed("https://cdn.example.com:8443/photo.webp", origins),
  ).toBe(true);
  expect(
    imageSourceAllowed("https://cdn.example.com/photo.webp", origins),
  ).toBe(false);
  for (const source of [
    "//evil.example/image.png",
    "/\\evil.example/image.png",
    "javascript:alert(1)",
    "https://images.openai.com.evil.example/image.jpg",
    "https://user@images.openai.com/photo.jpg",
    "",
  ])
    expect(imageSourceAllowed(source, origins)).toBe(false);
  expect(imageSourceAllowed("/product-placeholder.svg", origins)).toBe(true);
});
it("accepts existing underscore product slugs in admin updates", () => {
  const config = {
    ...entities.products,
    fields: [{ name: "slug", label: "Slug", required: true }],
  };
  expect(
    validateEntityValues(
      config,
      { slug: "itel_energy_power_tank_all_in_one_ess" },
      true,
    ).success,
  ).toBe(true);
});
it("uses a placeholder for unconfigured images before Next Image can throw", () => {
  expect(
    renderToStaticMarkup(
      createElement(SafeImage, {
        src: "https://unconfigured.invalid/photo.png",
        alt: "Product",
        width: 100,
        height: 100,
      }),
    ),
  ).toContain("/product-placeholder.svg");
  expect(imageSourceAllowed("blob:http://localhost:3000/test-preview")).toBe(
    true,
  );
});
