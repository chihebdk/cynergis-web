import React from 'react';
import dynamic from 'next/dynamic';
import './trace-core';
import './ddd-data';
import './domain-model-data';
const { Ref: DDRef, MermaidView: DDMermaid } = window;

// the event-flow canvas (embedded @flowai/canvas) — client-only, heavy, load on demand
const FlowEmbed = dynamic(() => import('../flow/FlowEmbed.jsx'), { ssr: false });
// which bounded contexts have a modelled event flow (Decisioning first)
const FLOW_BY_CONTEXT = { 'BC-DEC': 'decisioning' };

/* ============================================================
   Cynergis — Design surfaces (D-026 / D-027), in method order:
     1. DesignDomainModel  — EventStorming: events·commands·aggregates·policies
                             (the seams produce the contexts)
     2. DesignContexts     — bounded contexts + context map (distillation)
     3. DesignRealization  — per-capability realization (form×composition×surface)
                             + how each invariant is enforced per form
   Use-case ids render as <Ref> chips, wiring everything into the graph.
   ============================================================ */

const DDPico = ({ d, w = 14 }) => (
  <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
const DDI = {
  ctx:     <path d="M2 4h5l1 1.5h6V13H2zM2 4V2.5" />,
  cap:     <path d="M8 2 2.8 4.8v6.4L8 14l5.2-2.8V4.8z" />,
  test:    <path d="M3 2h10M6 2v4l-3 6.5a1 1 0 0 0 .9 1.5h8.2a1 1 0 0 0 .9-1.5L10 6V2" />,
  bulb:    <path d="M6 12.5h4M6.5 14.5h3M5 8a3 3 0 1 1 6 0c0 1.3-1 2-1 3.5H6C6 10 5 9.3 5 8" />,
  arrow:   <path d="M3 8h9M9 5l3 3-3 3" />,
  event:   <path d="M9 2 3.5 9H8l-1 5 5.5-7H8z" />,
  command: <path d="M4 4l3.5 4L4 12M8.5 12H13" />,
  agg:     <path d="M2.5 5.5 8 2.5l5.5 3v5L8 13.5l-5.5-3zM2.5 5.5 8 8.5l5.5-3M8 8.5v5" />,
  policy:  <path d="M8 1.5 3 3.5v4c0 3 2.2 5.3 5 6.5 2.8-1.2 5-3.5 5-6.5v-4z" />,
  shield:  <path d="M8 1.5 3 3.5v4c0 3 2.2 5.3 5 6.5 2.8-1.2 5-3.5 5-6.5v-4z" />,
  flow:    <path d="M2.5 8h11M11 5.5 13.5 8 11 10.5" />,
  owner:   <path d="M8 8a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8M3.5 13.5c0-2.2 2-3.6 4.5-3.6s4.5 1.4 4.5 3.6" />,
  doc:     <path d="M4 2h5l3 3v9H4zM9 2v3h3" />,
  drive:   <path d="M8 13V3M8 3 5 6M8 3l3 3" />,
};

const TIER = {
  Shadow:     { tone: 'shadow' },
  Assisted:   { tone: 'assisted' },
  Supervised: { tone: 'supervised' },
  Autonomous: { tone: 'autonomous' },
};
const TIER_ORDER = ['Shadow', 'Assisted', 'Supervised', 'Autonomous'];
const ASSET_LABEL = { skill: 'SKILL', script: 'SCRIPT', ref: 'REF' };
const SRC_LABEL = { doc: 'DOC', spec: 'SPEC', policy: 'POLICY', transcript: 'TRANSCRIPT', interview: 'INTERVIEW', telemetry: 'TELEMETRY', regulatory: 'REGULATORY', capture: 'CAPTURED' };

function ContextOwnerAgent({ c, D, M, prd }) {
  const [showHelp, setShowHelp] = React.useState(false);
  const [showPack, setShowPack] = React.useState(false);
  const a = c.agent;
  if (!a) {
    return (
      <div className="coa coa-none">
        <div className="coa-none-h"><DDPico d={DDI.owner} w={14} /> No bespoke subdomain agent</div>
        <div className="coa-none-t">This is a <b>generic</b> context — reuse an off-the-shelf service behind a thin adapter, governed by the neighbouring agent. No expert to install.</div>
      </div>
    );
  }
  const aggregates = ((M && M.aggregates) || []).filter(x => x.context === c.id);
  const policies = ((M && M.policies) || []).filter(x => x.context === c.id);
  const needs = c.needs || [];
  const ruleList = [
    ...aggregates.flatMap(x => (x.invariants || []).map(iv => ({ text: iv.text, fr: iv.fr }))),
    ...policies.map(p => ({ text: `When ${p.when} → ${p.then.toLowerCase()}`, fr: p.fr })),
  ];
  const manages = aggregates.map(x => x.name);
  const grounding = groundingFor(c, prd);
  const pack = (D && prd) ? buildKnowledgePack(c, D, M, prd) : null;
  const counts = pack && `${pack.ubiquitousLanguage.length} terms · ${pack.domainModel.aggregates.length} things it manages · ${ruleList.length} rules · ${pack.capabilities.length} capabilities · ${pack.inboundData.length} data inputs`;
  return (
    <div className={'coa ' + c.classification}>
      <div className="coa-head">
        <span className="coa-ico"><DDPico d={DDI.owner} w={16} /></span>
        <div className="coa-id">
          <div className="coa-eyebrow">SUBDOMAIN AGENT</div>
          <div className="coa-name">{a.name}</div>
          <div className="coa-tagline">A subdomain expert you install in Claude Code or Cowork</div>
        </div>
        <button type="button" className="coa-help-btn" onClick={() => setShowHelp(s => !s)} title="What is a subdomain agent?">?</button>
      </div>

      {showHelp && (
        <div className="coa-help">
          <b>What is a subdomain agent?</b> Every subdomain ships an agent that owns its knowledge — a grounded expert
          you install in <b>Claude Code</b> (as a developer) or <b>Cowork</b> (as a business analyst) to understand and
          work with it. Under the hood it's a generic <b>skill</b> plus this subdomain's <b>knowledge pack</b> — its
          facts, projected live from the model. Together they answer anything about the subdomain and always cite their
          sources. Ask it how something works, what a rule means, what data it needs, or what would break if you changed it.
        </div>
      )}

      <p className="coa-intro">
        This agent is the resident expert on the <b>{c.name}</b> subdomain — it knows what it does, the rules it
        follows, the data it needs, and the value it delivers, and can explain or analyse any of it. Ask it
        anything, as a developer or an analyst.
      </p>

      {a.does && (
        <div className="coa-block">
          <div className="coa-blk-h">What this subdomain does</div>
          <p className="coa-blk-text">{a.does}</p>
        </div>
      )}

      {ruleList.length > 0 && (
        <div className="coa-block">
          <div className="coa-blk-h">Business rules it follows <span className="coa-blk-sub">each traces to the requirement that mandates it</span></div>
          <ul className="coa-rules">{ruleList.map((r, i) => (
            <li key={i}>{r.text} {r.fr ? <DDRef id={r.fr} /> : <span className="coa-rule-gap">no requirement captured</span>}</li>
          ))}</ul>
        </div>
      )}

      <div className="coa-twocol">
        <div className="coa-block">
          <div className="coa-blk-h">What it manages</div>
          <div className="coa-chips">{manages.map(m => <span key={m} className="coa-chip">{m}</span>)}</div>
        </div>
        <div className="coa-block">
          <div className="coa-blk-h">Data it needs</div>
          <ul className="coa-needs">{needs.map((d, i) => <li key={i}><b>{d.from}</b> — {d.data}</li>)}</ul>
        </div>
      </div>

      {a.value && (
        <div className="coa-block">
          <div className="coa-blk-h">Value it delivers</div>
          <ul className="coa-rules">{a.value.map((v, i) => <li key={i}>{v}</li>)}</ul>
        </div>
      )}

      <div className="coa-block">
        <div className="coa-blk-h">Grounded in <span className="coa-blk-sub">captured evidence only — every source is a record in Sources &amp; Evidence</span></div>
        <div className="coa-sources">
          {grounding.sources.map(s => (
            <button key={s.id} type="button" className={'coa-source ' + (s.type || 'doc')} title={s.summary} onClick={() => window.__cynGoSources && window.__cynGoSources()}>
              <span className="coa-source-type">{s.id}</span>
              <span className="coa-source-label">{s.name}<span className="coa-source-origin"> · {SRC_LABEL[s.type] || s.type} · {s.origin}</span></span>
              <span className="coa-source-arrow">↗</span>
            </button>
          ))}
        </div>
        {grounding.gaps.length > 0 && (
          <div className="coa-gap"><b>⚠ Not yet evidenced (assumed):</b> {grounding.gaps.join(', ')} — no source captured. Capture one in Sources &amp; Evidence to ground it.</div>
        )}
      </div>

      {a.skill && (
        <div className="coa-block">
          <div className="coa-blk-h">Install the skill <span className="coa-blk-sub">use it in Claude Code or Cowork</span></div>
          <div className="coa-install">
            <div className="coa-install-top">
              <code className="coa-install-id">{a.skill.id}</code>
              <span className="coa-install-links">
                <a className="coa-install-btn primary" href={a.skill.marketplace} target="_blank" rel="noreferrer">Marketplace ↗</a>
                <a className="coa-install-btn" href={a.skill.repo} target="_blank" rel="noreferrer">GitHub ↗</a>
              </span>
            </div>
            <div className="coa-install-note">Installs the generic <b>Subdomain Analyst</b> skill bundled with this subdomain's <b>knowledge pack</b> — no separate download needed.</div>
          </div>
        </div>
      )}

      {pack && (
        <div className="coa-pack">
          <div className="coa-pack-h">
            <span className="coa-pack-t"><DDPico d={DDI.doc} w={12} /> KNOWLEDGE PACK — the facts this agent loads</span>
            <span className="coa-pack-actions">
              <button type="button" className="coa-pack-btn" onClick={() => setShowPack(s => !s)}>{showPack ? 'Hide' : 'View'} JSON</button>
            </span>
          </div>
          <div className="coa-pack-sub">A <b>live projection</b> of the subdomain's model — {counts}. The skill bundles it on install.</div>
          {showPack && <pre className="coa-pack-json">{JSON.stringify(pack, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}

const CLASS_TONE = { core: 'core', supporting: 'supporting', generic: 'generic' };

/* DDD context-map integration patterns — label + one-line meaning */
const PATTERN = {
  'customer-supplier':     { label: 'Customer–Supplier',    hint: 'upstream commits to the downstream’s needs' },
  'open-host-service':     { label: 'Open-Host Service',    hint: 'a stable, published interface any consumer can use' },
  'published-language':    { label: 'Published Language',   hint: 'a shared, documented contract' },
  'anti-corruption-layer': { label: 'Anti-Corruption Layer', hint: 'downstream translates to protect its own model' },
  'conformist':            { label: 'Conformist',           hint: 'downstream adopts the upstream model as-is' },
  'shared-kernel':         { label: 'Shared Kernel',        hint: 'a jointly-owned subset of the model' },
};

const FORM = {
  'code':         { label: 'Deterministic code', tone: 'code' },
  'llm-function': { label: 'LLM-as-a-function',   tone: 'llm' },
  'agent':        { label: 'Agent',               tone: 'agent' },
  'human':        { label: 'Human judgment',      tone: 'human' },
};
const SURFACE = { verb: 'MCP verb / automated', ui: 'UI component', cowork: 'Cowork / MCP-app', agent: 'Background agent' };
const AGENCY = {
  'automated':     { label: 'Automated · human out of loop', tone: 'ok' },
  'human-in-loop': { label: 'Human in the loop',             tone: 'warn' },
};

function contextMapMermaid(D, highlightId) {
  const safe = id => id.replace(/[^A-Za-z0-9]/g, '_');
  const lbl = s => (s || '').replace(/[()|"]/g, '').replace(/\s+/g, ' ').trim();
  const lines = ['graph LR'];
  D.contexts.forEach(c => {
    lines.push(`  ${safe(c.id)}["${c.name} · ${c.classification}"]`);
    // clickable node → open the context; tooltip shows on hover
    lines.push(`  click ${safe(c.id)} call cynOpenCtx("${c.id}") "${lbl(c.name + ' — ' + c.classification + ' subdomain · click to open')}"`);
  });
  (D.externals || []).forEach(e => {
    lines.push(`  ${safe(e.id)}["${e.name} · external"]:::ext`);
    lines.push(`  click ${safe(e.id)} call cynNoop() "External — reached via an anti-corruption layer (not owned here)"`);
  });
  const isExt = id => (D.externals || []).some(e => e.id === id);
  D.relations.forEach(r => {
    const arrow = (isExt(r.from) || isExt(r.to)) ? '-.->' : '-->';
    lines.push(`  ${safe(r.from)} ${arrow}|${lbl(r.label)}| ${safe(r.to)}`);
  });
  lines.push('  classDef ext stroke-dasharray:4 3;');
  if (highlightId) {
    lines.push('  classDef hl fill:#ece7ff,stroke:#6645c9,stroke-width:2.5px,color:#241d3d;');
    lines.push(`  class ${safe(highlightId)} hl;`);
  }
  return lines.join('\n');
}

/* context-map node click handler (wired into Mermaid via `click ... call cynOpenCtx`).
   If the Bounded-contexts surface is mounted, select directly; otherwise stash the
   id and route there (used when clicking from the standalone Context map page). */
if (typeof window !== 'undefined') {
  window.cynOpenCtx = function (id) {
    if (window.__cynSelectCtx) window.__cynSelectCtx(id);
    else { window.__cynPendingCtx = id; if (window.__cynGoContexts) window.__cynGoContexts(); }
  };
  window.cynNoop = function () {};
}

const dddData = product => (window.__DDD__ && window.__DDD__.byProduct[product.id]) || null;
const domainData = product => (window.__DOMAIN__ && window.__DOMAIN__.byProduct[product.id]) || null;

/* Grounding (provenance / addressability) — the agent grounds ONLY in captured evidence.
   Derive the context's sources from the citation map (window.prdEvidence.cites): the Sources
   that evidence its use cases. Any use case with no citation surfaces as an *assumed* gap —
   we never invent a source. */
function groundingFor(c, prd) {
  const ev = window.prdEvidence;
  const ucTitle = id => { const u = ((prd && prd.usecases) || []).find(x => x.id === id); return u ? u.title : id; };
  if (!ev) return { sources: [], gaps: [] };
  const byId = id => ev.sources.find(s => s.id === id);
  const ids = new Set();
  const gaps = [];
  (c.capabilities || []).forEach(uc => {
    const cited = ev.cites[uc];
    if (cited && cited.length) cited.forEach(s => ids.add(s));
    else gaps.push(ucTitle(uc));
  });
  const sources = [...ids].map(byId).filter(Boolean).filter(s => s.status !== 'superseded');
  return { sources, gaps };
}

/* Knowledge Pack generator (D-030, Build phase 1) — projects a bounded context's slice of the
   canonical graph into the versioned artifact the Subdomain Functional Analyst skill loads.
   This is the *instance*; the analyst Skill is the generic *kind* that consumes it. */
function buildKnowledgePack(c, D, M, prd) {
  const inCtx = arr => (arr || []).filter(x => x.context === c.id);
  const aggregates = inCtx(M && M.aggregates);
  const policies = inCtx(M && M.policies);
  const reals = (D.realizations || []).filter(r => r.context === c.id);
  const rels = (D.relations || []).filter(r => r.from === c.id || r.to === c.id);
  const ucTitle = id => { const u = ((prd && prd.usecases) || []).find(x => x.id === id); return u ? u.title : id; };
  return {
    manifest: {
      id: c.id, name: c.name, classification: c.classification, kind: 'subdomain-functional-analyst',
      product: (prd && prd.product && prd.product.name) || 'Fraud Decisioning', version: '0.1.0',
      source: 'live projection of the canonical graph (Design) — D-024',
    },
    summary: c.summary || c.note,
    ubiquitousLanguage: c.language,
    domainModel: {
      aggregates: aggregates.map(a => ({ name: a.name, commands: a.commands, events: a.events, invariants: a.invariants, realizes: a.ucs })),
      policies: policies.map(p => ({ when: p.when, then: p.then, note: p.note })),
    },
    triggers: reals.map(r => ({ capability: ucTitle(r.ucId), trigger: r.trigger || '(unspecified)' })),
    capabilities: reals.map(r => ({
      id: r.ucId, title: ucTitle(r.ucId),
      realization: { form: r.form, composition: r.composition, surface: r.surface, agency: r.agency },
      enforces: r.enforces || [],
    })),
    relationships: rels.map(r => ({ from: r.from, to: r.to, pattern: r.pattern, upstream: r.upstream, carries: r.label })),
    inboundData: (c.needs || []).map(d => ({ from: d.from, data: d.data })),
    valueRealized: (c.capabilities || []).map(ucTitle),
    sources: groundingFor(c, prd).sources.map(s => ({ id: s.id, type: s.type, name: s.name })),
    assumptions: groundingFor(c, prd).gaps,   // capabilities with no captured evidence
  };
}

/* ====================== 1 · DOMAIN MODEL ====================== */
function AggregateCard({ a }) {
  return (
    <div className="dm-agg">
      <div className="dm-agg-h">
        <span className="dm-agg-ico"><DDPico d={DDI.agg} w={15} /></span>
        <span className="dm-agg-nm">{a.name}</span>
        <span className="dm-agg-ucs">{a.ucs.map(id => <DDRef id={id} key={id} />)}</span>
      </div>
      <div className="dm-row"><span className="dm-k command"><DDPico d={DDI.command} w={11} /> commands</span>
        <span className="dm-chips">{a.commands.map(c => <span key={c} className="dm-chip command">{c}</span>)}</span></div>
      <div className="dm-row"><span className="dm-k event"><DDPico d={DDI.event} w={11} /> events</span>
        <span className="dm-chips">{a.events.map(c => <span key={c} className="dm-chip event">{c}</span>)}</span></div>
      <div className="dm-row"><span className="dm-k inv"><DDPico d={DDI.shield} w={11} /> invariants</span>
        <ul className="dm-invs">{a.invariants.map((iv, i) => <li key={i}>{iv.text} {iv.fr && <DDRef id={iv.fr} />}</li>)}</ul></div>
    </div>
  );
}

function DesignDomainModel({ product, prd }) {
  const M = domainData(product);
  if (!prd || !M) return <div className="ddd-empty">No domain model yet. Modeling opens once Discover is complete.</div>;
  const byCtx = ctx => M.aggregates.filter(a => a.context === ctx);
  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · DOMAIN MODEL (EVENTSTORMING)</div>
        <p className="ddd-lead">
          Design <b>opens by modeling</b> — turning Discover's journeys, use cases and business rules into
          <b> domain events · commands · aggregates · policies</b>. The ubiquitous language converges here, and the
          <b> seams reveal the bounded contexts</b> (so the contexts are an output of this model, not an input).
        </p>
        <div className="dm-legend">
          <span className="dm-chip command">command</span>
          <span className="dm-chip event">event</span>
          <span className="dm-chip agg">aggregate</span>
          <span className="dm-chip policy">policy</span>
          <span className="dm-chip inv">invariant</span>
        </div>
      </div>

      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.agg} w={14} /> Aggregates & invariants</div>
          <div className="asc-sec-sub">Consistency boundaries · commands in, events out · grouped by the context they seed</div>
        </div>
        {M.seams.map(s => (
          <div className="dm-group" key={s.context}>
            <div className="dm-group-h">{s.name}</div>
            <div className="dm-agg-list">{byCtx(s.context).map(a => <AggregateCard a={a} key={a.id} />)}</div>
          </div>
        ))}
      </div>

      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.policy} w={14} /> Policies (reactions)</div>
          <div className="asc-sec-sub">When an event happens → issue a command · cross-context policies reveal the seams</div>
        </div>
        <div className="dm-pol-list">
          {M.policies.map(p => (
            <div className="dm-pol" key={p.id}>
              <span className="dm-chip event">{p.when}</span>
              <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
              <span className="dm-chip command">{p.then}</span>
              <span className="dm-pol-note">{p.note}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dm-seams">
        <div className="dm-seams-h"><DDPico d={DDI.ctx} w={13} /> Seams → bounded contexts</div>
        {M.seams.map(s => (
          <div className="dm-seam" key={s.context}><b>{s.name}</b> — {s.rationale}</div>
        ))}
        <div className="dm-seams-foot">These three contexts carry into <b>Bounded contexts &amp; context map</b>.</div>
      </div>
    </div>
  );
}

/* ====================== 2 · BOUNDED CONTEXTS (hub + drill-in) ====================== */
function ContextCard({ c, onSelect }) {
  const drill = () => onSelect && onSelect(c.id);
  return (
    <div className={'ddd-ctx ddd-ctx-click ' + CLASS_TONE[c.classification]} role="button" tabIndex={0}
      onClick={drill} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(); } }}>
      <div className="ddd-ctx-h">
        <span className="ddd-ctx-nm">{c.name}</span>
        <span className={'ddd-class ' + c.classification}>{c.classification}</span>
      </div>
      <div className="ddd-lang">{c.language.map(l => <span key={l.term} className="ddd-term">{l.term}</span>)}</div>
      <div className="ddd-ctx-note">{c.note}</div>
      <div className="ddd-ctx-caps">
        {c.capabilities.length
          ? c.capabilities.map(id => <span key={id} onClick={e => e.stopPropagation()}><DDRef id={id} /></span>)
          : <span className="ddd-nocap">no bespoke capability — reuse</span>}
      </div>
      <div className="ddd-ctx-drill">Open context <DDPico d={DDI.arrow} w={13} /></div>
    </div>
  );
}

/* per-context detail: language · relationships · domain model · realization */
function ContextDetail({ c, D, M, prd, onBack }) {
  const aggregates = (M ? M.aggregates : []).filter(a => a.context === c.id);
  const policies = (M ? M.policies : []).filter(p => p.context === c.id);
  const reals = D.realizations.filter(r => r.context === c.id);
  const rels = D.relations.filter(r => r.from === c.id || r.to === c.id);
  const nameOf = id => {
    const ctx = D.contexts.find(x => x.id === id); if (ctx) return ctx.name;
    const ext = (D.externals || []).find(x => x.id === id); return ext ? ext.name + ' · external' : id;
  };
  const ucTitle = id => { const u = (prd.usecases || []).find(x => x.id === id); return u ? u.title : id; };
  const [tab, setTab] = React.useState(() => window.__cynCtxTab || 'rels');   // restore on remount (Back / deep link)
  // navTab writes the active tab to the URL so Back/Forward + sharing work
  const navTab = (t) => {
    window.__cynCtxTab = t; setTab(t);
    window.__cynPushProd?.();
  };
  React.useEffect(() => {
    window.__cynSetTab = t => { window.__cynCtxTab = t; setTab(t); };          // raw apply for Back/Forward (no URL push)
    return () => { delete window.__cynSetTab; };
  });
  const TABS = [
    { key: 'rels',  label: 'Relationships' },
    { key: 'agent', label: 'Agent' },
    { key: 'model', label: 'Model & capabilities' },
    { key: 'lang',  label: 'Ubiquitous Language' },
  ];

  const RelCard = ({ r, i }) => {
    const p = PATTERN[r.pattern] || { label: r.pattern, hint: '' };
    const downId = r.from === r.upstream ? r.to : r.from;
    const role = r.upstream === c.id ? 'upstream' : 'downstream';
    return (
      <div className="ddd-relc" key={i}>
        <div className="ddd-relc-top">
          <span className="ddd-relc-route"><b>{nameOf(r.upstream)}</b> <span className="ddd-relc-arr">→</span> <b>{nameOf(downId)}</b></span>
          <span className="ddd-relc-pat">{p.label}</span>
          <span className={'ddd-relc-role ' + role}>this context is {role}</span>
        </div>
        <div className="ddd-relc-meta"><span className="ddd-relc-k">carries</span> {r.label}{p.hint && <> · <span className="ddd-relc-hint">{p.hint}</span></>}</div>
        <p className="ddd-relc-flow">{r.flow}</p>
      </div>
    );
  };

  return (
    <div className="ddd-wrap">
      <div className="ddd-crumbhead">
        <h2 className="ddd-crumb-title">
          <button type="button" className="ddd-crumb-link" onClick={onBack}>Bounded contexts</button>
          <span className="ddd-crumb-sep">›</span>
          <span className="ddd-crumb-cur">{c.name}</span>
        </h2>
        <span className={'ddd-class ' + c.classification}>{c.classification} subdomain</span>
      </div>
      <p className="ddd-detail-note">{c.summary || c.note}</p>

      <div className="ddd-tabs">
        {TABS.map(t => (
          <button key={t.key} type="button" className={'ddd-tab' + (tab === t.key ? ' on' : '')} onClick={() => navTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'lang' && (
        <div className="asc-section ddd-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DDPico d={DDI.ctx} w={14} /> Ubiquitous language</div>
            <div className="asc-sec-sub">What each term means inside this boundary — the same word can mean something else in another context</div>
          </div>
          <div className="ddd-langdef">
            {c.language.map(l => (
              <div className="ddd-langdef-row" key={l.term}>
                <span className="ddd-langdef-term">{l.term}</span>
                <span className="ddd-langdef-def">{l.def}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'rels' && (
        <>
          <div className="asc-section ddd-sec">
            <div className="asc-sec-head">
              <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> On the context map</div>
              <div className="asc-sec-sub"><b>{c.name}</b> highlighted · dashed = external (ACL)</div>
            </div>
            {DDMermaid && <DDMermaid code={contextMapMermaid(D, c.id)} caption={c.name + ' and its neighbours on the map'} />}
          </div>
          {rels.length > 0 && (
            <div className="asc-section ddd-sec">
              <div className="asc-sec-head">
                <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> How the flow works</div>
                <div className="asc-sec-sub">Each edge: the integration pattern, who's upstream, and how the integration actually runs</div>
              </div>
              <div className="ddd-relc-list">
                {[...rels].sort((a, b) => (a.upstream === c.id ? 1 : 0) - (b.upstream === c.id ? 1 : 0)).map((r, i) => <RelCard r={r} i={i} key={i} />)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'agent' && <ContextOwnerAgent c={c} D={D} M={M} prd={prd} />}

      {tab === 'model' && (
        <>
          {FLOW_BY_CONTEXT[c.id] && (
            <div className="asc-section ddd-sec">
              <div className="asc-sec-head">
                <div className="asc-sec-title"><DDPico d={DDI.event} w={14} /> Event flow — process model</div>
                <div className="asc-sec-sub">How work moves through this context over time · click an event for its grounded detail · rendered on <b>@flowai/canvas</b></div>
              </div>
              <div style={{ height: '580px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
                <FlowEmbed flowId={FLOW_BY_CONTEXT[c.id]} />
              </div>
            </div>
          )}

          <div className="asc-section ddd-sec">
            <div className="asc-sec-head">
              <div className="asc-sec-title"><DDPico d={DDI.agg} w={14} /> Domain model — aggregates & invariants</div>
              <div className="asc-sec-sub">This context's slice of the model · commands in, events out</div>
            </div>
            {aggregates.length
              ? <div className="dm-agg-list">{aggregates.map(a => <AggregateCard a={a} key={a.id} />)}</div>
              : <div className="ddd-empty-inline">No domain state of its own — a pure reaction (generic). Nothing to model here.</div>}
          </div>

          {policies.length > 0 && (
            <div className="asc-section ddd-sec">
              <div className="asc-sec-head">
                <div className="asc-sec-title"><DDPico d={DDI.policy} w={14} /> Policies (reactions)</div>
                <div className="asc-sec-sub">When an event happens → issue a command</div>
              </div>
              <div className="dm-pol-list">
                {policies.map(p => (
                  <div className="dm-pol" key={p.id}>
                    <span className="dm-chip event">{p.when}</span>
                    <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
                    <span className="dm-chip command">{p.then}</span>
                    <span className="dm-pol-note">{p.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="asc-section ddd-sec">
            <div className="asc-sec-head">
              <div className="asc-sec-title"><DDPico d={DDI.cap} w={14} /> Capabilities & realization</div>
              <div className="asc-sec-sub">How each capability is built — least-agentic that fits · invariants enforced per form</div>
            </div>
            {reals.length
              ? <div className="ddd-real-list">{reals.map(r => (
                  <div key={r.ucId}>
                    <div className="ddd-uc-title">{ucTitle(r.ucId)}</div>
                    <RealizationCard r={r} />
                  </div>
                ))}</div>
              : <div className="ddd-empty-inline">No bespoke capability — reuse an off-the-shelf service for this context.</div>}
          </div>
        </>
      )}
    </div>
  );
}

function DesignContexts({ product, prd }) {
  const D = dddData(product);
  const M = domainData(product);
  const [sel, setSel] = React.useState(() => window.__cynCtxSel || null);   // restore on remount (Back / deep link)
  // navSel writes the selection to the URL so Back/Forward + sharing work
  const navSel = (id) => {
    window.__cynCtxSel = id; window.__cynCtxTab = 'rels'; setSel(id);        // a freshly opened context starts on Relationships
    window.__cynPushProd?.();
  };
  React.useEffect(() => {
    window.__cynSelectCtx = navSel;                                          // map clicks select a context (pushes URL)
    window.__cynSetSel = id => { window.__cynCtxSel = id; setSel(id); };      // raw apply for Back/Forward (no URL push)
    if (window.__cynPendingCtx) { navSel(window.__cynPendingCtx); window.__cynPendingCtx = null; }  // consume a click from the standalone map
    return () => { delete window.__cynSelectCtx; delete window.__cynSetSel; };
  });
  if (!prd || !D) return <div className="ddd-empty">No bounded contexts yet — they emerge from the domain model.</div>;

  const selCtx = sel && D.contexts.find(c => c.id === sel);
  if (selCtx) return <ContextDetail c={selCtx} D={D} M={M} prd={prd} onBack={() => navSel(null)} />;

  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <h2 className="ddd-page-title">Bounded contexts</h2>
        <p className="ddd-lead">
          The bounded contexts identified for this product — each a boundary where one model and language stay
          consistent, tagged <b>Core / Supporting / Generic</b>. <b>Open any context</b> to see its language, domain
          model, and how its capabilities are realized. (The <b>Context map</b> — how they relate — is its own page.)
        </p>
      </div>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.ctx} w={14} /> Bounded contexts</div>
          <div className="asc-sec-sub">{D.contexts.length} identified · click to open</div>
        </div>
        <div className="ddd-ctx-grid">{D.contexts.map(c => <ContextCard c={c} key={c.id} onSelect={navSel} />)}</div>
      </div>
    </div>
  );
}

/* the context map — its own Design page: how the contexts relate (one per product) */
function DesignContextMap({ product, prd }) {
  const D = dddData(product);
  if (!prd || !D) return <div className="ddd-empty">No context map yet — it appears once bounded contexts are identified.</div>;
  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · CONTEXT MAP</div>
        <p className="ddd-lead">
          How the bounded contexts relate — <b>one map per product</b>. <b>Solid</b> = a relationship between contexts
          you own; <b>dashed</b> = an external context reached through an anti-corruption layer (ACL).
        </p>
      </div>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> Context map</div>
          <div className="asc-sec-sub">Solid = relationship · dashed = external (ACL) · one map per product</div>
        </div>
        {DDMermaid && <DDMermaid code={contextMapMermaid(D)} caption="Context map — published language / anti-corruption layer at the boundaries" />}
      </div>
    </div>
  );
}

/* ====================== 3 · CAPABILITIES & REALIZATION ====================== */
function RealizationCard({ r }) {
  const f = FORM[r.form] || { label: r.form, tone: 'code' };
  const ag = AGENCY[r.agency] || { label: r.agency, tone: 'ok' };
  return (
    <div className="ddd-real">
      <div className="ddd-real-h">
        <DDRef id={r.ucId} />
        {r.provisional && <span className="ddd-prov">provisional</span>}
      </div>
      <div className="ddd-axes">
        <div className="ddd-axis"><div className="ddd-axis-k">Form</div><span className={'ddd-form ' + f.tone}>{f.label}</span></div>
        <div className="ddd-axis"><div className="ddd-axis-k">Composition</div><span className="ddd-comp">{r.composition}</span></div>
        <div className="ddd-axis"><div className="ddd-axis-k">Surface</div><span className="ddd-surface">{SURFACE[r.surface] || r.surface}</span></div>
        <div className="ddd-axis"><div className="ddd-axis-k">Agency</div><span className={'ddd-agency ' + ag.tone}>{ag.label}</span></div>
      </div>
      {r.composition === 'workflow' && (
        <div className="ddd-flow">
          {r.nodes.map((n, i) => (
            <React.Fragment key={i}>
              <span className="ddd-node">{n}</span>
              {i < r.nodes.length - 1 && <span className="ddd-node-arrow"><DDPico d={DDI.arrow} w={13} /></span>}
            </React.Fragment>
          ))}
        </div>
      )}
      {r.enforces && r.enforces.length > 0 && (
        <div className="ddd-enf">
          <div className="ddd-enf-h"><DDPico d={DDI.shield} w={12} /> Invariants enforced ({f.label})</div>
          {r.enforces.map((e, i) => (
            <div className="ddd-enf-row" key={i}>
              <span className="ddd-enf-inv">{e.inv}</span>
              <span className="ddd-enf-arrow"><DDPico d={DDI.arrow} w={12} /></span>
              <span className="ddd-enf-by">{e.by}</span>
            </div>
          ))}
        </div>
      )}
      <div className="ddd-meta">
        <div className="ddd-meta-row"><span className="ddd-meta-k"><DDPico d={DDI.test} w={12} /> Test</span><span className="ddd-meta-v">{r.testStrategy}</span></div>
        <div className="ddd-meta-row"><span className="ddd-meta-k"><DDPico d={DDI.bulb} w={12} /> Why</span><span className="ddd-meta-v">{r.rationale}</span></div>
      </div>
    </div>
  );
}

function DesignRealization({ product, prd }) {
  const D = dddData(product);
  if (!prd || !D) return <div className="ddd-empty">No realization decisions yet.</div>;
  const ucTitle = id => { const u = (prd.usecases || []).find(x => x.id === id); return u ? u.title : id; };
  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <div className="ddd-eyebrow"><DDPico d={DDI.cap} w={12} /> DESIGN · CAPABILITIES & REALIZATION</div>
        <p className="ddd-lead">
          One decision per capability (≈ use case): the <b>realization</b> on three axes — <b>form × composition × surface</b> —
          preferring the <b>least-agentic</b> combination that satisfies it. The domain model's invariants are <b>enforced per form</b>
          (the same rule, a different mechanism). A full application is one outcome, not the default.
        </p>
      </div>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.cap} w={14} /> Realization decisions</div>
          <div className="asc-sec-sub">{D.realizations.length} decisions · grouped by context · least-agentic-first</div>
        </div>
        {D.contexts.filter(c => c.capabilities.length).map(c => (
          <div className="ddd-ctx-group" key={c.id}>
            <div className="ddd-ctx-group-h"><span className={'ddd-class ' + c.classification}>{c.classification}</span> {c.name}</div>
            <div className="ddd-real-list">
              {D.realizations.filter(r => r.context === c.id).map(r => (
                <div key={r.ucId}>
                  <div className="ddd-uc-title">{ucTitle(r.ucId)}</div>
                  <RealizationCard r={r} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.DesignDomainModel = DesignDomainModel;
window.DesignContexts = DesignContexts;
window.DesignContextMap = DesignContextMap;
window.DesignRealization = DesignRealization;
