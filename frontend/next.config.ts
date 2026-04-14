import type { NextConfig } from "next";

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
    ],
    // Optimize images
    formats: ["image/avif", "image/webp"],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
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
};

export default nextConfig;
