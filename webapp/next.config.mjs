/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Ensure path resolution works correctly
    appDir: true,
  },
};

export default nextConfig;
