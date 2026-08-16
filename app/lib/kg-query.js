/* ============================================================
   The gated write path's client (doctrine 4 — D-066 §1.4).
   A two-way UI act never writes the graph or a spec directly: it
   stages a CHANGE REQUEST via this helper; `node kg/apply.js`
   routes it into the owning spec, regenerates, and the change
   returns to the UI from the derived knowledge base.
   (The v3 read-side view models retired with WealthGrow — D-102.
   Meridian surfaces read `window.__KG4__` directly.)
   ============================================================ */
export function stageChange(op, target, payload) {
  return fetch('/api/kg-changes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, target, payload }),
  }).then(r => r.json());
}
