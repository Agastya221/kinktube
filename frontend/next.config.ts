import type { NextConfig } from "next";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getPublicApiImagePattern() {
  try {
    const url = new URL(publicApiUrl);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    return null;
  }
}

const publicApiImagePattern = getPublicApiImagePattern();

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.eporner.com",
      },
      {
        protocol: "https",
        hostname: "static-*.eporner.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      ...(publicApiImagePattern ? [publicApiImagePattern] : []),
    ],
    // Optimize images
    formats: ["image/avif", "image/webp"],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Output standalone for Docker deployment
  output: "standalone",

  // Experimental features
  experimental: {
    // Enable partial prerendering for faster page loads
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/sitemap:path*.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
