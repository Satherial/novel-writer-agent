import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-sqlite', 'sqlite-vec', 'sqlite-rembed'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
