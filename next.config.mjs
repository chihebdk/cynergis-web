/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the ported prototype mutates window on mount
  // Pin the workspace root (several lockfiles exist higher up the tree).
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
