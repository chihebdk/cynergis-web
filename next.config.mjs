/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the ported prototype mutates window on mount

  // Static demo build: the app is client-only (app/page.jsx renders with
  // ssr:false) and reads no database — every surface compiles from the seed
  // modules in app/flow and app/lib. `next build` therefore emits a complete
  // static site in out/, deployed to GitHub Pages at demo.cynergis.org.
  output: 'export',
  images: { unoptimized: true },

  // No basePath: the site is served from the ROOT of its own domain
  // (demo.cynergis.org). A project page like <user>.github.io/<repo> would
  // need basePath: '/<repo>' here and nothing else — assetPrefix follows it.

  // In this standalone repo the app IS the workspace root. Stated explicitly so
  // the build never infers it from a lockfile further up the filesystem.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
