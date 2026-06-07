/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Server-only env vars (not exposed to client)
  env: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://res.cloudinary.com https://medusa-public-images.s3.eu-west-1.amazonaws.com; connect-src 'self' https://api.141.98.48.155.sslip.io http://localhost:9000 http://localhost:8000 wss://*; font-src 'self' data:;",
          },
        ],
      },
    ];
  },}

module.exports = nextConfig
