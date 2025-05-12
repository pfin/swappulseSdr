/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Server Actions are enabled by default in Next.js 14+
  images: {
    domains: ['pddata.dtcc.com'],
  },
}

module.exports = nextConfig