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

/* View models are memoized: surfaces mutate them in memory (pause
   toggles etc., a reload restores them) exactly like the hand-seeds
   did — a fresh rebuild each render would lose those mutations. */
const _cache = {};

/* ---- Saved query: the Operate SLO surface ------------------
   Definitions, targets, owners and relations come from Slo nodes
   + typed edges; the series comes from the DataSource the node's
   observed_via edge points at. Returns the view model the surface
   renders — same shape the hand-seed used, now derived. */
export function kgSlos() {
  const G = g(); if (!G) return null;
  if (_cache.slos) return _cache.slos;
  _cache.slos = G.nodes.filter(n => n.type === 'Slo').map(n => {
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
  return _cache.slos;
}

/* ---- Saved query: the Operate fleet surface (D-070) --------
   The fleet IS what the Operator governs: the rows are the
   governs_runtime edge targets, in edge order. Profiles, health,
   tier (canonical, D-067) and controls are node props; live
   telemetry + trend arrive through observed_via → DS-OBS; the
   related links are the guards / impacts / Runbook-traces_to
   edges pointing at the node. */
export function kgFleet() {
  const G = g(); if (!G) return null;
  if (_cache.fleet) return _cache.fleet;
  const op = kgNode('AGT-OPERATOR'); if (!op) return null;
  _cache.fleet = kgOut(op.id, 'governs_runtime').map(e => {
    const n = kgById(e.to); if (!n) return null;
    const p = n.props || {};
    const obs = kgOut(n.id, 'observed_via').find(x => x.props && String(x.props.query).startsWith('fleet/'));
    const t = obs ? telemetry(obs.props.query) : null;
    const rel = [];
    if (n.type === 'Agent') rel.push({ kind: 'agent', id: n.localId, label: 'Agent page — knowledge · toolset · skills · evals' });
    for (const x of kgIn(n.id, 'guards')) { const s = kgById(x.from); if (s) rel.push({ kind: 'slo', id: s.localId, label: `${s.localId} — ${s.label}` }); }
    for (const x of kgIn(n.id, 'impacts')) { const i = kgById(x.from); if (i) rel.push({ kind: 'incident', id: i.localId, label: `${i.localId} — ${i.label}` }); }
    for (const x of kgIn(n.id, 'traces_to')) { const r = kgById(x.from); if (r && r.type === 'Runbook') rel.push({ kind: 'runbook', id: r.localId, label: `${r.localId} — ${r.label}` }); }
    return {
      id: n.localId, name: n.label, kind: p.opsKind, profile: p.profile, health: p.health,
      tier: p.opsTier, note: p.opsNote, actions: p.actions || [],
      telemetry: (t && t.telemetry) || {}, trend: (t && t.trend) || [], trendLabel: (t && t.trendLabel) || '',
      related: rel.length ? rel : undefined,
      _kg: true,
    };
  }).filter(Boolean);
  return _cache.fleet;
}

/* ---- Saved query: the Operate incidents surface (D-071) ----
   The Incident node IS the curated record of judgment — discovery,
   findings, triage, remediation plan, hypotheses, escalation —
   structured on the node (D-066 §6). The impacted set and the
   matched runbook come from the impacts / remediated_by edges; the
   raw timeline is dereferenced through observed_via → DS-OBS.
   Nested records are shallow-copied so the surface's mutations
   (Apply, escalate) land on the view model, never the graph. */
export function kgIncidents() {
  const G = g(); if (!G) return null;
  if (_cache.incidents) return _cache.incidents;
  _cache.incidents = G.nodes.filter(n => n.type === 'Incident').map(n => {
    const p = n.props || {};
    const impacted = kgOut(n.id, 'impacts').map(e => (kgById(e.to) || {}).localId).filter(Boolean);
    const rbEdge = kgOut(n.id, 'remediated_by')[0];
    const runbook = (p.remediation && p.remediation.runbook) || (rbEdge && (kgById(rbEdge.to) || {}).localId);
    const obs = kgOut(n.id, 'observed_via')[0];
    const timeline = (obs && telemetry(obs.props && obs.props.query)) || [];
    return {
      id: n.localId, title: n.label,
      sev: p.sev, status: p.status, plane: p.plane, opened: p.opened, resolved: p.resolved,
      impact: p.impact, triage: p.triage, followUp: p.followUp,
      discovery: p.discovery, investigation: p.investigation,
      remediation: p.remediation && { ...p.remediation },
      hypotheses: p.hypotheses, escalation: p.escalation && { ...p.escalation },
      impacted, runbook, timeline: [...timeline],
      _kg: true,
    };
  });
  return _cache.incidents;
}

/* ---- Saved query: the Realize outcomes surface (D-072) -----
   An Outcome is the Realize reading of an Envision promise: the
   actualizes edge names the success criterion, sourced_from names
   the Operate SLO that instruments it (the label derives from that
   node; measuredVia covers un-instrumented outcomes), attributed_to
   carries the value shares, and the KPI history dereferences via
   observed_via → DS-OBS. */
export function kgOutcomes() {
  const G = g(); if (!G) return null;
  if (_cache.outcomes) return _cache.outcomes;
  _cache.outcomes = G.nodes.filter(n => n.type === 'Outcome').map(n => {
    const p = n.props || {};
    const scEdge = kgOut(n.id, 'actualizes')[0];
    const sc = scEdge ? (kgById(scEdge.to) || {}).localId : undefined;
    const srcEdge = kgOut(n.id, 'sourced_from')[0];
    const slo = srcEdge ? kgById(srcEdge.to) : null;
    const drivers = kgOut(n.id, 'attributed_to')
      .map(e => ({ id: (kgById(e.to) || {}).localId, share: e.props && e.props.share }))
      .filter(d => d.id);
    const obs = kgOut(n.id, 'observed_via')[0];
    const series = obs ? telemetry(obs.props && obs.props.query) : null;
    return {
      sc, name: n.label,
      baseline: p.baseline, target: p.target, actual: p.actual, unit: p.unit, targetV: p.targetV,
      gapClosed: p.gapClosed, state: p.state, timeToTarget: p.timeToTarget, note: p.note, asOf: p.asOf,
      history: (series && series.series) || [],
      drivers,
      source: slo
        ? { slo: slo.localId, label: `fed by ${slo.localId} — ${slo.label} (Operate)` }
        : { slo: null, label: p.measuredVia || '' },
      _kg: true,
    };
  });
  return _cache.outcomes;
}

/* ---- Saved query: global search (D-073) --------------------
   The shell's search probes the mesh — the product graph plus the
   control-plane graph (org cards, GraphModules, seams). Ranked:
   exact id, id prefix, label substring. */
export function kgSearch(q, limit = 12) {
  const G = g(); if (!G || !q) return [];
  const mesh = (typeof window !== 'undefined' && window.__KGMESH__ && window.__KGMESH__.org) || null;
  const pools = [{ graph: 'product', nodes: G.nodes }].concat(mesh ? [{ graph: 'org', nodes: mesh.nodes }] : []);
  const needle = String(q).trim().toLowerCase();
  const hits = [];
  for (const pool of pools) {
    for (const n of pool.nodes) {
      const lid = String(n.localId).toLowerCase(), lab = String(n.label).toLowerCase();
      const rank = lid === needle ? 0 : lid.startsWith(needle) ? 1 : lab.includes(needle) ? 2 : -1;
      if (rank >= 0) hits.push({ rank, id: n.localId, type: n.type, label: n.label, module: n.module, graph: pool.graph, status: n.status });
    }
  }
  hits.sort((a, b) => a.rank - b.rank);
  // seams live in both a product graph and the control plane — one row each
  const seen = new Set();
  return hits.filter(h => !seen.has(h.id) && seen.add(h.id)).slice(0, limit);
}

/* ---- Saved query: the Operate approvals surface (D-077) ----
   Approval nodes ARE the governance records (temporal, never
   overwritten). The two-way act on this surface is the doctrine-4
   test: deciding stages a CHANGE REQUEST onto the gated write path
   (POST /api/kg-changes → kg/changes/pending.jsonl → kg/apply.js
   routes it into the owning spec → regenerate). The in-memory
   mutation is only the optimistic echo; the durable record arrives
   from the derived KB after apply. */
export function kgApprovals() {
  const G = g(); if (!G) return null;
  if (_cache.approvals) return _cache.approvals;
  _cache.approvals = G.nodes.filter(n => n.type === 'Approval').map(n => {
    const p = n.props || {};
    return {
      id: n.localId, title: n.label,
      kind: p.kind, status: p.status, date: p.date, requestedBy: p.requestedBy,
      approver: p.approver, evidence: p.evidence, decision: p.decision, note: p.note, links: p.links,
      _kg: true,
    };
  });
  return _cache.approvals;
}

/* Stage a change request onto the gated write path (doctrine 4). */
export function stageChange(op, target, payload) {
  return fetch('/api/kg-changes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, target, payload }),
  }).then(r => r.json());
}

if (typeof window !== 'undefined') window.KG = { kgNode, kgOut, kgIn, kgById, telemetry, kgSlos, kgFleet, kgIncidents, kgOutcomes, kgSearch, kgApprovals, stageChange };
