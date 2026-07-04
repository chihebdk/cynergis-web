import React from 'react';
import './trace-core';
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

/* ===================== DISCOVER · Personas ===================== */
function DiscoverPersonas({ prd }) {
  const personas = prd.personas || [];
  const open = useOpen();
  return (
    <>
      <p className="dd-lead">Who this product serves — each evidence-backed in <b>Sources &amp; Evidence</b>. Open a persona to trace the journeys they drive and the use cases they act in.</p>
      <DSec icon="user" title="Personas" sub={`${personas.length} archetypes · click to trace`}>
        <div className="dd-personas">
          {personas.map(p => (
            <div className="dd-persona dd-clickable" key={p.id} onClick={() => open(p.id)}>
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
              <div className="dd-card-foot"><span className="dd-trace-hint">Trace journeys &amp; use cases</span><DIco k="arrow" w={12} /></div>
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
function DesignUseCases({ prd }) {
  const ucs = prd.usecases || [];
  const openEntity = useOpen();
  return (
    <>
      <p className="dd-lead">The solution as use cases — each realizing a journey. Click a card for the full detail: scenario, branches, terminal states, workflow and acceptance, with every chip a live trace link.</p>
      <div className="dd-ucgrid">
        {ucs.map(u => (
          <div className="dd-ucc dd-clickable" key={u.id} onClick={() => openEntity(u.id)}
            role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEntity(u.id); } }}>
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

/* ===================== DESIGN · Architecture ===================== */
function DesignArchitecture({ prd }) {
  const A = window.__ARCH__;
  const open = useOpen();
  if (!A) return <div className="env-empty"><div className="env-empty-ic"><DIco k="arch" w={20} /></div><div className="env-empty-t">Architecture</div><div className="env-empty-s">No architecture has been authored for this product yet.</div></div>;
  return (
    <>
      <p className="dd-lead">{A.context.summary}</p>

      <DSec icon="map" title="System context" sub="How the product sits in the authorization path">
        <TMermaid code={A.context.diagram} />
      </DSec>

      <DSec icon="arch" title="Drivers & constraints" sub="What shapes the design">
        <div className="dd-dc">
          <div className="dd-dc-col">
            <div className="dd-dc-h">Drivers</div>
            {A.context.drivers.map((d, i) => <div className="dd-dc-row drive" key={i}><DIco k="arrow" w={11} />{d}</div>)}
          </div>
          <div className="dd-dc-col">
            <div className="dd-dc-h">Constraints</div>
            {A.context.constraints.map((d, i) => <div className="dd-dc-row constrain" key={i}><DIco k="policy" w={11} />{d}</div>)}
          </div>
        </div>
      </DSec>

      <DSec icon="policy" title="Architecture decisions" sub={`${A.decisions.length} ADRs — click to trace what each affects`}>
        <div className="asc-panel dd-adrs">
          {A.decisions.map(d => (
            <div className="dd-adr dd-clickable" key={d.id} onClick={() => open(d.id)}>
              <div className="dd-adr-top"><span className="dd-adr-id">{d.id}</span><span className="dd-adr-title">{d.title}</span><span className="dd-adr-status">{d.status}</span></div>
              <div className="dd-adr-rat">{d.rationale}</div>
              <div className="dd-adr-affects" onClick={e => e.stopPropagation()}>{(d.affects || []).map(a => <TRef id={a} key={a} />)}</div>
            </div>
          ))}
        </div>
      </DSec>

      {(A.subdomainMaps || []).length > 0 && (
        <DSec icon="map" title="Context map" sub="How the subdomains relate">
          {A.subdomainMaps.map((m, i) => <TMermaid key={i} code={m.mermaid} caption={m.title} />)}
        </DSec>
      )}

      <DSec icon="arch" title="Domains & components" sub="The system, decomposed · click a component to trace">
        <div className="dd-domains">
          {A.domains.map(dm => (
            <div className="dd-domain" key={dm.id} style={{ '--dc': dm.color }}>
              <div className="dd-domain-h"><span className="dot"></span>{dm.name}</div>
              <div className="dd-domain-sum">{dm.summary}</div>
              <div className="dd-comps">
                {dm.components.map(c => (
                  <div className="dd-comp dd-clickable" key={c.id} onClick={() => open(c.id)}>
                    <div className="dd-comp-h"><span className="dd-comp-id">{c.id}</span>{c.name}</div>
                    <div className="dd-comp-ov">{c.overview}</div>
                    <div className="dd-comp-maps" onClick={e => e.stopPropagation()}>{(c.mapsTo || []).map(m => <TRef id={m} key={m} />)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DSec>

      <DSec icon="link" title="Integrations" sub="Where this product meets the rest of the bank · click to trace the dependency">
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

      <DSec icon="board" title="Technology stack" sub="What it's built on">
        <div className="asc-panel dd-stack">
          {A.stack.map((s, i) => (
            <div className="dd-stackrow" key={i}>
              <div className="dd-stack-layer">{s.layer}</div>
              <div className="dd-stack-tech">{s.tech}<span className="dd-stack-ver">{s.version}</span></div>
              <div className="dd-stack-why">{s.why}</div>
            </div>
          ))}
        </div>
      </DSec>

      <ArchResources A={A} open={open} />
      <ArchApisContracts A={A} open={open} />
      <ArchSecuritySecrets A={A} open={open} />
      {/* Infrastructure & environments (as-built actuals) live in Build — D-035:
          Design holds the intent, Build accrues the actuals against it. */}
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
    <DSec icon="board" title="Resources & data" sub="The runtime inventory — every store, queue and cache, who uses it, and where it runs">
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
                    <span className="dd-res-envs">{(r.environments || []).join(' · ')}</span>
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
      {(A.secrets || []).length > 0 && <>
        <div className="dd-sub-h">Secret management <span className="dd-sub-sub">every credential, its manager, rotation and users</span></div>
        <div className="asc-panel dd-secrets">
          {(A.secrets || []).map(s => (
            <div className="dd-secret dd-clickable" key={s.id} onClick={() => open(s.id)}>
              <span className="dd-secret-name">🔑 {s.name}</span>
              <span className="dd-secret-kind">{s.kind}</span>
              <span className="dd-secret-mgr">{s.manager}<span className="dd-secret-rot"> · rotates {s.rotation}</span></span>
              <span className="dd-secret-used" onClick={e => e.stopPropagation()}>{(s.usedBy || []).map(u => <TRef id={u} key={u} />)}</span>
            </div>
          ))}
        </div>
      </>}
    </DSec>
  );
}

/* ---- Build · Infrastructure & environments (the as-built surface, D-035) ----
   Design holds the architecture INTENT (ADRs, components, contracts); this surface
   accrues the ACTUALS — the environments, deployed resources and per-component build
   status the AI coding agent produces. Populated from __ARCH__ for now; the coding
   agent becomes the writer once Build is live. */
function EnvCards({ A, open }) {
  const inf = A.infra;
  const resIn = (envId) => (A.resources || []).filter(r => (r.environments || []).includes(envId));
  return (
    <div className="dd-envs">
      {(inf.environments || []).map(env => (
        <div className="dd-env" key={env.id}>
          <div className="dd-env-h"><span className="dd-env-name">{env.name}</span><span className="dd-env-cluster">{env.cluster}</span><span className="dd-env-region">{env.region}</span></div>
          <div className="dd-env-notes">{env.notes}</div>
          <div className="dd-env-row"><span className="dd-env-k">services</span>{(env.services || []).map((s, i) => <span className="dd-env-chip" key={i}>{s.name}</span>)}</div>
          <div className="dd-env-row"><span className="dd-env-k">resources</span>{resIn(env.id).map(r => <button type="button" className="dd-env-res" key={r.id} onClick={() => open(r.id)}>{r.name}</button>)}</div>
          <div className="dd-env-row"><span className="dd-env-k">dashboards</span>{(env.dashboards || []).map((dsh, i) => <span className="dd-env-chip" key={i}>{dsh.name}</span>)}</div>
        </div>
      ))}
    </div>
  );
}
function BuildInfrastructure() {
  const A = window.__ARCH__;
  const open = useOpen();
  if (!A || !A.infra) return <div className="env-empty"><div className="env-empty-ic"><DIco k="arch" w={20} /></div><div className="env-empty-t">Infrastructure</div><div className="env-empty-s">Nothing built yet — the AI coding agent populates this surface as it deploys.</div></div>;
  const comps = (A.domains || []).flatMap(dm => (dm.components || []).map(c => ({ ...c, domainName: dm.name })));
  return (
    <>
      <p className="dd-lead">The as-built picture: what actually runs, where, and how each component stands against the Design blueprint. Deployed and updated by the AI coding agent — the architect reads it, the drift against Design is the review.</p>

      <DSec icon="arch" title="Environments" sub={`${A.infra.cloud} · ${A.infra.platform} — what runs where`}>
        <p className="dd-infra-sum">{A.infra.summary} <span onClick={e => e.stopPropagation()}>{(A.infra.adrs || []).map(a => <TRef id={a} key={a} />)}{(A.infra.meets || []).map(m => <TRef id={m} key={m} />)}</span></p>
        <EnvCards A={A} open={open} />
      </DSec>

      <DSec icon="check" title="As-built component status" sub="Code, tests and ownership per component · click to trace">
        <div className="asc-panel dd-bstats">
          {comps.map(c => (
            <div className="dd-bstat dd-clickable" key={c.id} onClick={() => open(c.id)}>
              <span className="dd-bstat-name"><b>{c.id}</b> {c.name}<span className="dd-bstat-dom"> · {c.domainName}</span></span>
              <code className="dd-bstat-path">{c.code?.path || '—'}</code>
              <span className="dd-bstat-tests">{c.code?.tests || 'not built'}</span>
              <span className="dd-bstat-cov">{c.code?.coverage || ''}</span>
              <span className="dd-bstat-own">{c.code?.owners || ''}</span>
            </div>
          ))}
        </div>
      </DSec>
    </>
  );
}

/* ===================== dispatcher ===================== */
function DisDesContent({ phase, entry, prd }) {
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
    // Build (as-built actuals — D-035)
    'Build/infra':           BuildInfrastructure,
    // retained for back-compat / trace jumps
    'Design/usecases':       DesignUseCases,
    'Design/specs':          DesignSpecs,
    'Design/controls':       DesignControls,
  };
  const Cmp = map[phase + '/' + entry];
  return Cmp ? <Cmp prd={prd} /> : null;
}

Object.assign(window, { DisDesContent });
