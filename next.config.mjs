import path from "node:path";
import { fileURLToPath } from "node:url";
import { configuredImageOrigins } from "./lib/image-policy.mjs";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const imageOrigins = configuredImageOrigins();
/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  env: { NEXT_PUBLIC_IMAGE_ORIGINS: JSON.stringify(imageOrigins) },
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "11mb",
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 85],
    remotePatterns: imageOrigins.map((origin) => {
      const url = new URL(origin);
      return {
        protocol: url.protocol.slice(0, -1),
        hostname: url.hostname,
        port: url.port,
      };
    }),
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default nextConfig;
