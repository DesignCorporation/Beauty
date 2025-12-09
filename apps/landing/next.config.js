/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    domains: ['beauty.designcorp.eu'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  async redirects() {
    return [
      {
        source: '/demo',
        destination: 'https://salon.beauty.designcorp.eu',
        permanent: false,
      },
      {
        source: '/app',
        destination: 'https://salon.beauty.designcorp.eu',
        permanent: false,
      },
      {
        source: '/admin',
        destination: 'https://admin.beauty.designcorp.eu',
        permanent: false,
      },
    ]
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

}

export default nextConfig
