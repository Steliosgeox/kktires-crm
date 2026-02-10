import type { NextConfig } from "next";

const isVercel = process.env.VERCEL === '1';

const nextConfig: NextConfig = {
  // Standalone output is useful for Docker/self-hosting, but not needed on Vercel.
  ...(isVercel ? {} : { output: 'standalone' }),

  // Image optimization config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile avatars
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },

  // Security headers
  async headers() {
    const securityHeaders = [
      // Only set HSTS in production over HTTPS.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload',
            },
          ]
        : []),
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
