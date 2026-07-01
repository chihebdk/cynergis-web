import path from 'node:path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // the ported prototype mutates window on mount
  // Root spans the Ascent dir so it can resolve the sibling flowai/ packages
  // (@flowai/canvas is a file: dep symlinked to ../flowai/flowai/packages/canvas).
  // Root spans the Ascent dir so it can resolve the sibling flowai/ packages.
  turbopack: { root: path.join(import.meta.dirname, '..') },
};

export default nextConfig;
