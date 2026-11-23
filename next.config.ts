import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser-test builds independent of an already running local preview.
  distDir: process.env.ROOMIEOS_E2E === "1" ? ".next-e2e" : ".next",
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
