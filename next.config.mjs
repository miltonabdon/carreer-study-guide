/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/argon2", "bcryptjs"],
  },
};

export default nextConfig;
