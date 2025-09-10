import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    BUILD_TIMESTAMP: process.env.BUILD_TIMESTAMP,
    VERSION_DEPLOYED: process.env.VERSION_DEPLOYED,
    DEPLOYMENT_URL: process.env.DEPLOYMENT_URL,
    BUILD_DATE: process.env.BUILD_DATE,
    COMMIT_HASH: process.env.COMMIT_HASH,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.tina.io',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'adamcogan.com',
        port: '',
      },
    ],
  },
  
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Frame-Options',
        value: 'SAMEORIGIN',
      },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self'; connect-src 'self' https://content.tinajs.io https://assets.tina.io;",
      },
    ];

    // Headers CORS sécurisés uniquement pour l'admin Tina
    const adminCorsHeaders = [
      {
        key: 'Access-Control-Allow-Origin',
        value: 'https://app.tina.io', // Seulement Tina Cloud
      },
      {
        key: 'Access-Control-Allow-Methods',
        value: 'GET, POST, PUT, DELETE, OPTIONS',
      },
      {
        key: 'Access-Control-Allow-Headers',
        value: 'Content-Type, Authorization',
      },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/admin/(.*)',
        headers: adminCorsHeaders,
      },
    ];
  },
  
  async rewrites() {
    return [
      {
        source: '/admin',
        destination: '/admin/index.html',
      },
      { source: '/_next/:path*', destination: '/_next/:path*' },
      { source: '/.well-known/:path*', destination: '/.well-known/:path*' },
    ];
  },
};

export default nextConfig