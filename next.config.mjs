/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';
import createNextIntlPlugin from 'next-intl/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
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
    // 禁用WASM哈希功能
    config.output.hashFunction = 'md4';
    config.resolve.alias = {
      ...config.resolve.alias
    };
    return config;
  },
}

export default withNextIntl(nextConfig)
