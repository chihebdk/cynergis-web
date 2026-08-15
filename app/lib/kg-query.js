/* ============================================================
   Cynergis — knowledge-graph query layer (D-066/D-068).
   The UI never reads graph internals: a surface is a saved query
   over window.__KG__ (the derived knowledge base, kg/generate.js),
   and telemetry is dereferenced through the graph's observed_via
   pointers into window.__TELEMETRY__ (the demo stand-in for the
   external DataSource stores — doctrine 1, ascent-ontology.md §6).
   ============================================================ */
import './kg-graph.gen';
import './kg-telemetry.gen';

const g = () => (typeof window !== 'undefined' ? window.__KG__ : null);

export function kgNode(localId) {
  const G = g(); if (!G) return null;
  return G.nodes.find(n => n.localId === localId) || null;
}
export function kgOut(fullId, type) {
  const G = g(); if (!G) return [];
  return G.edges.filter(e => e.from === fullId && (!type || e.type === type));
}
export function kgIn(fullId, type) {
  const G = g(); if (!G) return [];
  return G.edges.filter(e => e.to === fullId && (!type || e.type === type));
}
export function kgById(fullId) {
  const G = g(); if (!G) return null;
  return G.nodes.find(n => n.id === fullId) || null;
}
/* Follow an observed_via pointer: query string -> the external store. */
export function telemetry(query) {
  return (typeof window !== 'undefined' && window.__TELEMETRY__ && window.__TELEMETRY__[query]) || null;
}

/* ---- Saved query: the Operate SLO surface ------------------
   Definitions, targets, owners and relations come from Slo nodes
   + typed edges; the series comes from the DataSource the node's
   observed_via edge points at. Returns the view model the surface
   renders — same shape the hand-seed used, now derived. */
export function kgSlos() {
  const G = g(); if (!G) return null;
  return G.nodes.filter(n => n.type === 'Slo').map(n => {
    const p = n.props || {};
    const obs = kgOut(n.id, 'observed_via')[0];
    const series = obs ? telemetry(obs.props && obs.props.query) : null;
    const rel = [];
    for (const e of kgOut(n.id, 'signals')) {
      const t = kgById(e.to); if (t) rel.push({ kind: 'incident', id: t.localId, label: `${t.localId} — ${t.label}` });
    }
    for (const e of kgIn(n.id, 'triggered_by')) {
      const t = kgById(e.from); if (t) rel.push({ kind: 'runbook', id: t.localId, label: `${t.localId} — ${t.label}` });
    }
    for (const e of kgIn(n.id, 'approves')) {
      const t = kgById(e.from); if (t) rel.push({ kind: 'approval', id: t.localId, label: `${t.localId} — ${t.label}` });
    }
    const measures = kgOut(n.id, 'measures')[0];
    return {
      id: n.localId, name: n.label,
      group: p.group, unit: p.unit, current: p.current, target: p.target, targetV: p.targetV,
      state: p.state, budget: p.budget, owner: p.owner, window: p.window, note: p.note, asOf: p.asOf,
      ref: measures ? (kgById(measures.to) || {}).localId : undefined,
      history: (series && series.series) || [],
      related: rel.length ? rel : undefined,
      _kg: true,
    };
  });
}

if (typeof window !== 'undefined') window.KG = { kgNode, kgOut, kgIn, kgById, telemetry, kgSlos };
