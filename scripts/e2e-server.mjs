import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
const product = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "Test phone",
  slug: "test-phone",
  description: "Product used by local browser tests",
  price: 10000,
  compare_at_price: null,
  image_url: "/logo2.png",
  featured: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  categories: { id: "c", name: "Phones", slug: "phones" },
  brands: { name: "Apple" },
  brand_slug: "apple",
  inventory: { quantity: 50, reserved: 0 },
  rating: 4,
  review_count: 1,
};
const server = http.createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  );
  if (request.method === "OPTIONS") {
    response.end();
    return;
  }
  const path = new URL(request.url, "http://localhost").pathname;
  if (path.includes("consume_rate_limit")) {
    response.end("true");
    return;
  }
  if (path.includes("storefront_catalog")) {
    response.setHeader("Content-Range", "0-0/1");
    response.end(
      JSON.stringify(
        request.headers.accept?.includes("vnd.pgrst.object")
          ? product
          : [product],
      ),
    );
    return;
  }
  if (path.includes("catalog_facets")) {
    response.end(
      JSON.stringify({
        maxPrice: 10000,
        brands: [{ name: "Apple", slug: "apple" }],
        categories: [{ id: "c", name: "Phones", slug: "phones", count: 1 }],
      }),
    );
    return;
  }
  response.end("[]");
});
server.listen(54325, "127.0.0.1", () => {
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--webpack",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3100",
    ],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        NEXT_DIST_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54325",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-only",
        SUPABASE_SERVICE_ROLE_KEY: "test-only",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      },
    },
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      if (process.platform === "win32")
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          windowsHide: true,
        });
      else child.kill();
      server.close();
      process.exit();
    });
  child.on("exit", (code) => {
    server.close();
    process.exit(code ?? 0);
  });
});
