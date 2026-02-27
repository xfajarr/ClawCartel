import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const coopCoep = [
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/", headers: coopCoep },
      { source: "/builder", headers: coopCoep },
      { source: "/builder/(.*)", headers: coopCoep },
    ];
  },
};

export default nextConfig;
