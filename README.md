# Cynergis / Onthos — web application

The demo site, live at **https://demo.cynergis.org**. A standalone repo carved out of the
`Ascent` monorepo with its history intact (`git subtree split --prefix=cynergis`): this repo
holds **only** the Next.js app — no product-definition documents, no knowledge-graph
generators, no promotional material.

It is a **fully static site**. There is no database and no server: the app renders entirely in
the browser (`app/page.jsx` imports the root with `ssr: false`) and every surface compiles from
the seed modules in `app/flow/` and `app/lib/`. `next build` emits a complete site in `out/`.

## Quick start

```bash
npm ci           # exact install from the lockfile (what CI runs)
npm run dev      # http://localhost:3000
npm run audit    # the design-packet coherence gate — exit 0 = publishable
npm run build    # emits the static site into out/
npm run preview  # serve out/ as the deployed site behaves
```

Node **20.9 or newer** (CI pins the version in `.nvmrc`). Note there is no `npm start`:
`next start` runs a server, which a static export does not have. Use `npm run preview`.

## CI/CD

`.github/workflows/ci.yml` runs on every push to `main`, every pull request, and on demand.
Pull requests run the gates only; `main` additionally deploys.

| Step | Command | Gate |
|---|---|---|
| Install | `npm ci` | lockfile must be in sync |
| Design audit | `npm run audit` | every id-join resolves both ways; every lifecycle stage reaches a terminal; every transition is tested |
| Build | `npm run build` | the static site compiles into `out/` |
| Verify artifact | — | `index.html`, `_next/` and a correct `CNAME` must be present |
| Deploy | `actions/deploy-pages` | `main` only |

### Deployment — GitHub Pages on a custom domain

`public/CNAME` holds `demo.cynergis.org` and `public/.nojekyll` stops Jekyll from stripping
`_next/`; both are copied into `out/` by the build, and the workflow asserts they are there.
Because the site is served from the root of its own domain, `next.config.mjs` needs **no**
`basePath`. (A project page at `<user>.github.io/<repo>` would need `basePath: '/<repo>'` and
nothing else.)

Repository settings to match, once: **Settings → Pages → Source = GitHub Actions**, custom
domain `demo.cynergis.org`, *Enforce HTTPS* on. DNS: a `CNAME` record for `demo` pointing at
`<user>.github.io`.

### What "no server" costs

One thing: the gated write path (D-077). The governance acts in Operate, Realize and the
Meridian console — approve/reject, apply or escalate an incident, record a decision or a
quarterly review — used to POST a change request to `/api/kg-changes`, which appended to
`kg/changes/pending.jsonl` for `kg/apply.js` to route into the owning spec. That route lived in
the monorepo beside `kg/`, so it could never work here; it has been removed from this repo and
remains in `Ascent`. `stageChange()` now resolves with an explanatory `error` instead of
rejecting, so each surface keeps its optimistic echo and shows a warning line rather than
claiming a durable write. In the target state (transformation plan, phase 5) the intake is a
**PR pipeline**, not an endpoint — so nothing about this demo is waiting on a server.

### Dependencies on the monorepo

None. The app is self-contained: its own lockfile, its own vendored `@flowai` tarballs (local
`file:` dependencies — they must stay committed, `npm ci` needs them), and no path escaping the
repo root.

---

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
