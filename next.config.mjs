/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-big-calendar"],
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
