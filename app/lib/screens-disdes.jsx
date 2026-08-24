import React from 'react';
import dynamic from 'next/dynamic';
import { WORKFLOW_INVENTORY, workflowUcCoverage } from '../flow/workflows.js';
import { BUSINESS_JOURNEYS, BJ_STORMS } from '../flow/journeys.js';
const FlowEmbed = dynamic(() => import('../flow/FlowEmbed.jsx'), { ssr: false });
import './trace-core';
import { componentArchetype } from '../flow/arch';
import { kgTests, kgEvalRuns, kgAgents } from './kg-query';
/* ============================================================
   Cynergis — Discover & Design phase content (org app).
   Now fully traceable, Product-Studio style:
     · every FR / NFR / UC / J / SC / P / POL / G / D / ADR /
       component / integration id is a clickable <Ref> that opens
       a detail modal with the COMPLETE bidirectional trace graph.
     · cards/rows open their own entity detail.
     · Mermaid renders use-case workflows, the system context
       diagram, and the subdomain context map.
   Driven by window.__PRD__ + window.__ARCH__ via the trace index.
   ============================================================ */
const { Ref: TRef, RefRow: TRefRow, MermaidView: TMermaid, useTrace: useTrace2 } = window;

/* self-contained icons (babel scripts don't share scope) */
const DD = {
  user:    <path d="M8 8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2M3 13.5c.5-2.4 2.5-4 5-4s4.5 1.6 5 4"/>,
  journey: <path d="M3 13s0-4 5-4 5-4 5-4M3 6.5h.01M13 9.5h.01"/>,
  usecase: <path d="M8 2 2.8 4.8v6.4L8 14l5.2-2.8V4.8z M2.8 4.8 8 7.6l5.2-2.8M8 7.6V14"/>,
  req:     <path d="M3.5 8.5l3 3 6-6.5"/>,
  gauge:   <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0M8 8l2.6-2.2"/>,
  flow:    <path d="M4 3.5h3v3H4zM9 9.5h3v3H9zM5.5 6.5v2a1 1 0 0 0 1 1H9"/>,
  arch:    <path d="M8 2 2.5 5v6L8 14l5.5-3V5zM2.5 5 8 8l5.5-3M8 8v6"/>,
  policy:  <path d="M8 2.2 3 4.2v3.3c0 3 2.1 5 5 6.3 2.9-1.3 5-3.3 5-6.3V4.2zM6 8l1.5 1.5L10.5 6.5"/>,
  alert:   <path d="M8 2.5 14 13H2zM8 6.5v3M8 11h.01"/>,
  arrow:   <path d="M3 8h9M9 5l3 3-3 3"/>,
  target:  <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M8 8h.01"/>,
  board:   <path d="M2.5 3.5h11v9h-11zM2.5 6.5h11M6 6.5v6"/>,
  gate:    <path d="M3 13V4l5-1.5L13 4v9M3 13h10M6.5 7h3"/>,
  spark:   <path d="M8 2.5l1.4 3.6L13 7.5l-3.6 1.4L8 12.5 6.6 8.9 3 7.5l3.6-1.4z"/>,
  scope:   <path d="M8 2v2M8 12v2M2 8h2M12 8h2M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>,
  link:    <path d="M6.5 9.5 9.5 6.5M7 4.5l.8-.8a2.4 2.4 0 0 1 3.5 3.5l-.8.8M9 11.5l-.8.8a2.4 2.4 0 0 1-3.5-3.5l.8-.8"/>,
  check:   <path d="M3.5 8.5l3 3 6-6.5"/>,
  x:       <path d="M4 4l8 8M12 4l-8 8"/>,
  chevd:   <path d="M4 6l4 4 4-4"/>,
  dot:     <circle cx="8" cy="8" r="3"/>,
  map:     <path d="M2.5 4 6 2.5 10 4l3.5-1.5v9L10 13 6 11.5 2.5 13zM6 2.5v9M10 4v9"/>,
};
function DIco({ k, w = 16 }) {
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{DD[k] || DD.dot}</svg>;
}
function DSec({ icon, title, sub, children }) {
  return (
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title"><DIco k={icon} w={15} /> {title}</div>
        {sub && <div className="asc-sec-sub">{sub}</div>}
      </div>
      {children}
    </div>
  );
}
/* open-entity helper hook */
function useOpen() { const t = useTrace2 && useTrace2(); return id => t && t.open(id); }

/* one card of the shared ADR register (D-047): identity · when & who · rationale ·
   how compliance is confirmed · informed-by (upstream) · affects (downstream) */
function AdrCard({ d, open, informers, showLayer }) {
  const superseded = d.status && d.status !== 'Accepted';
  return (
    <div className={'dd-adr dd-clickable' + (superseded ? ' superseded' : '')} onClick={() => open(d.id)}>
      <div className="dd-adr-top">
        <span className="dd-adr-id">{d.id}</span>
        <span className="dd-adr-title">{d.title}</span>
        {showLayer && d.layer === 'build' && <span className="dd-adr-layer">build</span>}
        <span className="dd-adr-status">{d.status}</span>
      </div>
      {(d.date || d.deciders) && <div className="dd-adr-meta">{d.date}{d.date && d.deciders ? ' · ' : ''}{d.deciders}</div>}
      <div className="dd-adr-rat">{d.rationale}</div>
      {d.confirmation && <div className="dd-adr-confirm"><b>confirmed by</b> {d.confirmation}</div>}
      <div className="dd-adr-foot">
        {(d.informedBy || []).length > 0 && (
          <span className="dd-adr-informed" onClick={e => e.stopPropagation()}>
            <span className="dd-drv-k">informed by</span>
            {d.informedBy.map(id => <span key={id} className={'dd-drv' + (id.startsWith('CON') ? ' con' : '')} title={(informers || {})[id] || id}>{id}</span>)}
          </span>
        )}
        <span className="dd-adr-affects" onClick={e => e.stopPropagation()}>{(d.affects || []).map(a => <TRef id={a} key={a} />)}</span>
      </div>
    </div>
  );
}

/* ===================== DISCOVER · Personas ===================== */
/* Personas as list ↔ detail (D-063): the card was a summary whose full record
   lived only in the modal — now it opens a page; chips elsewhere still peek. */
function DiscoverPersonas({ prd }) {
  const personas = prd.personas || [];
  const [selId, setSelId] = React.useState(null);
  const sel = personas.find(p => p.id === selId);

  if (sel) {
    const journeys = (prd.journeys || []).filter(j => j.personaId === sel.id);
    const ucs = (prd.usecases || []).filter(u => u.primaryActor === sel.id);
    const PROFILE = [
      ['situation', sel.situation], ['success metric', sel.successMetric], ['permissions', sel.permissions],
      ['frequency', sel.frequency], ['volume', sel.volume], ['authority', sel.authority],
      ['collaboration', sel.collaboration], ['touchpoints', sel.touchpoints], ['tools', sel.tools],
      ['regulatory', sel.regulatory],
    ].filter(x => x[1]);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Personas</button>
      <div className="tstx-dh">
        <span className="tstx-dh-id">{sel.id}</span>
        <span className="tst-uc-t">{sel.name}</span>
        <span className="agb-bc">{sel.role}</span>
        <span className={'dd-tier ' + sel.tier.toLowerCase()}>{sel.tier}</span>
      </div>
      <div className="dd-quote dd-quote-lg">“{sel.quote}”</div>
      <div className="ops-hero dd-pheroes">
        <div className="ops-hero-card"><div className="ops-hero-k">goal</div><div className="ops-hero-v small">{sel.goal}</div></div>
        <div className="ops-hero-card warn"><div className="ops-hero-k">obstacle</div><div className="ops-hero-v small">{sel.obstacle}</div></div>
        <div className="ops-hero-card ok"><div className="ops-hero-k">what helps</div><div className="ops-hero-v small">{sel.solution}</div></div>
      </div>
      <div className="dd-idetail">
        {PROFILE.map(([k, v]) => (
          <div className="dd-idef" key={k}><span className="dd-iext-k">{k}</span><div className="dd-idef-v">{v}</div></div>
        ))}
        {(journeys.length > 0 || ucs.length > 0) && (
          <div className="dd-idef"><span className="dd-iext-k">drives</span>
            <div className="dd-idef-v" onClick={e => e.stopPropagation()}>
              {journeys.map(j => <TRef id={j.id} key={j.id} />)}
              {ucs.map(u => <TRef id={u.id} key={u.id} />)}
            </div>
          </div>
        )}
      </div>
    </>);
  }

  return (
    <>
      <p className="dd-lead">Who this product serves — each evidence-backed in <b>Sources &amp; Evidence</b>. Open a persona for the full profile: situation, permissions, cadence, and what they drive.</p>
      <DSec icon="user" title="Personas" sub={`${personas.length} archetypes`}>
        <div className="dd-personas">
          {personas.map(p => (
            <div className="dd-persona dd-clickable" key={p.id} onClick={() => setSelId(p.id)}
              role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelId(p.id); } }}>
              <div className="dd-persona-top">
                <div className="dd-persona-id">{p.id}</div>
                <div>
                  <div className="dd-persona-name">{p.name}</div>
                  <div className="dd-persona-role">{p.role} · <span className={'dd-tier ' + p.tier.toLowerCase()}>{p.tier}</span></div>
                </div>
              </div>
              <div className="dd-quote">“{p.quote}”</div>
              <div className="dd-pog">
                <div><span className="k">Goal</span>{p.goal}</div>
                <div><span className="k">Obstacle</span>{p.obstacle}</div>
                <div><span className="k">What helps</span>{p.solution}</div>
              </div>
              <div className="dd-card-foot"><span className="dd-trace-hint">Full profile</span><DIco k="arrow" w={12} /></div>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DISCOVER · Journeys ===================== */
function DiscoverJourneys({ prd }) {
  const journeys = prd.journeys || [];
  const open = useOpen();
  return (
    <>
      <p className="dd-lead">The moments that matter — told as arcs, each tied to the persona who lives it and realized by the use cases below in Design. Open one to follow the chain.</p>
      <DSec icon="journey" title="User journeys" sub={`${journeys.length} narratives · click to trace`}>
        <div className="dd-journeys">
          {journeys.map(j => (
            <div className="dd-journey dd-clickable" key={j.id} onClick={() => open(j.id)}>
              <div className="dd-journey-h">
                <span className="dd-journey-id">{j.id}</span>
                <span className="dd-journey-title">{j.title}</span>
                <span className="dd-journey-who" onClick={e => e.stopPropagation()}><TRef id={j.personaId} /></span>
              </div>
              <div className="dd-arc">
                {[['Opening', j.opening], ['Rising', j.rising], ['Climax', j.climax], ['Resolution', j.resolution]].map(([k, v], i) => (
                  <div className={'dd-arc-step s' + i} key={k}>
                    <div className="dd-arc-k">{k}</div>
                    <div className="dd-arc-v">{v}</div>
                  </div>
                ))}
              </div>
              {j.capabilities && <div className="dd-caps"><span className="k">Capabilities</span>{j.capabilities}</div>}
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DISCOVER · Risk register ===================== */
function DiscoverRisks({ prd }) {
  const risks = prd.risk || [];
  const open = useOpen();
  const lvl = v => (v || '').toLowerCase();
  return (
    <>
      <p className="dd-lead">The assumptions that could break this product, scored by likelihood and impact, each with a named owner and mitigation. Open risks travel with the product into Design.</p>
      <DSec icon="alert" title="Risk register" sub={`${risks.length} tracked risks · click to open`}>
        <div className="asc-panel dd-risks">
          <div className="dd-risk-head"><span>Risk</span><span>Likelihood</span><span>Impact</span><span>Mitigation</span><span>Owner</span></div>
          {risks.map(r => (
            <div className="dd-risk dd-clickable" key={r.id} onClick={() => open(r.id)}>
              <div className="dd-risk-title"><span className="dd-risk-cat">{r.cat}</span>{r.title}</div>
              <div><span className={'dd-pill ' + lvl(r.likelihood)}>{r.likelihood}</span></div>
              <div><span className={'dd-pill ' + lvl(r.impact)}>{r.impact}</span></div>
              <div className="dd-risk-mit">{r.mitigation}</div>
              <div className="dd-risk-owner">{r.owner}</div>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DISCOVER · Opportunity sizing ===================== */
function DiscoverSizing({ prd }) {
  const objectives = (prd.portfolio && prd.portfolio.objectives) || [];
  const open = useOpen();
  const shifts = [
    { k: 'Fraud loss rate', from: '18 bps', to: '7 bps', sc: 'SC1' },
    { k: 'False declines',  from: '6.2%',   to: '2.5%', sc: 'SC2' },
    { k: 'Time-to-block',   from: '4 hours', to: '90 s', sc: 'SC3' },
  ];
  return (
    <>
      <p className="dd-lead">How big is the prize, and how do we know? The measurable shift this product is sized to deliver, and the objectives it ladders up to. Each metric links to its success criterion.</p>

      <DSec icon="target" title="The shift" sub="Today → the target this product is sized for">
        <div className="dd-shifts">
          {shifts.map(s => (
            <div className="dd-shift" key={s.sc}>
              <div className="dd-shift-k">{s.k}</div>
              <div className="dd-shift-row">
                <span className="dd-shift-from">{s.from}</span>
                <DIco k="arrow" w={15} />
                <span className="dd-shift-to">{s.to}</span>
              </div>
              <TRef id={s.sc} />
            </div>
          ))}
        </div>
      </DSec>

      <DSec icon="board" title="Objectives & key results" sub="What the opportunity ladders up to · click to trace">
        <div className="dd-okrs">
          {objectives.map(ob => (
            <div className="dd-okr" key={ob.id}>
              <div className="dd-okr-h dd-clickable" onClick={() => open(ob.id)}><span className="dd-okr-id">{ob.id}</span>{ob.objective}<span className="dd-okr-owner">{ob.owner}</span></div>
              {(ob.keyResults || []).map(kr => (
                <div className="dd-kr dd-clickable" key={kr.id} onClick={() => open(kr.id)}>
                  <span className="dd-kr-id">{kr.id}</span>
                  <span className="dd-kr-text">{kr.kr}<span className="dd-kr-contrib">{kr.contribution}</span></span>
                  {kr.metric && <span onClick={e => e.stopPropagation()}><TRef id={kr.metric} /></span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DISCOVER · Product scope (the gate) ===================== */
function DiscoverScope({ prd }) {
  const p = prd.product || {};
  const horizons = [
    { k: 'Now · MVP',  items: p.mvp || [],    cls: 'now' },
    { k: 'Next · Growth', items: p.growth || [], cls: 'next' },
    { k: 'Later · Vision', items: p.vision || [], cls: 'later' },
  ];
  return (
    <>
      <div className="dd-gatebar">
        <div className="dd-gatebar-ic"><DIco k="gate" w={18} /></div>
        <div>
          <div className="dd-gatebar-t">Discover → Design gate</div>
          <div className="dd-gatebar-s">Product scope is the commitment boundary that closes Discovery. Agreeing what is in, what is out, and the build horizons is what lets the product cross into Design — no separate phase needed.</div>
        </div>
      </div>

      {p.approach && (
        <DSec icon="scope" title="Approach" sub="How we'll attack the opportunity">
          <div className="dd-approach">{p.approach}</div>
        </DSec>
      )}

      <DSec icon="check" title="Scope boundary" sub="What we are — and are not — building">
        <div className="dd-scope">
          <div className="dd-scope-col in">
            <div className="dd-scope-h"><DIco k="check" w={13} /> In scope</div>
            {(p.inScope || []).map((s, i) => <div className="dd-scope-row" key={i}>{s}</div>)}
          </div>
          <div className="dd-scope-col out">
            <div className="dd-scope-h"><DIco k="x" w={13} /> Out of scope</div>
            {(p.outScope || []).map((s, i) => <div className="dd-scope-row" key={i}>{s}</div>)}
          </div>
        </div>
      </DSec>

      <DSec icon="board" title="Build horizons" sub="Now / Next / Later">
        <div className="dd-horizons">
          {horizons.map(h => (
            <div className={'dd-horizon ' + h.cls} key={h.k}>
              <div className="dd-horizon-h">{h.k}</div>
              {h.items.map((it, i) => <div className="dd-horizon-row" key={i}>{it}</div>)}
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DESIGN · Use cases (flows + workflow) ===================== */
/* Use cases as list ↔ detail (D-063): the card opens a full page with back —
   the modal stays a peek for CHIP clicks from other surfaces only. */
function DesignUseCases({ prd }) {
  const ucs = prd.usecases || [];
  const [selId, setSelId] = React.useState(null);
  const [dtab, setDtab] = React.useState('scenario');
  const pick = (id) => { setSelId(id); setDtab('scenario'); };
  const sel = ucs.find(u => u.id === selId);

  if (sel) {
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Use cases</button>
      <div className="tstx-dh">
        <span className="tstx-dh-id">{sel.id}</span>
        <span className="tst-uc-t">{sel.title}</span>
        <span onClick={e => e.stopPropagation()}><TRef id={sel.primaryActor} /> <TRef id={sel.journeyId} /></span>
      </div>
      <div className="ddd-tabs agb-tabs">
        {[['scenario', 'Scenario'], ['flow', 'Main flow'], ['acceptance', `Acceptance · ${(sel.acceptance || []).length}`]].map(([k, lbl]) => (
          <button key={k} type="button" className={'ddd-tab' + (dtab === k ? ' on' : '')} onClick={() => setDtab(k)}>{lbl}</button>
        ))}
      </div>

      {dtab === 'scenario' && (
        <div className="dd-idetail">
          <div className="dd-idef"><span className="dd-iext-k">trigger</span><div className="dd-idef-v">{sel.trigger}</div></div>
          <div className="dd-idef"><span className="dd-iext-k">preconditions</span><div className="dd-idef-v">{sel.preconditions}</div></div>
          <div className="dd-idef"><span className="dd-iext-k">postconditions</span><div className="dd-idef-v">{sel.postconditions}</div></div>
          {sel.repeatability && <div className="dd-idef"><span className="dd-iext-k">repeatability</span><div className="dd-idef-v">{sel.repeatability}</div></div>}
          {sel.orchestration && <div className="dd-idef"><span className="dd-iext-k">orchestration</span><div className="dd-idef-v">{sel.orchestration}</div></div>}
          {sel.supportingActors && <div className="dd-idef"><span className="dd-iext-k">supporting</span><div className="dd-idef-v">{sel.supportingActors}</div></div>}
          <div className="dd-idef"><span className="dd-iext-k">realizes</span><div className="dd-idef-v" onClick={e => e.stopPropagation()}>{(sel.frs || []).map(f => <TRef id={f} key={f} />)}</div></div>
        </div>
      )}

      {dtab === 'flow' && (
        <DSec icon="flow" title="Main flow" sub="The happy path, with its branches and how every run can end">
          <div className="asc-panel agb-panel">
            <ol className="ops-steps">{(sel.mainFlow || []).map((st, i) => <li key={i}>{st}</li>)}</ol>
            {(sel.extensions || []).length > 0 && (<>
              <div className="dd-itype-h">Extensions <span className="dd-sub-sub">branch points off the main flow</span></div>
              {(sel.extensions || []).map((x, i) => (
                <div className="dd-ucx" key={i}><span className="dd-ucx-at">{x.at}</span><span>{x.text}</span></div>
              ))}
            </>)}
            {(sel.terminalStates || []).length > 0 && (<>
              <div className="dd-itype-h">Terminal states</div>
              {(sel.terminalStates || []).map((t, i) => (
                <div className="dd-ucx" key={i}><span className={'tstx-badge ' + (t.type === 'Success' ? 'pass' : 'fail')}>{t.type}</span><span>{t.text}</span></div>
              ))}
            </>)}
          </div>
        </DSec>
      )}

      {dtab === 'acceptance' && (
        <DSec icon="check" title="Acceptance criteria" sub="The Gherkin contract — run as tests in Build › Tests">
          <div className="asc-panel agb-panel">
            {(sel.acceptance || []).map((a, i) => (
              <div className="dd-ucacc" key={i}>
                <div className="dd-ucacc-t">{a.title}</div>
                <div className="tstx-gherkin">
                  {(a.given || []).map((x, j) => <div key={'g' + j}><b>{j === 0 ? 'GIVEN' : 'AND'}</b> {x}</div>)}
                  {(a.when || []).map((x, j) => <div key={'w' + j}><b>{j === 0 ? 'WHEN' : 'AND'}</b> {x}</div>)}
                  {(a.then || []).map((x, j) => <div key={'t' + j}><b>{j === 0 ? 'THEN' : 'AND'}</b> {x}</div>)}
                </div>
              </div>
            ))}
            {!(sel.acceptance || []).length && <div className="ddd-empty-inline">No acceptance criteria recorded.</div>}
          </div>
        </DSec>
      )}
    </>);
  }

  return (
    <>
      <p className="dd-lead">The solution as use cases — each realizing a journey. Open a card for the full detail: scenario, branches, terminal states and acceptance.</p>
      <div className="dd-ucgrid">
        {ucs.map(u => (
          <div className="dd-ucc dd-clickable" key={u.id} onClick={() => pick(u.id)}
            role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(u.id); } }}>
            <div className="dd-ucc-top"><span className="dd-uc-id">{u.id}</span><span className="dd-ucc-title">{u.title}</span></div>
            <p className="dd-ucc-desc">{u.postconditions || u.trigger}</p>
            <div className="dd-ucc-foot" onClick={e => e.stopPropagation()}>
              <TRef id={u.primaryActor} />
              <TRef id={u.journeyId} />
              {(u.frs || []).map(f => <TRef id={f} key={f} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ===================== DESIGN · Specifications ===================== */
function DesignSpecs({ prd, only }) {
  const frs = (prd.specs && prd.specs.functional) || [];
  const nfr = (prd.specs && prd.specs.nonfunctional) || [];
  const pol = (prd.specs && prd.specs.policies) || [];
  const areas = [...new Set(frs.map(f => f.area))];
  const open = useOpen();
  return (
    <>
      {!only && <p className="dd-lead">The buildable specification: functional requirements traced to journey and metric, the non-functional quality bar, and the policies that bind behaviour. Click any requirement to see what exercises and implements it.</p>}

      {(!only || only === 'fr') && (
      <DSec icon="req" title="Functional requirements" sub={`${frs.length} — grouped by area, traced to journey & metric`}>
        <div className="asc-panel dd-frs">
          {areas.map(area => (
            <div className="dd-frgrp" key={area}>
              <div className="dd-frgrp-h">{area}<span className="ct">{frs.filter(f => f.area === area).length}</span></div>
              {frs.filter(f => f.area === area).map(f => (
                <div className="dd-fr dd-clickable" key={f.id} onClick={() => open(f.id)}>
                  <span className="dd-fr-id">{f.id}</span>
                  <span className="dd-fr-text">{f.text}</span>
                  <span className="dd-fr-trace" onClick={e => e.stopPropagation()}>{f.traceJ && <TRef id={f.traceJ} />}{f.traceSC && <TRef id={f.traceSC} />}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </DSec>
      )}

      {(!only || only === 'nfr') && (
      <DSec icon="gauge" title="Non-functional requirements" sub={`${nfr.length} — the quality bar · click to trace`}>
        <div className="dd-nfrs">
          {nfr.map(n => (
            <div className="dd-nfr dd-clickable" key={n.id} onClick={() => open(n.id)}>
              <div className="dd-nfr-cat">{n.cat}</div>
              <div className="dd-nfr-text">{n.text}</div>
              <div className="dd-nfr-id">{n.id}</div>
            </div>
          ))}
        </div>
      </DSec>
      )}

      {(!only || only === 'policies') && (
      <DSec icon="policy" title="Policies" sub={`${pol.length} — rules the product must obey`}>
        <div className="dd-policies">
          {pol.map(p => (
            <div className="dd-policy dd-clickable" key={p.id} onClick={() => open(p.id)}>
              <div className="dd-policy-h"><span className="dd-policy-id">{p.id}</span>{p.name}<span onClick={e => e.stopPropagation()}>{p.traceFR && <TRef id={p.traceFR} />}</span></div>
              <div className="dd-policy-st">{p.statement}</div>
            </div>
          ))}
        </div>
      </DSec>
      )}
    </>
  );
}

/* ---- single-section wrappers (re-homed to Discover, D-026/D-027) ---- */
const SpecsFunctional = ({ prd }) => <DesignSpecs prd={prd} only="fr" />;
const SpecsNonFunctional = ({ prd }) => <DesignSpecs prd={prd} only="nfr" />;
const SpecsPolicies = ({ prd }) => <DesignSpecs prd={prd} only="policies" />;

/* ---- Discover · Stakeholders ---- */
function DiscoverStakeholders({ prd }) {
  const st = (prd && prd.stakeholders) || [];
  return (
    <>
      <p className="dd-lead">The accountable parties beyond the end users — who cares about this product and why.</p>
      <DSec icon="req" title="Stakeholders" sub={`${st.length} — interest + governance link`}>
        <div className="dd-policies">
          {st.map(s => (
            <div className="dd-policy" key={s.id}>
              <div className="dd-policy-h"><span className="dd-policy-id">{s.id}</span>{s.name} · {s.role}<span>{s.govLink && <TRef id={s.govLink} />}</span></div>
              <div className="dd-policy-st">{s.interest}</div>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ---- Cross-phase · Glossary (ubiquitous language) ---- */
function XGlossary({ prd }) {
  const g = (prd && prd.glossary) || [];
  return (
    <>
      <p className="dd-lead">The ubiquitous language — shared terms used across every phase. The seed of the bounded-context vocabulary.</p>
      <DSec icon="req" title="Glossary" sub={`${g.length} terms`}>
        <div className="dd-nfrs">
          {g.map((t, i) => (
            <div className="dd-nfr" key={i}>
              <div className="dd-nfr-cat">{t.term}</div>
              <div className="dd-nfr-text">{t.definition}</div>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ---- Cross-phase · Dependencies (captured here, tracked in Delivery) ---- */
function XDependencies({ prd }) {
  const deps = (prd && prd.portfolio && prd.portfolio.dependencies) || [];
  return (
    <>
      <p className="dd-lead">What this product depends on — upstream and downstream — and whether it's available. Captured anywhere, tracked through Delivery.</p>
      <DSec icon="link" title="Dependencies" sub={`${deps.length} — upstream / downstream`}>
        <div className="asc-panel dd-ints">
          {deps.map(d => (
            <div className="dd-int" key={d.id}>
              <span className={'dd-int-dir ' + d.direction}>{d.direction}</span>
              <span className="dd-int-sys">{d.product}<span className="dd-int-data">{d.nature}</span></span>
              <span className="dd-int-proto">{d.status}<span className="dd-int-auth">{d.notes}</span></span>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== DESIGN · Governance & controls ===================== */
function DesignControls({ prd }) {
  const A = window.__ARCH__;
  const gov = (prd && prd.governance) || [];
  const sec = (A && A.security) || [];
  const pol = (prd.specs && prd.specs.policies) || [];
  const open = useOpen();
  return (
    <>
      <p className="dd-lead">How the product stays governable — where humans stay in the loop, who owns each control, and the security controls that protect data and decisions. Every control links to the requirement or obligation it enforces.</p>

      <DSec icon="policy" title="Human-in-the-loop" sub="The rules that bind autonomy">
        <div className="dd-policies">
          {pol.map(p => (
            <div className="dd-policy dd-clickable" key={p.id} onClick={() => open(p.id)}>
              <div className="dd-policy-h"><span className="dd-policy-id">{p.id}</span>{p.name}<span onClick={e => e.stopPropagation()}>{p.traceFR && <TRef id={p.traceFR} />}</span></div>
              <div className="dd-policy-st">{p.statement}</div>
            </div>
          ))}
        </div>
      </DSec>

      {gov.length > 0 && (
        <DSec icon="alert" title="Governance" sub="Who owns each control, and its state · click to trace">
          <div className="asc-panel dd-gov">
            {gov.map(g => (
              <div className="dd-govrow dd-clickable" key={g.id} onClick={() => open(g.id)}>
                <span className="dd-gov-type">{g.type}</span>
                <span className="dd-gov-item">{g.item}<span className="dd-gov-notes">{g.notes}</span></span>
                <span className="dd-gov-owner">{g.owner}</span>
                <span className={'dd-pill ' + g.status.toLowerCase()}>{g.status}</span>
              </div>
            ))}
          </div>
        </DSec>
      )}

      {sec.length > 0 && (
        <DSec icon="policy" title="Security controls" sub="Protecting data and decisions · click to trace">
          <div className="dd-secs">
            {sec.map(s => (
              <div className="dd-sec dd-clickable" key={s.id} onClick={() => open(s.id)}>
                <div className="dd-sec-h">{s.control}</div>
                <div className="dd-sec-ap">{s.approach}</div>
                <div className="dd-sec-addr" onClick={e => e.stopPropagation()}>{(s.addresses || []).map(a => <TRef id={a} key={a} />)}</div>
              </div>
            ))}
          </div>
        </DSec>
      )}
    </>
  );
}

/* ===================== DESIGN · System design (D-045) =====================
   Renamed from "Architecture" — Design designs; Build architects; the drift
   between them is the review. The product-level assembly view, tabbed:
   the System map, the decisions, THE COMPONENTS TO BUILD (grouped by bounded
   context — the build plan), integration patterns, technology choices &
   resource bindings, the contract registry, and the security posture.
   Superseded and struck: the system-context mermaid (→ System map tab) and
   the subdomain-map mermaid (→ the Context map entry). */
const SD_TABS = [
  { key: 'map',          label: 'System map' },
  { key: 'decisions',    label: 'Decisions' },
  { key: 'components',   label: 'Components' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'stack',        label: 'Stack & resources' },
  { key: 'contracts',    label: 'Contracts' },
  { key: 'security',     label: 'Security' },
];
/* ── D-150: Business journeys — the Design phase's first entry ──
   The journey list (facts from Discover; the storm is Design's treatment of
   them), each a card: actor, span, what it needs from the engine, its
   treatment (storm fully / sketch / deferred) and its status. The gate
   banner encodes the sequencing rule: decomposition only against the union
   of the storm-fully journeys. */
const BJ_TREATMENT = {
  storm:    { label: 'storm fully', cls: 'ok' },
  sketch:   { label: 'sketch',      cls: '' },
  deferred: { label: 'deferred',    cls: 'err' },
};
const BJ_STATUS = {
  'not-stormed': { label: 'not stormed', cls: '' },
  stormed:       { label: 'stormed',     cls: 'ok' },
  decomposed:    { label: 'decomposed',  cls: 'ok' },
};
function DesignJourneys() {
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const [selBj, setSelBj] = React.useState(null);
  const js = BUSINESS_JOURNEYS.filter(j => j.product === nav.prod);
  if (!js.length) return (
    <div className="ddd-empty-inline">
      No business journeys recorded for this product yet. The method starts here: one big-picture storm per journey, every storm-fully journey on the wall before decomposition.
    </div>
  );
  const must = js.filter(j => j.treatment === 'storm');
  const done = must.filter(j => j.status !== 'not-stormed');
  const gateOpen = done.length === must.length;

  const sel = js.find(j => j.id === selBj);
  if (sel) {
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelBj(null)}>← Business journeys</button>
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">{sel.id} — {sel.name}</div>
          <div className="asc-sec-sub">{sel.actor} · {sel.span}</div>
        </div>
        <p className="mer-sub-p" style={{ maxWidth: 860 }}><b>Needs from the engine:</b> {sel.needs}</p>
        <p className="mer-sub-p" style={{ maxWidth: 860 }}>{sel.note}</p>
        <div style={{ display: 'flex', gap: 6, margin: '6px 0 12px' }}>
          <span className={'badge ' + BJ_TREATMENT[sel.treatment].cls}>{BJ_TREATMENT[sel.treatment].label}</span>
          <span className={'badge ' + BJ_STATUS[sel.status].cls}>{BJ_STATUS[sel.status].label}</span>
        </div>
        {sel.storm ? (
          <div style={{ height: '560px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
            <FlowEmbed flowId={sel.storm} variant={sel.stormVariant || 'flow'} />
          </div>
        ) : (
          <div className="ddd-empty-inline">Deferred — no storm authored yet, by decision. {sel.note}</div>
        )}
      </div>
    </>);
  }

  return (<>
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title">Business journeys — where Design starts</div>
        <div className="asc-sec-sub">
          One big-picture storm per journey, in domain language, hotspots marked. Boundaries are cut ONCE, against the union of these storms — the overlaps between journeys (payment, customer, policy) are where the boundary decisions live. Sketches exist to extract the facts that bend the model (reopen semantics, post-close credits) without the cost of a full storm.
        </div>
      </div>
      <div className={'mer-health'}>
        <div className="mer-h-top">
          <b>Decomposition gate</b>
          <span className={'badge ' + (gateOpen ? 'ok' : 'err')}>{gateOpen ? 'unlocked' : 'locked'}</span>
        </div>
        <div className="mer-h-act">
          {done.length} of {must.length} storm-fully journeys on the wall{gateOpen
            ? ' — decomposition may proceed against the union.'
            : ` — the current decomposition is provisional until ${must.filter(j => j.status === 'not-stormed').map(j => j.id).join(' · ')} are stormed.`}
        </div>
      </div>
    </div>
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title">The decomposition — journeys × contexts</div>
        <div className="asc-sec-sub">Every storm event has exactly one home context; a journey is a walk across them. Computed from the home tags — the overlaps are where the seams came from.</div>
      </div>
      {(() => {
        const COLS = [['CTX-INTAKE', 'Intake'], ['CTX-ADJUD', 'Adjudication'], ['CTX-REPAIR', 'Repair'], ['CTX-PAYMENTS', 'Payments'], ['CTX-TOTALLOSS', 'Total loss'], ['CTX-RECOVERY', 'Recovery'], ['EXT', 'Outside the cut']];
        const rows = js.filter(j => j.storm && j.storm !== 'wf-claims').map(j => {
          const m = BJ_STORMS.find(x => x.id === j.storm);
          const counts = {};
          if (m) for (const n of m.nodes) {
            if (n.kind !== 'event') continue;
            const h = n.home ? (n.home.startsWith('EXT') ? 'EXT' : n.home) : null;
            if (h) counts[h] = (counts[h] || 0) + 1;
          }
          return { j, counts };
        });
        const cell = { padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--line)', fontSize: 12 };
        return (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 640 }}>
              <thead><tr>
                <th style={{ ...cell, textAlign: 'left' }}></th>
                {COLS.map(([k, l]) => <th key={k} style={{ ...cell, fontWeight: 600 }}>{l}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(({ j, counts }) => (
                  <tr key={j.id}>
                    <td style={{ ...cell, textAlign: 'left', whiteSpace: 'nowrap' }}><b>{j.id}</b> {j.name}</td>
                    {COLS.map(([k]) => (
                      <td key={k} style={{ ...cell, background: counts[k] ? 'var(--accent-soft, #eef2ff)' : undefined, color: counts[k] ? 'var(--accent-ink, #3730a3)' : 'var(--ink-3, #9ca3af)' }}>
                        {counts[k] || '·'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
    <div className="asc-section">
      <div className="mer-subgrid">
        {js.map(j => (
          <div className="mer-sub" key={j.id} style={{ cursor: 'pointer' }} onClick={() => setSelBj(j.id)}>
            <div className="mer-sub-top">
              <span className="mer-pat other">{j.id}</span>
              <h3>{j.name}</h3>
            </div>
            <div className="mer-sub-bc">{j.actor} · {j.span}</div>
            <p className="mer-sub-p"><b>Needs from the engine:</b> {j.needs}</p>
            <p className="mer-sub-p">{j.note}</p>
            <div className="mer-sub-foot">
              <span className={'badge ' + BJ_TREATMENT[j.treatment].cls}>{BJ_TREATMENT[j.treatment].label}</span>
              <span className={'badge ' + BJ_STATUS[j.status].cls}>{BJ_STATUS[j.status].label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>);
}

/* ── D-149: Design starts at the USE CASES — each one IS an event flow ──
   The list first; click a use case and its event flow opens: step by step
   until the use case completes (success ends) or exits on a branch — the
   extensions and error paths, honestly shown where recorded. No bounded
   contexts at this altitude; decomposition comes next in the rail. The
   end-to-end workflow (the stitched journey) lives on the domain's
   Workflows page as the roll-up. */
function DesignWorkflows({ prd }) {
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const [selUc, setSelUc] = React.useState(null);
  const wfs = WORKFLOW_INVENTORY.filter(w => w.product === nav.prod);
  if (!wfs.length) return (
    <div className="ddd-empty-inline">
      No use-case flows authored for this product yet. The method: every use case gets its event flow — step by step to success or error — and the bounded contexts emerge from them afterwards.
    </div>
  );
  const w = wfs[0];
  const cov = workflowUcCoverage(w.id, w.product);
  const prdUc = (id) => ((prd && prd.usecases) || []).find(u => u.id === id);

  if (selUc) {
    const row = cov.rows.find(r => r.uc === selUc);
    const u = prdUc(selUc);
    const flowId = `ucf-${w.product.toLowerCase()}-${selUc.toLowerCase()}`;
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelUc(null)}>← Use cases</button>
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">{selUc} — {row ? row.label : ''}</div>
          <div className="asc-sec-sub">The use case as an event flow — every leaf is a terminal; branches are the extensions</div>
        </div>
        {row ? (
          <div style={{ height: '480px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
            <FlowEmbed flowId={flowId} variant="flow" />
          </div>
        ) : (
          <div className="ddd-empty-inline">No events ground on this use case yet — the flow has not been stormed.</div>
        )}
      </div>
      {u && (u.terminalStates || []).length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">How every run can end</div>
            <div className="asc-sec-sub">Success and error terminals from the use case — errors include how we report and recover where recorded</div></div>
          {(u.terminalStates || []).map((t, i2) => (
            <div className="mer-seam" key={i2}>
              <span className={'badge ' + (t.type === 'Success' ? 'ok' : 'err')}>{t.type}</span>
              <span className="mer-seam-what">{t.text}</span>
            </div>
          ))}
          {(u.extensions || []).map((x, i2) => (
            <div className="mer-seam" key={'x' + i2}>
              <span className="badge">extension</span>
              <span className="mer-seam-what"><b>{x.at}</b> — {x.text}</span>
            </div>
          ))}
        </div>
      )}
      {u && !(u.terminalStates || []).length && (
        <div className="ddd-empty-inline">No terminal states recorded for this use case yet — the error/recovery paths are still to be captured.</div>
      )}
    </>);
  }

  return (
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title">Use cases — each one is an event flow</div>
        <div className="asc-sec-sub">Click a use case to walk its flow step by step, to success or error. The stitched end-to-end workflow lives on the domain's Workflows page.</div>
      </div>
      {cov.rows.map(r => (
        <div className="mer-seam" key={r.uc} style={{ cursor: 'pointer' }} onClick={() => setSelUc(r.uc)}>
          <span className="mer-seam-ends" style={{ minWidth: 300 }}><b>{r.uc} — {r.label}</b></span>
          <span className="badge ok">{r.main.length + r.extended.length} events</span>
          <span className="mer-seam-what">{r.main.join(' → ')}{r.extended.length ? <> · extensions: {r.extended.length}</> : null}</span>
        </div>
      ))}
      {cov.gaps.map(g => (
        <div className="mer-seam" key={g.uc}>
          <span className="mer-seam-ends" style={{ minWidth: 300 }}><b>{g.uc} — {g.label}</b></span>
          <span className="badge err">no flow yet</span>
          <span className="mer-seam-what">No event grounds on it — storm it, or record it as a standing reaction.</span>
        </div>
      ))}
    </div>
  );
}

function DesignArchitecture({ prd }) {
  const A = window.__ARCH__;
  const open = useOpen();
  const [tab, setTab] = React.useState('map');
  if (!A) return <div className="env-empty"><div className="env-empty-ic"><DIco k="arch" w={20} /></div><div className="env-empty-t">System design</div><div className="env-empty-s">No system design has been authored for this product yet.</div></div>;
  const SysMap = window.DesignSystemMap;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  /* __ARCH__ is the v3 (fraud) as-built registry — a v4 product must never wear it.
     v4 products get the System map (their own, from the DDD seed's systemMapId) plus
     honest empty states on the as-built tabs until an arch registry is derived. */
  const p4 = typeof window !== 'undefined' && window.__PRD4__ && window.__PRD4__[nav.prod];
  if (p4) {
    /* D-111 (R4 gate line G1): the registers DERIVE from the product graph —
       Decision/Component/Contract nodes and their edges — never hand-seeded and
       never borrowed from another product. Tabs the graph is silent on (stack,
       security) keep the honest empty state that names the reason. */
    const p4g = typeof window !== 'undefined' && window.__kg4Product && window.__kg4Product(nav.prod);
    const cc = p4g && p4g.idx;
    const D4 = (typeof window !== 'undefined' && window.__DDD__ && window.__DDD__.byProduct && window.__DDD__.byProduct[nav.prod]) || null;
    const wallName = lid => (D4 && (D4.contexts || []).find(x => x.id === lid)?.name) || lid;
    const empty4 = why => <div className="ddd-empty-inline">{why}</div>;
    return (
      <>
        <p className="dd-lead">{(p4.overview && p4.overview.vision) || 'The product in its world.'}</p>
        <div className="ddd-tabs">
          {SD_TABS.map(t => (
            <button key={t.key} type="button" className={'ddd-tab' + (tab === t.key ? ' on' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {tab === 'map' && (SysMap ? <SysMap product={{ id: nav.prod }} prd={prd} /> : null)}

        {tab === 'decisions' && (cc ? (
          <DSec icon="policy" title="Design decisions" sub={`Derived from the ${nav.prod} lifecycle graph — Decision nodes with their recorded status; the go-forward decision lives in Realize`}>
            {cc.nodes('Decision').filter(d => /^ADR/.test(d.localId)).map(d => (
              <div className="dm-rel" key={d.id}>
                <div className="dm-rel-h">
                  <span className="dm-chip comp">{d.localId}</span>
                  <b>{d.label}</b>
                  <span className={'dm-chip ' + (d.props.status === 'accepted' ? 'event' : 'policy')}>{d.props.status}</span>
                </div>
                <p className="dm-rel-flow">{d.props.note}</p>
              </div>
            ))}
          </DSec>
        ) : empty4('The product graph is not loaded — the decisions register derives from it.'))}

        {tab === 'components' && (cc ? (
          <DSec icon="arch" title="Components to build" sub="Derived from the graph: each module implements its FRs and lives on exactly one wall (I1) — the modular-monolith packaging of ADR-01">
            {cc.nodes('Component').map(c4 => {
              const wall = (cc.byId.get((cc.out(c4.id, 'part_of')[0] || {}).to) || {}).localId;
              const frs = cc.out(c4.id, 'implements').map(e => (cc.byId.get(e.to) || {}).localId);
              const nfrs = cc.out(c4.id, 'constrained_by').map(e => (cc.byId.get(e.to) || {}).localId);
              const skills = cc.inn(c4.id, 'realizes').map(e => (cc.byId.get(e.from) || {}));
              return (
                <div className="dm-rel" key={c4.id}>
                  <div className="dm-rel-h">
                    <span className="dm-chip comp">{c4.localId}</span>
                    <b>{c4.label}</b>
                    <span className="dm-chip event">{wallName(wall)}</span>
                    {frs.map(f => <TRef id={f} key={f} />)}
                    {nfrs.map(f => <TRef id={f} key={f} />)}
                  </div>
                  <p className="dm-rel-flow">
                    <code>{c4.props.code}</code>
                    {skills.length > 0 && <> · realized by {skills.map(s => `${s.localId} (${s.props.tier})`).join(', ')}</>}
                    {c4.props.note && <> — {c4.props.note}</>}
                  </p>
                </div>
              );
            })}
          </DSec>
        ) : empty4('The product graph is not loaded — the components register derives from it.'))}

        {tab === 'integrations' && (D4 ? (
          <DSec icon="arch" title="External parties & cross-domain seams" sub="Everything crossing this product's boundary, typed by pattern — the same relations register the maps draw">
            {(D4.relations || []).filter(r => !String(r.from).startsWith('CTX-') || !String(r.to).startsWith('CTX-')).map((r, i) => (
              <div className="dm-rel" key={i}>
                <div className="dm-rel-h">
                  <span className="dm-chip event">{String(r.from).startsWith('CTX-') ? wallName(r.from) : r.from}</span>
                  <span className="dm-pol-arrow">→</span>
                  <span className="dm-chip event">{String(r.to).startsWith('CTX-') ? wallName(r.to) : r.to}</span>
                  <span className="dm-chip policy">{r.pattern}</span>
                  <span className="dm-rel-carries">carries: {r.label}</span>
                </div>
                <p className="dm-rel-flow">{r.flow}</p>
              </div>
            ))}
          </DSec>
        ) : empty4('No relations register for this product yet.'))}

        {tab === 'contracts' && (cc ? (
          <DSec icon="policy" title="Published language — contract registry" sub="Derived from the graph's Contract nodes: what crosses each seam, owned by the module that speaks it">
            {cc.nodes('Contract').map(k => {
              const owner = cc.byId.get((cc.out(k.id, 'owned_by')[0] || {}).to);
              return (
                <div className="dm-rel" key={k.id}>
                  <div className="dm-rel-h">
                    <span className="dm-chip comp">{k.localId}</span>
                    <b>{k.label}</b>
                    <span className="dm-chip policy">{k.props.contractType}</span>
                    {owner && <span className="dm-rel-carries">owned by {owner.label}</span>}
                  </div>
                  <p className="dm-rel-flow">{k.props.note}</p>
                </div>
              );
            })}
          </DSec>
        ) : empty4('The product graph is not loaded — the contract registry derives from it.'))}

        {tab === 'stack' && (cc && (cc.nodes('Resource').length || cc.nodes('Environment').length) ? (
          <DSec icon="arch" title="Stack & resources" sub="As built, from the lifecycle graph — the environments and the resources each module binds to (D-112)">
            {cc.nodes('Environment').map(e => (
              <div className="dm-rel" key={e.id}>
                <div className="dm-rel-h"><span className="dm-chip comp">env</span><b>{e.label}</b></div>
                <p className="dm-rel-flow">{e.props.note}</p>
              </div>
            ))}
            {cc.nodes('Resource').map(r => {
              const users = cc.inn(r.id, 'uses').map(e => (cc.byId.get(e.from) || {}).localId).join(', ');
              const owner = cc.byId.get((cc.out(r.id, 'owned_by')[0] || {}).to);
              return (
                <div className="dm-rel" key={r.id}>
                  <div className="dm-rel-h">
                    <span className="dm-chip comp">{r.props.kind}</span>
                    <b>{r.label}</b>
                    <span className="dm-chip event">{r.props.engine}</span>
                    <span className="dm-rel-carries">used by {users}{owner ? ` · owned by ${owner.label}` : ''}</span>
                  </div>
                  <p className="dm-rel-flow">{r.props.note}</p>
                </div>
              );
            })}
          </DSec>
        ) : empty4('Not authored yet — and the graph says so: no resource or environment nodes exist in this product’s graph.'))}

        {tab === 'security' && (cc && cc.nodes('Secret').length ? (
          <DSec icon="policy" title="Security & secrets" sub="Every credential the boundary needs, who uses it, and its rotation — governance acts stay human at every tier (D-056)">
            {cc.nodes('Secret').map(s => {
              const users = cc.inn(s.id, 'authenticates_with').map(e => (cc.byId.get(e.from) || {}).localId).join(', ');
              return (
                <div className="dm-rel" key={s.id}>
                  <div className="dm-rel-h">
                    <span className="dm-chip comp">{s.localId}</span>
                    <b>{s.label}</b>
                    <span className="dm-chip policy">{s.props.rotation}</span>
                    <span className="dm-rel-carries">used by {users}</span>
                  </div>
                  <p className="dm-rel-flow">{s.props.note}</p>
                </div>
              );
            })}
          </DSec>
        ) : empty4('Not authored yet — and the graph says so: no secret nodes exist in this product’s graph.'))}
      </>
    );
  }
  // components grouped by the bounded context that OWNS them (comp.bc — the
  // sovereignty grouping), not by arch domain (which spans BCs)
  const comps = (A.domains || []).flatMap(dm => (dm.components || []));
  const byBC = {};
  comps.forEach(c => { (byBC[c.bc || '—'] = byBC[c.bc || '—'] || []).push(c); });
  const ctxName = id => ((((window.__DDD__ || {}).byProduct || {})[nav.prod] || {}).contexts || []).find(c => c.id === id)?.name || id;
  const goBuild = () => { const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Build', entry: 'infra' }; window.cynPushUrl?.(t); window.__cynApplyProd?.(t); };

  return (
    <>
      <p className="dd-lead">{A.context.summary}</p>

      <div className="ddd-tabs">
        {SD_TABS.map(t => (
          <button key={t.key} type="button" className={'ddd-tab' + (tab === t.key ? ' on' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'map' && (SysMap ? <SysMap product={{ id: nav.prod }} prd={prd} /> : null)}

      {tab === 'decisions' && (() => {
        /* One ADR register, layer-tagged (D-047): this tab shows the DESIGN slice;
           build-layer records live on the Build side. informedBy → DRV/CON chips
           close the upstream half of the trace (driver → decision → requirement). */
        const designAdrs = A.decisions.filter(d => (d.layer || 'design') === 'design');
        const buildAdrs = A.decisions.filter(d => d.layer === 'build');
        const informers = Object.fromEntries([...(A.context.drivers || []), ...(A.context.constraints || [])].map(x => [x.id, x.text]));
        return (<>
        <DSec icon="arch" title="Drivers & constraints" sub="What shapes the design — each identified, so every decision can cite what informed it">
          <div className="dd-dc">
            <div className="dd-dc-col">
              <div className="dd-dc-h">Drivers</div>
              {A.context.drivers.map(d => <div className="dd-dc-row drive" key={d.id}><span className="dd-drv" title={d.text}>{d.id}</span>{d.text}</div>)}
            </div>
            <div className="dd-dc-col">
              <div className="dd-dc-h">Constraints</div>
              {A.context.constraints.map(d => (
                <div className="dd-dc-row constrain" key={d.id}>
                  <span className="dd-drv con" title={d.text}>{d.id}</span>{d.text}
                  {d.from && <span className="dd-drv-from" onClick={e => e.stopPropagation()} title="Self-imposed — this constraint crystallized out of a decision">← <TRef id={d.from} /></span>}
                  {d.from && (() => { const src = A.decisions.find(x => x.id === d.from); return src && src.status !== 'Accepted'
                    ? <span className="dd-con-warn">⚠ {d.from} is {src.status.toLowerCase()} — review this constraint</span> : null; })()}
                </div>
              ))}
            </div>
          </div>
        </DSec>
        <DSec icon="policy" title="Design decisions" sub={`${designAdrs.length} design-layer ADRs — informed by the drivers above; click to trace what each affects`}>
          <div className="asc-panel dd-adrs">
            {designAdrs.map(d => <AdrCard d={d} key={d.id} open={open} informers={informers} />)}
          </div>
          {buildAdrs.length > 0 && (
            <button type="button" className="asc-gd-fulltrace" onClick={goBuild}>{buildAdrs.length} build-layer decision{buildAdrs.length > 1 ? 's' : ''} live in Build ↗</button>
          )}
        </DSec>
        </>);
      })()}

      {tab === 'components' && (
        <DSec icon="arch" title="Components to build" sub="The event functions this design commits to, grouped by the bounded context that owns them — pure intent; statuses live in Build">
          <div className="dd-domains">
            {Object.entries(byBC).map(([bc, list]) => (
              <div className="dd-domain" key={bc} style={{ '--dc': 'var(--accent)' }}>
                <div className="dd-domain-h"><span className="dot"></span>{ctxName(bc)} <span className="sd-bc">{bc}</span></div>
                <div className="dd-comps">
                  {list.map(c => (
                    <div className="dd-comp dd-clickable" key={c.id} onClick={() => open(c.id)}>
                      <div className="dd-comp-h"><span className="dd-comp-id">{c.id}</span>{c.name}<span className="sd-arche">{componentArchetype(c).label}</span></div>
                      <div className="dd-comp-ov">{c.overview}</div>
                      <div className="dd-comp-maps" onClick={e => e.stopPropagation()}>{(c.mapsTo || []).map(m => <TRef id={m} key={m} />)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="asc-gd-fulltrace" onClick={goBuild}>View as-built status in Build ↗</button>
        </DSec>
      )}

      {tab === 'integrations' && (
        <DSec icon="link" title="Integration patterns" sub="Where this product meets the rest of the bank — pattern · direction · auth; the as-built surfaces live in Build › Integrations">
          <div className="asc-panel dd-ints">
            {(A.integrations || []).map(it => (
              <div className="dd-int dd-clickable" key={it.id} onClick={() => open(it.id)}>
                <span className={'dd-int-dir ' + it.direction}>{it.direction}</span>
                <span className="dd-int-sys">{it.system}<span className="dd-int-data">{it.data}</span></span>
                <span className="dd-int-proto">{it.protocol}<span className="dd-int-auth">{it.auth}</span></span>
              </div>
            ))}
          </div>
        </DSec>
      )}

      {tab === 'stack' && (<>
        {/* D-038: Design carries the technology CHOICE and its rationale; the pinned
            versions are physical actuals and live in Build (as-built stack). */}
        <DSec icon="board" title="Technology choices" sub="What it's built on — the choices and why · pinned versions live in Build">
          <div className="asc-panel dd-stack">
            {A.stack.map((s, i) => (
              <div className="dd-stackrow" key={i}>
                <div className="dd-stack-layer">{s.layer}</div>
                <div className="dd-stack-tech">{s.tech}</div>
                <div className="dd-stack-why">{s.why}</div>
              </div>
            ))}
          </div>
        </DSec>
        <ArchResources A={A} open={open} />
      </>)}

      {tab === 'contracts' && <ArchApisContracts A={A} open={open} />}

      {tab === 'security' && <ArchSecuritySecrets A={A} open={open} />}
    </>
  );
}

/* ---- Architecture page · Resources & data (the inventory) ---- */
/* Usage is derived bottom-up from component links — never hand-maintained. */
function archResourceUsers(A, resId) {
  const users = [];
  (A.domains || []).forEach(dm => (dm.components || []).forEach(c => {
    const uses = (c.resource || []).includes(resId) || (c.dependency || []).some(d => d.ref === resId);
    if (uses) users.push(c.id);
  }));
  return users;
}
function ArchResources({ A, open }) {
  const groups = {};
  (A.resources || []).forEach(r => { (groups[r.cat] = groups[r.cat] || []).push(r); });
  const order = ['Databases', 'Messaging', 'Cache', 'Object storage', 'Secrets'];
  const cats = [...order.filter(c => groups[c]), ...Object.keys(groups).filter(c => !order.includes(c))];
  const unused = (A.resources || []).filter(r => archResourceUsers(A, r.id).length === 0);
  return (
    /* D-038: Design's inventory is the resource CLASS + role + usage (the binding the
       domain needs); placement and per-environment config are Build's as-built view. */
    <DSec icon="board" title="Resources & data" sub="The resource classes the domain needs, and who uses each — provisioning & config live in Build">
      <div className="dd-resgroups">
        {cats.map(cat => (
          <div className="dd-resgroup" key={cat}>
            <div className="dd-resgroup-h">{cat}</div>
            {groups[cat].map(r => {
              const users = archResourceUsers(A, r.id);
              return (
                <div className="dd-res dd-clickable" key={r.id} onClick={() => open(r.id)}>
                  <div className="dd-res-main">
                    <span className="dd-res-name">{r.name}</span>
                    <span className="dd-res-engine">{r.engine}</span>
                  </div>
                  <div className="dd-res-desc">{r.desc}</div>
                  <div className="dd-res-used" onClick={e => e.stopPropagation()}>
                    <span className="dd-res-usedk">used by</span>
                    {users.length ? users.map(u => <TRef id={u} key={u} />) : <span className="dd-res-unused">⚠ nothing links here</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {unused.length > 0 && <div className="dd-res-drift">Drift check: {unused.length} resource{unused.length > 1 ? 's' : ''} with no component using {unused.length > 1 ? 'them' : 'it'} — {unused.map(r => r.name).join(', ')}.</div>}
    </DSec>
  );
}

/* ---- Architecture page · APIs & contracts (+ schema alignment) ---- */
function ArchApisContracts({ A, open }) {
  return (
    <DSec icon="link" title="APIs & contracts" sub="The surface area — endpoints, and the schema registry every boundary shares">
      <div className="asc-panel dd-apis">
        {(A.apis || []).map(a => (
          <div className="dd-api dd-clickable" key={a.id} onClick={() => open(a.id)}>
            <code className="dd-api-ep"><b>{a.method}</b> {a.path}</code>
            <span className="dd-api-purpose">{a.purpose}</span>
            <span className="dd-api-realizes" onClick={e => e.stopPropagation()}>{(a.realizes || []).map(r => <TRef id={r} key={r} />)}</span>
          </div>
        ))}
      </div>
      {(A.schemas || []).length > 0 && <>
        <div className="dd-sub-h">Schema registry <span className="dd-sub-sub">producer → consumer alignment per contract</span></div>
        <div className="asc-panel dd-schemas">
          <div className="dd-schema dd-schema-head">
            <span>Contract</span><span>Kind</span><span>Version</span><span>Producers</span><span>Consumers</span>
          </div>
          {(A.schemas || []).map(s => (
            <div className="dd-schema dd-clickable" key={s.id} onClick={() => open(s.id)}>
              <span className="dd-schema-name">{s.name}</span>
              <span className="dd-schema-kind">{s.kind}</span>
              <span className="dd-schema-ver">v{s.version}</span>
              <span className="dd-schema-refs" onClick={e => e.stopPropagation()}>{(s.producers || []).map(p => <TRef id={p} key={p} />)}</span>
              <span className="dd-schema-refs" onClick={e => e.stopPropagation()}>{(s.consumers || []).length ? (s.consumers || []).map(c => <TRef id={c} key={c} />) : <span className="dd-res-unused">⚠ none</span>}</span>
            </div>
          ))}
        </div>
      </>}
    </DSec>
  );
}

/* ---- Architecture page · Security & secrets ---- */
function ArchSecuritySecrets({ A, open }) {
  return (
    <DSec icon="policy" title="Security & secrets" sub="Controls, and the credential inventory under management">
      <div className="dd-secs">
        {(A.security || []).map(s => (
          <div className="dd-sec dd-clickable" key={s.id} onClick={() => open(s.id)}>
            <div className="dd-sec-h">{s.control}</div>
            <div className="dd-sec-ap">{s.approach}</div>
            <div className="dd-sec-addr" onClick={e => e.stopPropagation()}>{(s.addresses || []).map(a => <TRef id={a} key={a} />)}</div>
          </div>
        ))}
      </div>
      {/* D-038: Design records WHICH credentials exist and who needs them; the
          manager, path and rotation are operational actuals — see Build. */}
      {(A.secrets || []).length > 0 && <>
        <div className="dd-sub-h">Credentials <span className="dd-sub-sub">every credential the system needs, and who uses it — management & rotation live in Build</span></div>
        <div className="asc-panel dd-secrets">
          {(A.secrets || []).map(s => (
            <div className="dd-secret dd-clickable" key={s.id} onClick={() => open(s.id)}>
              <span className="dd-secret-name">🔑 {s.name}</span>
              <span className="dd-secret-kind">{s.kind}</span>
              <span className="dd-secret-used" onClick={e => e.stopPropagation()}>{(s.usedBy || []).map(u => <TRef id={u} key={u} />)}</span>
            </div>
          ))}
        </div>
      </>}
    </DSec>
  );
}

/* ---- Build · Infrastructure & environments (the as-built surface, D-035/D-038) ----
   Design holds the architecture INTENT (ADRs, components, contracts, resource
   classes); this surface accrues the ACTUALS — environments (cloud accounts,
   clusters), provisioned resources with their config knobs, secret management and
   pinned versions. Populated from __ARCH__ for now; the coding agent becomes the
   writer once Build is live. */

/* What each physical parameter means — rendered as a help-cursor tooltip so the
   as-built values stay explainable to non-infra readers. Keys match config `k`s. */
const PARAM_HINTS = {
  'Partitions': 'Kafka parallelism unit — consumers scale up to one per partition. Sized for peak TPS with headroom.',
  'Retention': 'How long data is kept before being discarded or archived — on the bus this bounds replay; on a store it is the compliance window.',
  'Replication': 'Copies of each partition across brokers — the cluster survives a broker loss without data loss.',
  'Idempotent producers': 'Exactly-once publishing per partition — a retry can never duplicate a decision event.',
  'Mode': 'Deployment topology — how instances are arranged for scale and failover.',
  'Eviction': 'What the cache does when memory fills. noeviction fails writes loudly instead of silently dropping features.',
  'TTL': 'Time-to-live — how long a cached value stays valid before it must be recomputed.',
  'Partitioning': 'Table partitioning scheme — keeps the hot working set small and archival cheap.',
  'Backups': 'PITR = point-in-time recovery — restore to any moment, not just the last snapshot.',
  'Type': 'Queue type — Standard favors throughput; FIFO favors strict ordering.',
  'Visibility': 'How long a consumed message stays hidden before it is redelivered to another consumer.',
  'DLQ': 'Dead-letter queue — messages that repeatedly fail delivery park here for inspection.',
  'Object lock': 'WORM retention — objects cannot be modified or deleted for the compliance window.',
  'Encryption': 'Server-side encryption with KMS-managed keys.',
  'Rotation': 'How often the credential is automatically replaced.',
  'Access': 'Scoped through IAM roles — least privilege.',
  'Auth': 'How callers authenticate at the edge — mutual TLS for systems, OAuth2 for delegated clients.',
  'Rate limit': 'Per-client request budget — protects the hot path from a noisy neighbour.',
  'Timeout': 'How long the gateway waits on the upstream before failing the call — bounded by the decision budget.',
  'cluster': 'The Kubernetes cluster this environment runs on.',
  'region': 'Cloud region (and AZ spread) — multi-AZ survives a zone outage.',
  'account': 'The cloud account / project this environment is isolated in.',
  'iac': 'Infrastructure-as-Code — the repo that declares everything on this card.',
};
const Hint = ({ k, children }) => (
  <span className={PARAM_HINTS[k] ? 'dd-help' : undefined} title={PARAM_HINTS[k]}>{children ?? k}</span>
);

function EnvCards({ A, open }) {
  const inf = A.infra;
  const resIn = (envId) => (A.resources || []).filter(r => (r.environments || []).includes(envId));
  return (
    <div className="dd-envs">
      {(inf.environments || []).map(env => (
        <div className="dd-env" key={env.id}>
          <div className="dd-env-h"><span className="dd-env-name">{env.name}</span><Hint k="cluster"><span className="dd-env-cluster">{env.cluster}</span></Hint><Hint k="region"><span className="dd-env-region">{env.region}</span></Hint></div>
          <div className="dd-env-notes">{env.notes}</div>
          <div className="dd-env-row"><span className="dd-env-k">account</span>
            {env.accountUrl && <a className="dd-env-res" href={env.accountUrl} target="_blank" rel="noreferrer"><Hint k="account">cloud account ↗</Hint></a>}
            {env.iacUrl && <a className="dd-env-res" href={env.iacUrl} target="_blank" rel="noreferrer"><Hint k="iac">IaC ↗</Hint></a>}
          </div>
          <div className="dd-env-row"><span className="dd-env-k">services</span>{(env.services || []).map((s, i) => <span className="dd-env-chip" key={i}>{s.name}</span>)}</div>
          <div className="dd-env-row"><span className="dd-env-k">resources</span>{resIn(env.id).map(r => <button type="button" className="dd-env-res" key={r.id} onClick={() => open(r.id)}>{r.name}</button>)}</div>
          <div className="dd-env-row"><span className="dd-env-k">dashboards</span>{(env.dashboards || []).map((dsh, i) => <span className="dd-env-chip" key={i}>{dsh.name}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

/* One provisioned resource — engine, placement, and every config knob (hover for
   what a parameter means). */
function ResCard({ r, open }) {
  return (
    <div className="dd-res dd-bres dd-clickable" onClick={() => open(r.id)}>
      <div className="dd-res-main">
        <span className="dd-res-name">{r.name}</span>
        <span className="dd-res-engine">{r.cat} · {r.engine}</span>
        <span className="dd-res-envs">{(r.environments || []).join(' · ')}</span>
      </div>
      <div className="dd-res-desc">{r.desc}</div>
      {(r.config || []).length > 0 && (
        <div className="dd-cfg" onClick={e => e.stopPropagation()}>
          {r.config.map(c => (
            <span className="dd-cfg-kv" key={c.k}><Hint k={c.k}><span className="dd-cfg-k">{c.k}</span></Hint><span className="dd-cfg-v">{c.v}</span></span>
          ))}
        </div>
      )}
    </div>
  );
}

/* Secret rows — where each credential physically lives, its path, rotation. */
function SecretRows({ A, open }) {
  return (
    <div className="asc-panel dd-secrets">
      {(A.secrets || []).map(s => (
        <div className="dd-secret dd-clickable" key={s.id} onClick={() => open(s.id)}>
          <span className="dd-secret-name">🔑 {s.name}</span>
          <span className="dd-secret-mgr">{s.manager}<code className="dd-secret-path">{s.pathHint}</code></span>
          <span className="dd-secret-mgr"><Hint k="Rotation"><span className="dd-secret-rot">rotates {s.rotation}</span></Hint></span>
          <span className="dd-secret-used" onClick={e => e.stopPropagation()}>{(s.usedBy || []).map(u => <TRef id={u} key={u} />)}</span>
        </div>
      ))}
    </div>
  );
}

/* The service categories of the Resources page (D-039) — the user's taxonomy plus
   Messaging / Networking / Compute (an EDA product's bus, gateway and clusters
   need homes). Each category lists what the coding agent has provisioned. */
const RES_CATS = [
  { key: 'ai',            label: 'AI' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'databases',     label: 'Databases' },
  { key: 'permissions',   label: 'Permissions' },
  { key: 'storage',       label: 'Storage' },
  { key: 'secrets',       label: 'Secrets' },
  { key: 'jobs',          label: 'Jobs' },
  { key: 'functions',     label: 'Functions' },
  { key: 'observability', label: 'Observability' },
  { key: 'messaging',     label: 'Messaging' },
  { key: 'networking',    label: 'Networking' },
  { key: 'compute',       label: 'Compute' },
];
const RES_EMPTY = {
  ai: 'No AI resources provisioned yet — model endpoints and LLM gateways land here as they are deployed.',
  networking: 'No networking resources provisioned yet — the API gateway lands here when the coding agent deploys it.',
  default: 'Nothing provisioned in this category yet — the coding agent populates it as it deploys.',
};
/* File everything provisioned into the service categories — shared by the page
   and the sidebar flyout's counts (D-048). */
function resCatalog(A) {
  const comps = (A.domains || []).flatMap(dm => (dm.components || []).map(c => ({ ...c, domainName: dm.name })));
  const items = { ai: [], notifications: [], databases: [], permissions: [], storage: [], secrets: [], jobs: [], functions: [], observability: [], messaging: [], networking: [], compute: [] };
  (A.resources || []).forEach(r => {
    if (r.id === 'res-notify') items.notifications.push({ kind: 'res', r });        // outbound customer comms
    else if (r.cat === 'Messaging') items.messaging.push({ kind: 'res', r });        // the event backbone
    else if (r.cat === 'Databases' || r.cat === 'Cache') items.databases.push({ kind: 'res', r });
    else if (r.cat === 'Object storage') items.storage.push({ kind: 'res', r });
    else if (r.cat === 'Secrets') items.secrets.push({ kind: 'res', r });
    else if (r.cat === 'Networking') items.networking.push({ kind: 'res', r });
    else items.compute.push({ kind: 'res', r });
  });
  (A.integrations || []).forEach(it => {
    if (it.id === 'INT-registry') items.ai.push({ kind: 'int', it });                // model registry / LLM side
    if (it.id === 'INT-notify') items.notifications.push({ kind: 'int', it });
  });
  items.secrets.unshift({ kind: 'secrets' });                                        // credential rows render via SecretRows
  comps.forEach(c => (c.trigger || []).filter(t => t.type === 'Schedule').forEach(t => items.jobs.push({ kind: 'job', t, c })));
  items.functions = comps.map(c => ({ kind: 'fn', c }));
  ((A.infra || {}).environments || []).forEach(env => {
    (env.dashboards || []).forEach(d => items.observability.push({ kind: 'dash', env, d }));
    items.compute.push({ kind: 'cluster', env });
  });
  (A.security || []).filter(s => /IAM|role|least privilege|access/i.test(s.control + ' ' + s.approach))
    .forEach(s => items.permissions.push({ kind: 'sec', s }));
  const count = k => items[k].filter(x => x.kind !== 'secrets').length + (k === 'secrets' ? (A.secrets || []).length : 0);
  return { items, count };
}

function BuildInfrastructure() {
  const A = window.__ARCH__;
  const open = useOpen();
  // category selection is driven by the sidebar flyout (D-048): the flyout writes
  // window.__cynResCat and fires 'cyn-rescat'; this page follows.
  const [sel, setSel] = React.useState(() => (typeof window !== 'undefined' && window.__cynResCat) || 'env');
  React.useEffect(() => {
    const onCat = (e) => setSel(e.detail || 'env');
    window.addEventListener('cyn-rescat', onCat);
    return () => window.removeEventListener('cyn-rescat', onCat);
  }, []);
  if (!A || !A.infra) return <div className="env-empty"><div className="env-empty-ic"><DIco k="arch" w={20} /></div><div className="env-empty-t">Resources</div><div className="env-empty-s">Nothing built yet — the AI coding agent populates this surface as it deploys.</div></div>;
  const { items, count } = resCatalog(A);

  const catBody = (k) => {
    const list = items[k];
    if (!count(k)) return <div className="ddd-empty-inline">{RES_EMPTY[k] || RES_EMPTY.default}</div>;
    return (
      <>
        {list.map((x, i) => {
          if (x.kind === 'res') return <ResCard r={x.r} open={open} key={x.r.id} />;
          if (x.kind === 'secrets') return <SecretRows A={A} open={open} key="secrets" />;
          if (x.kind === 'int') return (
            <div className="dd-int dd-clickable" key={x.it.id} onClick={() => open(x.it.id)}>
              <span className={'dd-int-dir ' + x.it.direction}>{x.it.direction}</span>
              <span className="dd-int-sys">{x.it.system}<span className="dd-int-data">{x.it.data}</span></span>
              <span className="dd-int-proto">{x.it.protocol}<span className="dd-int-auth">{x.it.auth}</span></span>
            </div>
          );
          if (x.kind === 'job') return (
            <div className="dd-job" key={i}>
              <span className="dd-job-name">◷ {x.t.name}</span>
              <span className="dd-job-why">{x.t.why}</span>
              <span onClick={e => e.stopPropagation()}><TRef id={x.c.id} /></span>
            </div>
          );
          if (x.kind === 'fn') return (
            <div className="dd-bstat dd-clickable" key={x.c.id} onClick={() => open(x.c.id)}>
              <span className="dd-bstat-name"><b>{x.c.id}</b> {x.c.name}<span className="dd-bstat-dom"> · {x.c.domainName}</span></span>
              <code className="dd-bstat-path">{x.c.code?.path || '—'}</code>
              <span className="dd-bstat-tests">{x.c.code?.tests || 'not built'}</span>
              <span className="dd-bstat-cov">{x.c.code?.coverage || ''}</span>
              <span className="dd-bstat-own">{x.c.code?.owners || ''}</span>
            </div>
          );
          if (x.kind === 'dash') return (
            <div className="dd-job" key={i}>
              <span className="dd-job-name">📊 {x.d.name}</span>
              <span className="dd-job-why">{x.env.name}</span>
            </div>
          );
          if (x.kind === 'cluster') return (
            <div className="dd-job" key={i}>
              <span className="dd-job-name">⬢ <Hint k="cluster">{x.env.cluster}</Hint></span>
              <span className="dd-job-why">{A.infra.platform} · <Hint k="region">{x.env.region}</Hint> · {x.env.name}</span>
            </div>
          );
          if (x.kind === 'sec') return (
            <div className="dd-sec dd-clickable" key={x.s.id} onClick={() => open(x.s.id)}>
              <div className="dd-sec-h">{x.s.control}</div>
              <div className="dd-sec-ap">{x.s.approach}</div>
            </div>
          );
          return null;
        })}
      </>
    );
  };

  const curLabel = sel === 'env' ? 'Environments' : RES_CATS.find(c => c.key === sel)?.label;
  return (
    <>
      <p className="dd-lead">The as-built picture: the cloud resources and services that actually run, organized by service category. Deployed and updated by the AI coding agent — the architect reads it, the drift against Design is the review.</p>

          {sel === 'env' ? (
            <>
              <DSec icon="arch" title="Environments" sub={`${A.infra.cloud} · ${A.infra.platform} — accounts, clusters and what runs where`}>
                <p className="dd-infra-sum">{A.infra.summary} <span onClick={e => e.stopPropagation()}>{(A.infra.adrs || []).map(a => <TRef id={a} key={a} />)}{(A.infra.meets || []).map(m => <TRef id={m} key={m} />)}</span></p>
                <EnvCards A={A} open={open} />
              </DSec>
              <DSec icon="board" title="As-built stack" sub="The pinned versions actually running — the physical half of Design's technology choices">
                <div className="asc-panel dd-stack">
                  {(A.stack || []).map((s, i) => (
                    <div className="dd-stackrow" key={i}>
                      <div className="dd-stack-layer">{s.layer}</div>
                      <div className="dd-stack-tech">{s.tech}<span className="dd-stack-ver">{s.version}</span></div>
                      <div className="dd-stack-why">{s.why}</div>
                    </div>
                  ))}
                </div>
              </DSec>
              {(() => {
                /* the BUILD slice of the shared ADR register (D-047) — physical
                   decisions; the design slice lives in Design › System design */
                const buildAdrs = (A.decisions || []).filter(d => d.layer === 'build');
                if (!buildAdrs.length) return null;
                const informers = Object.fromEntries([...(A.context.drivers || []), ...(A.context.constraints || [])].map(x => [x.id, x.text]));
                return (
                  <DSec icon="policy" title="Build decisions" sub={`${buildAdrs.length} build-layer ADRs — same register as Design's decisions, constraining the physical realization`}>
                    <div className="asc-panel dd-adrs">
                      {buildAdrs.map(d => <AdrCard d={d} key={d.id} open={open} informers={informers} showLayer />)}
                    </div>
                  </DSec>
                );
              })()}
            </>
          ) : (
            <DSec icon="board" title={curLabel} sub="Provisioned in the cloud for this product — hover a parameter for what it means">
              {catBody(sel)}
            </DSec>
          )}
    </>
  );
}

/* ---- Build · Integrations (D-040) ----
   Every surface other systems integrate with, grouped by the domain · subdomain
   that OWNS it, split into APIs (synchronous, via the gateway) and Events
   (asynchronous topics on the bus). Each endpoint/queue references the resource
   that carries it and its versioned contract. External systems close the page
   with the pattern-level counterparties and the contracts that cross.
   (A third type — Files/batch, e.g. bucket drops to the Core Ledger — is part of
   the model but has no provisioned instances yet.) */
/* Provider groups + external counterparties — shared by the page and the
   sidebar flyout's counts (D-048). */
function intCatalog(A) {
  const comps = (A.domains || []).flatMap(dm => (dm.components || []).map(c => ({ ...c, domainName: dm.name })));
  const compBy = id => comps.find(c => c.id === id);
  // provider groups — one per bounded context that exposes surfaces
  const bcs = [...new Set(comps.map(c => c.bc))];
  const groups = bcs.map(bc => ({
    key: bc,
    label: `${comps.find(c => c.bc === bc)?.domainName} · ${bc}`,
    apis: (A.apis || []).filter(a => compBy(a.ownedBy)?.bc === bc),
    events: (A.schemas || []).filter(s => s.kind === 'event' && compBy(s.ownedBy)?.bc === bc),
  })).filter(g => g.apis.length || g.events.length);
  const externals = (A.integrations || []).map(it => ({
    it,
    contracts: (A.schemas || []).filter(s => s.ownedBy === it.id || (s.producers || []).includes(it.id) || (s.consumers || []).includes(it.id)),
  }));
  return { comps, compBy, groups, externals };
}

function BuildIntegrations() {
  const A = window.__ARCH__;
  const open = useOpen();
  const [tab, setTab] = React.useState('internal');   // internal | external
  const [selId, setSelId] = React.useState(null);      // opened integration; null = the list
  const [kind, setKind] = React.useState('all');       // all | api | event
  const [only, setOnly] = React.useState('all');       // 'all' or one integration id
  if (!A) return <div className="env-empty"><div className="env-empty-ic"><DIco k="link" w={20} /></div><div className="env-empty-t">Integrations</div><div className="env-empty-s">Nothing integrated yet — surfaces appear here as the coding agent wires them.</div></div>;
  const { compBy, groups, externals } = intCatalog(A);
  const schemaForApi = apiId => (A.schemas || []).find(s => s.api === apiId);
  // resolve any id to its human name — the page reads in names; ids stay as trace links
  const nameOf = id => compBy(id)?.name
    || ((A.integrations || []).find(i => i.id === id) || {}).system
    || (() => { const r = (A.resources || []).find(x => x.id === id); return r ? `${r.name} (${r.engine})` : id; })();
  const listNames = ids => (ids || []).map(nameOf).join(', ');

  // one flat list per tab — integrations are data rows, not categories (D-049),
  // so the page is a list ↔ detail pair rather than a sectioned nav
  const internal = groups.flatMap(g => [
    ...g.apis.map(a => ({ kind: 'api', id: a.id, g, a, sch: schemaForApi(a.id) })),
    ...g.events.map(s => ({ kind: 'event', id: s.id, g, s })),
  ]);

  // small trailing trace-chip row — the links, demoted below the readable text
  const Chips = ({ ids }) => (
    <div className="dd-icard-chips" onClick={e => e.stopPropagation()}>
      <span className="dd-iext-k">trace</span>{ids.filter(Boolean).map(id => <TRef id={id} key={id} />)}
    </div>
  );
  const Def = ({ k, children }) => <div className="dd-idef"><span className="dd-iext-k">{k}</span><div className="dd-idef-v">{children}</div></div>;

  const sel = tab === 'internal' ? internal.find(x => x.id === selId) : externals.find(x => x.it.id === selId);
  const Back = () => (
    <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← {tab === 'internal' ? 'Internal integrations' : 'External systems'}</button>
  );

  // ---------- detail: one integration as its own page ----------
  const detail = () => {
    if (tab === 'external') {
      const { it, contracts } = sel;
      const evts = contracts.filter(s => s.kind === 'event');
      const apis = contracts.filter(s => s.kind === 'api-req');
      return (<>
        <Back />
        <div className="dd-idetail">
          <div className="dd-idetail-h">
            <span className="dd-icard-topic">{it.system}</span>
            <span className={'dd-int-dir ' + it.direction}>{it.direction}</span>
          </div>
          <div className="dd-icard-desc">{it.data}{it.notes ? ` — ${it.notes}` : ''}</div>
          <Def k="transport">Over <b>{it.protocol}</b> · auth <b>{it.auth}</b></Def>
          {evts.length > 0 && <Def k="events crossing"><b>{evts.map(s => `${s.name} v${s.version}`).join(' · ')}</b></Def>}
          {apis.length > 0 && <Def k="api contracts"><b>{apis.map(s => `${s.name} v${s.version}`).join(' · ')}</b></Def>}
          {!contracts.length && <Def k="contracts">No published contract on our side — the surface is {it.system}&rsquo;s own, absorbed at the boundary.</Def>}
          <Chips ids={contracts.map(s => s.id)} />
        </div>
      </>);
    }
    if (sel.kind === 'api') {
      const { a, g, sch } = sel;
      return (<>
        <Back />
        <div className="dd-idetail">
          <div className="dd-idetail-h">
            <code className="dd-api-ep"><b>{a.method}</b> {a.path}</code>
            {sch && <span className="dd-icard-ver">contract v{sch.version}</span>}
          </div>
          <div className="dd-icard-desc">{a.purpose}</div>
          <Def k="owner">{g.label}</Def>
          <Def k="served by"><b>{nameOf(a.ownedBy)}</b> · carried by <b>{nameOf(a.via)}</b></Def>
          {sch && <Def k="payload"><span className="dd-icard-fields">{(sch.fields || []).map(f => f.name).join(' · ')}</span></Def>}
          <Def k="on error">{a.errors}</Def>
          <Chips ids={[a.ownedBy, a.via, sch && sch.id]} />
        </div>
      </>);
    }
    const { s: ev, g } = sel;
    return (<>
      <Back />
      <div className="dd-idetail">
        <div className="dd-idetail-h">
          <span className="dd-icard-topic">{ev.name}</span>
          <span className="dd-icard-ver">v{ev.version}</span>
        </div>
        <Def k="owner">{g.label}</Def>
        <Def k="flow"><b>{listNames(ev.producers)}</b> publishes → <b>{listNames(ev.consumers)}</b> consume{(ev.consumers || []).length > 1 ? '' : 's'}{ev.via && <> · on <b>{nameOf(ev.via)}</b></>}</Def>
        <Def k="payload"><span className="dd-icard-fields">{(ev.fields || []).map(f => f.name).join(' · ')}</span></Def>
        <Chips ids={[...(ev.producers || []), ...(ev.consumers || []), ev.via, ev.id]} />
      </div>
    </>);
  };

  // ---------- the two lists, narrowed by the filters ----------
  // externals answer the API/Events filter through their typed contracts,
  // falling back to the protocol when the surface is the counterparty's own
  const extKinds = externals.map(x => ({ ...x,
    hasEvents: x.contracts.some(s => s.kind === 'event') || /kafka|event/i.test(x.it.protocol),
    hasApis: x.contracts.some(s => s.kind === 'api-req') || /rest|grpc|callback/i.test(x.it.protocol),
  }));
  const internalShown = internal.filter(x => (kind === 'all' || x.kind === kind) && (only === 'all' || x.g.key === only));
  const externalShown = extKinds.filter(x => kind === 'all' || (kind === 'api' ? x.hasApis : x.hasEvents));

  const rows = tab === 'internal'
    ? internalShown.map(x => (
        <button type="button" className="dd-irow" key={x.id} onClick={() => setSelId(x.id)}>
          <span className={'dd-irow-kind ' + x.kind}>{x.kind === 'api' ? 'API' : 'Event'}</span>
          <span className="dd-irow-name">{x.kind === 'api'
            ? <code className="dd-api-ep"><b>{x.a.method}</b> {x.a.path}</code>
            : <span className="dd-icard-topic">{x.s.name}</span>}</span>
          <span className="dd-irow-desc">{x.kind === 'api' ? x.a.purpose : `${listNames(x.s.producers)} → ${listNames(x.s.consumers)}`}</span>
          <span className="dd-irow-owner">{x.g.label.split(' · ')[1]}</span>
          <span className="dd-irow-go">›</span>
        </button>
      ))
    : externalShown.map(({ it }) => (
        <button type="button" className="dd-irow" key={it.id} onClick={() => setSelId(it.id)}>
          <span className={'dd-int-dir ' + it.direction}>{it.direction}</span>
          <span className="dd-irow-name"><span className="dd-icard-topic">{it.system}</span></span>
          <span className="dd-irow-desc">{it.data}</span>
          <span className="dd-irow-owner">{it.protocol}</span>
          <span className="dd-irow-go">›</span>
        </button>
      ));

  return (
    <>
      <p className="dd-lead">Every surface other systems integrate with. <b>Internal</b> is what our subdomains expose to each other; <b>External</b> is the counterparties across the product boundary. Open an integration for its full contract.</p>

      {sel ? detail() : (<>
        <div className="ddd-tabs">
          {[['internal', `Internal · ${internal.length}`], ['external', `External · ${externals.length}`]].map(([k, lbl]) => (
            <button key={k} type="button" className={'ddd-tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setSelId(null); setKind('all'); setOnly('all'); }}>{lbl}</button>
          ))}
          <div className="dd-ifilters">
            <select className="dd-isel" name="integ-kind" value={kind} onChange={e => setKind(e.target.value)} aria-label="Filter by type">
              <option value="all">All types</option>
              <option value="api">APIs</option>
              <option value="event">Events</option>
            </select>
            {tab === 'internal' && (
              <select className="dd-isel" name="integ-bc" value={only} onChange={e => setOnly(e.target.value)} aria-label="Filter by bounded context">
                <option value="all">All contexts</option>
                {groups.map(g => <option key={g.key} value={g.key}>{g.key}</option>)}
              </select>
            )}
          </div>
        </div>
        <div className="dd-ilist">
          {rows.length ? rows : <div className="ddd-empty-inline">No integrations match the current filters.</div>}
        </div>
      </>)}
    </>
  );
}

/* ---- Build · Agents (D-051) — one subdomain agent per bounded context.
   The same identity as the Design Context Owner: Design shows what it KNOWS,
   this page shows what it can DO. Doctrine: the agent does the HUMAN work of
   its subdomain — it acts through role-scoped surfaces the console already
   uses, and observes what a support human would read. It is never in the
   event path; the deterministic workflow stays authoritative. Agents
   collaborate as colleagues (ask/answer), not through the bus. ---- */
const AGB_TIER = { suggest: 'Suggest', supervised: 'Supervised', autonomous: 'Autonomous' };

function BuildAgents({ prd }) {
  const A = window.__ARCH__;
  const open = useOpen();
  // the Evals page can deep-link a specific agent + tab via window.__cynAgentOpen
  const [selId, setSelId] = React.useState(() => ((typeof window !== 'undefined' && window.__cynAgentOpen) || {}).id || null);
  const [dtab, setDtab] = React.useState(() => { const t = ((typeof window !== 'undefined' && window.__cynAgentOpen) || {}).tab || 'knowledge'; if (typeof window !== 'undefined') delete window.__cynAgentOpen; return t; });
  const pick = (id) => { setSelId(id); setDtab('knowledge'); };
  if (!A || !(A.agents || []).length) return <div className="env-empty"><div className="env-empty-ic"><DIco k="spark" w={20} /></div><div className="env-empty-t">Agents</div><div className="env-empty-s">No subdomain agents built yet.</div></div>;
  // D-084: the register is a saved query — operations Agent nodes with their
  // act triples (acts_via), observes lens list, skills (equips → does_work_of/
  // acts_via/knowledge) and evals (evaluates, agent- and skill-level).
  const agents = kgAgents() || A.agents;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const { comps, groups } = intCatalog(A);
  const ctxs = (((window.__DDD__ || {}).byProduct || {})[nav.prod] || {}).contexts || [];
  const ctxOf = bc => ctxs.find(c => c.id === bc);
  const ctxName = bc => ctxOf(bc)?.name || bc;
  const compBcOf = id => comps.find(c => c.id === id)?.bc || null;
  const personaOf = id => ((prd || {}).personas || []).find(p => p.id === id);
  const apiOf = id => (A.apis || []).find(a => a.id === id);

  // who it collaborates with — neighbours on the context map (the seam events
  // are the shared concern; the channel between agents is ask/answer, not the bus)
  const partnersOf = (bc) => {
    const out = new Map();
    (A.schemas || []).filter(s => s.kind === 'event').forEach(s => {
      const bcs = new Set([...(s.producers || []), ...(s.consumers || [])].map(compBcOf).filter(Boolean));
      if (!bcs.has(bc)) return;
      bcs.delete(bc);
      bcs.forEach(b => { const e = out.get(b) || []; e.push(s.id); out.set(b, e); });
    });
    return [...out.entries()].map(([pbc, via]) => ({ bc: pbc, via, agent: agents.find(a => a.bc === pbc) || null }));
  };
  const goKnowledge = (bc) => {
    const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Design', entry: 'contexts', ctx: bc, tab: 'agent' };
    window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
  };

  const sel = agents.find(a => a.id === selId);
  const TierChip = ({ t }) => <span className={'agb-tier ' + t.toLowerCase()}>{AGB_TIER[t.toLowerCase()] || t}</span>;
  const VerdChip = ({ v }) => <span className={'agb-verd ' + v}>{v}</span>;
  const AsChip = ({ id }) => {
    const p = personaOf(id);
    return p ? <span className="agb-as" title={p.role}>{p.name}’s work</span> : null;
  };

  // ---------- detail: one agent as its own page ----------
  if (sel) {
    const partners = partnersOf(sel.bc);
    const dAgent = ctxOf(sel.bc)?.agent || null;
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Agents</button>

      <div className="agb-head">
        <div className="agb-head-l">
          <div className="agb-head-line">
            <span className="agb-name">{sel.name}</span>
            <span className="agb-kind">operations agent</span>
            <span className="agb-bc">{ctxName(sel.bc)} · {sel.bc}</span>
            {ctxOf(sel.bc)?.classification && <span className={'ddd-class ' + ctxOf(sel.bc).classification} title="DDD distillation (D-026) — richness scales with coreness">{ctxOf(sel.bc).classification}</span>}
            <TierChip t={sel.tier} />
            <span className={'agb-status ' + sel.status}>{sel.status}</span>
            {sel._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph — the operations Agent node with its act triples (acts_via: tool · whose work · what), observes lens list, skills (equips → does_work_of · acts_via · knowledge) and evals (evaluates — doctrine checks on the agent, promotion evidence on each skill).">KG</span>}
          </div>
          <p className="agb-mission">{sel.mission}</p>
          <div className="agb-mcp"><span className="dd-iext-k">mcp</span><code>{sel.mcp.server}</code><span className="agb-mcp-note">{sel.mcp.note}</span></div>
          <div className="agb-principle">The deterministic workflow stays authoritative — the agent appears in no event contract’s producers or consumers. Switch it off and the product still runs. Governance acts — approve, promote, change an envelope, kill-switch — are reserved to humans at every tier; they are never in the toolset (D-056).</div>
        </div>
      </div>

      <div className="ddd-tabs agb-tabs">
        {[['knowledge', 'Knowledge'], ['toolset', 'Toolset'], ['skills', 'Skills'], ['collab', 'Collaborators'], ['evals', 'Evals']].map(([k, lbl]) => (
          <button key={k} type="button" className={'ddd-tab' + (dtab === k ? ' on' : '')} onClick={() => setDtab(k)}>{lbl}</button>
        ))}
      </div>

      {dtab === 'knowledge' && <DSec icon="spark" title="Knowledge" sub="What it knows — the subdomain knowledge pack, defined and maintained in Design">
        <div className="asc-panel agb-panel">
          {dAgent ? (<>
            <p className="agb-charter">“{dAgent.charter}”</p>
            <div className="agb-slice">
              {Object.entries(dAgent.slice || {}).map(([k, n]) => <span className="agb-slice-chip" key={k}><b>{n}</b> {k}</span>)}
            </div>
          </>) : <p className="agb-charter">No Design-side knowledge pack recorded for this context.</p>}
          <button type="button" className="coa-kg-link agb-kglink" onClick={() => goKnowledge(sel.bc)}>Open the knowledge pack in Design →</button>
        </div>
      </DSec>}

      {dtab === 'toolset' && <DSec icon="link" title="Toolset" sub="The surfaces a person with the right role already has — act like the human, read like a support engineer. Never the event path.">
        <div className="asc-panel agb-panel">
          <div className="dd-itype-h">Acts <span className="dd-sub-sub">human actions, through the product’s own role-scoped endpoints</span></div>
          {(sel.acts || []).map(t => { const a = apiOf(t.tool); return (
            <div className="agb-tool" key={t.tool}>
              {a ? <code className="dd-api-ep"><b>{a.method}</b> {a.path}</code> : <span className="dd-icard-topic">{t.tool}</span>}
              <AsChip id={t.as} />
              <span className="agb-tool-p">{t.what}</span>
              <span onClick={e => e.stopPropagation()}><TRef id={t.tool} /></span>
            </div>
          ); })}
          <div className="dd-itype-h">Observes <span className="dd-sub-sub">read-only — what a support human looks at to understand what’s happening</span></div>
          {(sel.observes || []).map((o, i) => (
            <div className="agb-tool" key={i}>
              <span className="agb-obs-l">{o.label}</span>
              <span className="agb-tool-p">{o.what}</span>
              {o.ref && <span onClick={e => e.stopPropagation()}><TRef id={o.ref} /></span>}
            </div>
          ))}
          <div className="agb-excluded"><b>Excluded by doctrine (D-056):</b> governance acts — approve · promote · change envelope · kill-switch — are never tools, at any tier. An attempted call is out-of-toolset and fails the tool-conformance check.</div>
        </div>
      </DSec>}

      {dtab === 'skills' && <DSec icon="board" title="Skills" sub="Knowledge + tools composed into runnable capabilities, each doing a named person’s work — Suggest → Supervised → Autonomous; promotion is governed in Operate (POL2)">
        <div className="asc-panel agb-panel">
          {sel.skills.map(sk => (
            <div className={'agb-skill' + (sk.status === 'planned' ? ' planned' : '')} key={sk.id}>
              <div className="agb-skill-h">
                <TierChip t={sk.tier} />
                <span className="agb-skill-nm">{sk.name}</span>
                <AsChip id={sk.as} />
                {sk.status === 'planned' && <span className="agb-plan">planned</span>}
              </div>
              <div className="agb-skill-does">{sk.does}</div>
              <div className="agb-skill-foot" onClick={e => e.stopPropagation()}>
                <span className="dd-iext-k">tools</span>{sk.tools.map(id => <TRef id={id} key={id} />)}
                <span className="dd-iext-k agb-know-k">knows</span>{sk.knowledge.map(k => <span className="agb-know" key={k}>{k}</span>)}
              </div>
            </div>
          ))}
        </div>
      </DSec>}

      {dtab === 'collab' && <DSec icon="flow" title="Collaborators" sub="Agents collaborate as colleagues — ask and answer, each grounded in its own knowledge graph. The context map says who; the seam events are the shared concern, not the channel.">
        <div className="agb-collabs">
          {partners.map(pt => (
            <div className={'agb-collab' + (pt.agent ? ' dd-clickable' : '')} key={pt.bc}
              onClick={pt.agent ? () => pick(pt.agent.id) : undefined}>
              <div className="agb-collab-h">
                {pt.agent
                  ? <><span className="agb-collab-nm">{pt.agent.name}</span><TierChip t={pt.agent.tier} /></>
                  : <><span className="agb-collab-nm muted">{ctxName(pt.bc)}</span><span className="agb-plan">no bespoke agent — generic context</span></>}
                <span className="agb-bc">{pt.bc}</span>
              </div>
              <div className="agb-collab-via" onClick={e => e.stopPropagation()}>
                <span className="dd-iext-k">shared concern</span>{pt.via.map(id => <TRef id={id} key={id} />)}
              </div>
            </div>
          ))}
        </div>
      </DSec>}

      {dtab === 'evals' && (() => {
        const ev = sel.evals || { checks: [], skills: [] };
        return (<>
          <DSec icon="policy" title="Doctrine checks" sub="Agent-level invariants, run continuously — the D-051 rules enforced as evals">
            <div className="asc-panel agb-panel">
              {ev.checks.map(c => (
                <div className="agb-eval" key={c.id}>
                  <div className="agb-eval-h">
                    <span className="agb-skill-nm">{c.name}</span>
                    <VerdChip v={c.verdict} />
                    <span className="agb-eval-run">last run {c.lastRun}</span>
                  </div>
                  <div className="agb-skill-does">{c.what}</div>
                  <div className="agb-eval-m"><span className="dd-iext-k">{c.metric}</span><b>{c.score}</b></div>
                </div>
              ))}
            </div>
          </DSec>
          <DSec icon="gauge" title="Skill evals" sub="Promotion evidence — a golden dataset per skill; the threshold holds the current tier or argues the next. Reviewed at the Operate promotion gate (POL2).">
            <div className="asc-panel agb-panel">
              {sel.skills.map(sk => {
                const e = ev.skills.find(x => x.skill === sk.id);
                return (
                  <div className={'agb-eval' + (e ? '' : ' planned')} key={sk.id}>
                    <div className="agb-eval-h">
                      <TierChip t={sk.tier} />
                      <span className="agb-skill-nm">{sk.name}</span>
                      {e ? <VerdChip v={e.verdict} /> : <span className="agb-plan">no eval yet</span>}
                      {e && <span className="agb-eval-run">last run {e.lastRun}</span>}
                    </div>
                    {e ? (<>
                      <div className="agb-eval-m">
                        <span className="dd-iext-k">dataset</span><b>{e.dataset.name}</b>
                        <span className="agb-eval-ds">{e.dataset.size} · {e.dataset.source}</span>
                      </div>
                      <div className="agb-eval-m">
                        <span className="dd-iext-k">{e.metric}</span><b>{e.score}</b>
                        <span className="agb-eval-th">{e.holdAt}</span>
                        {e.promoteAt && <span className="agb-eval-th promote">{e.promoteAt}</span>}
                      </div>
                    </>) : <div className="agb-skill-does">The skill is {sk.status} — its golden dataset is assembled when the skill is built.</div>}
                  </div>
                );
              })}
            </div>
          </DSec>
        </>);
      })()}
    </>);
  }

  // ---------- roster ----------
  const agentless = groups.filter(g => !agents.some(a => a.bc === g.key));
  return (<>
    <p className="dd-lead">The <b>operations agents</b> — one per subdomain, used by humans in live operation. Each is defined in Design (on its bounded context’s Agents tab, beside its <b>domain agent</b> sibling that knows and builds the subdomain); this page is its as-built form. It does the subdomain’s <b>human work</b> — acting through the same role-scoped surfaces people use, reading what a support engineer reads. The deterministic workflow stays authoritative; agents collaborate with it and with each other, never replace it.</p>
    {agents[0] && agents[0]._kg && (
      <div className="ops-kgline">Derived surface — each card is an operations <b>Agent</b> node: act triples on <b>acts_via</b> edges, skills via <b>equips</b> (personas <b>does_work_of</b>, tools <b>acts_via</b>), evals via <b>evaluates</b>; collaborators derive from the shared event contracts (D-066). Tiers read in the canonical ladder (D-067).</div>
    )}
    <div className="agb-grid">
      {agents.map(a => {
        const nPartners = partnersOf(a.bc).length;
        return (
          <button type="button" className="agb-card" key={a.id} onClick={() => pick(a.id)}>
            <div className="agb-card-h">
              <span className="agb-name">{a.name}</span>
              <TierChip t={a.tier} />
            </div>
            <div className="agb-bc">{ctxName(a.bc)} · {a.bc}{ctxOf(a.bc)?.classification && <> <span className={'ddd-class ' + ctxOf(a.bc).classification}>{ctxOf(a.bc).classification}</span></>}</div>
            <p className="agb-card-mission">{a.mission}</p>
            <div className="agb-card-foot">
              <span><b>{a.skills.length}</b> skills</span>
              <span><b>{(a.acts || []).length}</b> actions</span>
              <span><b>{(a.observes || []).length}</b> reads</span>
              <span><b>{nPartners}</b> collaborators</span>
              <span className="dd-irow-go">›</span>
            </div>
          </button>
        );
      })}
      {agentless.map(g => (
        <div className="agb-card none" key={g.key}>
          <div className="agb-card-h"><span className="agb-name muted">{ctxName(g.key)}</span></div>
          <div className="agb-bc">{g.key}{ctxOf(g.key)?.classification && <> <span className={'ddd-class ' + ctxOf(g.key).classification}>{ctxOf(g.key).classification}</span></>}</div>
          <p className="agb-card-mission">Generic context — no bespoke agent; richness scales with coreness. Its human work is thin; the workflow runs it deterministically.</p>
        </div>
      ))}
    </div>
  </>);
}

/* ---- Build · Tests (D-053) — dedicated-tool detail for the deterministic
   plane: a run header (id, trigger, pipeline, environments), an Acceptance
   register and the Component suites, each row opening a full test detail —
   Gherkin steps, environment, duration, run history, failure message + log. ---- */
const TST_ST = {
  pass:   { glyph: '✓', label: 'pass' },
  fail:   { glyph: '✕', label: 'fail' },
  notrun: { glyph: '○', label: 'not run' },
};
const TstDots = ({ h }) => (
  <span className="tstx-dots" title={'last ' + h.length + ' runs, oldest first: ' + h.join(' · ')}>
    {h.map((x, i) => <span key={i} className={'tstx-dot ' + x} />)}
  </span>
);
const TstDef = ({ k, children }) => <div className="dd-idef"><span className="dd-iext-k">{k}</span><div className="dd-idef-v">{children}</div></div>;

function BuildTests({ prd }) {
  const A = window.__ARCH__;
  // D-083: the register is a saved query — AcceptanceTest nodes (criterion,
  // Gherkin, env) + tests/verifies/blocks edges; run header, histories,
  // failure logs and suites dereference via observed_via → DS-CI.
  const T = kgTests() || (A && A.testing);
  const open = useOpen();
  const [tab, setTab] = React.useState('acceptance');   // acceptance | suites
  const [selId, setSelId] = React.useState(null);        // AT-x or suite comp id
  const [flt, setFlt] = React.useState('all');           // all | pass | fail | notrun
  if (!T) return <div className="env-empty"><div className="env-empty-ic"><DIco k="check" w={20} /></div><div className="env-empty-t">Tests</div><div className="env-empty-s">No test runs recorded yet.</div></div>;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const { comps } = intCatalog(A);
  const compOf = id => comps.find(c => c.id === id) || {};
  const D = (window.__DELIVERY__ && window.__DELIVERY__.byProduct[nav.prod]) || null;
  const stageOf = uc => D && (D.items.find(i => i.ucId === uc) || {}).stage;
  const ucs = (prd && prd.usecases) || [];
  const ucOf = id => ucs.find(u => u.id === id) || {};
  const gherkinOf = t => ((ucOf(t.uc).acceptance || []).find(c => c.title === t.crit)) || null;
  const EnvChip = ({ e }) => <span className="tstx-env" title={T.environments[e] || e}>{e}</span>;

  const n = st => T.acceptance.filter(r => r.status === st).length;
  const suiteFails = T.suites.reduce((k, su) => k + (su.total - su.passed), 0);

  // ---------- detail: one acceptance test ----------
  const at = T.acceptance.find(t => t.id === selId);
  if (tab === 'acceptance' && at) {
    const g = at.gherkin || gherkinOf(at);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Acceptance tests</button>
      <div className="tstx-dh">
        <span className={'tst-glyph big ' + at.status}>{TST_ST[at.status].glyph}</span>
        <span className="tstx-dh-id">{at.id}</span>
        <span className="tst-uc-t">{at.crit}</span>
        <span className={'tstx-badge ' + at.status}>{TST_ST[at.status].label}</span>
      </div>
      <div className="dd-idetail">
        <TstDef k="verifies"><span onClick={e => e.stopPropagation()}><TRef id={at.uc} /> {at.verifies.map(v => <TRef id={v} key={v} />)}</span>{stageOf(at.uc) && <span className={'tst-stage s-' + stageOf(at.uc).replace(/\s/g, '').toLowerCase()}>{stageOf(at.uc)}</span>}</TstDef>
        <TstDef k="environment"><EnvChip e={at.env} /> <span className="agb-mcp-note">{T.environments[at.env]}</span></TstDef>
        <TstDef k="last run">{at.lastRun} · run {T.runId} · {at.duration} <TstDots h={at.history} /></TstDef>
        {at.blocker && <TstDef k="blocked by"><b>{at.blocker}</b> — see the delivery backlog’s waiting-on register.</TstDef>}
        {at.note && <TstDef k="note">{at.note}</TstDef>}
        {g && (
          <TstDef k="scenario">
            <div className="tstx-gherkin">
              {(g.given || []).map((x, i) => <div key={'g' + i}><b>{i === 0 ? 'GIVEN' : 'AND'}</b> {x}</div>)}
              {(g.when || []).map((x, i) => <div key={'w' + i}><b>{i === 0 ? 'WHEN' : 'AND'}</b> {x}</div>)}
              {(g.then || []).map((x, i) => <div key={'t' + i}><b>{i === 0 ? 'THEN' : 'AND'}</b> {x}</div>)}
            </div>
          </TstDef>
        )}
        {at.failure && (<>
          <TstDef k="failure"><span className="tstx-failmsg">{at.failure.message}</span></TstDef>
          <div className="tstx-log">{at.failure.log.map((l, i) => <div key={i} className={/FAILED|AssertionError/.test(l) ? 'bad' : ''}>{l}</div>)}</div>
        </>)}
      </div>
    </>);
  }

  // ---------- detail: one component suite ----------
  const su = T.suites.find(x => x.comp === selId);
  if (tab === 'suites' && su) {
    const c = compOf(su.comp);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Component suites</button>
      <div className="tstx-dh">
        <span className={'tst-glyph big ' + (su.passed === su.total ? 'pass' : 'fail')}>{su.passed === su.total ? '✓' : '✕'}</span>
        <span className="tstx-dh-id">{su.comp}</span>
        <span className="tst-uc-t">{c.name}</span>
        <span className={'tstx-badge ' + (su.passed === su.total ? 'pass' : 'fail')}>{su.passed} / {su.total} passing</span>
      </div>
      <div className="dd-idetail">
        <TstDef k="suite"><code className="tst-comp-path">{c.code?.path}</code> · owners <b>{c.code?.owners}</b></TstDef>
        <TstDef k="environment"><EnvChip e={su.env} /> <span className="agb-mcp-note">{T.environments[su.env]} · {T.pipeline}</span></TstDef>
        <TstDef k="last run">{su.lastRun} · run {T.runId} · {su.duration} <TstDots h={su.history} /></TstDef>
        <TstDef k="coverage"><b>{su.coverage}</b> line coverage</TstDef>
        {su.failNote && <TstDef k="failures"><span className="tstx-failmsg">{su.failNote}</span></TstDef>}
      </div>
      {(su.failures || []).map((f, i) => (
        <div className="tstx-failcase" key={i}>
          <div className="tstx-failcase-h"><span className="tst-glyph fail">✕</span><span className="tstx-failcase-nm">{f.name}</span></div>
          <div className="tstx-failmsg">{f.message}</div>
          {f.log && <div className="tstx-log">{f.log.map((l, j) => <div key={j} className={j === 0 ? '' : 'bad'}>{l}</div>)}</div>}
        </div>
      ))}
    </>);
  }

  // ---------- the register ----------
  const shown = T.acceptance.filter(t => flt === 'all' || t.status === flt);
  const byUc = {};
  shown.forEach(t => { (byUc[t.uc] = byUc[t.uc] || []).push(t); });
  return (<>
    <p className="dd-lead">The deterministic plane’s verification, at tool depth: the acceptance register (the Gherkin contract from Design, run as tests) and the component suites. Open any row for its scenario, environment, run history and failure logs.</p>
    {T._kg && (
      <div className="ops-kgline">Derived surface — each test is an <b>AcceptanceTest</b> node (criterion + Gherkin from Design) with <b>tests</b> / <b>verifies</b> / <b>blocks</b> edges; run header, histories, failure logs and suites dereference via <b>observed_via → DS-CI</b> (D-066).</div>
    )}

    <div className="tstx-run">
      <span className="tstx-run-k">run</span><b>{T.runId}</b>
      <span className="tstx-run-sep" />{T.trigger}
      <span className="tstx-run-sep" />{T.pipeline}
      <span className="tstx-run-right">
        <span className="tst-pill pass"><b>{n('pass')}</b> passing</span>
        <span className="tst-pill fail"><b>{n('fail')}</b> failing</span>
        <span className="tst-pill notrun"><b>{n('notrun')}</b> not run</span>
        <span className="tst-pill fail"><b>{suiteFails}</b> suite failures</span>
      </span>
    </div>

    <div className="ddd-tabs">
      {[['acceptance', `Acceptance tests · ${T.acceptance.length}`], ['suites', `Component suites · ${T.suites.length}`]].map(([k, lbl]) => (
        <button key={k} type="button" className={'ddd-tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setSelId(null); }}>{lbl}</button>
      ))}
      {tab === 'acceptance' && (
        <div className="dd-ifilters">
          <select className="dd-isel" name="tst-flt" value={flt} onChange={e => setFlt(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="pass">Passing</option>
            <option value="fail">Failing</option>
            <option value="notrun">Not run</option>
          </select>
        </div>
      )}
    </div>

    {tab === 'acceptance' && Object.entries(byUc).map(([uc, tests]) => (
      <div className="tstx-group" key={uc}>
        <div className="tstx-group-h">
          <span onClick={e => e.stopPropagation()}><TRef id={uc} /></span>
          <span className="tstx-group-t">{ucOf(uc).title}</span>
          {stageOf(uc) && <span className={'tst-stage s-' + stageOf(uc).replace(/\s/g, '').toLowerCase()}>{stageOf(uc)}</span>}
        </div>
        {tests.map(t => (
          <button type="button" className="tstx-row" key={t.id} onClick={() => setSelId(t.id)}>
            <span className={'tst-glyph ' + t.status}>{TST_ST[t.status].glyph}</span>
            <span className="tstx-row-id">{t.id}</span>
            <span className="tstx-row-t">{t.crit}</span>
            <EnvChip e={t.env} />
            <span className="tstx-row-dur">{t.duration}</span>
            <TstDots h={t.history} />
            <span className="tstx-row-run">{t.lastRun}</span>
            <span className="dd-irow-go">›</span>
          </button>
        ))}
      </div>
    ))}
    {tab === 'acceptance' && !shown.length && <div className="ddd-empty-inline">No acceptance tests match the filter.</div>}

    {tab === 'suites' && (
      <div className="tstx-group">
        {T.suites.map(su => { const c = compOf(su.comp); const ok = su.passed === su.total; return (
          <button type="button" className="tstx-row" key={su.comp} onClick={() => setSelId(su.comp)}>
            <span className={'tst-glyph ' + (ok ? 'pass' : 'fail')}>{ok ? '✓' : '✕'}</span>
            <span className="tstx-row-id">{su.comp}</span>
            <span className="tstx-row-t">{c.name} <code className="tst-comp-path">{c.code?.path}</code></span>
            <EnvChip e={su.env} />
            <span className={'tst-comp-tests' + (ok ? '' : ' bad')}>{su.passed} / {su.total}</span>
            <span className="tst-comp-cov">{su.coverage}</span>
            <span className="tstx-row-dur">{su.duration}</span>
            <TstDots h={su.history} />
            <span className="dd-irow-go">›</span>
          </button>
        ); })}
        {comps.filter(c => !T.suites.some(su => su.comp === c.id)).map(c => (
          <div className="tstx-row none" key={c.id}>
            <span className="tst-glyph notrun">○</span>
            <span className="tstx-row-id">{c.id}</span>
            <span className="tstx-row-t">{c.name}</span>
            <span className="tst-comp-nb">not built — no suite yet</span>
          </div>
        ))}
      </div>
    )}
  </>);
}

/* ---- Build · Evals (D-053) — eval-tool detail for the agent plane: a run
   register (dataset, judge, score + trend, samples), each run opening a full
   view — metadata, score history, failure causes, and the sampled transcripts
   with judge criteria, latency and tokens. Aggregate thresholds stay on the
   agent (D-052). ---- */
function BuildEvals() {
  const A = window.__ARCH__;
  const [selKey, setSelKey] = React.useState(null);   // `${agentId}/${skillId}`
  const [sflt, setSflt] = React.useState('all');       // sample filter: all | fail
  if (!A || !(A.agents || []).length) return <div className="env-empty"><div className="env-empty-ic"><DIco k="gauge" w={20} /></div><div className="env-empty-t">Evals</div><div className="env-empty-s">No agent evals recorded yet.</div></div>;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const TierChip = ({ t }) => <span className={'agb-tier ' + t.toLowerCase()}>{AGB_TIER[t.toLowerCase()] || t}</span>;
  const VerdChip = ({ v }) => <span className={'agb-verd ' + v}>{v}</span>;
  const goAgent = (id) => {
    window.__cynAgentOpen = { id, tab: 'evals' };
    const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Build', entry: 'agents' };
    window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
  };
  // D-083: one row per eval run — the Eval node (definition + gates) joined to
  // its skill (evaluates) and agent (equips); runs/transcripts via DS-EVALS.
  const runs = kgEvalRuns() || A.agents.flatMap(a => (a.evals?.skills || []).map(e => ({ a, e, sk: a.skills.find(x => x.id === e.skill) || {}, key: a.id + '/' + e.skill })));
  const trend = (e) => {
    const h = e.history || [];
    if (h.length < 2) return null;
    const d = parseFloat(h[h.length - 1].s) - parseFloat(h[h.length - 2].s);
    return { d, txt: (d > 0 ? '+' : '') + d.toFixed(1) + ' pp' };
  };

  // ---------- detail: one eval run ----------
  const sel = runs.find(r => r.key === selKey);
  if (sel) {
    const { a, e, sk } = sel;
    const tr = trend(e);
    const samples = (e.samples || []).filter(sm => sflt === 'all' || sm.verdict === 'fail');
    return (<>
      <button type="button" className="dd-iback" onClick={() => { setSelKey(null); setSflt('all'); }}>← Eval runs</button>
      <div className="tstx-dh">
        <TierChip t={sk.tier || 'suggest'} />
        <span className="tst-uc-t">{sk.name}</span>
        <VerdChip v={e.verdict} />
        <span className="evx-score">{e.metric}: <b>{e.score}</b>{tr && <span className={'evx-trend ' + (tr.d < 0 ? 'down' : 'up')}>{tr.txt}</span>}</span>
      </div>
      <div className="dd-idetail">
        <TstDef k="agent"><b>{a.name}</b> · {a.bc} — <button type="button" className="coa-kg-link evx-inline" onClick={() => goAgent(a.id)}>thresholds on the agent →</button></TstDef>
        <TstDef k="dataset"><b>{e.dataset.name}</b> · {e.dataset.size} — {e.dataset.source}</TstDef>
        <TstDef k="judge">{e.judge}</TstDef>
        <TstDef k="version">{e.agentVersion}</TstDef>
        <TstDef k="last run">{e.lastRun} · {e.duration} · <b className="ok">{e.passed} passed</b> / <b className="no">{e.failed} failed</b></TstDef>
        <TstDef k="gate">{e.holdAt}{e.promoteAt && <span className="agb-eval-th promote">{e.promoteAt}</span>}</TstDef>
        <TstDef k="history">
          <span className="evx-hist">
            {(e.history || []).map((h, i) => <span className={'evx-hrun' + (i === (e.history.length - 1) ? ' cur' : '')} key={i}>{h.d}<b>{h.s}</b></span>)}
          </span>
        </TstDef>
        {e.failCauses && (
          <TstDef k="failure causes">
            <div className="evx-causes">
              {e.failCauses.map((fc, i) => <span className="evx-cause" key={i}><b>{fc.n}</b> {fc.cause}</span>)}
            </div>
          </TstDef>
        )}
      </div>

      <div className="evx-samples-h">
        <span className="asc-sec-title"><DIco k="board" w={15} /> Sampled transcripts <span className="evx-of">· showing {(e.samples || []).length} of {(e.passed || 0) + (e.failed || 0)}</span></span>
        <div className="dd-iseg" role="group" aria-label="Sample filter">
          {[['all', `All · ${(e.samples || []).length}`], ['fail', `Failing · ${(e.samples || []).filter(x => x.verdict === 'fail').length}`]].map(([k, lbl]) => (
            <button type="button" key={k} className={'dd-iseg-btn' + (sflt === k ? ' on' : '')} aria-pressed={sflt === k} onClick={() => setSflt(k)}>{lbl}</button>
          ))}
        </div>
      </div>
      {samples.map((sm, i) => (
        <div className={'evp-sample ' + sm.verdict} key={i}>
          <div className="evp-row q"><span className="evp-k">query</span><span className="evp-v">{sm.q}</span></div>
          <div className="evp-row a"><span className="evp-k">agent</span><span className="evp-v">{sm.response}</span></div>
          <div className="evp-row g"><span className="evp-k">golden</span><span className="evp-v">{sm.expected}</span></div>
          <div className="evp-judge">
            <span className={'evp-jchip ' + (sm.judge.grounded ? 'ok' : 'no')}>{sm.judge.grounded ? '✓' : '✕'} grounded</span>
            <span className={'evp-jchip ' + (sm.judge.correct ? 'ok' : 'no')}>{sm.judge.correct ? '✓' : '✕'} correct</span>
            {sm.judge.note && <span className="evp-jnote">{sm.judge.note}</span>}
            <span className="evx-meta">{sm.lat} · {sm.tok} tok</span>
            <span className={'evp-verd ' + sm.verdict}>{sm.verdict}</span>
          </div>
        </div>
      ))}
      {!samples.length && <div className="ddd-empty-inline">No samples match the filter.</div>}
    </>);
  }

  // ---------- the run register ----------
  return (<>
    <p className="dd-lead">The agent plane’s evidence, at tool depth: one row per eval run — dataset, judge, score and trend. Open a run for its metadata, score history, failure causes and the sampled transcripts (query · agent response · golden · judge). Aggregate thresholds live on each agent’s Evals tab.</p>
    {runs[0] && runs[0]._kg && (
      <div className="ops-kgline">Derived surface — each row joins an <b>Eval</b> node (dataset · judge · gates, D-052) to its skill (<b>evaluates</b>) and agent (<b>equips</b>); score histories, fail causes and transcripts dereference via <b>observed_via → DS-EVALS</b> (D-066). Tiers read in the canonical ladder (D-067).</div>
    )}
    <div className="tstx-group">
      {runs.map(r => {
        const tr = trend(r.e);
        return (
          <button type="button" className="tstx-row" key={r.key} onClick={() => setSelKey(r.key)}>
            <TierChip t={r.sk.tier || 'suggest'} />
            <span className="tstx-row-t"><b>{r.sk.name}</b> <span className="evx-agent-nm">{r.a.name}</span></span>
            <span className="evx-ds">{r.e.dataset.name} · {r.e.dataset.size}</span>
            <span className="evx-score">{r.e.score}{tr && <span className={'evx-trend ' + (tr.d < 0 ? 'down' : 'up')}>{tr.txt}</span>}</span>
            <VerdChip v={r.e.verdict} />
            <span className="tstx-row-run">{r.e.lastRun}</span>
            <span className="dd-irow-go">›</span>
          </button>
        );
      })}
    </div>
  </>);
}

/* ---- Build · Delivery backlog (D-050) — the delivery board, re-homed from the
   More menu into Build (spec Block 1: sequencing; stages are D-014). The board
   itself lives in screens-delivery.jsx; this adapter feeds it the product id. */
function BuildBacklog({ prd }) {
  const PD = window.ProductDelivery;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  return PD ? <PD product={{ id: nav.prod }} prd={prd} /> : null;
}

/* ===================== dispatcher ===================== */
function DisDesContent({ phase, entry, prd }) {
  /* v4 products (D-107, widened D-113): Build/Operate/Realize registers derive
     from the product's OWN lifecycle graph — never another product's KG. Any
     product with a lifecycle graph qualifies, PRD4 projection or not (so this
     runs BEFORE the null-prd guard). Entries with no v4 content return null →
     the caller's honest empty state. */
  const nav113 = (typeof window !== 'undefined' && window.__cynNav) || {};
  const p4id = (prd && prd.productId)
    || (typeof window !== 'undefined' && window.__kg4Product && nav113.prod && window.__kg4Product(nav113.prod) ? nav113.prod : null);
  if (p4id && ['Build', 'Operate', 'Realize'].includes(phase) && typeof window !== 'undefined' && window.Kg4PhaseEntry) {
    return window.Kg4PhaseEntry({ phase, entry, productId: p4id });
  }
  if (!prd) return null;
  const map = {
    // Discover (the validated-problem artifacts)
    'Discover/personas':     DiscoverPersonas,
    'Discover/stakeholders': DiscoverStakeholders,
    'Discover/journeys':     DiscoverJourneys,
    'Discover/usecases':     DesignUseCases,
    'Discover/fr':           SpecsFunctional,
    'Discover/nfr':          SpecsNonFunctional,
    'Discover/policies':     SpecsPolicies,
    'Discover/scope':        DiscoverScope,
    'Discover/sizing':       DiscoverSizing,   // (rendered under Envision)
    'Discover/risks':        DiscoverRisks,
    // Cross-phase registers
    'X/glossary':            XGlossary,
    'X/deps':                XDependencies,
    'X/risk':                DiscoverRisks,
    'X/governance':          DesignControls,
    // Design (genuine outputs)
    'Design/arch':           DesignArchitecture,
    'Design/workflows':      DesignWorkflows,
    'Design/journeys':       DesignJourneys,
    // Build (as-built actuals — D-035)
    'Build/infra':           BuildInfrastructure,
    'Build/integ':           BuildIntegrations,
    'Build/backlog':         BuildBacklog,
    'Build/agents':          BuildAgents,
    'Build/tests':           BuildTests,
    'Build/evals':           BuildEvals,
    'Build/eval':            BuildEvals,   // legacy 'Test & eval' deep links
    // Operate (live operations — D-054; components live in screens-operate.jsx)
    'Operate/fleet':         window.OpsFleet,
    'Operate/incidents':     window.OpsIncidents,
    'Operate/approvals':     window.OpsApprovals,
    'Operate/runbooks':      window.OpsRunbooks,
    // Realize (value realization — D-061; components live in screens-realize.jsx)
    'Realize/outcomes':      window.RealOutcomes,
    'Realize/value':         window.RealValue,
    'Realize/decision':      window.RealDecision,
    // retained for back-compat / trace jumps
    'Design/usecases':       DesignUseCases,
    'Design/specs':          DesignSpecs,
    'Design/controls':       DesignControls,
  };
  const Cmp = map[phase + '/' + entry];
  return Cmp ? <Cmp prd={prd} /> : null;
}

/* Category list + live counts for the sidebar's Resources flyout (D-048). */
function cynResCats() {
  const A = window.__ARCH__;
  if (!A || !A.infra) return [];
  const { count } = resCatalog(A);
  return [
    { key: 'env', label: 'Environments', count: (A.infra.environments || []).length },
    ...RES_CATS.map((c, i) => ({ key: c.key, label: c.label, count: count(c.key), sep: i === 0 })),
  ];
}

Object.assign(window, { DisDesContent, cynResCats });
