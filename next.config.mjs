/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-big-calendar"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
