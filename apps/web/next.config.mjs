/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bayanserve/ui', '@bayanserve/db', '@bayanserve/types'],
};

export default nextConfig;
