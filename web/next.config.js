/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  rewrites: () => {
    const apiUrl = process.env.API_URL || 'http://localhost:8090';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${apiUrl}/uploads/:path*` },
    ];
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.SITE_URL || 'https://www.alatirok.com',
  },
};

module.exports = nextConfig;
