/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-big-calendar"],
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
