/** @type {import('next').NextConfig} */
import path from "path";

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/:locale/gtfs.sqlite',
        destination: '/gtfs.sqlite',
      },
    ];
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-intl/config": path.resolve("./next-intl.config.ts"),
    };
    return config;
  },
}

export default nextConfig
