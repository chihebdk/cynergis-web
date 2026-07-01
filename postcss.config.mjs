// Tailwind v4 is used ONLY to emit the utility classes the embedded @flowai/canvas
// island needs. Preflight (the global reset) is deliberately excluded in
// theme/feature/flow-canvas.css so the Ascent design system is untouched.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
