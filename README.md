# Cynergis (Next.js)

A Next.js (App Router) port of the `design_handoff_cynergis` static prototype — the product
lifecycle management app for **WealthGrow Bank** (worked product: *Fraud Decisioning*).

It recreates the handoff faithfully: the OKLCH design system, the
Organization → Portfolios → Products navigation, the six-phase product lifecycle
(Envision → Realize), the Envision/Discover/Design surfaces, the prioritization 2×2 + WSJF
model, **universal traceability** (every entity id is a clickable `<Ref>` chip that opens an
`EntityModal` showing the complete bidirectional relationship graph), Sources & Evidence + the
Knowledge graph, and Mermaid diagrams (value-stream / OKR tree / context / workflow).

## Run

```bash
npm install
npm run dev      # http://localhost:3000 (3001 if 3000 is taken)
```

`npm run build && npm start` for a production build.

## How the port works

The original prototype ran React 18 + `@babel/standalone` in the browser, with files sharing
state through `window` globals. This port keeps that runtime model intact but serves it through
Next.js as real ES modules:

- **`app/page.jsx`** renders `app/CynergisApp.jsx` via `next/dynamic` with `ssr: false` — the app
  is fully client-side (it reads/writes `window`), so it never renders on the server.
- **`app/CynergisApp.jsx`** imports the ported modules in dependency order (data → trace engine →
  screens → root) and provides `window.mermaid` from the npm `mermaid` package.
- **`app/lib/`** holds the ported data (`*-data.js` → `window.__PRD__` / `window.__ARCH__` /
  `window.ORG`) and components (`trace-core`, `trace-details`, `screens-evidence`,
  `screens-disdes`, `org-prio`, `org-envision`, `org-app`). Each module keeps the prototype's
  `window`-sharing; the only edits are a `react` import, ordering imports, and a few
  `const {…} = window` bindings.
- **`app/theme/`** holds the design system: `styles.css` (the entry that `@import`s
  `tokens/*` + `styles/*`) plus the feature CSS in `feature/` (`ascent`, `evidence`, `disdes`,
  `trace`, and `inline.css` extracted from the handoff's `<head>`). All imported globally in
  `app/layout.jsx`.

## Next steps (incremental hardening)

This is a faithful first cut. Natural follow-ups: convert `window`-sharing to explicit ES
imports + typed data modules (TypeScript), replace the inline icon sets with a shared module,
and move routing to real Next.js routes (`/`, `/portfolio/[id]`, `/product/[id]/[phase]`).
