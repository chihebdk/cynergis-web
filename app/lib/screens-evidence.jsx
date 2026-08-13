import React from 'react';
import { ReactFlow, ReactFlowProvider, Handle, Position, Controls, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './trace-core';
/* ============================================================
   Cynergis — PRODUCT-scoped cross-cutting surfaces (org app).
   Driven by window.__PRD__ (the product's authored PRD), these are
   two saved queries over the same product knowledge graph:
     • ProductSources — Sources & Evidence registry + coverage + change feed
     • ProductGraph    — the knowledge-graph explorer (nodes · edges · provenance)
   Everything is derived from the PRD + a product evidence registry —
   nothing invented at render time.
   ============================================================ */

/* ---- self-contained icon set (babel scripts don't share scope) ---- */
const VI = {
  sources: <path d="M3 3.5h10v9H3zM3 6h10M6 3.5v9"/>,
  metric:  <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0M8 8l2.6-2.2"/>,
  user:    <path d="M8 8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2M3 13.5c.5-2.4 2.5-4 5-4s4.5 1.6 5 4"/>,
  journey: <path d="M3 13s0-4 5-4 5-4 5-4M3 6.5h.01M13 9.5h.01"/>,
  usecase: <path d="M8 2 2.8 4.8v6.4L8 14l5.2-2.8V4.8z M2.8 4.8 8 7.6l5.2-2.8M8 7.6V14"/>,
  req:     <path d="M3.5 8.5l3 3 6-6.5"/>,
  dep:     <path d="M6.5 9.5 9.5 6.5M7 4.5l.8-.8a2.4 2.4 0 0 1 3.5 3.5l-.8.8M9 11.5l-.8.8a2.4 2.4 0 0 1-3.5-3.5l.8-.8"/>,
  policy:  <path d="M8 2.2 3 4.2v3.3c0 3 2.1 5 5 6.3 2.9-1.3 5-3.3 5-6.3V4.2zM6 8l1.5 1.5L10.5 6.5"/>,
  check:   <path d="M3.5 8.5l3 3 6-6.5"/>,
  change:  <path d="M3 7a5 5 0 0 1 8.5-2.5M13 4v3h-3M13 9a5 5 0 0 1-8.5 2.5M3 12V9h3"/>,
  warn:    <path d="M8 2.5 14 13H2zM8 6.5v3M8 11h.01"/>,
  arrow:   <path d="M5 3l5 5-5 5"/>,
  x:       <path d="M4 4l8 8M12 4l-8 8"/>,
  graph:   <path d="M4 4.5h3.5v3.5H4zM10 8h2.5v3.5H10zM5.7 8v2.2a1 1 0 0 0 1 1H10"/>,
  doc:     <path d="M4 2.5h5l3 3v8H4zM9 2.5V5.5h3"/>,
  interview:<path d="M3 3.5h10v7H7l-3 2.5V10.5H3z"/>,
  export:  <path d="M8 10V3M5.5 5.5 8 3l2.5 2.5M3.5 11.5v1a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1"/>,
  link:    <path d="M6.5 9.5 9.5 6.5M7 4.5l.8-.8a2.4 2.4 0 0 1 3.5 3.5l-.8.8M9 11.5l-.8.8a2.4 2.4 0 0 1-3.5-3.5l.8-.8"/>,
  lock:    <path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z"/>,
  expand:  <path d="M9.5 2.5H13.5V6.5M13.5 2.5 9 7M6.5 13.5H2.5V9.5M2.5 13.5 7 9"/>,
  collapse:<path d="M13 3 9.5 6.5M9.5 6.5V3.5M9.5 6.5H13M3 13 6.5 9.5M6.5 9.5V13M6.5 9.5H3"/>,
};
function VIco({ k, w = 16 }) {
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{VI[k] || VI.doc}</svg>;
}
const VSRC_ICON = { interview: 'interview', doc: 'doc', dependency: 'dep', telemetry: 'graph', regulatory: 'policy' };

/* ---- node-type vocabulary (shared by both views) ----
   Covers EVERY entity in the PRD + Architecture so the graph is the
   complete, single source of truth (same data the trace modal uses). */
const VTYPE = {
  src:        { label: 'Source',          ico: 'sources',  c: 'oklch(0.50 0.02 260)' },
  metric:     { label: 'Success metric',  ico: 'metric',   c: 'oklch(0.55 0.16 265)' },
  objective:  { label: 'Objective',       ico: 'metric',   c: 'oklch(0.48 0.13 292)' },
  kr:         { label: 'Key result',      ico: 'check',    c: 'oklch(0.58 0.11 300)' },
  persona:    { label: 'Persona',         ico: 'user',     c: 'oklch(0.55 0.10 195)' },
  stakeholder:{ label: 'Stakeholder',     ico: 'user',     c: 'oklch(0.58 0.07 205)' },
  journey:    { label: 'Journey',         ico: 'journey',  c: 'oklch(0.55 0.15 310)' },
  usecase:    { label: 'Use case',        ico: 'usecase',  c: 'oklch(0.52 0.15 255)' },
  req:        { label: 'Requirement',     ico: 'req',      c: 'oklch(0.58 0.12 75)'  },
  nfr:        { label: 'Non-functional',  ico: 'req',      c: 'oklch(0.56 0.10 100)' },
  risk:       { label: 'Risk',            ico: 'warn',     c: 'oklch(0.58 0.16 30)'  },
  dep:        { label: 'Dependency',      ico: 'dep',      c: 'oklch(0.52 0.12 230)' },
  integration:{ label: 'Integration',    ico: 'link',     c: 'oklch(0.55 0.10 215)' },
  policy:     { label: 'Policy',          ico: 'policy',   c: 'oklch(0.50 0.14 15)'  },
  governance: { label: 'Governance',      ico: 'policy',   c: 'oklch(0.52 0.10 40)'  },
  security:   { label: 'Security',        ico: 'lock',     c: 'oklch(0.48 0.12 20)'  },
  adr:        { label: 'Decision (ADR)',  ico: 'check',    c: 'oklch(0.50 0.13 285)' },
  component:  { label: 'Component',       ico: 'graph',    c: 'oklch(0.52 0.13 268)' },
  api:        { label: 'API',             ico: 'export',   c: 'oklch(0.55 0.09 250)' },
  resource:   { label: 'Resource',        ico: 'doc',      c: 'oklch(0.52 0.06 240)' },
};

/* ============================================================
   Product evidence registry — the sources behind this PRD, and the
   citations that bind each persona/journey/use-case/metric to them.
   Authored once per product; here, the Fraud Decisioning evidence base.
   ============================================================ */
const PRD_EVIDENCE = {
  sources: [
    { id: 'S1', type: 'doc',        name: 'Fraud incident post-mortems (FY25)', origin: 'Risk Ops · 28 reports', by: 'Fraud Ops', ingestedAt: '2026-02-14', status: 'current',
      summary: 'A year of fraud-loss events: attack patterns, detection lag, and false-decline complaints.' },
    { id: 'S2', type: 'telemetry',  name: 'Authorization telemetry stream',     origin: 'Card platform · event bus', by: 'Platform', ingestedAt: '2026-02-14', status: 'current',
      summary: 'Real-time authorization feed and feature lineage; the latency and volume baseline.' },
    { id: 'S3', type: 'interview',  name: 'Fraud analyst shadowing',            origin: '9 sessions', by: 'Discovery', ingestedAt: '2026-02-22', status: 'current',
      summary: 'Analyst case-triage workflow, tooling pain, and where human judgement is essential.' },
    { id: 'S4', type: 'interview',  name: 'Cardholder research interviews',     origin: '14 sessions', by: 'Discovery', ingestedAt: '2026-02-18', status: 'current',
      summary: 'How cardholders experience blocks, false declines, and alerts — desirability evidence.' },
    { id: 'S5', type: 'regulatory', name: 'Model risk & governance review',     origin: 'Model Risk · SR 11-7', by: 'Regina Foss', ingestedAt: '2026-03-02', status: 'current',
      summary: 'Validation, explainability, and the supervised-autonomy promotion bar.' },
    { id: 'S6', type: 'doc',        name: 'Voice-of-customer survey (v1)',      origin: 'CX · 1.2k responses', by: 'CX Research', ingestedAt: '2026-01-22', status: 'superseded', supersededBy: 'S4',
      summary: 'Early read on false-decline frustration; superseded by the deeper cardholder interviews (S4).' },
  ],
  /* citation map — PRD entity id → source ids that evidence it */
  cites: {
    SC1: ['S1'], SC2: ['S1', 'S4'], SC3: ['S2'], SC4: ['S2'], SC5: ['S4'],
    P1: ['S4'], P2: ['S3'], P3: ['S1'], P4: ['S5'],
    J1: ['S4'], J2: ['S3'], J3: ['S5'],
    UC1: ['S1', 'S2'], UC2: ['S1', 'S3'], UC3: ['S3'],
    // UC4 (step-up auth) intentionally uncited → surfaces as `assumed`
    D1: ['S2'], D2: ['S2'], D3: ['S2'],
  },
};

/* ============================================================
   Build the product knowledge graph from the SHARED trace index
   (window.buildTraceIndex) — every PRD + Architecture entity and
   every trace edge — then layer the evidence sources on top.
   This is the single source of truth the trace modal also uses.
   ============================================================ */
const VKIND2TYPE = { sc: 'metric', fr: 'req', dependency: 'dep' };
const V_INDEX_KINDS = ['sc', 'objective', 'kr', 'persona', 'stakeholder', 'journey', 'usecase', 'fr', 'nfr', 'risk', 'dependency', 'integration', 'policy', 'governance', 'security', 'adr', 'component', 'api', 'resource'];
const V_EVIDENCEABLE = ['metric', 'persona', 'journey', 'usecase'];

function prdGraph(prd) {
  const ARCH = window.__ARCH__;
  const idx = window.buildTraceIndex ? window.buildTraceIndex(prd, ARCH) : null;
  const nodes = [];
  const edges = [];
  const byId = {};
  const cites = PRD_EVIDENCE.cites;
  const N = (id, type, label, extra) => {
    if (byId[id]) return byId[id];
    const n = { id, type, label, sources: cites[id] || [], ...(extra || {}) };
    byId[id] = n; nodes.push(n); return n;
  };
  const E = (from, to, fwd, rev, dash) => {
    if (byId[from] && byId[to] && from !== to && !edges.some(e => e.from === from && e.to === to)) edges.push({ from, to, fwd, rev, dash: !!dash });
  };

  if (idx) {
    V_INDEX_KINDS.forEach(k => idx.all(k).forEach(rec => N(rec.id, VKIND2TYPE[k] || k, rec.label, { data: rec.data, sub: rec.sub })));
    idx.edges.forEach(e => E(e.from, e.to, e.fwd, e.rev, false));
  }

  // source nodes — every referenced source plus the registry — and evidence edges
  const srcIds = new Set();
  nodes.slice().forEach(n => (n.sources || []).forEach(s => srcIds.add(s)));
  PRD_EVIDENCE.sources.forEach(s => srcIds.add(s.id));
  srcIds.forEach(sid => { const s = sourceById(sid); if (s) N(sid, 'src', s.name, { stype: s.type, status: s.status, origin: s.origin, summary: s.summary, supersededBy: s.supersededBy }); });
  nodes.slice().forEach(n => (n.sources || []).forEach(s => E(n.id, s, 'evidenced by', 'evidences', true)));

  return { nodes, edges, byId };
}
function sourceById(id) { return PRD_EVIDENCE.sources.find(s => s.id === id) || null; }
function neighborsOf(g, id) {
  const out = [];
  g.edges.forEach(e => {
    if (e.from === id) out.push({ id: e.to, label: e.fwd, dir: 'out' });
    else if (e.to === id) out.push({ id: e.from, label: e.rev, dir: 'in' });
  });
  return out;
}

/* ---- small KPI tile (matches asc-kpi markup) ---- */
function VKpi({ label, value, meta }) {
  return <div className="asc-kpi"><div className="l">{label}</div><div className="v">{value}</div><div className="m">{meta}</div></div>;
}

/* ---- empty state for products without a PRD ---- */
function VEmpty({ title }) {
  return (
    <div className="env-empty">
      <div className="env-empty-ic"><VIco k="lock" w={20} /></div>
      <div className="env-empty-t">{title} — no product knowledge yet</div>
      <div className="env-empty-s">This product does not yet carry a Studio PRD, so there are no sources or graph nodes to show. The knowledge graph is populated as the product is authored in the Product Studio.</div>
    </div>
  );
}

/* ============================================================
   1 · SOURCES & EVIDENCE  (product-scoped)
   ============================================================ */
function ProductSources({ product, prd }) {
  if (!prd) return <div className="asc-page"><div className="asc-page-head"><div><div className="asc-eyebrow"><VIco k="sources" w={12} /> Product · Cross-cutting</div><h1 className="asc-page-title">Sources &amp; Evidence</h1></div></div><VEmpty title="Sources & Evidence" /></div>;

  const g = React.useMemo(() => prdGraph(prd), [prd]);
  const usedSrc = g.nodes.filter(n => n.type === 'src');
  const producedBy = (sid) => g.nodes.filter(n => n.type !== 'src' && (n.sources || []).includes(sid)).map(n => n.id);

  const groups = [
    { type: 'metric',  title: 'Success metrics' },
    { type: 'persona', title: 'Personas' },
    { type: 'journey', title: 'Journeys' },
    { type: 'usecase', title: 'Use cases' },
  ].map(grp => ({ ...grp, items: g.nodes.filter(n => n.type === grp.type) })).filter(grp => grp.items.length);

  const evidenceable = g.nodes.filter(n => ['metric', 'persona', 'journey', 'usecase'].includes(n.type));
  const assumed = evidenceable.filter(n => !(n.sources && n.sources.length));
  const coveragePct = evidenceable.length ? Math.round((evidenceable.length - assumed.length) / evidenceable.length * 100) : 100;
  const itemsProduced = usedSrc.reduce((acc, s) => acc + producedBy(s.id).length, 0);

  // derived change feed (straight from the registry — honest)
  const feed = [];
  usedSrc.slice().sort((a, b) => (sourceById(b.id)?.ingestedAt || '').localeCompare(sourceById(a.id)?.ingestedAt || '')).forEach(s => {
    const src = sourceById(s.id); const prod = producedBy(s.id);
    if (src.status === 'superseded') feed.push({ action: 'supersede', at: src.ingestedAt, by: src.by, fromSource: s.id, target: src.name, note: `Superseded by ${src.supersededBy} — kept, never deleted.`, reason: 'new-evidence' });
    feed.push({ action: 'add', at: src.ingestedAt, by: src.by, fromSource: s.id, target: prod.length ? prod.join(' · ') : src.name, note: src.summary, reason: 'ingest' });
  });
  assumed.forEach(n => feed.push({ action: 'flag', at: '—', by: 'Atlas', target: `${n.id} · ${n.label}`, note: 'No source cited — flagged assumed; must be evidenced or dropped before the gate.', reason: 'coverage' }));

  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><VIco k="sources" w={12} /> Product · {product.name} · Cross-cutting</div>
          <h1 className="asc-page-title">Sources &amp; Evidence</h1>
          <p className="asc-page-sub">Every persona, metric, journey and use case in this product traces back to a source here — or is flagged <span className="asc-assumed">assumed</span>. Sources are superseded, never deleted; the change feed is the audit trail.</p>
        </div>
        <div className="asc-head-actions">
          <button className="asc-btn"><VIco k="export" w={14} /> Export evidence pack</button>
          <button className="asc-btn accent"><VIco k="sources" w={14} /> Ingest source</button>
        </div>
      </div>

      <div className="asc-kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <VKpi label="Sources" value={usedSrc.length} meta={`${usedSrc.filter(s => s.status !== 'superseded').length} current · ${usedSrc.filter(s => s.status === 'superseded').length} superseded`} />
        <VKpi label="Items produced" value={itemsProduced} meta="extracted & cited" />
        <VKpi label="Evidence coverage" value={coveragePct + '%'} meta={`${assumed.length} assumed item${assumed.length === 1 ? '' : 's'}`} />
        <VKpi label="Graph items" value={evidenceable.length} meta="metrics · personas · journeys · use cases" />
      </div>

      {/* coverage matrix */}
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><VIco k="check" w={15} /> Evidence coverage</div>
          <div className="asc-sec-sub">Every item → its cited source, or the assumed flag</div>
        </div>
        <div className="asc-panel asc-panel-pad asc-cov">
          {groups.map(grp => (
            <div className="asc-cov-grp" key={grp.type}>
              <div className="asc-cov-gh"><span className="dot" style={{ background: VTYPE[grp.type].c }}></span>{grp.title}<span className="ct">{grp.items.length}</span></div>
              {grp.items.map(it => (
                <div className={'asc-cov-row' + (it.sources.length ? '' : ' assumed')} key={it.id}>
                  <span className="asc-cov-id">{it.id}</span>
                  <span className="asc-cov-name">{it.label}</span>
                  <span className="asc-cov-src">
                    {it.sources.length
                      ? it.sources.map(sid => <span className="asc-prodchip" key={sid}>{sid}</span>)
                      : <span className="asc-assumed">assumed · no source</span>}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* registry */}
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title"><VIco k="sources" w={15} /> Source registry</div><div className="asc-sec-sub">Source → what it produced in this product</div></div>
        <div className="asc-panel">
          {usedSrc.map(s => {
            const src = sourceById(s.id); const prod = producedBy(s.id);
            return (
              <div className="asc-srcrow" key={s.id}>
                <div className="asc-srctype"><VIco k={VSRC_ICON[src.type] || 'doc'} w={16} /></div>
                <div className="asc-src-main">
                  <div className="asc-src-name">{src.name} <span className="asc-src-id">{s.id}</span>
                    {src.status === 'superseded'
                      ? <span className="asc-prov-status superseded">superseded → {src.supersededBy}</span>
                      : <span className="asc-prov-status current">current</span>}
                  </div>
                  <div className="asc-src-sum">{src.summary}</div>
                </div>
                <div className="asc-src-produced">
                  {prod.length ? prod.map(p => <span className="asc-prodchip" key={p}>{p}</span>) : <span className="asc-src-none">— nothing in this product</span>}
                </div>
                <div className="asc-src-date">{src.type}<br />{src.ingestedAt}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* change feed */}
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title"><VIco k="change" w={15} /> Change feed</div><div className="asc-sec-sub">Ingest · supersede · assumed — with reason &amp; attribution</div></div>
        <div className="asc-panel asc-panel-pad">
          {feed.map((c, i) => (
            <div className="asc-change" key={i}>
              <div className={'asc-change-ico ' + (c.action === 'flag' ? 'warn' : c.action)}>
                <VIco k={c.action === 'add' ? 'check' : c.action === 'supersede' ? 'change' : 'warn'} w={11} />
              </div>
              <div className="asc-change-body">
                <span><b>{c.action === 'add' ? 'Ingested' : c.action === 'supersede' ? 'Superseded' : 'Flagged assumed'}</b> {c.target}</span>
                <div style={{ marginTop: '2px', color: 'var(--ink-3)', fontSize: '11.5px' }}>{c.note}</div>
                <div className="asc-change-meta">
                  <span>{c.at}</span><span>· {c.by}</span>
                  {c.fromSource && <span>· {c.fromSource}</span>}
                  <span className="asc-reason">· {c.reason}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   2 · KNOWLEDGE GRAPH explorer  (product-scoped)
   ============================================================ */
const VGRAPH_COLS = [['src'], ['metric', 'objective', 'kr'], ['persona', 'stakeholder'], ['journey'], ['usecase'], ['risk'], ['req', 'nfr'], ['dep', 'integration'], ['policy', 'governance', 'security'], ['adr', 'component', 'api', 'resource']];
const V_NODE_W = 168, V_NODE_H = 46, V_COL_PITCH = 232, V_ROW_PITCH = 58, V_PAD = 24;

function vLayout(g, colGroups = VGRAPH_COLS) {
  const cols = [];
  colGroups.forEach(group => { const ns = g.nodes.filter(n => group.includes(n.type)); if (ns.length) cols.push(ns); });
  const pos = {}; let maxRows = 0;
  cols.forEach((ns, ci) => { maxRows = Math.max(maxRows, ns.length); ns.forEach((n, ri) => { pos[n.id] = { x: V_PAD + ci * V_COL_PITCH, y: V_PAD + ri * V_ROW_PITCH, w: V_NODE_W, h: V_NODE_H }; }); });
  cols.forEach(ns => { const off = (maxRows - ns.length) * V_ROW_PITCH / 2; ns.forEach(n => { pos[n.id].y += off; }); });
  const width = V_PAD * 2 + (cols.length - 1) * V_COL_PITCH + V_NODE_W;
  const height = V_PAD * 2 + maxRows * V_ROW_PITCH - (V_ROW_PITCH - V_NODE_H);
  return { pos, width, height, cols };
}
/* ---- React Flow node: reuses the exact `asc-gnode` markup/CSS so it looks
   identical to the old SVG canvas, just mounted inside React Flow. Four hidden
   handles (one per side) let edges enter/leave left or right to match the old
   left→right / backward-edge routing. Dim/select/assumed state arrives via data. */
const KG_HANDLE = { opacity: 0, width: 1, height: 1, minWidth: 1, minHeight: 1, border: 0, background: 'transparent' };
function KGNode({ data }) {
  const { n, dim, sel, assumed, gc, ico } = data;
  return (
    <div className={'asc-gnode' + (sel ? ' sel' : '') + (dim ? ' dim' : '') + (assumed ? ' assumed' : '')}
      style={{ position: 'relative', left: 0, top: 0, width: V_NODE_W, height: V_NODE_H, '--gc': gc }}>
      <Handle id="tl" type="target" position={Position.Left} style={KG_HANDLE} />
      <Handle id="tr" type="target" position={Position.Right} style={KG_HANDLE} />
      <Handle id="sl" type="source" position={Position.Left} style={KG_HANDLE} />
      <Handle id="sr" type="source" position={Position.Right} style={KG_HANDLE} />
      <span className="asc-gnode-ico"><VIco k={ico} w={12} /></span>
      <span className="asc-gnode-txt">
        <span className="id">{n.code || n.id}{assumed && <span className="asc-gnode-flag">assumed</span>}</span>
        <span className="lb">{n.label}</span>
      </span>
    </div>
  );
}
const KG_NODE_TYPES = { kg: KGNode };

/* edge stroke reproduces the old .asc-edge CSS inline (React Flow styles the
   inner path, so driving it via `style` is simpler than fighting specificity) */
function kgEdgeStyle(dash, dim, lit) {
  return {
    stroke: lit ? 'var(--accent)'
      : dash ? 'color-mix(in oklch, var(--ink) 20%, transparent)'
        : 'color-mix(in oklch, var(--ink) 26%, transparent)',
    strokeWidth: lit ? 1.9 : 1.4,
    strokeDasharray: dash ? '3 3' : undefined,
    opacity: dim ? 0.12 : 1,
  };
}

/* The canvas itself — React Flow over the same vLayout column positions.
   typeMeta / evidenceable are parameterized so other graphs (e.g. the subdomain
   knowledge graphs) can reuse the explorer with their own vocabulary. */
function KGraph({ g, L, sel, setSel, hover, setHover, typeFilter, expanded, typeMeta = VTYPE, evidenceable = V_EVIDENCEABLE }) {
  const rf = useReactFlow();
  // when the canvas resizes (expand/collapse) re-frame the graph into view
  React.useEffect(() => {
    const id = setTimeout(() => rf.fitView({ padding: 0.2 }), 140);
    return () => clearTimeout(id);
  }, [expanded, rf]);
  const focusId = hover || sel;
  const nbrIds = React.useMemo(() => new Set(focusId ? neighborsOf(g, focusId).map(n => n.id) : []), [g, focusId]);
  const isActive = (id) => !focusId || id === focusId || nbrIds.has(id);
  const edgeActive = (e) => !focusId || e.from === focusId || e.to === focusId;

  const rfNodes = React.useMemo(() => g.nodes.map(n => {
    const p = L.pos[n.id]; const ty = typeMeta[n.type] || { c: 'oklch(0.5 0.02 260)', ico: 'doc' };
    const dim = (typeFilter && n.type !== typeFilter) || !isActive(n.id);
    const assumed = evidenceable.includes(n.type) && !(n.sources && n.sources.length);
    return {
      id: n.id, type: 'kg', position: { x: p.x, y: p.y }, width: V_NODE_W, height: V_NODE_H,
      data: { n, dim, sel: sel === n.id, assumed, gc: ty.c, ico: ty.ico },
    };
  }), [g, L, focusId, typeFilter, sel]);

  const rfEdges = React.useMemo(() => g.edges.map((e, i) => {
    const a = L.pos[e.from], b = L.pos[e.to];
    const dim = (typeFilter && !(g.byId[e.from].type === typeFilter || g.byId[e.to].type === typeFilter)) || !edgeActive(e);
    const lit = !!focusId && edgeActive(e);
    const forward = b.x >= a.x;
    return {
      id: 'e' + i, source: e.from, target: e.to,
      sourceHandle: forward ? 'sr' : 'sl', targetHandle: forward ? 'tl' : 'tr',
      type: 'default', style: kgEdgeStyle(e.dash, dim, lit),
    };
  }), [g, L, focusId, typeFilter]);

  return (
    <ReactFlow
      nodes={rfNodes} edges={rfEdges} nodeTypes={KG_NODE_TYPES}
      onNodeMouseEnter={(_, nd) => setHover(nd.id)} onNodeMouseLeave={() => setHover(null)}
      onNodeClick={(_, nd) => setSel(nd.id)} onPaneClick={() => setSel(null)}
      fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.2} maxZoom={1.6}
      nodesConnectable={false} nodesDraggable elementsSelectable
      proOptions={{ hideAttribution: true }} panOnScroll zoomOnScroll={false}>
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

/* ── Reusable graph explorer (D-042) ──
   The same columnar React Flow canvas + legend + detail sidebar that powers the
   product Knowledge Graph, parameterized so other surfaces (the subdomain
   knowledge graphs) can mount it with their own columns / type palette / detail
   panel. g = { nodes:[{id,type,label,code?}], edges:[{from,to,fwd,rev,dash?}], byId }. */
function GraphExplorer({ g, cols, typeMeta, evidenceable = [], renderDetail, emptyHint }) {
  const L = React.useMemo(() => vLayout(g, cols), [g, cols]);
  const [sel, setSel] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState(null);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const presentTypes = cols.flat().filter(t => g.nodes.some(n => n.type === t));
  const selNode = sel ? g.byId[sel] : null;

  return (
    <>
      <div className="asc-graph-legend">
        {presentTypes.map(t => (
          <button key={t} className={'asc-glchip' + (typeFilter === t ? ' on' : '')}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)} style={{ '--gc': typeMeta[t].c }}>
            <span className="dot"></span>{typeMeta[t].label}<span className="ct">{g.nodes.filter(n => n.type === t).length}</span>
          </button>
        ))}
        <div className="asc-gl-sp"></div>
        {sel && <button className="asc-glchip clear" onClick={() => setSel(null)}><VIco k="x" w={9} /> Clear selection</button>}
      </div>

      <div className={'asc-graph-body' + (expanded ? ' asc-graph-expanded' : '')}>
        <div className="asc-graph-scroll asc-graph-rf">
          <button type="button" className="asc-graph-fsbtn" onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse (Esc)' : 'Expand to full window'} aria-label={expanded ? 'Collapse' : 'Expand'}>
            <VIco k={expanded ? 'collapse' : 'expand'} w={15} />
          </button>
          {mounted && (
            <ReactFlowProvider>
              <KGraph g={g} L={L} sel={sel} setSel={setSel} hover={hover} setHover={setHover}
                typeFilter={typeFilter} expanded={expanded} typeMeta={typeMeta} evidenceable={evidenceable} />
            </ReactFlowProvider>
          )}
        </div>

        <aside className="asc-graph-detail">
          {!selNode ? (
            <div className="asc-gd-empty">
              <div className="asc-gd-empty-ico"><VIco k="graph" w={20} /></div>
              <div className="t">Walk the graph</div>
              <div className="s">{emptyHint || 'Click any node to see what it is and everything it connects to. Hover to light up its neighbourhood.'}</div>
            </div>
          ) : (renderDetail
            ? renderDetail(selNode, g, setSel)
            : <GraphDetailLite g={g} node={selNode} onSelect={setSel} typeMeta={typeMeta} />)}
        </aside>
      </div>
    </>
  );
}

/* generic detail panel for parameterized graphs — type · label · connections */
function GraphDetailLite({ g, node, onSelect, typeMeta }) {
  const ty = typeMeta[node.type] || { label: node.type, c: 'oklch(0.5 0.02 260)' };
  const ns = neighborsOf(g, node.id);
  const byLabel = {};
  ns.forEach(nb => { (byLabel[nb.label] = byLabel[nb.label] || []).push(nb); });
  const t = window.useTrace ? window.useTrace() : null;
  const traceable = t && typeof window.cynTraceHas === 'function' && window.cynTraceHas(node.id);
  return (
    <div className="asc-gd">
      <div className="asc-gd-head" style={{ '--gc': ty.c }}>
        <span className="asc-gd-type"><span className="dot"></span>{ty.label}</span>
        <div className="asc-gd-id">{node.code || node.id}</div>
        <div className="asc-gd-name">{node.label}</div>
      </div>
      <div className="asc-gd-facts">
        <div className="asc-gd-meta">{node.sub || ty.label}{node.desc ? <div className="asc-gd-desc">{node.desc}</div> : null}</div>
        {traceable && <button className="asc-gd-fulltrace" onClick={() => t.open(node.id)}>Open full trace →</button>}
      </div>
      <div className="asc-gd-sect">
        <div className="asc-gd-sh">Connections ({ns.length})</div>
        {ns.length === 0 && <div className="asc-gd-desc">No edges yet.</div>}
        {Object.keys(byLabel).map(label => (
          <div className="asc-gd-kgrp" key={label}>
            <div className="asc-gd-kl">{label}</div>
            {byLabel[label].map((nb, i) => {
              const tn = g.byId[nb.id]; if (!tn) return null;
              return (
                <button className="asc-gd-nb" key={i} onClick={() => onSelect(nb.id)} style={{ '--gc': (typeMeta[tn.type] || {}).c }}>
                  <span className="dot"></span><span className="nid">{tn.code || tn.id}</span><span className="nl">{tn.label}</span>
                  <span className="dir">{nb.dir === 'out' ? '→' : '←'}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductGraph({ product, prd }) {
  if (!prd) return <div className="asc-page"><div className="asc-page-head"><div><div className="asc-eyebrow"><VIco k="graph" w={12} /> Product · Cross-cutting</div><h1 className="asc-page-title">Knowledge Graph</h1></div></div><VEmpty title="Knowledge Graph" /></div>;

  const g = React.useMemo(() => prdGraph(prd), [prd]);
  const L = React.useMemo(() => vLayout(g), [prd]);
  const [sel, setSel] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [typeFilter, setTypeFilter] = React.useState(null);
  // React Flow touches the DOM/layout at mount; render it client-side only
  // (mirrors FlowEmbed's dynamic ssr:false) to avoid a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  // expand the canvas to a full-page overlay (Esc collapses)
  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const presentTypes = VGRAPH_COLS.flat().filter(t => g.nodes.some(n => n.type === t));
  const selNode = sel ? g.byId[sel] : null;

  return (
    <div className="asc-page asc-graphpage">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><VIco k="graph" w={12} /> Product · {product.name} · Cross-cutting</div>
          <h1 className="asc-page-title">Knowledge Graph</h1>
          <p className="asc-page-sub">The canonical store for this product. Every PRD and architecture entity — sources, metrics, objectives, personas, journeys, use cases, requirements, risks, dependencies, integrations, policies, governance, decisions, components, APIs, resources and security controls — and the trace edges between them. Every other surface is a saved query over this graph.</p>
        </div>
        <div className="asc-head-actions">
          <span className="asc-graph-stat"><b>{g.nodes.length}</b> nodes</span>
          <span className="asc-graph-stat"><b>{g.edges.length}</b> edges</span>
        </div>
      </div>

      <div className="asc-graph-legend">
        {presentTypes.map(t => (
          <button key={t} className={'asc-glchip' + (typeFilter === t ? ' on' : '')}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)} style={{ '--gc': VTYPE[t].c }}>
            <span className="dot"></span>{VTYPE[t].label}<span className="ct">{g.nodes.filter(n => n.type === t).length}</span>
          </button>
        ))}
        <div className="asc-gl-sp"></div>
        {sel && <button className="asc-glchip clear" onClick={() => setSel(null)}><VIco k="x" w={9} /> Clear selection</button>}
      </div>

      <div className={'asc-graph-body' + (expanded ? ' asc-graph-expanded' : '')}>
        <div className="asc-graph-scroll asc-graph-rf">
          <button type="button" className="asc-graph-fsbtn" onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse (Esc)' : 'Expand to full window'} aria-label={expanded ? 'Collapse' : 'Expand'}>
            <VIco k={expanded ? 'collapse' : 'expand'} w={15} />
          </button>
          {mounted && (
            <ReactFlowProvider>
              <KGraph g={g} L={L} sel={sel} setSel={setSel} hover={hover} setHover={setHover} typeFilter={typeFilter} expanded={expanded} />
            </ReactFlowProvider>
          )}
        </div>

        <aside className="asc-graph-detail">
          {!selNode ? (
            <div className="asc-gd-empty">
              <div className="asc-gd-empty-ico"><VIco k="graph" w={20} /></div>
              <div className="t">Walk the graph</div>
              <div className="s">Click any node to see what it is, the evidence behind it, and everything it connects to — or open its full trace. Hover to light up its neighbourhood. The columns read left→right as the product was built: <b>sources → metrics &amp; objectives → personas → journeys → use cases → risks → requirements → dependencies → controls → architecture</b>.</div>
            </div>
          ) : <VGraphDetail g={g} node={selNode} onSelect={setSel} />}
        </aside>
      </div>
    </div>
  );
}

function VGraphDetail({ g, node, onSelect }) {
  const ty = VTYPE[node.type] || { label: node.type, c: 'oklch(0.5 0.02 260)' };
  const ns = neighborsOf(g, node.id);
  const srcs = (node.sources || []).map(id => sourceById(id)).filter(Boolean);
  const assumed = V_EVIDENCEABLE.includes(node.type) && srcs.length === 0;
  const byLabel = {};
  ns.forEach(nb => { (byLabel[nb.label] = byLabel[nb.label] || []).push(nb); });
  const d = node.data || {};
  const desc = d.nature || d.statement || d.text || d.approach || d.rationale || d.overview || d.purpose || d.objective || d.kr || d.mitigation || node.summary || '';
  const t = (node.type !== 'src' && window.useTrace) ? window.useTrace() : null;

  return (
    <div className="asc-gd">
      <div className="asc-gd-head" style={{ '--gc': ty.c }}>
        <span className="asc-gd-type"><span className="dot"></span>{ty.label}</span>
        <div className="asc-gd-id">{node.id}</div>
        <div className="asc-gd-name">{node.label}</div>
      </div>

      <div className="asc-gd-facts">
        <div className="asc-gd-meta">
          {node.type === 'metric' && d.metric ? <>Target · <b>{d.metric}</b></> : (node.sub || ty.label)}
          {desc ? <div className="asc-gd-desc">{desc}</div> : null}
        </div>
        {t && <button className="asc-gd-fulltrace" onClick={() => t.open(node.id)}>Open full trace →</button>}
      </div>

      {node.type !== 'src' && (
        <div className="asc-gd-sect">
          <div className="asc-gd-sh">{assumed ? 'Evidence' : `Evidence (${srcs.length})`}</div>
          {assumed
            ? <div className="asc-gd-assumed"><span className="asc-assumed">assumed</span> No source cited. This item must be evidenced or dropped before its gate passes.</div>
            : srcs.length
              ? srcs.map(s => (
                <button className="asc-gd-srcrow" key={s.id} onClick={() => onSelect(s.id)}>
                  <span className="pi"><VIco k={VSRC_ICON[s.type] || 'doc'} w={12} /></span>
                  <span className="pn">{s.name} <span className="sid">{s.id}</span><span className="pm">{s.origin}</span></span>
                </button>
              ))
              : <div className="asc-gd-desc">Derived from upstream entities — trace via the connections below.</div>}
        </div>
      )}

      <div className="asc-gd-sect">
        <div className="asc-gd-sh">Connections ({ns.length})</div>
        {ns.length === 0 && <div className="asc-gd-desc">No edges yet.</div>}
        {Object.keys(byLabel).map(label => (
          <div className="asc-gd-kgrp" key={label}>
            <div className="asc-gd-kl">{label}</div>
            {byLabel[label].map((nb, i) => {
              const tn = g.byId[nb.id]; if (!tn) return null;
              return (
                <button className="asc-gd-nb" key={i} onClick={() => onSelect(nb.id)} style={{ '--gc': (VTYPE[tn.type] || {}).c }}>
                  <span className="dot"></span><span className="nid">{tn.id}</span><span className="nl">{tn.label}</span>
                  <span className="dir">{nb.dir === 'out' ? '→' : '←'}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { prdGraph, ProductSources, ProductGraph, GraphExplorer, prdEvidence: PRD_EVIDENCE });
