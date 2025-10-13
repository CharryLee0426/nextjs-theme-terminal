import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Since you're using next-mdx-remote, you don't need @next/mdx configuration
  // next-mdx-remote handles MDX processing independently
  
  // Remove experimental.mdxRs as it conflicts with next-mdx-remote
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Add any other Next.js configurations you need
  typescript: {
    // During builds, ignore TypeScript errors if needed
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
