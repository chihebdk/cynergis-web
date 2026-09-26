/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the ported prototype mutates window on mount
  // In this standalone repo the app IS the workspace root. Stated explicitly so
  // the build never infers it from a lockfile further up the filesystem.
  // (In the Ascent monorepo this pointed one level up to reach sibling packages;
  // the @flowai packages are vendored tarballs here, resolved from node_modules.)
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
