import React from 'react';
import dynamic from 'next/dynamic';
import './trace-core';
import './ddd-data';
import './domain-model-data';
import { seedFlows } from '../flow/data';
import { claimsFlows } from '../flow/claims-flows';
import { CLAIMS_LIFECYCLES, lifecycleCheck, lifecycleGrounds } from '../flow/claims-lifecycle';
import { kgContracts } from './kg-query';
import { componentById, componentsForBC, deriveArch } from '../flow/arch';
const { Ref: DDRef } = window;

// the event-flow canvas (embedded @flowai/canvas) — client-only, heavy, load on demand
const FlowEmbed = dynamic(() => import('../flow/FlowEmbed.jsx'), { ssr: false });
// which bounded contexts have a modelled event flow
const FLOW_BY_CONTEXT = {
  'BC-DEC': 'decisioning', 'BC-CASE': 'casemgmt', 'BC-NOTIFY': 'notify',
  'CTX-FNOL': 'cc-fnol', 'CTX-COVERAGE': 'cc-coverage', 'CTX-AB': 'cc-ab', 'CTX-TOTAL-LOSS': 'cc-totalloss',
  'CTX-INTAKE': 'ds-intake',   // D-154: the accepted cut's first design-level storm
  'CTX-ADJUD': 'ds-adjud',     // D-155: the cut's centre of gravity
  'CTX-REPAIR': 'ds-repair', 'CTX-PAYMENTS': 'ds-payments',   // D-156
  'CTX-TOTALLOSS': 'ds-totalloss', 'CTX-RECOVERY': 'ds-recovery',
};

/* ============================================================
   Cynergis — Design surfaces (D-026 / D-027), in method order:
     1. DesignContexts     — bounded contexts + context map (distillation)
     2. DesignRealization  — per-capability realization (form×composition×surface)
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

function ContextOwnerAgent({ c, D, M, prd, onOpenKg }) {
  const [showHelp, setShowHelp] = React.useState(false);
  const [showPack, setShowPack] = React.useState(false);
  const a = c.agent;
  if (!a) {
    return (
      <div className="coa coa-none">
        <div className="coa-none-h"><DDPico d={DDI.owner} w={14} /> No bespoke subdomain agents</div>
        <div className="coa-none-t">This is a <b>generic</b> context — reuse an off-the-shelf service behind a thin adapter, governed by the neighbouring agent. No expert to install.</div>
      </div>
    );
  }
  const aggregates = ((M && M.aggregates) || []).filter(x => x.context === c.id);
  // policies are derived from the flows (single source of truth — D-037)
  const policies = derivedPolicies().filter(p => p.owner === c.id);
  const needs = c.needs || [];
  const ruleList = [
    ...aggregates.flatMap(x => (x.invariants || []).map(iv => ({ text: iv.text, fr: iv.fr }))),
    ...policies.map(p => ({ text: `When ${p.when} → ${p.then.toLowerCase()}`, fr: (p.grounds || [])[0] })),
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
          <div className="coa-eyebrow">DOMAIN AGENT</div>
          <div className="coa-name">{a.name}</div>
          <div className="coa-tagline">The domain expert — install it in Claude Code or Cowork; it knows this subdomain and helps build it</div>
        </div>
        <button type="button" className="coa-help-btn" onClick={() => setShowHelp(s => !s)} title="What is a subdomain agent?">?</button>
      </div>

      {showHelp && (
        <div className="coa-help">
          <b>What is a subdomain agent?</b> Every subdomain ships an agent that owns its knowledge — a grounded expert
          you install in <b>Claude Code</b> (as a developer) or <b>Cowork</b> (as a business analyst) to understand and
          work with it. Under the hood it's a generic <b>skill</b> connected to this subdomain's <b>knowledge graph</b> —
          the typed facts of the model, projected live and queried over MCP. The <b>knowledge pack</b> is the same
          projection bundled for offline install. Every answer is grounded in the graph and cites its sources — ask it
          how something works, what a rule means, what data it needs, or what would break if you changed it.
        </div>
      )}

      <p className="coa-intro">
        This agent is the resident expert on the <b>{c.name}</b> subdomain, and it does two jobs:
        it <b>answers questions</b> about the subdomain — asked directly by a person, or by another agent when it
        takes part in an orchestration — and it answers them by <b>querying this subdomain's knowledge graph</b>,
        so every reply is grounded in the model, never improvised.
        {onOpenKg && <> {' '}<button type="button" className="coa-kg-link" onClick={onOpenKg}>View its knowledge graph →</button></>}
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

/* The subdomain's OPERATIONS agent, as designed (D-065). The domain agent above
   knows and builds the subdomain; this one is used by humans in live operation.
   Skills can be shared between the two. Its as-built form is Build › Agents. */
function OpsAgentCard({ c }) {
  const o = c.opsAgent;
  if (!o) return null;
  const goBuilt = () => {
    window.__cynAgentOpen = { id: o.asBuilt, tab: 'knowledge' };
    const nav = window.__cynNav || {};
    const scope = window.__cynGroundScope || {};   // set when the element mounts on the org altitude (R3)
    const t = { v: 'prod', pf: nav.pf || scope.pf, prod: nav.prod || scope.prod, sub: 'dashboard', phase: 'Build', entry: 'agents' };
    window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
  };
  return (
    <div className={'coa coa-ops ' + c.classification}>
      <div className="coa-head">
        <span className="coa-ico"><DDPico d={DDI.owner} w={16} /></span>
        <div className="coa-id">
          <div className="coa-eyebrow">OPERATIONS AGENT</div>
          <div className="coa-name">{o.name}</div>
          <div className="coa-tagline">Used by humans in operation — it assists, executes, investigates, and responds</div>
        </div>
      </div>

      <p className="coa-intro">{o.charter}</p>

      <div className="coa-block">
        <div className="coa-blk-h">Skills, as designed <span className="coa-blk-sub">the trust tier is the intent — earned and governed once deployed · shared skills are carried by both agents</span></div>
        <div className="coa-opskills">
          {o.skills.map((sk, i) => (
            <div className={'coa-opskill' + (sk.planned ? ' planned' : '')} key={i}>
              <span className={'agb-tier ' + sk.tier.toLowerCase()}>{sk.tier}</span>
              <span className="coa-opskill-nm">{sk.name}</span>
              {sk.shared && <span className="coa-shared" title="Shared with the domain agent">shared</span>}
              {sk.planned && <span className="coa-shared planned">planned</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="coa-block">
        <div className="coa-blk-h">Permission boundary</div>
        <ul className="coa-rules">{o.permissions.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>

      <div className="coa-install-note">
        Defined here in Design; deployed and governed in Build/Operate —
        <button type="button" className="coa-kg-link" onClick={goBuilt}> as built: MCP toolset · evals · trust ladder →</button>
      </div>
    </div>
  );
}

/* The Agents tab (D-065): a segmented switch between the subdomain's two
   agents — one card at a time instead of a scroll. Hidden when a context has
   no ops agent (or no agents at all — the generic-context card covers that). */
function AgentsTab({ c, D, M, prd, onOpenKg }) {
  const [which, setWhich] = React.useState('domain');
  const hasBoth = !!(c.agent && c.opsAgent);
  return (
    <>
      {hasBoth && (
        <div className="dd-iseg coa-switch" role="group" aria-label="Agent">
          <button type="button" className={'dd-iseg-btn' + (which === 'domain' ? ' on' : '')} aria-pressed={which === 'domain'} onClick={() => setWhich('domain')}>Domain agent</button>
          <button type="button" className={'dd-iseg-btn' + (which === 'ops' ? ' on' : '')} aria-pressed={which === 'ops'} onClick={() => setWhich('ops')}>Operations agent</button>
        </div>
      )}
      {(which === 'domain' || !hasBoth) && <ContextOwnerAgent c={c} D={D} M={M} prd={prd} onOpenKg={onOpenKg} />}
      {which === 'ops' && hasBoth && <OpsAgentCard c={c} />}
    </>
  );
}

const CLASS_TONE = { core: 'core', supporting: 'supporting', generic: 'generic' };

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

const dddData = product => (window.__DDD__ && window.__DDD__.byProduct[product.id]) || null;
const domainData = product => (window.__DOMAIN__ && window.__DOMAIN__.byProduct[product.id]) || null;

/* Policies are DERIVED from the storming flows (flow/data.js — single source of
   truth): every node.policies entry reads "When X → Y". The OWNER (the context
   that executes the THEN) is the crosses target, or the flow's own context when
   the reaction stays inside. Consumed by the bounded context's
   Policies tab and the knowledge pack. */
const derivedPolicies = () => [...seedFlows, ...claimsFlows].flatMap(f =>
  f.nodes.flatMap(n => (n.policies || []).map((p, i) => {
    const [whenRaw, then] = (p.label || '').split('→').map(s => s.trim());
    return {
      id: `${n.id}-pol-${i}`,
      when: (whenRaw || '').replace(/^When\s+/i, ''),
      then: then || '',
      note: p.desc,
      grounds: p.grounds || [],
      event: n.summary,
      from: f.contextId,
      owner: p.crosses || f.contextId,
    };
  })));

/* Grounding (provenance / addressability) — the agent grounds ONLY in captured evidence.
   Derive the context's sources from the citation map (window.prdEvidence.cites): the Sources
   that evidence its use cases. Any use case with no citation surfaces as an *assumed* gap —
   we never invent a source. */
function groundingFor(c, prd) {
  const ev = (prd && prd.evidence) || window.prdEvidence;   // a Meridian PRD grounds in ITS evidence (D-106)
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
  const policies = derivedPolicies().filter(p => p.owner === c.id);   // the reactions this context owns
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

/* ── Unified aggregate card (D-043) — the modern-DDD minimal capture ──
   One structure per aggregate: identity + STATE SHAPE with three markers
   (id / ref / fk·owned; an unmarked field is a value object) + invariants +
   commands in / events out + the store. The logical schema IS this shape —
   values → columns, owned children → child tables with in-aggregate FKs,
   refs → identity columns that are never joined — so nothing is authored twice. */
function AggregateUnit({ a }) {
  const A = (typeof window !== 'undefined' && window.__ARCH__) || {};
  const ref = a.archRef || {};
  // D-182: the state shape can be authored directly on the seed (a.shape) —
  // the claims records do this; the fraud ones still join via archRef.
  const agg = a.shape || (ref.component ? (componentById(ref.component) || {}).aggregate
    : ref.domain ? ((A.domains || []).find(d => d.id === ref.domain) || {}).aggregate
    : null);
  const tables = (agg && agg.tables) || [];
  const root = tables.find(t => !t.owned) || tables[0];
  const owned = tables.filter(t => t.owned);
  const refs = tables.flatMap(t => (t.columns || []).filter(col => col.role === 'ref').map(col => ({ ...col, table: t.name })));
  const Badge = ({ col }) => col.role === 'id' ? <span className="agu-badge id">id</span>
    : col.role === 'ref' ? <span className="agu-badge ref">ref → {col.refTo}</span>
    : col.role === 'fk' ? <span className="agu-badge fk">fk → {col.refTo}</span>
    : null;
  const Tbl = ({ t, tag }) => (
    <div className="agu-tbl">
      <div className="agu-tbl-h">{t.name}<span className="agu-tbl-tag">{tag}</span><span className="agu-tbl-p">{t.purpose}</span></div>
      {(t.columns || []).map(col => (
        <div className="agu-row" key={col.name}>
          <span className="agu-f">{col.name}</span>
          <Badge col={col} />
          <span className="agu-ty">{col.type}</span>
          <span className="agu-d">{col.desc}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="agu">
      <div className="agu-h">
        <span className="dm-agg-ico"><DDPico d={DDI.agg} w={15} /></span>
        <span className="agu-nm">{a.name}</span>
        <span className="agu-aid">{a.id}</span>
        {agg && <span className="agu-store">{agg.store}</span>}
        <span className="agu-ucs" onClick={e => e.stopPropagation()}>{a.ucs.map(id => <DDRef id={id} key={id} />)}</span>
      </div>
      {agg && <div className="agu-about">{agg.description}</div>}

      <div className="agu-sec">state shape <span className="agu-sec-sub">unmarked fields are values · this shape is the logical schema</span></div>
      {root && <Tbl t={root} tag="root entity" />}
      {owned.map(t => <Tbl t={t} key={t.name} tag="owned · child entity" />)}
      {refs.length > 0 && (
        <div className="agu-refs"><DDPico d={DDI.arrow} w={11} /> <b>References by identity</b> — {refs.map((r, i) => (
          <span key={i}>{i > 0 && ' · '}<code>{r.table}.{r.name}</code> → {r.refTo}</span>
        ))} — carried by events, never joined.</div>
      )}

      <div className="agu-sec">rules & behavior</div>
      <div className="dm-row"><span className="dm-k inv"><DDPico d={DDI.shield} w={11} /> invariants</span>
        <ul className="dm-invs">{a.invariants.map((iv, i) => (
          <li key={i}>{iv.text} {iv.fr ? <DDRef id={iv.fr} /> : <span className="coa-rule-gap">no requirement captured</span>}</li>
        ))}</ul></div>
      <div className="dm-row"><span className="dm-k command"><DDPico d={DDI.command} w={11} /> in</span>
        <span className="dm-chips">{a.commands.map(x => <span key={x} className="dm-chip command">{x}</span>)}</span></div>
      <div className="dm-row"><span className="dm-k event"><DDPico d={DDI.event} w={11} /> out</span>
        <span className="dm-chips">{a.events.map(x => <span key={x} className="dm-chip event">{x}</span>)}</span></div>
    </div>
  );
}

/* ====================== BOUNDED CONTEXTS (hub + drill-in) ======================
   (The standalone “Domain model” page was retired — its aggregate and policy
   views live in the per-context Aggregates / Policies tabs, which are richer.) */
function ContextCard({ c, onSelect }) {
  const drill = () => onSelect && onSelect(c.id);
  return (
    <div className={'ddd-ctx ddd-ctx-click ' + CLASS_TONE[c.classification]} role="button" tabIndex={0}
      onClick={drill} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(); } }}>
      <div className="ddd-ctx-h">
        <span className="ddd-ctx-nm">{c.name}</span>
        <span className={'ddd-class ' + c.classification}>{c.classification}</span>
        {c.superseded && <span className="ddd-class superseded" title={'Superseded by the D-152 cut — successor: ' + c.superseded}>superseded → {c.superseded}</span>}
        {c.deferredForward && <span className="ddd-class deferredfwd" title="Deliberately last; carries forward into the new cut unchanged">deferred — carries forward</span>}
      </div>
      {/* Kept lean (D-041): the ubiquitous-language terms live in the drill-in's
          Language tab; the card carries only identity, note, and the UC chips
          (traceability). The whole card is clickable — no explicit drill affordance. */}
      <div className="ddd-ctx-note">{c.note}</div>
      <div className="ddd-ctx-caps">
        {(c.capabilities || []).length
          ? (c.capabilities || []).map(id => <span key={id} onClick={e => e.stopPropagation()}><DDRef id={id} /></span>)
          : <span className="ddd-nocap">no bespoke capability — reuse</span>}
      </div>
    </div>
  );
}

/* ── Subdomain knowledge graph (D-042) ──
   The queryable graph behind the context agent: typed nodes + labelled edges,
   DERIVED live from the storming flows, the domain model, the components and
   the contract registry — never hand-authored, so it cannot drift. Deployed
   with the agent as its MCP knowledge source; the knowledge pack is the same
   projection bundled for offline install. */
function contextGraph(c, D, M) {
  const A = (typeof window !== 'undefined' && window.__ARCH__) || {};
  const nodes = []; const edges = []; const seen = new Set();
  // `code` is the short tag the explorer node shows; real ids (UC1, C1, AGG-*)
  // display themselves, synthetic nodes get a type tag.
  const addN = (id, type, label, code) => { if (!seen.has(id)) { seen.add(id); nodes.push({ id, type, label: label || id, code }); } return id; };
  const addE = (from, rel, to) => { if (from && to) edges.push({ from, rel, to }); };

  addN(c.id, 'context', c.name);
  if (c.agent) { addN('agent', 'agent', c.agent.name, 'AGENT'); addE('agent', 'answers for', c.id); }

  // aggregates → invariants → mandating requirements
  const aggs = ((M && M.aggregates) || []).filter(x => x.context === c.id);
  aggs.forEach(a => {
    addN(a.id, 'aggregate', a.name); addE(c.id, 'contains', a.id);
    (a.invariants || []).forEach((iv, i) => {
      const id = `${a.id}-inv-${i}`; addN(id, 'invariant', iv.text, 'INV'); addE(a.id, 'holds', id);
      if (iv.fr) { addN(iv.fr, 'requirement', iv.fr); addE(id, 'mandated by', iv.fr); }
    });
  });

  // the storming flow: events · commands · handling components · policies
  const flow = seedFlows.find(f => f.contextId === c.id);
  (flow?.nodes || []).forEach(n => {
    addN(n.id, 'event', n.summary, 'EVENT');
    if (n.aggregate) { addN(n.aggregate, 'aggregate', n.aggregate); addE(n.aggregate, 'emits', n.id); }
    (n.commands || []).forEach((cmd, i) => {
      const id = `${n.id}-cmd-${i}`; addN(id, 'command', cmd.label, 'CMD');
      addE(id, 'produces', n.id);
      if (cmd.on) { addN(cmd.on, 'aggregate', cmd.on); addE(id, 'targets', cmd.on); }
    });
    const comp = (n.arch || deriveArch(n) || {}).component;
    if (comp) { addN(comp, 'component', (componentById(comp) || {}).name || comp); addE(comp, 'handles', n.id); }
    (n.policies || []).forEach((p, i) => {
      const id = `${n.id}-pol-${i}`; addN(id, 'policy', p.label, 'POLICY');
      addE(id, 'reacts to', n.id);
      if (p.crosses && p.crosses !== c.id) { addN(p.crosses, 'context', p.crosses); addE(id, 'fires into', p.crosses); }
      (p.grounds || []).forEach(g => { addN(g, 'requirement', g); addE(id, 'grounded by', g); });
    });
  });

  // event functions of the context + the contracts they publish / consume
  const comps = componentsForBC(c.id);
  comps.forEach(comp => { addN(comp.id, 'component', comp.name); addE(c.id, 'contains', comp.id); });
  const ids = new Set(comps.map(x => x.id));
  (A.schemas || []).forEach(s => {
    const prod = (s.producers || []).filter(p => ids.has(p));
    const cons = (s.consumers || []).filter(x => ids.has(x));
    if (!prod.length && !cons.length) return;
    addN(s.id, 'contract', `${s.name} v${s.version}`);
    prod.forEach(p => addE(p, 'publishes', s.id));
    cons.forEach(x => addE(x, 'consumes', s.id));
  });

  // capabilities and the event functions realizing them
  (c.capabilities || []).forEach(uc => { addN(uc, 'capability', uc); addE(c.id, 'groups', uc); });
  ((D && D.realizations) || []).filter(r => r.context === c.id).forEach(r =>
    (r.components || []).forEach(cp => { addN(cp, 'component', (componentById(cp) || {}).name || cp); addE(r.ucId, 'realized by', cp); }));

  return { nodes, edges };
}

/* The explorer's vocabulary for subdomain graphs — columns read left→right as
   the model was built: agent/context → capabilities & requirements → the
   aggregate model → behavior → realization → contracts. */
const KG_COLS = [['agent', 'context'], ['capability', 'requirement'], ['aggregate', 'invariant'], ['command'], ['event'], ['policy'], ['component'], ['contract']];
const KG_VTYPE = {
  context:     { label: 'Bounded context', ico: 'graph',   c: 'oklch(0.50 0.13 275)' },
  agent:       { label: 'Agent',           ico: 'user',    c: 'oklch(0.55 0.09 200)' },
  capability:  { label: 'Capability',      ico: 'usecase', c: 'oklch(0.52 0.15 255)' },
  requirement: { label: 'Requirement',     ico: 'req',     c: 'oklch(0.58 0.12 75)'  },
  aggregate:   { label: 'Aggregate',       ico: 'doc',     c: 'oklch(0.60 0.11 95)'  },
  invariant:   { label: 'Invariant',       ico: 'lock',    c: 'oklch(0.50 0.05 260)' },
  command:     { label: 'Command',         ico: 'export',  c: 'oklch(0.55 0.12 250)' },
  event:       { label: 'Domain event',    ico: 'metric',  c: 'oklch(0.60 0.14 40)'  },
  policy:      { label: 'Policy',          ico: 'policy',  c: 'oklch(0.55 0.12 295)' },
  component:   { label: 'Component',       ico: 'graph',   c: 'oklch(0.52 0.13 268)' },
  contract:    { label: 'Contract',        ico: 'link',    c: 'oklch(0.55 0.10 215)' },
};

const KG_TYPE_ORDER = ['context', 'agent', 'aggregate', 'event', 'command', 'policy', 'invariant', 'component', 'contract', 'capability', 'requirement'];
function ContextKnowledgeGraph({ c, D, M }) {
  const raw = React.useMemo(() => contextGraph(c, D, M), [c]);
  // the explorer's shape: byId map + fwd/rev edge labels for the neighbour panel
  const g = React.useMemo(() => ({
    nodes: raw.nodes,
    edges: raw.edges.map(e => ({ from: e.from, to: e.to, fwd: e.rel, rev: e.rel })),
    byId: Object.fromEntries(raw.nodes.map(n => [n.id, n])),
  }), [raw]);
  const Explorer = typeof window !== 'undefined' ? window.GraphExplorer : null;
  const label = id => (g.byId[id] || {}).label || id;
  const isRef = id => /^(UC\d|FR\d|NFR\d|POL\d|SCH-|C\d|AGG)/.test(id);
  const byType = KG_TYPE_ORDER.map(t => [t, g.nodes.filter(n => n.type === t).length]).filter(([, n]) => n > 0);
  const byRel = {};
  g.edges.forEach(e => { (byRel[e.fwd] = byRel[e.fwd] || []).push(e); });
  return (
    <>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> Knowledge graph — what the agent queries</div>
          <div className="asc-sec-sub">Typed nodes + labelled edges, derived live from the flows, domain model, components and contracts — deployed with the agent as its MCP knowledge source. Every answer the agent gives resolves to a path in this graph. Click a node to walk it; hover to light up its neighbourhood.</div>
        </div>
        <div className="kg-stats">
          {byType.map(([t, n]) => <span key={t} className={'kg-stat kg-' + t}><b>{n}</b> {n > 1 ? (t === 'policy' ? 'policies' : t === 'capability' ? 'capabilities' : t + 's') : t}</span>)}
          <span className="kg-stat"><b>{g.edges.length}</b> facts</span>
        </div>
        {Explorer && <Explorer g={g} cols={KG_COLS} typeMeta={KG_VTYPE}
          emptyHint={`Click any node to see what it is and everything it connects to — the columns read left→right as the model was built: agent → capabilities & requirements → aggregates & invariants → commands → events → policies → event functions → contracts.`} />}
      </div>

      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.doc} w={14} /> The facts</div>
          <div className="asc-sec-sub">Every edge as a subject — relation — object triple; ids are clickable into the trace</div>
        </div>
        {Object.entries(byRel).map(([rel, list]) => (
          <div className="kg-relgroup" key={rel}>
            <div className="kg-rel-h">{rel} <span className="kg-rel-n">{list.length}</span></div>
            {list.map((e, i) => (
              <div className="kg-triple" key={i}>
                <span className="kg-sub">{isRef(e.from) ? <DDRef id={e.from} /> : <b>{label(e.from)}</b>}</span>
                <span className="kg-rel">{rel}</span>
                <span className="kg-obj">{isRef(e.to) ? <DDRef id={e.to} /> : label(e.to)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

/* per-context detail: event flow · agent · domain model · language */
/* ── D-177: the record's life story, drawn ──
   Spine = the main stages left to right; side stages (Denied) sit below;
   dashed arcs are the paths people forget: reopened, money after close.
   Same-stage events don't clutter the picture — they collapse into a
   small "recorded here" note under their stage (the table has them). */
function LifecycleDiagram({ lc }) {
  const spine = lc.stages.filter(s => !s.side);
  const sides = lc.stages.filter(s => s.side);
  const W = 920, PW = 118, PH = 40, Y = 46, SY = 158;
  const gap = (W - 24 - spine.length * PW) / Math.max(1, spine.length - 1);
  const X = {}; spine.forEach((s, i) => { X[s.id] = 12 + i * (PW + gap); });
  const cx = id => X[id] + PW / 2;
  const stageMoves = lc.moves.filter(m => m.from && m.to && m.from !== m.to);
  sides.forEach(sd => {
    const ins = stageMoves.filter(m => m.to === sd.id && X[m.from] != null);
    const cc = ins.length ? ins.reduce((a, m) => a + cx(m.from), 0) / ins.length + 40 : W / 2;
    X[sd.id] = Math.min(Math.max(12, cc - PW / 2), W - PW - 12);
  });
  const idx = id => spine.findIndex(s => s.id === id);
  const isSide = id => sides.some(s => s.id === id);
  const shortLabel = ev => { const p = ev.split('—'); return (p[1] || p[0]).trim().toLowerCase(); };
  const selfNotes = {};
  lc.moves.filter(m => m.from && m.to === m.from).forEach(m => { (selfNotes[m.from] = selfNotes[m.from] || []).push(shortLabel(m.event)); });
  return (
    <svg viewBox={`0 0 ${W} 236`} className="ddd-lc-svg" role="img" aria-label="lifecycle diagram">
      <defs>
        <marker id="lcArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="var(--ink-3, #6b7280)" />
        </marker>
      </defs>
      {lc.flags.map(f => (
        <text key={f.id} x={W / 2} y={16} textAnchor="middle" className="ddd-lc-flag">⏸ {f.name} — {f.def.split('.')[0]}.</text>
      ))}
      {stageMoves.map((m, i) => {
        const a = idx(m.from), b = idx(m.to);
        if (isSide(m.to)) {
          const x1 = cx(m.from), x2 = X[m.to] + PW / 2 + (cx(m.from) < X[m.to] + PW / 2 ? -22 : 22);
          return (<g key={i}>
            <path d={`M ${x1} ${Y + PH} C ${x1} ${SY - 28}, ${x2} ${SY - 34}, ${x2} ${SY - 3}`} className="ddd-lc-edge" markerEnd="url(#lcArr)" />
            <text x={(x1 + x2) / 2 - 6} y={(Y + PH + SY) / 2 + 2} textAnchor="middle" className="ddd-lc-lbl">{shortLabel(m.event)}</text>
          </g>);
        }
        if (isSide(m.from)) {
          const x1 = X[m.from] + PW - 10, x2 = cx(m.to) + 14;
          return (<g key={i}>
            <path d={`M ${x1} ${SY} C ${x1 + 40} ${SY - 40}, ${x2} ${Y + PH + 34}, ${x2} ${Y + PH + 3}`} className="ddd-lc-edge back" markerEnd="url(#lcArr)" />
            <text x={(x1 + x2) / 2 + 34} y={(Y + PH + SY) / 2 + 12} textAnchor="middle" className="ddd-lc-lbl">{shortLabel(m.event)}</text>
          </g>);
        }
        if (b === a + 1) return <path key={i} d={`M ${X[m.from] + PW} ${Y + PH / 2} L ${X[m.to] - 2} ${Y + PH / 2}`} className="ddd-lc-edge" markerEnd="url(#lcArr)" />;
        if (b > a + 1) {
          const x1 = cx(m.from), x2 = cx(m.to);
          return <path key={i} d={`M ${x1} ${Y} C ${x1} ${Y - 26}, ${x2} ${Y - 26}, ${x2} ${Y - 2}`} className="ddd-lc-edge" markerEnd="url(#lcArr)" />;
        }
        const x1 = cx(m.from), x2 = cx(m.to) + 20;
        return (<g key={i}>
          <path d={`M ${x1} ${Y + PH} C ${x1} 228, ${x2} 228, ${x2} ${Y + PH + 3}`} className="ddd-lc-edge back" markerEnd="url(#lcArr)" />
          <text x={(x1 + x2) / 2} y={222} textAnchor="middle" className="ddd-lc-lbl">{shortLabel(m.event)}</text>
        </g>);
      })}
      {lc.stages.map(s => (
        <g key={s.id}>
          <rect x={X[s.id]} y={isSide(s.id) ? SY : Y} width={PW} height={PH} rx="10"
            className={'ddd-lc-pill' + (s.terminal ? ' term' : '') + (s.side ? ' side' : '')} />
          <text x={X[s.id] + PW / 2} y={(isSide(s.id) ? SY : Y) + 24} textAnchor="middle" className="ddd-lc-name">{s.name}</text>
          {selfNotes[s.id] && (
            <text x={Math.min(X[s.id] + PW / 2, W - 8)} y={(isSide(s.id) ? SY : Y) + PH + 13}
              textAnchor={X[s.id] + PW / 2 > W - 130 ? 'end' : 'middle'} className="ddd-lc-note">{selfNotes[s.id].join(' · ')} — recorded here</text>
          )}
        </g>
      ))}
    </svg>
  );
}

// legacy deep links / cached tab state from the pre-split page (D-037)
const LEGACY_TAB = { model: 'aggregates', rels: 'contracts' };
const normCtxTab = t => (t && (LEGACY_TAB[t] || t)) || 'flow';

/* the crumb + status banners + summary shared by the old in-page detail and
   the D-179 workspace — one header, two shells */
function BcHead({ c, onBack }) {
  return (<>
    <div className="ddd-crumbhead">
      <h2 className="ddd-crumb-title">
        <button type="button" className="ddd-crumb-link" onClick={onBack}>Bounded contexts</button>
        <span className="ddd-crumb-sep">›</span>
        <span className="ddd-crumb-cur">{c.name}</span>
      </h2>
      <span className={'ddd-class ' + c.classification}>{c.classification} subdomain</span>
    </div>
    {c.superseded && (
      <div className="ddd-superseded-banner">
        Superseded by the D-152 cut — its successor is <b>{c.superseded}</b>. This wall stays readable while the migration (agents, capabilities, grounded evidence) completes; it retires only once the successor carries everything — rehome, never remove.
      </div>
    )}
    {c.deferredForward && (
      <div className="ddd-superseded-banner" style={{ borderColor: 'var(--line)', background: 'var(--panel-2)' }}>
        Deliberately deferred — this wall carries forward into the new cut unchanged. The AB module is last, by plan.
      </div>
    )}
    <p className="ddd-detail-note">{c.summary || c.note}</p>
  </>);
}

/* ── D-180: the Lifecycle surface, split into views so each part breathes ──
   Story (the picture + stage definitions) · Moves (the table) · Never rules
   (the guardrails) · ⚠ To Discover (rules the design found that no captured
   requirement backs). The story-vs-wall check shows above whichever view is
   open — it is rare and must not hide behind a tab. */
function LifecycleSurface({ c, navTab }) {
  const LC = CLAIMS_LIFECYCLES[c.id];
  const [view, setView] = React.useState('story');
  if (!LC) return null;
  const stageName = id => (LC.stages.find(s => s.id === id) || {}).name;
  const chk = lifecycleCheck(c.id);
  const G = lifecycleGrounds(c.id);
  const unmined = { moves: [], rules: LC.never.filter(n => !(n.grounds || []).length) };
  const seenEv = new Set();
  for (const m of LC.moves) {
    if ((G[m.event] || []).length || seenEv.has(m.event)) continue;
    seenEv.add(m.event); unmined.moves.push(m);
  }
  const nDisc = unmined.moves.length + unmined.rules.length;
  const Grounds = ({ ids }) => (ids || []).length
    ? (ids || []).map(g => <DDRef id={g} key={g} />)
    : <span className="ddd-lc-unmined" title="No captured requirement behind this yet — asserted while designing">⚠</span>;
  const VIEWS = [
    { key: 'story', label: 'State machine' },
    { key: 'moves', label: 'Transitions' },
    { key: 'never', label: 'Transition rules' },
    ...(nDisc ? [{ key: 'disc', label: `⚠ Gaps with Discovery · ${nDisc}` }] : []),
  ];
  return (<>
    <div className="ddd-tabs ddd-subtabs">
      {VIEWS.map(v => (
        <button key={v.key} type="button" className={'ddd-tab' + (view === v.key ? ' on' : '')} onClick={() => setView(v.key)}>{v.label}</button>
      ))}
    </div>

    {chk && !chk.healthy && (
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Story vs wall — needs attention</div>
          <div className="asc-sec-sub">The story and the flow disagree; one of them is wrong.</div>
        </div>
        {chk.cardsWithoutRow.map(e => <div className="ddd-lc-never warn" key={'a' + e}><b>&ldquo;{e}&rdquo;</b><span>is on the wall, but the story has no row for it.</span></div>)}
        {chk.rowsWithoutCard.map(e => <div className="ddd-lc-never warn" key={'b' + e}><b>&ldquo;{e}&rdquo;</b><span>is in the story, but no card on the wall says it.</span></div>)}
        {chk.unreachable.map(st => <div className="ddd-lc-never warn" key={'c' + st}><b>{st}</b><span>is a stage no move can reach.</span></div>)}
      </div>
    )}

    {view === 'story' && (
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> The life of {LC.record.toLowerCase()}</div>
          <div className="asc-sec-sub">{LC.summary} The story is checked automatically against the wall — a card without a row in the moves, or a stage nothing can reach, is flagged on this page.</div>
        </div>
        <LifecycleDiagram lc={LC} />
        <div className="ddd-lc-defs">
          {LC.stages.map(st => <div key={st.id} className="ddd-lc-def"><b>{st.name}</b> — {st.def}</div>)}
          {LC.flags.map(f => <div key={f.id} className="ddd-lc-def flag"><b>⏸ {f.name}</b> — {f.def}</div>)}
        </div>
      </div>
    )}

    {view === 'moves' && (
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.policy} w={14} /> The moves — what advances the file</div>
          <div className="asc-sec-sub">One row per event on the wall — same names, same facts. Click an event to open the flow; the last column names the Discover item behind the move, or ⚠ where none exists yet.</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ddd-lc-table">
            <thead><tr><th>From</th><th>What happens</th><th>Only if</th><th>New stage</th><th>Also tells</th><th>Grounded in</th></tr></thead>
            <tbody>
              {LC.moves.map((m, i) => (
                <tr key={i}>
                  <td>{m.flag ? 'any open stage' : (m.from ? stageName(m.from) : '—')}</td>
                  <td><button type="button" className="dm-chip event ddd-lc-ev" onClick={() => navTab('flow')}>{m.event}</button></td>
                  <td>{m.onlyIf}</td>
                  <td>{m.flag
                    ? `same stage · ${(LC.flags.find(f => f.id === m.flag) || {}).name} flag set`
                    : (m.to === m.from ? 'unchanged' : stageName(m.to))}</td>
                  <td>{m.tells || '—'}</td>
                  <td className="ddd-lc-gr"><Grounds ids={G[m.event]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {view === 'never' && (
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.ctx} w={14} /> Never — whatever the stage</div>
          <div className="asc-sec-sub">The rules a builder may not soften. Each is enforced in code, not trusted — and each names the Discover item behind it, or ⚠ where none exists yet.</div>
        </div>
        {LC.never.map((n, i) => (
          <div className="ddd-lc-never" key={i}><b>{n.rule}</b><span>{n.why} <Grounds ids={n.grounds} /></span></div>
        ))}
      </div>
    )}

    {view === 'disc' && nDisc > 0 && (
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title">⚠ Found in design — not yet in Discover</div>
          <div className="asc-sec-sub">These rules came from working the storm; no captured requirement says them yet. Candidates to take back to Discover and record as requirements — until then they stand as assertions.</div>
        </div>
        {unmined.rules.map((n, i) => (
          <div className="ddd-lc-never disc" key={'r' + i}><b>{n.rule}</b><span>{n.why}</span></div>
        ))}
        {unmined.moves.map((m, i) => (
          <div className="ddd-lc-never disc" key={'m' + i}><b>&ldquo;{m.event}&rdquo;</b><span>{m.onlyIf}</span></div>
        ))}
      </div>
    )}
  </>);
}

function ContextDetail({ c, D, M, prd, onBack }) {
  const [tab, setTab] = React.useState(() => normCtxTab(window.__cynCtxTab));   // restore on remount (Back / deep link)
  // navTab writes the active tab to the URL so Back/Forward + sharing work
  const navTab = (t) => {
    window.__cynCtxTab = t; setTab(t);
    window.__cynPushProd?.();
  };
  React.useEffect(() => {
    window.__cynSetTab = t => { const v = normCtxTab(t); window.__cynCtxTab = v; setTab(v); };  // raw apply for Back/Forward (no URL push)
    return () => { delete window.__cynSetTab; };
  });
  return (
    <div className="ddd-wrap">
      <BcHead c={c} onBack={onBack} />
      <BcTabs c={c} D={D} M={M} prd={prd} tab={tab} navTab={navTab} />
    </div>
  );
}

/* The BC tabbed element, extracted for reuse (R3, D-109): the product page's
   ContextDetail wraps it with the crumb + URL-wired tab state above; the
   Meridian subdomain page mounts it directly (window.CynBcTabs) with local
   tab state — one element, two homes, same seeds. */
function BcTabs({ c, D, M, prd, tab, navTab, hideTabs }) {
  const aggregates = (M ? M.aggregates : []).filter(a => a.context === c.id);
  const policies = derivedPolicies().filter(p => p.owner === c.id);   // the reactions this context owns (derived from the flows)
  const reals = D.realizations.filter(r => r.context === c.id);
  const ucTitle = id => { const u = (prd.usecases || []).find(x => x.id === id); return u ? u.title : id; };
  // BC-level tabs mirror the event-card panel's ownership levels (D-037): the
  // read-only Aggregate / Contracts cards on events point HERE as the edit home.
  // D-177: the Lifecycle tab exists only where the record's story is written —
  // the tab's presence tells you the work exists (no empty tabs).
  const LC = CLAIMS_LIFECYCLES[c.id];
  const TABS = [
    { key: 'flow',         label: 'Event flow' },
    { key: 'agent',        label: 'Agents' },
    { key: 'kg',           label: 'Knowledge graph' },
    { key: 'aggregates',   label: 'Aggregates' },
    ...(LC ? [{ key: 'lifecycle', label: 'Lifecycle' }] : []),
    { key: 'policies',     label: 'Policies' },
    { key: 'capabilities', label: 'Capabilities' },
    { key: 'contracts',    label: 'Contracts' },
    { key: 'lang',         label: 'Ubiquitous Language' },
  ];

  return (
    <>
      {/* D-179: inside the BC workspace the left menu does the navigating — no tab row */}
      {!hideTabs && (
        <div className="ddd-tabs">
          {TABS.map(t => (
            <button key={t.key} type="button" className={'ddd-tab' + (tab === t.key ? ' on' : '')} onClick={() => navTab(t.key)}>{t.label}</button>
          ))}
        </div>
      )}

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

      {tab === 'agent' && <AgentsTab key={c.id} c={c} D={D} M={M} prd={prd} onOpenKg={() => navTab('kg')} />}

      {tab === 'kg' && <ContextKnowledgeGraph c={c} D={D} M={M} />}

      {tab === 'flow' && (
        (FLOW_BY_CONTEXT[c.id] || (typeof window !== 'undefined' && (window.__DERIVED_FLOWS_BY_CTX__ || {})[c.id]))
          ? <div className="ddd-wrap" style={{ paddingTop: '4px' }}>
              <p className="ddd-lead" style={{ marginBottom: '10px' }}>
                How work moves through this context over time — click an event to inspect its commands, rules,
                read models and reactions, each grounded in a captured node. (<b>Tree</b> shows the whole flow;
                <b> Org</b> focuses one path.)
              </p>
              <div style={{ height: '620px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
                <FlowEmbed flowId={FLOW_BY_CONTEXT[c.id] || (window.__DERIVED_FLOWS_BY_CTX__ || {})[c.id]} />
              </div>
            </div>
          : <div className="ddd-empty-inline">No event flow modelled for this context yet.</div>
      )}

      {tab === 'aggregates' && (
        <div className="asc-section ddd-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DDPico d={DDI.agg} w={14} /> {aggregates.length === 1 ? 'The record this context owns' : 'The records this context owns'} — {aggregates.length || 'no'} aggregate{aggregates.length === 1 ? '' : 's'}</div>
            <div className="asc-sec-sub">An aggregate is one record changed as a unit — its commands, the events they raise, and the rules that guard every change. Between aggregates: identity references and events. Between contexts: contracts.</div>
          </div>
          {aggregates.length
            ? <div className="agu-list">{aggregates.map(a => <AggregateUnit a={a} key={a.id} />)}</div>
            : <div className="ddd-empty-inline">No record modelled for this context yet. A generic, pure-reaction context genuinely owns none; for a core or supporting context this is a modelling gap.</div>}
        </div>
      )}

      {tab === 'lifecycle' && LC && <LifecycleSurface c={c} navTab={navTab} />}

      {tab === 'policies' && (() => {
        const all = derivedPolicies();
        const outbound = all.filter(p => p.from === c.id && p.owner !== c.id);
        const polRow = p => (
          <div className="dm-pol" key={p.id}>
            <span className="dm-chip event">{p.when}</span>
            <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
            <span className="dm-chip command">{p.then}</span>
            <span className="dm-pol-note">{p.note} {p.grounds.map(g => <DDRef id={g} key={g} />)}
              <span className="dm-pol-src">on “{p.event}”{p.owner !== p.from ? ` · ${p.from} → ${p.owner}` : ''}</span></span>
          </div>
        );
        return (<>
          <div className="asc-section ddd-sec">
            <div className="asc-sec-head">
              <div className="asc-sec-title"><DDPico d={DDI.policy} w={14} /> Reacts to</div>
              <div className="asc-sec-sub">The reactions this context owns — whenever the event fires, this context executes the command (derived live from the event flows)</div>
            </div>
            {policies.length ? <div className="dm-pol-list">{policies.map(polRow)}</div>
              : <div className="ddd-empty-inline">No inbound reactions — nothing wakes this context via a policy.</div>}
          </div>
          {outbound.length > 0 && (
            <div className="asc-section ddd-sec">
              <div className="asc-sec-head">
                <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> Its events fire</div>
                <div className="asc-sec-sub">Downstream reactions to this context's published events — owned by the consuming contexts</div>
              </div>
              <div className="dm-pol-list">{outbound.map(polRow)}</div>
            </div>
          )}
        </>);
      })()}

      {tab === 'capabilities' && (
        <div className="asc-section ddd-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DDPico d={DDI.cap} w={14} /> Capabilities & realization</div>
            <div className="asc-sec-sub">How each capability is built — least-agentic that fits · realized by this context's event functions</div>
          </div>
          {reals.length
            ? <div className="ddd-real-list">{reals.map(r => (
                <div key={r.ucId}>
                  <div className="ddd-uc-title">{ucTitle(r.ucId)}
                    {(r.components || []).map(id => { const cp = componentById(id); return (
                      <span key={id} className="dm-chip comp" title={id}>{cp ? cp.name : id}</span>
                    ); })}
                  </div>
                  <RealizationCard r={r} />
                </div>
              ))}</div>
            : <div className="ddd-empty-inline">No bespoke capability — reuse an off-the-shelf service for this context.</div>}
        </div>
      )}

      {tab === 'contracts' && (() => {
        const A = (typeof window !== 'undefined' && window.__ARCH__) || {};
        const ids = new Set(componentsForBC(c.id).map(x => x.id));
        const schemas = (A.schemas || []).filter(s =>
          ids.has(s.ownedBy) || (s.producers || []).some(p => ids.has(p)) || (s.consumers || []).some(x => ids.has(x)));
        const rels = (D.relations || []).filter(r => r.from === c.id || r.to === c.id);
        const partyName = id => (componentById(id) || {}).name
          || ((A.integrations || []).find(i => i.id === id) || {}).system || id;
        return (<>
          {rels.length > 0 && (
            <div className="asc-section ddd-sec">
              <div className="asc-sec-head">
                <div className="asc-sec-title"><DDPico d={DDI.ctx} w={14} /> Relationships</div>
                <div className="asc-sec-sub">How this context relates across each seam — pattern · upstream end · what crosses</div>
              </div>
              {rels.map((r, i) => (
                <div className="dm-rel" key={i}>
                  <div className="dm-rel-h">
                    <span className="dm-chip event">{r.from}</span>
                    <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
                    <span className="dm-chip event">{r.to}</span>
                    <span className="dm-chip policy">{r.pattern}</span>
                    <span className="dm-rel-carries">carries: {r.label} · upstream: {r.upstream}</span>
                  </div>
                  <p className="dm-rel-flow">{r.flow}</p>
                </div>
              ))}
            </div>
          )}
          <div className="asc-section ddd-sec">
            <div className="asc-sec-head">
              <div className="asc-sec-title"><DDPico d={DDI.doc} w={14} /> Published language — contract registry</div>
              <div className="asc-sec-sub">Every event / table / API this context's event functions own, produce or consume — versioned. Click a contract to open its schema: the fields ARE the published language.</div>
            </div>
            <ContractRegistry schemas={schemas} partyName={partyName} />
          </div>
        </>);
      })()}
    </>
  );
}
if (typeof window !== 'undefined') window.CynBcTabs = BcTabs;

/* Contract registry with expandable schema rows (D-062): the published
   language IS the fields — click a contract to see its payload/columns,
   the carrier, and (for API contracts) the endpoint. */
function ContractRegistry({ schemas: seedSchemas, partyName }) {
  const A = (typeof window !== 'undefined' && window.__ARCH__) || {};
  const [openId, setOpenId] = React.useState(null);
  // D-083: each row prefers its Contract node — structured fields (the
  // published language IS the seam surface), parties from publishes /
  // consumes / owned_by edges; the caller's BC filtering is kept as-is.
  const kg = kgContracts();
  const schemas = kg ? seedSchemas.map(s => kg.find(k => k.id === s.id) || s) : seedSchemas;
  const resName = id => { const r = (A.resources || []).find(x => x.id === id); return r ? `${r.name} (${r.engine})` : id; };
  const apiOf = id => (A.apis || []).find(a => a.id === id);
  return (
    <table className="dm-tbl dm-contracts"><thead>
      <tr><th className="dm-col-chev"></th><th>contract</th><th>kind</th><th>v</th><th>owned by</th><th>producers</th><th>consumers</th></tr>
    </thead><tbody>
      {schemas.map(s => (
        <React.Fragment key={s.id}>
          <tr className={'dm-crow' + (openId === s.id ? ' open' : '')} onClick={() => setOpenId(openId === s.id ? null : s.id)}
            title="Click to see the schema">
            <td className="dm-col-chev">{openId === s.id ? '▾' : '▸'}</td>
            <td className="dm-col-nm">{s.name}</td>
            <td className="dm-col-ty">{s.kind}</td>
            <td className="dm-col-ty">v{s.version}</td>
            <td className="dm-col-d">{partyName(s.ownedBy)}</td>
            <td className="dm-col-d">{(s.producers || []).map(partyName).join(', ')}</td>
            <td className="dm-col-d">{(s.consumers || []).map(partyName).join(', ')}</td>
          </tr>
          {openId === s.id && (
            <tr className="dm-cschema-row"><td className="dm-col-chev" /><td colSpan={6}>
              <div className="dm-cschema">
                <div className="dm-cschema-h">
                  <span className="dm-cschema-k">{s.kind === 'table' ? 'columns' : 'payload'} · {(s.fields || []).length}</span>
                  {s.via && <span className="dm-cschema-via">carried by <b>{resName(s.via)}</b></span>}
                  {s.api && apiOf(s.api) && <span className="dm-cschema-via">endpoint <code>{apiOf(s.api).method} {apiOf(s.api).path}</code></span>}
                  <span onClick={e => e.stopPropagation()}><DDRef id={s.id} /></span>
                </div>
                {s.kind === 'table' ? (
                  <div className="dm-fields">
                    {(s.fields || []).map((f, i) => (
                      <div className="dm-field" key={i}><span className="dm-field-nm">{f.name}</span><span className="dm-field-ty">{f.type}</span></div>
                    ))}
                    {!(s.fields || []).length && <span className="dm-cschema-none">No columns recorded for this contract.</span>}
                  </div>
                ) : (
                  /* events and API payloads are JSON on the wire — show them as JSON */
                  <pre className="dm-json">
                    <div>{'{'}</div>
                    {(s.fields || []).map((f, i) => {
                      const t = f.type || '';
                      const last = i === (s.fields.length - 1);
                      let v;
                      if (/^enum\(/.test(t)) v = <span className="v">{t.slice(5, -1).split('|').map(x => '"' + x.trim() + '"').join(' | ')}</span>;
                      else if (/json/.test(t)) v = <span className="p">{'{ … }'}</span>;
                      else if (/number|numeric/.test(t)) v = <span className="n">{t}</span>;
                      else v = <span className="v">"{t}"</span>;
                      return <div className="dm-json-line" key={i}><span className="k">"{f.name}"</span><span className="p">: </span>{v}<span className="p">{last ? '' : ','}</span></div>;
                    })}
                    <div>{'}'}</div>
                    {!(s.fields || []).length && <span className="dm-cschema-none">No fields recorded for this contract.</span>}
                  </pre>
                )}
              </div>
            </td></tr>
          )}
        </React.Fragment>
      ))}
    </tbody></table>
  );
}

function DesignContexts({ product, prd }) {
  const D = dddData(product);
  const M = domainData(product);
  const [sel, setSel] = React.useState(() => window.__cynCtxSel || null);   // restore on remount (Back / deep link)
  // navSel writes the selection to the URL so Back/Forward + sharing work
  const navSel = (id) => {
    window.__cynCtxSel = id; window.__cynCtxTab = 'flow'; setSel(id);        // a freshly opened context starts on its Event flow
    window.__cynShellCtx?.(id);                                              // D-179: the shell swaps to the BC workspace
    window.__cynPushProd?.();
  };
  React.useEffect(() => {
    window.__cynSelectCtx = navSel;                                          // map clicks select a context (pushes URL)
    window.__cynSetSel = id => { window.__cynCtxSel = id; setSel(id); };      // raw apply for Back/Forward (no URL push)
    return () => { delete window.__cynSelectCtx; delete window.__cynSetSel; };
  });
  if (!D) return <div className="ddd-empty">No bounded contexts yet — they emerge from the domain model.</div>;

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
          <div className="asc-sec-sub">{D.contexts.filter(c => !c.retired).length} identified · click to open</div>
        </div>
        <div className="ddd-ctx-grid">{D.contexts.filter(c => !c.retired).map(c => <ContextCard c={c} key={c.id} onSelect={navSel} />)}</div>
        {D.contexts.some(c => c.retired) && (
          <p className="ddd-detail-note" style={{ marginTop: 10 }}>
            {D.contexts.filter(c => c.retired).length} superseded walls retired from this list (D-161) — their cargo lives on the successors; the pages remain reachable by deep link and at the org altitude.
          </p>
        )}
      </div>
    </div>
  );
}

/* the context map — its own Design page: how the contexts relate (one per product) */
function DesignContextMap({ product, prd }) {
  const D = dddData(product);
  if (!D) return <div className="ddd-empty">No context map yet — it appears once bounded contexts are identified.</div>;
  /* products without an interactive canvas yet (canvas:false, e.g. ClaimsCore — R2, D-105)
     still get the REAL map: every seam typed, from the same relations register */
  if (D.canvas === false) {
    return (
      <div className="ddd-wrap">
        <div className="ddd-intro">
          <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · CONTEXT MAP</div>
          <p className="ddd-lead">
            How this product's bounded contexts relate — every standing relationship, <b>typed by pattern</b>:
            the relationship type IS the management. The interactive canvas for this product arrives with a
            later rehoming pass; the seams below are the same register it will draw.
          </p>
        </div>
        <div className="asc-section ddd-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> Context map — the seams, typed</div>
            <div className="asc-sec-sub">Pattern · upstream end · what crosses — mirrored from the Claims member graph</div>
          </div>
          {(D.relations || []).map((r, i) => (
            <div className="dm-rel" key={i}>
              <div className="dm-rel-h">
                <span className="dm-chip event">{r.from}</span>
                <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
                <span className="dm-chip event">{r.to}</span>
                <span className="dm-chip policy">{r.pattern}</span>
                <span className="dm-rel-carries">carries: {r.label} · upstream: {r.upstream}</span>
              </div>
              <p className="dm-rel-flow">{r.flow}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · CONTEXT MAP</div>
        <p className="ddd-lead">
          How the bounded contexts relate — <b>one map per product</b>. Each coloured box is a bounded context:
          <b> select it and hit the expand arrow</b> to see its event flow in place, or <b>double-click it</b> to
          go to the bounded context&apos;s page. The small nodes between boxes are the <b>published events crossing
          each seam</b>; externals are reached through an anti-corruption layer (ACL).
        </p>
      </div>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> Context map</div>
          <div className="asc-sec-sub">Bounded contexts as expandable containers · seam nodes = the published-language contracts</div>
        </div>
        <div style={{ height: '620px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
          <FlowEmbed flowId={D.contextMapId || 'contextmap'} variant="contextmap" />
        </div>
      </div>
    </div>
  );
}

/* ── System map (D-044) — the C4 system-context level, same canvas framework ──
   The product as an expandable box (its bounded contexts inside), surrounded by
   the external systems and the human actors. One zoom level above the context
   map: System map → product → contexts → (Context map) → event flows → cards. */
function DesignSystemMap({ product, prd }) {
  const D = dddData(product);
  if (!D) return <div className="ddd-empty">No system map yet — it appears once the architecture is authored.</div>;
  /* canvas-less products (R2, D-105): the system-context view as the external
     parties register — who feeds and consumes this product, over which seam */
  if (D.canvas === false) {
    const externals = (D.relations || []).filter(r => !String(r.from).startsWith('CTX-') || !String(r.to).startsWith('CTX-'));
    return (
      <div className="ddd-wrap">
        <div className="ddd-intro">
          <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · SYSTEM MAP</div>
          <p className="ddd-lead">
            The product in its world — <b>who feeds it and who consumes it</b>, each over a typed seam.
            The interactive C4 canvas for this product arrives with a later rehoming pass; the register
            below is the same set of boundaries it will draw.
          </p>
        </div>
        <div className="asc-section ddd-sec">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> External parties &amp; cross-domain seams</div>
            <div className="asc-sec-sub">Everything crossing this product's boundary — vendors behind ACLs, domains behind published language</div>
          </div>
          {externals.map((r, i) => (
            <div className="dm-rel" key={i}>
              <div className="dm-rel-h">
                <span className="dm-chip event">{r.from}</span>
                <span className="dm-pol-arrow"><DDPico d={DDI.arrow} w={14} /></span>
                <span className="dm-chip event">{r.to}</span>
                <span className="dm-chip policy">{r.pattern}</span>
                <span className="dm-rel-carries">carries: {r.label}</span>
              </div>
              <p className="dm-rel-flow">{r.flow}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="ddd-wrap">
      <div className="ddd-intro">
        <div className="ddd-eyebrow"><DDPico d={DDI.flow} w={12} /> DESIGN · SYSTEM MAP</div>
        <p className="ddd-lead">
          The product in its world — <b>who acts on it, and which external systems feed and consume it</b>.
          The box is the product: <b>select it and hit the expand arrow</b> to see its bounded contexts in
          place; each external card states what crosses that boundary and over which integration. The
          <b> Context map</b> is the next zoom level down.
        </p>
      </div>
      <div className="asc-section ddd-sec">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><DDPico d={DDI.flow} w={14} /> System map</div>
          <div className="asc-sec-sub">Actors · the product (expandable to its contexts) · external systems, in the same visual language as the flows</div>
        </div>
        <div style={{ height: '620px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
          <FlowEmbed flowId={D.systemMapId || 'systemmap'} variant="systemmap" />
        </div>
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

window.DesignContexts = DesignContexts;

/* ============================================================
   D-179 — the bounded context is its own place.
   When a context is open, the product shell hands the whole body to this
   workspace: a BC-scoped left menu (grouped, with room to grow) + the
   context's surfaces, one per entry. Tabs survive unchanged on the
   Meridian subdomain pages (BcTabs without hideTabs); deep links keep
   working — ?ctx=…&tab=… maps one-to-one onto the menu entries.
   ============================================================ */
const BC_MENU = [
  { group: 'Model', items: [
    { key: 'flow',       label: 'Event flow',          ico: 'flow' },
    { key: 'lifecycle',  label: 'Lifecycle',           ico: 'event', needsLC: true },
    { key: 'aggregates', label: 'Aggregates',          ico: 'agg' },
  ] },
  { group: 'Rules & handoffs', items: [
    { key: 'policies',   label: 'Policies',            ico: 'policy' },
    { key: 'contracts',  label: 'Contracts',           ico: 'doc' },
    { key: 'lang',       label: 'Ubiquitous language', ico: 'ctx' },
  ] },
  { group: 'Build handoff', items: [
    { key: 'capabilities', label: 'Capabilities',      ico: 'cap' },
  ] },
  { group: 'Team & knowledge', items: [
    { key: 'agent',      label: 'Agents',              ico: 'owner' },
    { key: 'kg',         label: 'Knowledge graph',     ico: 'bulb' },
  ] },
];

function BcWorkspace({ product, prd, onBack }) {
  const D = dddData(product);
  const M = domainData(product);
  const c = D && D.contexts.find(x => x.id === window.__cynCtxSel);
  const [tab, setTab] = React.useState(() => normCtxTab(window.__cynCtxTab));
  const navTab = (t) => {
    window.__cynCtxTab = t; setTab(t);
    window.__cynPushProd?.();
    document.querySelector('.asc-main')?.scrollTo(0, 0);
  };
  React.useEffect(() => {
    window.__cynSetTab = t => { const v = normCtxTab(t); window.__cynCtxTab = v; setTab(v); };
    return () => { delete window.__cynSetTab; };
  });
  if (!c) return null;
  const hasLC = !!CLAIMS_LIFECYCLES[c.id];
  return (
    <div className="asc-body">
      <aside className="asc-rail bc-rail">
        <button type="button" className="bc-rail-back" onClick={onBack}>
          <DDPico d={DDI.arrow} w={12} /> Bounded contexts
        </button>
        <div className="bc-rail-head">
          <div className="bc-rail-name">{c.name}</div>
          <span className={'ddd-class ' + c.classification}>{c.classification}</span>
        </div>
        {BC_MENU.map(g => {
          const items = g.items.filter(i => !i.needsLC || hasLC);
          if (!items.length) return null;
          return (
            <div className="env-railgroup" key={g.group}>
              <div className="env-railgroup-h"><span>{g.group}</span></div>
              {items.map(e => (
                <div key={e.key} className={'asc-nav env-navitem' + (tab === e.key ? ' on' : '')} onClick={() => navTab(e.key)}>
                  <span className="bc-nav-ico"><DDPico d={DDI[e.ico]} w={15} /></span>
                  <span className="env-navlabel">{e.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </aside>
      <main className="asc-main">
        <div className="asc-page env-page">
          <div className="ddd-wrap">
            <BcHead c={c} onBack={onBack} />
            <BcTabs c={c} D={D} M={M} prd={prd} tab={tab} navTab={navTab} hideTabs />
          </div>
        </div>
      </main>
    </div>
  );
}
window.BcWorkspace = BcWorkspace;
window.DesignContextMap = DesignContextMap;
window.DesignSystemMap = DesignSystemMap;
window.DesignRealization = DesignRealization;
