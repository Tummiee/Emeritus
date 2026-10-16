import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    maxWorkers: 2,
    include: ["lib/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 60000,
  },
});
