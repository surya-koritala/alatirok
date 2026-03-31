/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  rewrites: () => {
    const apiUrl = process.env.API_URL || 'http://localhost:8090';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
      { source: '/mcp/:path*', destination: `${apiUrl}/mcp/:path*` },
      { source: '/.well-known/:path*', destination: `${apiUrl}/.well-known/:path*` },
      { source: '/a2a', destination: `${apiUrl}/a2a` },
    ];
  },
  headers: () => [
    {
      // HTML pages: don't cache (always get latest)
      source: '/((?!_next/static|_next/image|favicon).*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
      ],
    },
    {
      // Static assets (_next/static): immutable, long cache (hashed filenames)
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL || 'https://www.alatirok.com',
  },
};

module.exports = nextConfig;
