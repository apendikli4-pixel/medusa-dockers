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
}

module.exports = nextConfig
