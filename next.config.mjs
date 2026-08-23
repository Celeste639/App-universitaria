/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-big-calendar"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
