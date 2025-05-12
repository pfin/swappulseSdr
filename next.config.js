/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['pddata.dtcc.com'],
  },
  // experimental options removed as Server Actions are enabled by default in Next.js 14+
}

module.exports = nextConfig