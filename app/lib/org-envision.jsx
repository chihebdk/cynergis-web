import React from 'react';
import './trace-core';
import './screens-evidence';
import './screens-disdes';
import './screens-delivery';
import './screens-design-ddd';
import './org-data';
const { ProductSources, ProductGraph, DisDesContent, ProductDelivery, DesignDomainModel, DesignContexts, DesignContextMap, DesignRealization, ORG } = window;
/* ============================================================
   Cynergis — Product page (Dashboard + Envision surface).
   The lifecycle now renders HORIZONTALLY inside the main page as
   a status "affirmation" (LifeBoard + legend). The LEFT PANEL is
   the Envision entry navigator — every piece of Envision
   information as a first-class, status-tagged entry:
     · Problem background     (PRD overview.problem + background)
     · Objective              (PRD overview.vision + objectives)
     · Success metrics        (PRD overview.criteria)
     · Strategic context      (PRD portfolio.domain/capability/position)
     · Ownership & dependencies (PRD portfolio.owners + dependencies)
     · Strategic alignment    (PRD portfolio.objectives — OKR tree)
     · Value stream map       (PRD portfolio.valueStream)
     · Prioritization         (org-data WSJF + sponsorship + rationale)
   Rich content is sourced from window.__PRD__ (Fraud Decisioning,
   the product carrying a full Studio PRD). Products without a PRD
   show those entries as "Not started"; Prioritization is always live.
   ============================================================ */
const { useState: useStateE, useEffect: useEffectE } = React;
/* trace helpers (assigned by trace-core.jsx, loaded earlier) */
const { Ref: ERef, MermaidView: EMermaid, valueStreamMermaid: vsMermaid, okrTreeMermaid: okrMermaid } = window;
function useOpenE() { const t = window.useTrace ? window.useTrace() : null; return id => t && t.open(id); }

/* ---- icons (self-contained; babel scripts don't share scope) ---- */
const EI = {
  dash:    <path d="M2.5 2.5h4v5h-4zM9.5 2.5h4v3h-4zM2.5 10h4v3.5h-4zM9.5 8h4v5.5h-4z"/>,
  alert:   <path d="M8 2.5 14 13H2zM8 6.5v3M8 11h.01"/>,
  target:  <path d="M8 8m-5.5 0a5.5 5.5 0 1 0 11 0 5.5 5.5 0 1 0-11 0M8 8m-2.3 0a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0"/>,
  gauge:   <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0M8 8l2.6-2.2"/>,
  compass: <path d="M8 8m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z"/>,
  link:    <path d="M6.5 9.5 9.5 6.5M7 4.5l.8-.8a2.4 2.4 0 0 1 3.5 3.5l-.8.8M9 11.5l-.8.8a2.4 2.4 0 0 1-3.5-3.5l.8-.8"/>,
  tree:    <path d="M8 2.5v3M4 9.5v-1a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1M8 5.5h0M4 12.5h0M8 12.5h0M12 12.5h0M4 9.5v3M8 9.5v3M12 9.5v3"/>,
  flow:    <path d="M2.5 8h11M11 5.5 13.5 8 11 10.5"/>,
  board:   <path d="M2 2v12h12M5 11V7M8.5 11V4.5M12 11V8.5"/>,
  check:   <path d="M3.5 8.5l3 3 6-6.5"/>,
  dot:     <circle cx="8" cy="8" r="2.4"/>,
  arrow:   <path d="M5 3l5 5-5 5"/>,
  back:    <path d="M9.5 3.5 5 8l4.5 4.5"/>,
  lock:    <path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z"/>,
  spark:   <path d="M8 2.5l1.3 3.2 3.2 1.3-3.2 1.3L8 11.5 6.7 8.3 3.5 7l3.2-1.3zM12.5 11.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z"/>,
  product: <path d="M8 2 2.8 4.8v6.4L8 14l5.2-2.8V4.8z M2.8 4.8 8 7.6l5.2-2.8M8 7.6V14"/>,
};
function EIco({ k, w = 16 }) {
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{EI[k] || EI.dot}</svg>;
}

/* ---- status vocabulary (the legend) ---- */
const ESTAT = {
  done:     { label: 'Completed' },
  progress: { label: 'In progress' },
  todo:     { label: 'Not started' },
  issue:    { label: 'Has issue' },
  commands: { label: 'Has commands' },
};
const ESTAT_ORDER = ['todo', 'progress', 'done', 'issue', 'commands'];

/* ---- per-phase entries (the left-panel "section" for each face) ---- */
const ENV_ENTRIES = [
  { key: 'problem',   label: 'Problem & opportunity',   ico: 'alert' },
  { key: 'objective', label: 'Value hypothesis',        ico: 'target' },
  { key: 'sizing',    label: 'Opportunity sizing',      ico: 'board' },
  { key: 'metrics',   label: 'Success metrics',         ico: 'gauge' },
  { key: 'context',   label: 'Strategic alignment',     ico: 'tree' },
  { key: 'owners',    label: 'Ownership & sponsorship', ico: 'link' },
  { key: 'exit',      label: 'Exit decision',           ico: 'arrow' },
];
const PHASE_ENTRIES = {
  Envision: ENV_ENTRIES,
  Discover: [
    { key: 'personas',     label: 'Personas',                    ico: 'spark' },
    { key: 'stakeholders', label: 'Stakeholders',                ico: 'product' },
    { key: 'journeys',     label: 'User journeys',               ico: 'flow' },
    { key: 'usecases',     label: 'Use cases',                   ico: 'compass' },
    { key: 'fr',           label: 'Functional requirements',     ico: 'check' },
    { key: 'nfr',          label: 'Non-functional requirements', ico: 'gauge' },
    { key: 'policies',     label: 'Policies',                    ico: 'lock' },
    { key: 'scope',        label: 'Product scope',               ico: 'arrow' },
  ],
  Design: [
    { key: 'contexts',    label: 'Bounded contexts',           ico: 'product' },
    { key: 'contextmap',  label: 'Context map',                ico: 'flow' },
    { key: 'model',       label: 'Domain model',               ico: 'spark' },
    { key: 'arch',        label: 'Architecture',               ico: 'tree' },
  ],
  Build: [
    { key: 'backlog',  label: 'Delivery backlog',     ico: 'board' },
    { key: 'agents',   label: 'Agents & skills',      ico: 'spark' },
    { key: 'integ',    label: 'Integrations',         ico: 'link' },
    { key: 'eval',     label: 'Test & eval',          ico: 'gauge' },
  ],
  Operate: [
    { key: 'fleet',     label: 'Fleet & SLAs',        ico: 'gauge' },
    { key: 'incidents', label: 'Incidents',           ico: 'alert' },
    { key: 'approvals', label: 'Approvals',           ico: 'check' },
    { key: 'runbooks',  label: 'Runbooks',            ico: 'board' },
  ],
  Realize: [
    { key: 'outcomes', label: 'Outcomes vs targets',  ico: 'target' },
    { key: 'value',    label: 'Value realized',       ico: 'board' },
    { key: 'decision', label: 'Go-forward decision',  ico: 'compass' },
  ],
};
function entriesFor(phase) { return PHASE_ENTRIES[phase] || []; }
function phaseEntryStatus(phase, key, product, prd) {
  if (phase === 'Envision') return entryStatus(key, product, prd);
  return phaseStatus(product, phase);
}

/* ---- data helpers ---- */
function prdFor(product) { return product && product.studio && window.__PRD__ ? window.__PRD__ : null; }

function phaseStatus(product, ph) {
  const edge = ORG.phaseIndex(product.phase);
  const i = ORG.phaseIndex(ph);
  const flag = (product.phaseFlags || {})[ph];
  if (flag) return flag;                                   // explicit 'issue' | 'commands'
  if (ph === 'Envision' && !product.sponsor) return 'issue';
  if (i < edge) return 'done';
  if (i === edge) return 'progress';
  return 'todo';
}

function entryStatus(key, product, prd) {
  if (key === 'exit') return product.sponsor ? 'done' : 'issue';
  if (!prd) return 'todo';
  if (key === 'metrics') return 'commands';               // agent can re-baseline from live data
  if (key === 'owners' && prd.portfolio.dependencies.some(d => d.status !== 'Available')) return 'issue';
  return 'done';
}

/* ============================================================
   Horizontal LifeBoard + legend  (the dashboard "affirmation")
   ============================================================ */
function StatusDot({ st }) { return <span className={'env-dot ' + st}></span>; }

function LifeBar({ product, active, onSelect }) {
  const edge = ORG.phaseIndex(product.phase);
  const ico = (st, i) => {
    if (st === 'done') return <EIco k="check" w={11} />;
    if (st === 'issue') return <span className="env-segbang">!</span>;
    if (st === 'commands') return <EIco k="spark" w={11} />;
    if (st === 'progress') return <span className="env-segpulse"></span>;
    return <span className="env-segnum">{i + 1}</span>;
  };
  return (
    <div className="env-lifebar">
      <div className="env-track">
        {ORG.PHASES.map((ph, i) => {
          const st = phaseStatus(product, ph);
          const last = i === ORG.PHASES.length - 1;
          const sel = ph === active;
          return (
            <React.Fragment key={ph}>
              <button type="button" className={'env-seg ' + st + (sel ? ' sel' : '')}
                onClick={() => onSelect(ph)} aria-pressed={sel}>
                <span className="env-seg-ic" title={ph + ' · ' + ESTAT[st].label}>{ico(st, i)}</span>
                <span className="env-seg-name">{ph}</span>
              </button>
              {!last && <span className={'env-seg-link' + (i < edge ? ' done' : '')}></span>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Left panel — Envision entry navigator
   ============================================================ */
/* Cross-cutting surfaces — present at every phase, sit beneath the canonical graph.
   Ordered as a value chain: evidence grounds the graph, the graph drives delivery.
   The "More" menu opens UPWARD, so the last item renders nearest the trigger —
   which conveniently puts the most operational surface (Delivery) closest to the cursor. */
const XCUT_ENTRIES = [
  { key: 'xsources',  label: 'Sources & Evidence', ico: 'compass' },
  { key: 'xgraph',    label: 'Knowledge graph',    ico: 'tree' },
  { key: 'xdelivery', label: 'Delivery',           ico: 'board' },
  { key: 'xglossary', label: 'Glossary',           ico: 'spark' },
  { key: 'xdeps',     label: 'Dependencies',       ico: 'link' },
  { key: 'xrisk',     label: 'Risk register',      ico: 'alert' },
  { key: 'xgov',      label: 'Governance',         ico: 'lock' },
];

function PhaseRail({ product, portfolio, prd, phase, entry, setEntry }) {
  const st = phaseStatus(product, phase);
  const items = entriesFor(phase);
  const xcutStat = prd ? 'done' : 'todo';
  const xcutActive = XCUT_ENTRIES.some(e => e.key === entry);
  const [xcutShown, setXcutShown] = useStateE(xcutActive);
  // auto-open when navigating into a cross-cutting entry (e.g. via a trace jump),
  // but the header toggle can always close it afterwards.
  useEffectE(() => { if (xcutActive) setXcutShown(true); }, [xcutActive]);
  return (
    <aside className="asc-rail">
      <div className="asc-rail-sect">Overview</div>
      <div className={'asc-nav' + (entry === 'overview' ? ' on' : '')} onClick={() => setEntry('overview')}>
        <EIco k="dash" w={15} /> Dashboard
      </div>

      <div className="env-railgroup">
        <div className="env-railgroup-h">
          <span>{phase}</span>
          <span className={'env-railgroup-st ' + st}><StatusDot st={st} /> {ESTAT[st].label}</span>
        </div>
        {items.map(e => {
          const est = phaseEntryStatus(phase, e.key, product, prd);
          return (
            <div key={e.key} className={'asc-nav env-navitem' + (entry === e.key ? ' on' : '')} onClick={() => setEntry(e.key)}>
              <EIco k={e.ico} w={15} />
              <span className="env-navlabel">{e.label}</span>
              <StatusDot st={est} />
            </div>
          );
        })}
      </div>

      {/* More — accordion pinned to the bottom, sitting on top of the Cards & Payments card; opens upward */}
      <div className={'env-xcut' + (xcutShown ? ' open' : '')}>
        {xcutShown && (
          <div className="env-xcut-body">
            {XCUT_ENTRIES.map(e => (
              <div key={e.key} className={'asc-nav env-navitem' + (entry === e.key ? ' on' : '')} onClick={() => setEntry(e.key)}>
                <EIco k={e.ico} w={15} />
                <span className="env-navlabel">{e.label}</span>
                <StatusDot st={xcutStat} />
              </div>
            ))}
          </div>
        )}
        <button type="button" className="env-xcut-head" onClick={() => setXcutShown(o => !o)} aria-expanded={xcutShown}>
          <span className="env-xcut-chev"><EIco k="arrow" w={11} /></span>
          <span className="env-xcut-title">More</span>
          <span className={'env-railgroup-st ' + xcutStat}><StatusDot st={xcutStat} /> {prd ? 'Live' : 'Empty'}</span>
        </button>
      </div>

      <div className="asc-rail-foot">
        <div className="asc-rail-org">
          <div className="ico">{portfolio.name.slice(0, 1)}</div>
          <div><div className="nm">{portfolio.name}</div><div className="sub">{ORG.org.name}</div></div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   Content building blocks
   ============================================================ */
function Block({ k, children, full }) {
  return (
    <div className={'env-block' + (full ? ' full' : '')}>
      <div className="env-k">{k}</div>
      <div className="env-v">{children}</div>
    </div>
  );
}
function CmdChip({ children }) { return <span className="env-cmd"><EIco k="spark" w={12} /> {children}</span>; }
function EntryHead({ entry, status, eyebrow }) {
  return (
    <div className="env-entryhead">
      <div className="env-entryhead-l">
        <h2 className="env-entrytitle">{entry.label}</h2>
      </div>
      <span className={'env-statpill ' + status}><StatusDot st={status} /> {ESTAT[status].label}</span>
    </div>
  );
}
function NotStarted({ entry }) {
  return (
    <div className="env-empty">
      <div className="env-empty-ic"><EIco k="lock" w={20} /></div>
      <div className="env-empty-t">{entry.label} — not started</div>
      <div className="env-empty-s">This product does not yet carry a Studio PRD, so this Envision entry has no authored content. It is populated once the product opens a Product Studio.</div>
    </div>
  );
}

/* ---- the eight Envision content renderers ---- */
function CProblem({ prd }) {
  const o = prd.overview;
  return (
    <div className="env-doc">
      <Block k="Problem statement" full>{o.problem}</Block>
      <Block k="Background & context" full>{o.background}</Block>
    </div>
  );
}
function CObjective({ prd }) {
  const o = prd.overview;
  return (
    <div className="env-doc">
      <Block k="Value hypothesis" full>{o.hypothesis}</Block>
      <Block k="Objectives" full>
        <ul className="env-list">{(o.objectives || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
      </Block>
      <Block k="Differentiator">{o.differentiator}</Block>
      <Block k="Target users">{o.targetUsers}</Block>
    </div>
  );
}
function CMetrics({ prd }) {
  const o = prd.overview;
  const open = useOpenE();
  return (
    <div className="env-doc">
      <div className="env-cmdbar">
        <span className="env-cmdbar-l">Agent commands</span>
        <CmdChip>Re-baseline from live data</CmdChip>
        <CmdChip>Draft metric from objective</CmdChip>
      </div>
      <div className="env-crits">
        {o.criteria.map(cr => (
          <div className="env-crit env-clickable" key={cr.id} onClick={() => open(cr.id)}>
            <div className="env-crit-id">{cr.id}</div>
            <div className="env-crit-body">
              <div className="env-crit-t">{cr.text}</div>
              {cr.metric && <span className="env-crit-target">Target&nbsp;·&nbsp;{cr.metric}</span>}
            </div>
            <span className="env-crit-go">Trace what meets this →</span>
          </div>
        ))}
      </div>
    </div>
  );
}
/* Strategic fit & alignment — one page, two movements:
   (1) WHERE it fits  — domain, capability, value stream, architectural position
   (2) HOW it aligns  — objectives → key results → success metrics (the OKR ladder) */
function CStrategy({ prd }) {
  const P = prd.portfolio;
  const open = useOpenE();
  const raw = (P.valueStream || '').split('—')[0];
  const stages = raw.split(/->|→|⟶/).map(s => s.trim()).filter(Boolean);
  const caption = (P.valueStream || '').includes('—') ? P.valueStream.split('—').slice(1).join('—').trim() : '';
  const okrCode = okrMermaid ? okrMermaid(P.objectives) : '';
  const objCount = (P.objectives || []).length;
  const krCount = (P.objectives || []).reduce((n, o) => n + (o.keyResults || []).length, 0);

  return (
    <div className="env-strat">

      {/* ───────── 1 · WHERE IT FITS ───────── */}
      <section className="env-strat-sect">
        <header className="env-strat-h">
          <div className="env-strat-h-t"><EIco k="compass" w={15} /> Where this product fits</div>
          <div className="env-strat-h-s">The slice of the business it serves, and the value stream it moves forward.</div>
        </header>

        <div className="env-fitgrid">
          <div className="env-fitcard">
            <div className="env-fitcard-k"><EIco k="board" w={13} /> Business domain</div>
            <div className="env-fitcard-v">{P.domain}</div>
          </div>
          <div className="env-fitcard accent">
            <div className="env-fitcard-k"><EIco k="target" w={13} /> Business capability</div>
            <div className="env-fitcard-v">{P.capability}</div>
          </div>
        </div>

        <div className="env-strat-card">
          <div className="env-strat-card-k">Value stream</div>
          <div className="env-vsm">
            {stages.map((s, i) => (
              <React.Fragment key={i}>
                <div className="env-vsm-stage"><span className="env-vsm-n">{i + 1}</span>{s}</div>
                {i < stages.length - 1 && <div className="env-vsm-arrow"><EIco k="flow" w={16} /></div>}
              </React.Fragment>
            ))}
          </div>
          {caption && <div className="env-vsm-cap">{caption}</div>}
        </div>

        <div className="env-position">
          <div className="env-position-k"><EIco k="link" w={13} /> Where it sits in the landscape</div>
          <div className="env-position-v">{P.position}</div>
        </div>
      </section>

      {/* ───────── 2 · HOW IT ALIGNS ───────── */}
      <section className="env-strat-sect">
        <header className="env-strat-h">
          <div className="env-strat-h-t"><EIco k="tree" w={15} /> How it aligns to strategy</div>
          <div className="env-strat-h-s">Every objective ladders to a key result and a measurable success metric.</div>
          <div className="env-strat-h-meta">{objCount} objectives · {krCount} key results</div>
        </header>

        {okrCode && EMermaid && (
          <div className="env-strat-card">
            <div className="env-strat-card-k">OKR tree</div>
            <EMermaid code={okrCode} caption="Objective → key result → success metric" />
          </div>
        )}

        <div className="env-okr">
          {P.objectives.map(o => (
            <div className="env-okr-obj" key={o.id}>
              <div className="env-okr-objhead env-clickable" onClick={() => open(o.id)}>
                <span className="env-okr-tag">{o.id}</span>
                <span className="env-okr-objname">{o.objective}</span>
                {o.owner && <span className="env-okr-owner">{o.owner}</span>}
              </div>
              <div className="env-okr-krs">
                {o.keyResults.map(k => (
                  <div className="env-okr-kr env-clickable" key={k.id} onClick={() => open(k.id)}>
                    <div className="env-okr-krhead">
                      <span className="env-okr-krtag">{k.id}</span>
                      <span className="env-okr-krname">{k.kr}</span>
                      {k.metric && <span onClick={e => e.stopPropagation()}>{ERef ? <ERef id={k.metric} /> : <span className="env-okr-metric">{k.metric}</span>}</span>}
                    </div>
                    <div className="env-okr-contrib">{k.contribution}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
function COwners({ prd }) {
  const owners = (prd.portfolio && prd.portfolio.owners) || [];
  return (
    <div className="env-doc">
      <Block k="Ownership & sponsorship" full>
        <div className="env-owners">
          {owners.map((o, i) => (
            <div className="env-owner" key={i}>
              <div className="env-owner-role">{o.role}</div>
              <div className="env-owner-name">{o.name}</div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}
function CPrio({ product }) {
  const w = product.wsjf;
  const cod = w.bv + w.tc + w.rr;
  const wsjf = ORG.wsjf(product).toFixed(1);
  const rows = [
    { k: 'Business value', v: w.bv, hint: 'revenue, cost-out, loss avoided' },
    { k: 'Time criticality', v: w.tc, hint: 'cost of delay / market urgency' },
    { k: 'Risk reduction', v: w.rr, hint: 'risk removed or opportunity enabled' },
    { k: 'Job size', v: w.js, hint: 'effort to deliver (the divisor)', cost: true },
  ];
  return (
    <div className="env-doc">
      <Block k="Thesis" full>{product.tagline}</Block>
      <div className="env-priorow">
        <div className="env-priostat"><div className="l">Value at stake</div><div className="v">{product.valueAtStake}<small>/yr</small></div></div>
        <div className="env-priostat"><div className="l">Value</div><div className="v">{product.value.toFixed(1)}<small>/5</small></div></div>
        <div className="env-priostat"><div className="l">Feasibility</div><div className="v">{product.feasibility.toFixed(1)}<small>/5</small></div></div>
        <div className="env-priostat"><div className="l">WSJF</div><div className="v">{wsjf}</div></div>
        <div className="env-priostat"><div className="l">Quadrant</div><div className="v sm">{product.quadrant}</div></div>
      </div>
      <Block k="WSJF scoring" full>
        <div className="env-wsjf">
          {rows.map(r => (
            <div className={'env-wsjf-row' + (r.cost ? ' cost' : '')} key={r.k}>
              <span className="env-wsjf-k">{r.k}</span>
              <span className="env-wsjf-bar"><span style={{ width: (r.v / 10 * 100) + '%' }}></span></span>
              <span className="env-wsjf-v">{r.v}</span>
              <span className="env-wsjf-hint">{r.hint}</span>
            </div>
          ))}
          <div className="env-wsjf-formula">Cost of delay {cod} ÷ job size {w.js} = <b>WSJF {wsjf}</b></div>
        </div>
      </Block>
      <Block k="Sponsorship" full>
        {product.sponsor
          ? <span className="badge ok"><span className="dot ok"></span>{product.sponsor}</span>
          : <span className="badge err"><span className="dot err"></span>No sponsor — resolve before Discover</span>}
      </Block>
      <Block k="Rationale" full>{product.rationale}</Block>
    </div>
  );
}

/* ---- exit decision (the Envision → Discover gate) ---- */
function CExit({ product, prd }) {
  const o = prd && prd.overview;
  const depsOk = !!prd && prd.portfolio.dependencies.every(d => d.status === 'Available');
  const gate = [
    { label: 'Named executive sponsor secured', ok: !!product.sponsor, note: product.sponsor || 'No sponsor assigned' },
    { label: 'Measurable value hypothesis with targets', ok: !!(o && o.criteria && o.criteria.length), note: o ? `${o.criteria.length} success criteria defined` : 'Studio PRD not opened' },
    { label: 'Upstream dependencies available', ok: depsOk, note: prd ? (depsOk ? 'all dependencies available' : 'a dependency is unresolved') : 'Studio PRD not opened' },
    { label: 'Priority rank clears the bar', ok: ['Quick Win', 'Big Bet'].includes(product.quadrant), note: `${product.quadrant} · WSJF ${ORG.wsjf(product).toFixed(1)}` },
  ];
  const passed = gate.filter(g => g.ok).length;
  const ready = !!product.sponsor;
  const rec = !ready ? 'Hold — resolve sponsorship before Discover'
            : passed === gate.length ? 'Proceed to Discover'
            : 'Proceed with open items';
  const ex = (o && o.exit) || {};
  const decisionRight = ex.decisionRight || (product.sponsor ? product.sponsor + ', with portfolio steering.' : 'Portfolio steering.');
  const kills = ex.killCriteria || ['Value hypothesis fails offline validation.', 'A required upstream dependency cannot be secured.', 'Priority rank drops below the funding bar at the next steering review.'];
  const cadence = ex.reviewCadence || 'Phase-gate review at each lifecycle transition; portfolio steering reviews rank and sponsorship monthly.';
  return (
    <div className="env-doc">
      <div className={'env-gatebanner ' + (ready ? 'go' : 'hold')}>
        <div>
          <span className="env-gate-k">Recommendation</span>
          <span className="env-gate-v">{rec}</span>
        </div>
        <div className="env-gate-score">{passed} / {gate.length} gate criteria met</div>
      </div>
      <Block k="Decision right" full>Who decides: <b>{decisionRight}</b> The exit from Envision is a go / pivot / stop gate — committing funded capacity to Discover, or sending the case back.</Block>
      <Block k="Gate criteria — must hold to exit Envision" full>
        <div className="env-gate-list">
          {gate.map((g, i) => (
            <div className={'env-gate-row ' + (g.ok ? 'ok' : 'no')} key={i}>
              <span className="env-gate-ic">{g.ok ? <EIco k="check" w={12} /> : <span className="env-segbang">!</span>}</span>
              <span className="env-gate-label">{g.label}</span>
              <span className="env-gate-note">{g.note}</span>
            </div>
          ))}
        </div>
      </Block>
      <Block k="Stop / pivot conditions" full>
        <ul className="env-list">{kills.map((k, i) => <li key={i}>{k}</li>)}</ul>
      </Block>
      <Block k="Review cadence" full>{cadence}</Block>
    </div>
  );
}

function EnvContent({ entry, product, prd }) {
  const def = ENV_ENTRIES.find(e => e.key === entry);
  const status = entryStatus(entry, product, prd);
  let body;
  if (entry === 'exit') body = <CExit product={product} prd={prd} />;
  else if (!prd) body = <NotStarted entry={def} />;
  else if (entry === 'problem') body = <CProblem prd={prd} />;
  else if (entry === 'objective') body = <CObjective prd={prd} />;
  else if (entry === 'metrics') body = <CMetrics prd={prd} />;
  else if (entry === 'context') body = <CStrategy prd={prd} />;
  else if (entry === 'owners') body = <COwners prd={prd} />;
  else if (entry === 'sizing') body = (typeof DisDesContent !== 'undefined') ? DisDesContent({ phase: 'Discover', entry: 'sizing', prd }) : null;
  return (
    <div className="asc-page env-page">
      <EntryHead entry={def} status={status} eyebrow="Envision · entry" />
      {body}
    </div>
  );
}

/* ---- cross-phase register surface (Glossary / Dependencies / Risk / Governance) ---- */
function XSurface({ phase, entry, prd }) {
  const body = (prd && typeof DisDesContent !== 'undefined') ? DisDesContent({ phase, entry, prd }) : null;
  return (
    <div className="asc-page env-page">
      {body || <div className="env-empty"><div className="env-empty-ic"><EIco k="lock" w={20} /></div><div className="env-empty-t">No data captured for this product yet.</div></div>}
    </div>
  );
}

/* ---- non-Envision phase entry (section authored in Studio) ---- */
function PhaseEntry({ phase, entry, product, prd }) {
  const def = entriesFor(phase).find(e => e.key === entry);
  const status = phaseEntryStatus(phase, entry, product, prd);
  const designMap = { contexts: DesignContexts, contextmap: DesignContextMap, model: DesignDomainModel };  // realization folded into the context drill-in
  const DesignCmp = phase === 'Design' ? designMap[entry] : null;
  const content = DesignCmp
    ? <DesignCmp product={product} prd={prd} />
    : (typeof DisDesContent !== 'undefined') ? DisDesContent({ phase, entry, prd }) : null;
  // the Bounded contexts surface renders its own title (hub) / breadcrumb (drill-in)
  const selfHeaded = phase === 'Design' && entry === 'contexts';
  return (
    <div className="asc-page env-page">
      {!selfHeaded && <EntryHead entry={def} status={status} eyebrow={phase + ' · entry'} />}
      {content || (
        <div className="env-empty">
          <div className="env-empty-ic"><EIco k="lock" w={20} /></div>
          <div className="env-empty-t">{def.label}</div>
          <div className="env-empty-s">A {phase} surface. Its detailed content is authored in the Product Studio and summarized here. The {phase} phase is currently <b>{ESTAT[status].label.toLowerCase()}</b>.</div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Dashboard — product header + full prioritization
   ============================================================ */
function PhaseOverview({ product, portfolio, prd }) {
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><EIco k="product" w={12} /> Product · {portfolio.name}</div>
          <h1 className="asc-page-title">{product.name}</h1>
          <p className="asc-page-sub">{product.tagline}</p>
        </div>
        <div className="asc-head-actions">
          <span className={'asc-quad ' + ORG.quadClass(product.quadrant)}>{product.quadrant}</span>
          {product.sponsor
            ? <span className="badge ok"><span className="dot ok"></span>{product.sponsor}</span>
            : <span className="badge err"><span className="dot err"></span>No sponsor</span>}
        </div>
      </div>

      {prd && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title"><EIco k="link" w={15} /> Ownership</div>
            <div className="asc-sec-sub">Who is accountable for this product</div>
          </div>
          <div className="env-owners">
            {prd.portfolio.owners.map((o, i) => (
              <div className="env-owner" key={i}>
                <div className="env-owner-role">{o.role}</div>
                <div className="env-owner-name">{o.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><EIco k="board" w={15} /> Prioritization</div>
          <div className="asc-sec-sub">Why this product ranks where it does — value, feasibility, and WSJF</div>
        </div>
        <CPrio product={product} />
      </div>
    </div>
  );
}

/* ============================================================
   ProductPage — persistent lifecycle band + (rail + main)
   ============================================================ */
function ProductPage({ product, portfolio }) {
  // boot phase/entry from the URL nav state (deep link), defaulting to the product's phase
  const boot = React.useMemo(() => {
    const n = (window.__cynNav && window.__cynNav.prod === product.id) ? window.__cynNav : null;
    window.__cynCtxSel = (n && n.entry === 'contexts') ? (n.ctx || null) : null;
    window.__cynCtxTab = (n && n.tab) || 'rels';
    return { phase: (n && n.phase) || product.phase || 'Envision', entry: (n && n.entry) || 'overview' };
  }, [product]);
  const [phase, setPhase] = useStateE(boot.phase);
  const [entry, setEntry] = useStateE(boot.entry);
  const prd = prdFor(product);
  const scrollTop = () => document.querySelector('.asc-main')?.scrollTo(0, 0);
  // write the current in-product location to the URL (so Back/Forward + sharing work)
  const pushUrl = (patch) => {
    const base = window.__cynNav || {};
    const n = { v: 'prod', pf: base.pf || (portfolio && portfolio.id) || null, prod: product.id, sub: 'dashboard',
      phase, entry, ctx: window.__cynCtxSel, tab: window.__cynCtxTab, ...patch };
    if (n.entry !== 'contexts') n.ctx = null;
    window.cynPushUrl(n);
  };
  const selectPhase = (ph) => { setPhase(ph); setEntry('overview'); window.__cynCtxSel = null; pushUrl({ phase: ph, entry: 'overview' }); scrollTop(); };
  const goTo = (ph, en) => { setPhase(ph); setEntry(en); if (en !== 'contexts') window.__cynCtxSel = null; pushUrl({ phase: ph, entry: en }); scrollTop(); };
  const navEntry = (en) => { setEntry(en); if (en !== 'contexts') window.__cynCtxSel = null; pushUrl({ entry: en }); scrollTop(); };
  // browser Back/Forward lands here for product-internal moves (phase / entry / ctx / tab)
  useEffectE(() => {
    window.__cynApplyProd = (n) => {
      setPhase(n.phase || 'Envision'); setEntry(n.entry || 'overview');
      window.__cynCtxSel = n.entry === 'contexts' ? (n.ctx || null) : null;
      window.__cynCtxTab = n.tab || 'rels';
      if (window.__cynSetSel) window.__cynSetSel(window.__cynCtxSel);
      if (window.__cynSetTab) window.__cynSetTab(window.__cynCtxTab);
      scrollTop();
    };
    window.__cynPushProd = () => pushUrl({});   // design surfaces push after changing ctx/tab
    window.__cynGoContexts = () => goTo('Design', 'contexts');
    window.__cynGoSources = () => navEntry('xsources');
    return () => { delete window.__cynApplyProd; delete window.__cynPushProd; delete window.__cynGoContexts; delete window.__cynGoSources; };
  }, [phase, entry]);
  const TP = window.TraceProvider;
  const inner = (
    <div className="asc-prodwrap">
      <LifeBar product={product} active={phase} onSelect={selectPhase} />
      <div className="asc-body">
        <PhaseRail product={product} portfolio={portfolio} prd={prd} phase={phase} entry={entry} setEntry={navEntry} />
        <main className="asc-main">
          {entry === 'overview'
            ? <PhaseOverview product={product} portfolio={portfolio} prd={prd} />
            : entry === 'xdelivery'
              ? <ProductDelivery product={product} prd={prd} />
            : entry === 'xsources'
              ? <ProductSources product={product} prd={prd} />
              : entry === 'xgraph'
                ? <ProductGraph product={product} prd={prd} />
            : entry === 'xglossary'
                ? <XSurface phase="X" entry="glossary" prd={prd} />
            : entry === 'xdeps'
                ? <XSurface phase="X" entry="deps" prd={prd} />
            : entry === 'xrisk'
                ? <XSurface phase="X" entry="risk" prd={prd} />
            : entry === 'xgov'
                ? <XSurface phase="X" entry="governance" prd={prd} />
                : phase === 'Envision'
                  ? <EnvContent entry={entry} product={product} prd={prd} />
                  : <PhaseEntry phase={phase} entry={entry} product={product} prd={prd} />}
        </main>
      </div>
    </div>
  );
  return TP ? <TP prd={prd} arch={window.__ARCH__} goTo={goTo}>{inner}</TP> : inner;
}

window.ProductPage = ProductPage;
