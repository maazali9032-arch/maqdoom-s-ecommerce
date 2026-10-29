import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Development only: let phones on the same Wi-Fi open the dev server (e.g. http://192.168.0.105:3000).
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
