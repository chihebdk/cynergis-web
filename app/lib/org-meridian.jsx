import React from 'react';
import dynamic from 'next/dynamic';
import './kg-v4.gen';
import './org-refchart';
/* the flow canvas, for the domain-level maps (D-120) — client-only, heavy */
const FlowEmbed = dynamic(() => import('../flow/FlowEmbed.jsx'), { ssr: false });
import { stageChange } from './kg-query';
/* ============================================================
   Cynergis — the Meridian org altitude (v4, D-094).
   The two-axis IA from the org-site reference, rendered ENTIRELY
   from the derived v4 graphs (window.__KG4__ — org walls + map +
   language, the Claims member graph, the ClaimsCore lifecycle):
     chart   the two-axis org: value axis (domains → contexts →
             teams) × capability axis (chapters), journeys, the
             typed context map, polysemes, health metrics
     domain  sub-structure · subdomains · context-map slice ·
             journeys · product portfolio
     context owning team · models & invariants · applications &
             modules · typed contracts · outcome measures
   Strangler: lives beside the WealthGrow dashboard until cutover.
   Routing rides the shell router: ?v=org&sub=meridian&dom=…&bc=…
   ============================================================ */
const { useMemo, useState, useEffect } = React;

const K4 = typeof window !== 'undefined' ? window.__KG4__ : null;

/* ---------- graph accessors (static data — indexed once) ---------- */
function indexGraph(g) {
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  const byLocal = new Map(g.nodes.map(n => [n.localId, n]));
  const out = (id, t) => g.edges.filter(e => e.from === id && (!t || e.type === t));
  const inn = (id, t) => g.edges.filter(e => e.to === id && (!t || e.type === t));
  const nodes = t => g.nodes.filter(n => n.type === t);
  return { g, byId, byLocal, out, inn, nodes };
}

const M = (() => {
  if (!K4) return null;
  const org = indexGraph(K4.org);
  /* every domain member graph, keyed by BOTH namespace and Domain localId (D-113) */
  const members = {};
  if (K4.members) for (const [ns, graph] of Object.entries(K4.members)) {
    const idx = indexGraph(graph);
    idx.ns = ns;
    members[ns] = idx;
    const dNode = idx.nodes('Domain')[0];
    if (dNode) members[dNode.localId] = idx;
  }
  const claims = members.claims || null;
  const ccore = K4.products && K4.products.claimscore ? indexGraph(K4.products.claimscore) : null;

  const domains = org.nodes('Domain').map(d => ({
    node: d,
    contexts: org.out(d.id, 'contains').map(e => org.byId.get(e.to)),
    teams: org.nodes('Team').filter(t => org.out(t.id, 'part_of').some(e => e.to === d.id)),
    journeyHome: org.out(d.id, 'home_of').map(e => org.byId.get(e.to)),
  }));
  const ctxDomain = new Map();
  domains.forEach(d => d.contexts.forEach(c => ctxDomain.set(c.id, d.node)));

  const products = org.nodes('Product').map(p => ({
    node: p,
    owner: org.byId.get((org.out(p.id, 'owned_by')[0] || {}).to),
    packages: org.out(p.id, 'packages').map(e => ({ ctx: org.byId.get(e.to), modules: e.props.modules || [] })),
  }));

  const chapters = org.nodes('Chapter').map(ch => ({ node: ch, staffed: org.out(ch.id, 'staffs').length }));
  const journeys = org.nodes('Journey').map(j => ({
    node: j,
    home: org.byId.get((org.inn(j.id, 'home_of')[0] || {}).from),
    crosses: org.out(j.id, 'crosses').map(e => org.byId.get(e.to)),
  }));
  const seams = org.g.edges.filter(e => e.type === 'upstream_of').map(e => ({
    from: org.byId.get(e.from), to: org.byId.get(e.to), ...e.props,
  }));

  /* member-graph depth for EVERY domain, keyed by context localId (unique org-wide);
     units and reviews keyed by Domain localId (D-113 generalization of the Claims shape) */
  const depth = new Map();
  const memberUnits = {}, memberReviews = {};
  for (const ns of Object.keys(K4.members || {})) {
    const mg = members[ns];
    for (const c of mg.nodes('BoundedContext')) {
      const team = mg.byId.get((mg.out(c.id, 'owned_by')[0] || {}).to);
      const models = mg.nodes('DomainModel').filter(m => mg.out(m.id, 'part_of').some(e => e.to === c.id))
        .map(m => ({ node: m, aggregates: mg.inn(m.id, 'part_of').map(e => mg.byId.get(e.from)) }));
      const apps = mg.nodes('Application').filter(a => mg.out(a.id, 'implements').some(e => e.to === c.id));
      const contracts = [...mg.out(c.id, 'consumes'), ...mg.out(c.id, 'publishes_to')]
        .map(e => mg.byId.get(e.to)).filter(k => k && k.type === 'Contract')
        .map(k => ({ node: k, counterpart: mg.byId.get((mg.out(k.id, 'with')[0] || {}).to) }));
      const oms = mg.out(c.id, 'measured_by').map(e => mg.byId.get(e.to)).filter(Boolean);
      const agents = mg.nodes('Agent').filter(a => mg.out(a.id, 'serves').some(e => e.to === c.id));
      depth.set(c.localId, { node: c, team, models, apps, contracts, oms, agents, member: mg });
    }
    const dNode = mg.nodes('Domain')[0];
    if (dNode) {
      memberUnits[dNode.localId] = mg.nodes('OrgUnit');
      memberReviews[dNode.localId] = mg.nodes('OutcomeReview').slice().sort((a, b) => String(b.props.quarter).localeCompare(String(a.props.quarter)));
    }
  }
  const claimsUnits = memberUnits['DOM-CLAIMS'] || [];
  const claimsReviews = memberReviews['DOM-CLAIMS'] || [];

  const ccoreGates = ccore ? ((ccore.nodes('Product')[0] || {}).props || {}).gates : null;

  /* every product lifecycle graph, keyed by the product's localId (D-100) */
  const prods4 = {};
  if (K4.products) for (const [ns, graph] of Object.entries(K4.products)) {
    const idx = indexGraph(graph);
    const pNode = idx.nodes('Product')[0];
    if (pNode) prods4[pNode.localId] = { idx, ns };
  }
  return { org, claims, ccore, members, memberUnits, memberReviews, domains, ctxDomain, products, chapters, journeys, seams, depth, claimsUnits, claimsReviews, ccoreGates, prods4 };
})();

/* ---------- shared bits ---------- */
const CLS = { core: 'core', supporting: 'supporting', generic: 'generic' };
function Chip({ c }) {
  return c ? <span className={'ddd-class ' + (CLS[c] || '')}>{c}</span> : null;
}
function patternClass(p) {
  const s = String(p || '').toLowerCase();
  if (s.startsWith('customer')) return 'cs';
  if (s.startsWith('open host')) return 'oh';
  if (s.startsWith('published')) return 'ev';
  if (s.startsWith('conformist')) return 'cf';
  if (s.startsWith('anticorruption')) return 'acl';
  if (s.startsWith('partnership')) return 'pn';
  return 'other';
}
function Pattern({ p, status }) {
  return <span className={'mer-pat ' + patternClass(p)} title={status || ''}>{p}{status ? ' ·  expired' : ''}</span>;
}
function nav(n) {
  window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'meridian', phase: 'Envision', entry: 'overview', ctx: null, tab: 'flow', ...n });
  setTimeout(() => document.querySelector('.asc-main')?.scrollTo(0, 0), 0);
}
const goChart = () => nav({});
const goDomain = id => nav({ dom: id });
const goContext = id => nav({ bc: id });
const goProduct = (id, tab) => nav({ mprod: id, mtab: tab || 'envision' });
function DerivedStrip({ graph, extra }) {
  return (
    <div className="mer-derived">
      <span className="mer-kg">KG</span> derived surface — {graph.stats.nodes} nodes · {graph.stats.edges} edges · {graph.stats.unresolved} unresolved · ontology {graph.ontologyVersion}{extra ? <> · {extra}</> : null}
    </div>
  );
}

/* ---------- the two-axis chart ---------- */
function MerChart() {
  const streams = M.domains.filter(d => d.node.props.kind === 'stream');
  const platform = M.domains.find(d => d.node.props.kind === 'platform');
  const allCtx = M.org.nodes('BoundedContext');
  const clsCount = k => allCtx.filter(c => c.props.classification === k).length;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · org model v4 · two axes</div>
          <h1 className="asc-page-title">{M.org.g.org.name}</h1>
          <p className="asc-page-sub">{M.org.byLocal.get('ORG').props.northStar}</p>
        </div>
        <div className="asc-head-actions">
          <span className="badge ok"><span className="dot ok"></span>org gate ✓ · domain gate ✓</span>
        </div>
      </div>

      <div className="asc-kpis">
        <div className="asc-kpi"><div className="l">Domains</div><div className="v">{M.domains.length}</div><div className="m">5 stream + platform band</div></div>
        <div className="asc-kpi"><div className="l">Bounded contexts</div><div className="v">{allCtx.length}</div><div className="m">core {clsCount('core')} · supporting {clsCount('supporting')} · generic {clsCount('generic')}</div></div>
        <div className="asc-kpi"><div className="l">Durable teams</div><div className="v">{M.org.nodes('Team').length}</div><div className="m">each owns 1–3 contexts</div></div>
        <div className="asc-kpi"><div className="l">Products</div><div className="v">{M.products.length}</div><div className="m">packaging over contexts</div></div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Capability axis — chapters</div>
          <div className="asc-sec-sub">Own craft, standards and careers · staff the teams · never route work</div>
        </div>
        <div className="mer-chapters">
          {M.chapters.map(({ node, staffed }) => (
            <div className="mer-chapter" key={node.id} title={node.props.allocation}>
              <div className="mer-ch-top"><b>{node.label}</b><span className="mer-ch-size">{node.props.size}</span></div>
              <div className="mer-ch-owns">{node.props.owns}</div>
              <div className="mer-ch-foot">staffs <b>{staffed}</b> teams</div>
            </div>
          ))}
        </div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Value axis — domain groups</div>
          <div className="asc-sec-sub">The value chain, left to right · a named owner per domain · contexts are the walls</div>
        </div>
        <div className="mer-grid">
          {streams.map(d => (
            <div className={'mer-dom' + (d.node.props.deepSlice ? ' deep' : '')} key={d.node.id} onClick={() => goDomain(d.node.localId)}>
              <div className="mer-dom-step">{d.node.props.valueChainStep}</div>
              <h3>{d.node.label}</h3>
              <div className="mer-dom-owner">{d.node.props.owner}</div>
              <div className="mer-ctxs">
                {d.contexts.map(c => (
                  <button type="button" className="mer-ctxrow" key={c.id}
                    onClick={e => { e.stopPropagation(); goContext(c.localId); }}>
                    <Chip c={c.props.classification} /><span className="nm">{c.label}</span>
                  </button>
                ))}
              </div>
              <div className="mer-dom-foot">
                <span><b>{d.teams.length}</b> teams · <b>{d.teams.reduce((s, t) => s + (t.props.size || 0), 0)}</b> people</span>
                {d.node.props.deepSlice && <span className="mer-deep">deep slice</span>}
              </div>
            </div>
          ))}
        </div>
        {platform && (
          <div className="mer-band" onClick={() => goDomain(platform.node.localId)}>
            <div className="mer-band-head">
              <b>{platform.node.label}</b>
              <span className="mer-dom-owner">{platform.node.props.owner}</span>
              <span className="mer-band-note">X-as-a-Service by default · rule of three · guardrails the only mandate</span>
            </div>
            <div className="mer-band-ctxs">
              {platform.contexts.map(c => (
                <button type="button" className="mer-ctxrow" key={c.id}
                  onClick={e => { e.stopPropagation(); goContext(c.localId); }}>
                  <Chip c={c.props.classification} /><span className="nm">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Journeys — owned, not coordinated</div>
          <div className="asc-sec-sub">Each crosses domains but has exactly one home · Product &amp; Pricing homes none by design</div>
        </div>
        <div className="mer-journeys">
          {M.journeys.map(j => (
            <div className="mer-jr" key={j.node.id}>
              <b>{j.node.label}</b>
              <div className="mer-jr-home">home: <button type="button" className="mer-link" onClick={() => j.home && goDomain(j.home.localId)}>{j.home ? j.home.label : '—'}</button>
                {j.crosses.length > 0 && <span className="mer-jr-x"> · crosses {j.crosses.map(c => c.label).join(', ')}</span>}</div>
              <div className="mer-jr-meas">{(j.node.props.measures || []).join(' · ')}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">The context map — every seam, typed</div>
          <div className="asc-sec-sub">"Ownership is never shared to manage a dependency; the type of the relationship IS the management."</div>
        </div>
        <div className="mer-map">
          {M.seams.map((s, i) => (
            <div className="mer-seam" key={i}>
              <span className="mer-seam-ends">
                <b className={s.from.type === 'External' ? 'ext' : ''}>{s.from.label}</b>
                <span className="mer-arrow">→</span>
                <b className={s.to.type === 'External' ? 'ext' : ''}>{s.to.label}</b>
              </span>
              <Pattern p={s.pattern} status={s.status} />
              <span className="mer-seam-what">{s.what}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mer-two">
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">The polysemes — one word, many models</div>
            <div className="asc-sec-sub">Why the walls exist: the same word deliberately means different things</div>
          </div>
          {M.org.nodes('Polyseme').map(p => (
            <div className="mer-poly" key={p.id}>
              <b className="mer-poly-word">{p.label}</b>
              <div className="mer-poly-means">
                {(p.props.meanings || []).map((m, i) => (
                  <div className="mer-poly-row" key={i}>
                    {m.ref
                      ? <button type="button" className="mer-link where" onClick={() => (M.org.byLocal.get(m.ref) || {}).type === 'Domain' ? goDomain(m.ref) : goContext(m.ref)}>{m.where}</button>
                      : <span className="where plain">{m.where}</span>}
                    <span className="means">{m.means}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Health — is the structure holding?</div>
            <div className="asc-sec-sub">Metrics that say when to redraw, never who to blame</div>
          </div>
          {(M.org.byLocal.get('ORG').props.healthMetrics || []).map((h, i) => (
            <div className="mer-health" key={i}>
              <div className="mer-h-top"><b>{h.metric}</b><span className="badge ok">{h.healthy}</span></div>
              <div className="mer-h-act">{h.action}</div>
            </div>
          ))}
        </div>
      </div>

      <DerivedStrip graph={M.org.g} extra={<>evidence S1–S3 = the ddd/ corpus · <code>kg/org/meridian.js</code> → <code>node kg/generate-v4.js</code></>} />
    </div>
  );
}

/* ---------- funding & rhythm (Phase E, D-097): the first v4 two-way act ---------- */
function FundingRhythm({ domainId = 'DOM-CLAIMS' }) {
  const member = M.members[domainId];
  const domainNode = member ? member.nodes('Domain')[0] : null;
  const funding = domainNode ? domainNode.props.funding : null;
  const reviews = M.memberReviews[domainId] || [];
  const [staged, setStaged] = useState([]);
  const [form, setForm] = useState(null);   // null | {decision, rebalancePct, conditions}
  if (!funding) return null;

  /* evidence in — pulled LIVE from the domain's product lifecycle graphs' outcomes, never typed */
  const evidence = M.products
    .filter(p => p.packages.some(pk => pk.ctx && (M.ctxDomain.get(pk.ctx.id) || {}).localId === domainId))
    .flatMap(p => {
      const p4 = M.prods4[p.node.localId];
      if (!p4) return [];
      return p4.idx.nodes('Outcome').map(o => {
        const sc = p4.idx.byId.get((p4.idx.out(o.id, 'actualizes')[0] || {}).to);
        return `${sc ? sc.label : o.localId}: ${o.props.current}`;
      });
    });
  const nextQuarter = '2026-Q3';
  const already = reviews.some(r => r.props.quarter === nextQuarter) || staged.some(r => r.quarter === nextQuarter);

  const record = () => {
    if (form.rebalancePct > 15) {
      /* beyond the corridor: not a review record — a strategic-reserve DRAW REQUEST.
         The refusal path becomes productive: it stages approval.create into the
         ClaimsCore approvals queue (the reserve process is the only other money door). */
      const apr = {
        id: 'APR-3', status: 'pending', name: `Strategic-reserve draw: +${form.rebalancePct}% into the ${domainNode.label} envelope`,
        kind: 'strategic-reserve draw', requestedBy: `${domainNode.props.executive} · quarterly outcome review`,
        evidence: evidence.join(' · '),
        ask: `${form.tradeoffs}${form.conditions ? ` Conditions offered: ${form.conditions}` : ''}`,
      };
      setStaged(s => [{ reserveAsk: true, ...apr }, ...s]);
      stageChange('approval.create', apr.id, { ...apr, graph: 'claimscore' });
      setForm(null);
      return;
    }
    const rv = {
      id: `OR-${nextQuarter.replace('-', '')}-${domainId.replace('DOM-', '')}`, quarter: nextQuarter, status: 'recorded', date: '2026-08-16',
      decidedBy: `${domainNode.props.executive} · quarterly outcome review`,
      evidence,
      decision: form.rebalancePct === 0 ? 'hold' : 'rebalance', rebalancePct: form.rebalancePct,
      tradeoffs: form.tradeoffs, conditions: form.conditions,
    };
    setStaged(s => [rv, ...s]);   // optimistic echo — the record returns from the KB after apply
    stageChange('review.record', rv.id, { ...rv, graph: member.ns });
    setForm(null);
  };

  const Review = ({ r, isStaged }) => (
    <div className="mer-panel">
      <div className="mer-h-top">
        <b>{r.quarter} outcome review</b>
        <span style={{ display: 'flex', gap: 6 }}>
          <span className={'badge ' + (r.rebalancePct ? '' : 'ok')}>{r.decision}{r.rebalancePct ? ` ${r.rebalancePct > 0 ? '+' : ''}${r.rebalancePct}%` : ''}</span>
          {isStaged && <span className="badge err" title="Staged onto the gated write path (kg/changes/pending.jsonl). Run `node kg/apply.js` — the record lands in kg/org/domains/claims.js, regenerates, and returns from the derived KB.">staged · node kg/apply.js</span>}
        </span>
      </div>
      <div className="mer-h-act">{r.decidedBy} · {r.date}</div>
      <div className="mer-oms" style={{ margin: '8px 0' }}>{(r.evidence || []).map((e, i) => <span className="mer-om" key={i}>{e}</span>)}</div>
      <div className="mer-h-act"><b>Trade-offs:</b> {r.tradeoffs}</div>
      {r.conditions && <div className="mer-h-act" style={{ marginTop: 4 }}><b>Conditions:</b> {r.conditions}</div>}
    </div>
  );

  return (
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title">Funding &amp; rhythm — the envelope and its reviews</div>
        <div className="asc-sec-sub">Evidence in, trade-offs out · rebalancing ≤10–15%/quarter · records ride the gated write path (doctrine 4)</div>
      </div>
      <div className="mer-facts">
        <div className="mer-fact"><span className="k">Envelope · {funding.period}</span><span className="v">{funding.posture}</span></div>
        <div className="mer-fact"><span className="k">Scope</span><span className="v">{funding.note}</span></div>
      </div>

      {!form && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!already && (
            <button type="button" className="asc-btn" onClick={() => setForm({ rebalancePct: 0, tradeoffs: '', conditions: '' })}>
              Record the {nextQuarter} review
            </button>
          )}
          {!(staged.some(r => r.reserveAsk) || (M.ccore && M.ccore.byLocal.get('APR-3'))) && (
            <button type="button" className="mer-link" onClick={() => setForm({ rebalancePct: 20, tradeoffs: '', conditions: '' })}>
              Request a strategic-reserve draw (beyond the corridor) →
            </button>
          )}
        </div>
      )}
      {form && (
        <div className="mer-panel mer-actform">
          <div className="mer-k">Record the {nextQuarter} outcome review — evidence is read from the lifecycle graph, not typed</div>
          <div className="mer-oms" style={{ margin: '6px 0 10px' }}>{evidence.map((e, i) => <span className="mer-om" key={i}>{e}</span>)}</div>
          <label className="mer-formrow">Envelope decision
            <select value={form.rebalancePct} onChange={e => setForm({ ...form, rebalancePct: Number(e.target.value) })}>
              <option value={0}>Hold — run + change stays flat</option>
              <option value={5}>Rebalance +5% — into the repair-cycle promise work</option>
              <option value={-5}>Rebalance −5% — released to the strategic reserve</option>
              <option value={12}>Rebalance +12% — accelerate the whole slice</option>
              <option value={20}>Ask +20% — beyond the corridor: a strategic-reserve draw request</option>
            </select>
          </label>
          {form.rebalancePct > 15 && (
            <div className="mer-h-act" style={{ marginTop: 6 }}>
              Beyond the ≤15% corridor this is not a review record — recording stages a <b>strategic-reserve draw request</b> into the ClaimsCore approvals queue instead (the reserve is the only other money door).
            </div>
          )}
          <label className="mer-formrow">Trade-offs out (what was NOT funded)
            <input value={form.tradeoffs} onChange={e => setForm({ ...form, tradeoffs: e.target.value })}
              placeholder="e.g. Repair-cycle promises before new AB tooling; SIU expansion stays deferred" />
          </label>
          <label className="mer-formrow">Conditions (optional)
            <input value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })}
              placeholder="e.g. SLO3 back to green before the +5% lands" />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="asc-btn" disabled={!form.tradeoffs} onClick={record}>Record review</button>
            <button type="button" className="mer-link" onClick={() => setForm(null)}>cancel</button>
          </div>
        </div>
      )}

      {staged.map(r => r.reserveAsk
        ? <div className="mer-panel" key={r.id}>
            <div className="mer-h-top"><b>{r.name}</b>
              <span style={{ display: 'flex', gap: 6 }}>
                <span className="badge">pending · approvals queue</span>
                <span className="badge err" title="Staged onto the gated write path — the draw request lands in ClaimsCore's approvals register.">staged · node kg/apply.js</span>
              </span>
            </div>
            <div className="mer-h-act">{r.kind} · requested by {r.requestedBy} — decided in the reserve process, not the review.</div>
          </div>
        : <Review r={r} isStaged key={r.id} />)}
      {reviews.map(r => <Review r={{ ...r.props, quarter: r.props.quarter }} key={r.id} />)}
    </div>
  );
}

/* ---------- domain page ---------- */
function MerDomain({ id }) {
  const d = M.domains.find(x => x.node.localId === id);
  /* D-133: the D-123 tabbed panel moved into the domain rail — sections are
     URL-driven (dtab), so every one deep-links. Overview = the identity card
     (facts); the rail carries the rest. Hooks stay above the early return. */
  const q133 = (typeof window !== 'undefined' && window.cynParseUrl) ? window.cynParseUrl() : {};
  const domTab = ['units', 'funding', 'subdomains', 'portfolio', 'prioritize'].includes(q133.dtab) ? q133.dtab : 'overview';
  const [prioSel, setPrioSel] = useState(null);   // D-127: the open WSJF breakdown
  useEffect(() => { setPrioSel(null); }, [id]);
  if (!d) return <div className="asc-page"><div className="asc-panel asc-panel-pad">Unknown domain. <button type="button" className="mer-link" onClick={goChart}>Back to the org</button></div></div>;
  const member = M.members[id] || null;
  const units = M.memberUnits[id] || [];
  const portfolio = M.products.filter(p => p.packages.some(pk => pk.ctx && M.ctxDomain.get(pk.ctx.id) && M.ctxDomain.get(pk.ctx.id).id === d.node.id));
  return (
    <div className="asc-page">
      <div className="mer-crumb"><button type="button" className="mer-link" onClick={goChart}>Meridian org</button> / <b>{d.node.label}</b></div>
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Domain · {d.node.props.kind} · {d.node.props.valueChainStep}</div>
          <h1 className="asc-page-title">{d.node.label}</h1>
          {/* D-133 polish: the description reads once, on Overview — section
              pages keep only the identity line above */}
          {domTab === 'overview' && <p className="asc-page-sub">{d.node.props.summary}</p>}
        </div>
        <div className="asc-head-actions">
          {d.node.props.deepSlice && <span className="badge ok"><span className="dot ok"></span>the worked deep slice</span>}
        </div>
      </div>

      {domTab === 'overview' && (
        <div className="mer-facts">
          <div className="mer-fact"><span className="k">Accountable executive</span><span className="v">{d.node.props.owner}</span></div>
          {d.node.props.envelope && <div className="mer-fact"><span className="k">Envelope</span><span className="v">{d.node.props.envelope}</span></div>}
          {d.node.props.standingMeasures && <div className="mer-fact"><span className="k">Standing measures</span><span className="v">{d.node.props.standingMeasures.join(' · ')}</span></div>}
          {d.node.props.journeyNote && <div className="mer-fact"><span className="k">Note</span><span className="v">{d.node.props.journeyNote}</span></div>}
        </div>
      )}

      {domTab === 'units' && (
        units.length > 0 ? (
          <div className="asc-section">
            <div className="asc-sec-head">
              <div className="asc-sec-title">Sub-structure</div>
              <div className="asc-sec-sub">Two management logics inside one envelope — flat product side, hierarchical operations side</div>
            </div>
            <div className="mer-units">
              {units.map(u => (
                <div className="mer-unit" key={u.id}>
                  <div className="mer-u-top"><b>{u.label}</b><span className="mer-u-size">{u.props.size}</span></div>
                  <div className="mer-u-shape">{u.props.shape}</div>
                  <div className="mer-u-note">{u.props.note}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="ddd-empty-inline">No sub-structure recorded for this domain.</div>
      )}

      {domTab === 'funding' && (
        member ? <FundingRhythm domainId={id} /> : <div className="ddd-empty-inline">No funding rhythm recorded for this domain.</div>
      )}

      {domTab === 'subdomains' && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Subdomains — the walls</div>
            <div className="asc-sec-sub">Classified before staffed · each owned by exactly one durable team</div>
          </div>
          <div className="mer-subgrid">
            {d.contexts.map(c => {
              const dep = M.depth.get(c.localId);
              const team = M.org.byId.get((M.org.out(c.id, 'owned_by')[0] || {}).to);
              return (
                <div className="mer-sub" key={c.id} onClick={() => goContext(c.localId)}>
                  <div className="mer-sub-top"><Chip c={c.props.classification} /><h3>{c.label}</h3></div>
                  <div className="mer-sub-bc">model: <b>{c.props.bcName}</b></div>
                  <p className="mer-sub-p">{dep ? dep.node.props.purpose : (c.props.publishes || '')}</p>
                  <div className="mer-sub-foot">{team ? <>{team.label} · {team.props.size} people</> : null}<span className="mer-open">open →</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {domTab === 'portfolio' && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Product portfolio — the furniture</div>
            <div className="asc-sec-sub">Packaging over this domain's contexts · a module in another domain's colour means composition through a contract</div>
          </div>
          {portfolio.length > 0 ? (
            <div className="mer-prods">
              {portfolio.map(p => (
                <div className="mer-prod" key={p.node.id}>
                  <div className="mer-prod-top">
                    <b>{p.node.label}</b><span className="mer-prod-kind">{p.node.props.kind}</span>
                    <button type="button" className="badge mer-gatelink" title="The full product page: the six-phase journey with every section — Envision entries, Discover, Design (bounded contexts · context map · system design), Build, Operate, Realize (R1, D-104)."
                      onClick={() => window.__cynOpenV4Product && window.__cynOpenV4Product(p.node.localId)}>
                      open the product page →</button>
                    {M.prods4[p.node.localId] && (() => {
                      const gts = (M.prods4[p.node.localId].idx.nodes('Product')[0].props || {}).gates || {};
                      const n = Object.keys(gts).length;
                      return (
                        <button type="button" className="badge ok mer-gatelink" title={Object.entries(gts).map(([k, v]) => `${k}: ${v}`).join('\n')}
                          onClick={() => goProduct(p.node.localId)}>
                          <span className="dot ok"></span>lifecycle · {n} gate{n === 1 ? '' : 's'} ✓{n < 4 ? ` of 4 — depth is honest` : ''} →</button>
                      );
                    })()}
                  </div>
                  <div className="mer-prod-owner">Owner: {p.owner ? p.owner.label : '—'}</div>
                  <p className="mer-prod-note">{p.node.props.note}</p>
                  <div className="mer-mods">
                    {p.packages.map((pk, i) => (pk.modules || []).map(m => {
                      const home = pk.ctx ? M.ctxDomain.get(pk.ctx.id) : null;
                      const foreign = home && home.id !== d.node.id;
                      return (
                        <button type="button" key={i + m} className={'mer-mod' + (foreign ? ' foreign' : '')}
                          title={pk.ctx ? `context: ${pk.ctx.label}${foreign ? ` (${home.label})` : ''}` : ''}
                          onClick={() => pk.ctx && goContext(pk.ctx.localId)}>
                          {m}<span className="ctx">{pk.ctx ? pk.ctx.props.bcName : ''}</span>
                        </button>
                      );
                    }))}
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="ddd-empty-inline">No products package this domain's contexts yet.</div>}
        </div>
      )}

      {domTab === 'prioritize' && (() => {
        /* D-127: the legacy portfolio's WSJF sequencing at domain altitude —
           the SAME board and breakdown (window.CynVFBoard / CynProdWsjfDetail),
           scored from wsjf props the org spec records on each Product node.
           Closes parity-gate line G6. */
        const O = window.ORG;
        if (!O || !window.CynVFBoard) return <div className="ddd-empty-inline">Prioritization machinery not loaded.</div>;
        const scored = portfolio.filter(p => p.node.props.wsjf).map(p => ({
          id: p.node.localId, name: p.node.label, tagline: p.node.props.note || p.node.props.kind,
          wsjf: p.node.props.wsjf, rationale: p.node.props.wsjfWhy,
        }));
        const unscored = portfolio.filter(p => !p.node.props.wsjf);
        const ranked = scored.map(dd => ({
          id: dd.id, name: dd.name, sub: dd.tagline,
          value: O.prodValue(dd), feasibility: O.prodFeasibility(dd), score: O.wsjf(dd),
          invest: dd.wsjf.js, urgency: dd.wsjf.tc,
        })).sort((a, b) => b.score - a.score);
        const max = ranked.length ? ranked[0].score : 1;
        ranked.forEach(it => { it.tier = O.tierOf(it.score, max); it.scoreLabel = it.score.toFixed(2); it.scoreUnit = 'WSJF'; });
        const selProd = prioSel ? scored.find(dd => dd.id === prioSel) : null;
        return (
          <div className="asc-section">
            <div className="asc-sec-head">
              <div className="asc-sec-title">Prioritize products</div>
              <div className="asc-sec-sub">WSJF sequencing — Cost of Delay ÷ Job Size, ranked within the domain; scores recorded in the org spec, never invented here</div>
            </div>
            <div className="formula-line">
              <b>WSJF</b> = ( Business Value + Time Criticality + Risk Reduction ) ÷ Job Size
              <span className="fl-note">components scored 1–10 · higher = do sooner</span>
            </div>
            {ranked.length > 0
              ? <div style={{ marginTop: '16px' }}>
                  {React.createElement(window.CynVFBoard, { items: ranked, onItem: it => setPrioSel(it.id), sizeLabel: 'Job size', colorLabel: 'Time criticality' })}
                </div>
              : <div className="ddd-empty-inline">No scored products in this domain yet.</div>}
            {unscored.length > 0 && (
              <div className="ddd-empty-inline" style={{ marginTop: '10px' }}>
                Not yet scored (wsjf absent from the org spec): {unscored.map(p => p.node.label).join(' · ')}
              </div>
            )}
            {selProd && React.createElement(window.CynProdWsjfDetail, { product: selProd, onClose: () => setPrioSel(null) })}
          </div>
        );
      })()}

      <DerivedStrip graph={member ? member.g : M.org.g} extra={member ? <>member graph <code>{member.ns}:*</code> · walls gated "Walls hold?" ✓</> : null} />
    </div>
  );
}

/* ---------- context page ---------- */
function MerContext({ id }) {
  /* R3 (D-109) → D-121: the subdomain is its own scope. The BC element's tabs
     are RAIL-driven via the sbtab URL param (the product-page pattern); the
     overview carries the member-graph sections. Hooks stay above the early
     return. */
  const n121 = (typeof window !== 'undefined' && window.cynParseUrl) ? window.cynParseUrl() : {};
  const sbtab = n121.sbtab || 'overview';
  const dddProd = useMemo(() => {
    const reg = (typeof window !== 'undefined' && window.__DDD__ && window.__DDD__.byProduct) || {};
    for (const pid of Object.keys(reg)) {
      if (((reg[pid] || {}).contexts || []).some(cc => cc.id === id)) return { pid, ddd: reg[pid] };
    }
    return null;
  }, [id]);
  const c = M && M.org.byLocal.get(id);
  const domain = c ? M.ctxDomain.get(c.id) : null;
  useEffect(() => {
    if (!dddProd) return;
    /* ground chips, arch joins and nav targets inside the element resolve
       against the OWNING product while we're on the org altitude */
    window.__cynGroundScope = { prod: dddProd.pid, pf: domain ? domain.localId : undefined };
    return () => { delete window.__cynGroundScope; };
  }, [dddProd, domain && domain.localId]);
  if (!c || c.type !== 'BoundedContext') return <div className="asc-page"><div className="asc-panel asc-panel-pad">Unknown context. <button type="button" className="mer-link" onClick={goChart}>Back to the org</button></div></div>;
  const dep = M.depth.get(id);
  const team = dep ? dep.team : M.org.byId.get((M.org.out(c.id, 'owned_by')[0] || {}).to);
  const packagedBy = M.products.filter(p => p.packages.some(pk => pk.ctx && pk.ctx.id === c.id));
  const seams = M.seams.filter(s => s.from.id === c.id || s.to.id === c.id);
  const isPlatform = !!c.props.publishes;
  const pushSbtab = t => nav({ bc: id, sbtab: t && t !== 'overview' ? t : null });
  if (sbtab !== 'overview' && dddProd && typeof window !== 'undefined' && window.CynBcTabs) {
    const BcTabs = window.CynBcTabs;
    const cc = dddProd.ddd.contexts.find(x => x.id === id);
    return (
      <div className="asc-page">
        <div className="mer-crumb">
          <button type="button" className="mer-link" onClick={goChart}>Meridian org</button> / {domain && <><button type="button" className="mer-link" onClick={() => goDomain(domain.localId)}>{domain.label}</button> / </>}<button type="button" className="mer-link" onClick={() => pushSbtab('overview')}>{c.label}</button>
        </div>
        <div className="asc-page-head">
          <div>
            <div className="asc-eyebrow">Subdomain · {domain ? domain.label : ''}</div>
            <h1 className="asc-page-title">{c.label} <Chip c={c.props.classification} /></h1>
          </div>
        </div>
        <BcTabs c={cc} D={dddProd.ddd}
          M={((window.__DOMAIN__ || {}).byProduct || {})[dddProd.pid]}
          prd={((window.__PRD4__ || {})[dddProd.pid]) || {}}
          tab={sbtab} navTab={pushSbtab} />
      </div>
    );
  }
  return (
    <div className="asc-page">
      <div className="mer-crumb">
        <button type="button" className="mer-link" onClick={goChart}>Meridian org</button> / {domain && <><button type="button" className="mer-link" onClick={() => goDomain(domain.localId)}>{domain.label}</button> / </>}<b>{c.label}</b>
      </div>
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Bounded context · {domain ? domain.label : ''}</div>
          <h1 className="asc-page-title">{c.label} <Chip c={c.props.classification} /></h1>
          <p className="asc-page-sub">{dep ? dep.node.props.purpose : (c.props.publishes || `Model: ${c.props.bcName}.`)}</p>
        </div>
      </div>

      <div className="mer-facts">
        <div className="mer-fact"><span className="k">Owning team</span><span className="v">{team ? <>{team.label} · {team.props.size} people · {team.props.teamType}</> : '—'}</span></div>
        {dep && dep.team && dep.team.props.composition && <div className="mer-fact"><span className="k">Composition</span><span className="v">{dep.team.props.composition}</span></div>}
        <div className="mer-fact"><span className="k">Model{dep && dep.models.length > 1 ? 's' : ''}</span><span className="v">{c.props.bcName}</span></div>
        {dep && dep.node.props.origin && <div className="mer-fact"><span className="k">Origin</span><span className="v">{dep.node.props.origin}</span></div>}
      </div>

      {/* D-121: the BC element lives behind the RAIL tabs (Event flow … Language)
          — rehomed from the inline section to the subdomain's own navigation. */}

      {dep && dep.models.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">The model — language &amp; invariants</div>
            <div className="asc-sec-sub">From the Claims member graph · every model states the invariant it defends</div>
          </div>
          <div className="mer-models">
            {dep.models.map(m => (
              <div className="mer-model" key={m.node.id}>
                <div className="mer-model-top"><b>{m.node.label}</b></div>
                <div className="mer-inv"><span className="k">Invariant</span> {m.node.props.invariant}</div>
                <div className="mer-aggs">
                  {m.aggregates.map(a => (
                    <div className="mer-agg" key={a.id}><b>{a.label}</b><span>{a.props.def}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isPlatform && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">The platform charter</div></div>
          <div className="mer-plat">
            <div className="mer-fact"><span className="k">Publishes</span><span className="v">{c.props.publishes}</span></div>
            <div className="mer-fact"><span className="k">Consumers</span><span className="v">{c.props.consumers}</span></div>
            <div className="mer-fact warn"><span className="k">Watch</span><span className="v">{c.props.watch}</span></div>
          </div>
        </div>
      )}

      {dep && dep.apps.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Applications &amp; modules</div>
            <div className="asc-sec-sub">Every module implements exactly this context (I1)</div></div>
          <div className="mer-apps">
            {dep.apps.map(a => (
              <div className="mer-app" key={a.id}><b>{a.label}</b><span>{a.props.note}</span></div>
            ))}
          </div>
        </div>
      )}

      {dep && dep.contracts.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Contracts</div>
            <div className="asc-sec-sub">Typed dependencies — the relationship type is the management</div></div>
          <div className="mer-map">
            {dep.contracts.map((k, i) => (
              <div className="mer-seam" key={i}>
                <span className="mer-seam-ends">
                  <span className={'mer-dir ' + k.node.props.dir}>{k.node.props.dir === 'consumes' ? '← consumes' : '→ publishes'}</span>
                  <b className={k.counterpart && (k.counterpart.type === 'External') ? 'ext' : ''}>{k.counterpart ? k.counterpart.label : '—'}</b>
                </span>
                <Pattern p={k.node.props.pattern} />
                <span className="mer-seam-what">{k.node.props.mechanism}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!dep && seams.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">On the context map</div></div>
          <div className="mer-map">
            {seams.map((s, i) => (
              <div className="mer-seam" key={i}>
                <span className="mer-seam-ends">
                  <b className={s.from.type === 'External' ? 'ext' : ''}>{s.from.label}</b>
                  <span className="mer-arrow">→</span>
                  <b className={s.to.type === 'External' ? 'ext' : ''}>{s.to.label}</b>
                </span>
                <Pattern p={s.pattern} status={s.status} />
                <span className="mer-seam-what">{s.what}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {dep && dep.oms.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Outcome measures</div>
            <div className="asc-sec-sub">What this wall is accountable for — attached at context level</div></div>
          <div className="mer-oms">{dep.oms.map(o => <span className="mer-om" key={o.id}>{o.label}</span>)}</div>
        </div>
      )}

      {dep && (dep.agents || []).length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">The two agents</div>
            <div className="asc-sec-sub">One per profile (D-065): the builder lives in the harness, the operator is deployed on the trust ladder — governance acts human-reserved at every tier (D-056)</div></div>
          <div className="mer-two">
            {dep.agents.map(a => (
              <div className="mer-panel" key={a.id}>
                <div className="mer-h-top"><b>{a.label}</b>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <span className={'badge ' + (a.props.kind === 'operations' ? 'ok' : '')}>{a.props.kind === 'operations' ? `deployed · ${a.props.tier}` : 'harness · builder'}</span>
                  </span>
                </div>
                {a.props.knows && <div className="mer-h-act">{a.props.knows}</div>}
                {a.props.posture && <div className="mer-h-act" style={{ marginTop: 4 }}><b>Posture:</b> {a.props.posture}</div>}
                {a.props.tierNote && <div className="mer-h-act" style={{ marginTop: 4 }}>{a.props.tierNote}</div>}
                {(a.props.skills || []).length > 0 && <div className="mer-oms" style={{ margin: '8px 0 0' }}>{a.props.skills.map(s => <span className="mer-om prod" key={s}>{s}</span>)}</div>}
                {(a.props.acts || []).length > 0 && (
                  <div className="mer-fact" style={{ marginTop: 8 }}><span className="k">Acts</span><span className="v">{a.props.acts.map((x, i) => <div key={i}>· {x}</div>)}</span></div>
                )}
                {(a.props.observes || []).length > 0 && (
                  <div className="mer-fact"><span className="k">Observes</span><span className="v">{a.props.observes.map((x, i) => <div key={i}>· {x}</div>)}</span></div>
                )}
                {(a.props.guardrails || []).length > 0 && (
                  <div className="mer-fact"><span className="k">Guardrails</span><span className="v">{a.props.guardrails.map((x, i) => <div key={i}>· {x}</div>)}</span></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {dep && dep.node.props.posture && (
        <div className="mer-posture">
          <b>{dep.node.props.postureTitle}</b>
          <p>{dep.node.props.posture}</p>
        </div>
      )}

      {packagedBy.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">In the product portfolio</div>
            <div className="asc-sec-sub">Products composing this context — furniture on this wall</div></div>
          <div className="mer-oms">
            {packagedBy.map(p => {
              const mods = p.packages.filter(pk => pk.ctx && pk.ctx.id === c.id).flatMap(pk => pk.modules);
              return (
                <button type="button" className="mer-om prod click" key={p.node.id}
                  title={`Open the ${p.node.label} product page`}
                  onClick={() => window.__cynOpenV4Product && window.__cynOpenV4Product(p.node.localId)}>
                  {p.node.label} ({mods.join(', ')}) →
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DerivedStrip graph={dep && dep.member ? dep.member.g : M.org.g} />
    </div>
  );
}

/* ---------- Operate tab with the two-way acts (D-098) ----------
   approval.decide (with node-level supersession, D-087) and
   incident.apply ride the gated write path into the v4 lifecycle
   spec; governance acts stay human-reserved (D-056). */
function MerOperate({ cc, lbl, only }) {
  const [acted, setActed] = useState({});          // id → optimistic act echo
  const [aprForm, setAprForm] = useState(null);    // {id, conditions}
  const STAGED = <span className="badge err" title="Staged onto the gated write path. Run `node kg/apply.js` — the routed spec edit lands in kg/org/products/claimscore.js, regenerates, and the record returns from the derived KB.">staged · node kg/apply.js</span>;

  const decide = (a, status) => {
    const decision = { by: 'Chief Claims Officer', at: '2026-08-16', conditions: aprForm && aprForm.id === a.localId ? aprForm.conditions : '' };
    setActed(s => ({ ...s, [a.localId]: { status, decision } }));
    stageChange('approval.decide', a.localId, { status, decision, graph: 'claimscore' });
    setAprForm(null);
  };
  const applyRemediation = (inc) => {
    const at = '2026-08-16 15:45';
    setActed(s => ({ ...s, [inc.localId]: { applied: true, at } }));
    stageChange('incident.apply', inc.localId, { appliedBy: 'A. Tremblay (console)', at, action: inc.props.remediation, graph: 'claimscore' });
  };
  const escalate = (inc) => {
    const at = '2026-08-16 15:52';
    setActed(s => ({ ...s, [inc.localId]: { escalated: true, at } }));
    stageChange('incident.escalate', inc.localId, { at, graph: 'claimscore' });
  };

  const show = k => !only || only === k;
  return (<>
    {show('slos') && <div className="asc-section">
      <div className="asc-sec-head"><div className="asc-sec-title">SLOs</div><div className="asc-sec-sub">Knowledge, not telemetry: the series live behind `observed_via` pointers (doctrine 1)</div></div>
      <div className="mer-journeys">
        {cc.nodes('Slo').map(s => (
          <div className="mer-jr" key={s.id}>
            <div className="mer-h-top"><b>{s.label}</b><span className={'badge ' + (s.props.health === 'green' ? 'ok' : 'err')}>{s.props.health}</span></div>
            <div className="mer-jr-home">{s.props.current} against {s.props.target} · {lbl((cc.out(s.id, 'measures')[0] || {}).to)}</div>
            <div className="mer-jr-meas">{((cc.out(s.id, 'observed_via')[0] || {}).props || {}).query}</div>
          </div>
        ))}
      </div>
    </div>}
    <div className="mer-two">
      {show('incidents') && <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">Incidents</div>
          <div className="asc-sec-sub">Low-risk remediations prepared by the Operator; ONE human Apply</div></div>
        {cc.nodes('Incident').map(inc => {
          const act = acted[inc.localId] || {};
          const status = act.applied ? 'monitoring' : inc.props.status;
          const remStatus = act.applied ? 'applied' : inc.props.remediationStatus;
          const escalated = act.escalated || inc.props.escalationRequested;
          const timeline = [...(inc.props.timeline || []),
            ...(act.applied ? [`${act.at}  remediation applied (human-approved via console)`] : []),
            ...(act.escalated ? [`${act.at}  deep-investigation session launched in the agentic harness (Claude Code) with the incident context`] : [])];
          return (
            <div className="mer-panel" key={inc.id}>
              <div className="mer-h-top"><b>{inc.label}</b>
                <span style={{ display: 'flex', gap: 6 }}>
                  <span className={'badge ' + (status === 'resolved' ? 'ok' : '')}>{inc.props.severity} · {status}</span>
                  {(act.applied || act.escalated) && STAGED}
                </span>
              </div>
              <div className="mer-fact"><span className="k">Discovery</span><span className="v">{inc.props.discovery}</span></div>
              <div className="mer-fact"><span className="k">Finding</span><span className="v">{inc.props.finding}</span></div>
              {inc.props.remediation && (
                <div className="mer-fact"><span className="k">Remediation</span><span className="v">
                  {inc.props.remediation}
                  {inc.props.remediationStatus && <> · <b>{remStatus}</b>{(act.applied || inc.props.appliedBy) && <> by {act.applied ? 'A. Tremblay (console)' : inc.props.appliedBy}</>}</>}
                  {cc.out(inc.id, 'remediated_by').length > 0 && <> · runbook {(cc.byId.get(cc.out(inc.id, 'remediated_by')[0].to) || {}).localId}</>}
                </span></div>
              )}
              {(inc.props.hypotheses || []).length > 0 && (
                <div className="mer-fact"><span className="k">Hypotheses</span><span className="v">
                  {inc.props.hypotheses.map((h, i) => <div key={i}>· {h}</div>)}
                </span></div>
              )}
              {timeline.length > 0 && (
                <div className="mer-timeline">{timeline.map((l, i) => <div key={i}>{l}</div>)}</div>
              )}
              {remStatus === 'proposed' && (
                <button type="button" className="asc-btn" style={{ marginTop: 8 }} onClick={() => applyRemediation(inc)}>
                  Apply remediation — human-approved
                </button>
              )}
              {inc.props.escalationNote && (escalated
                ? <div className="mer-h-act" style={{ marginTop: 8 }}><span className="badge ok"><span className="dot ok"></span>deep investigation requested</span> {inc.props.escalationNote}</div>
                : <button type="button" className="asc-btn" style={{ marginTop: 8 }} onClick={() => escalate(inc)} title={inc.props.escalationNote}>
                    Launch deep investigation — in the harness
                  </button>)}
            </div>
          );
        })}
      </div>}
      {show('approvals') && <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">Approvals</div>
          <div className="asc-sec-sub">Governance acts are human-reserved at every tier (D-056) · decisions supersede, never overwrite (D-087)</div></div>
        {cc.nodes('Approval').filter(a => a.status !== 'superseded').map(a => {
          const act = acted[a.localId];
          const status = act ? act.status : a.props.status;
          const decision = act ? act.decision : a.props.decision;
          const prior = cc.out(a.id, 'supersedes').length;
          return (
            <div className="mer-panel" key={a.id}>
              <div className="mer-h-top"><b>{a.label}</b>
                <span style={{ display: 'flex', gap: 6 }}>
                  {prior > 0 && <span className="badge" title="The prior version is archived in the graph (superseded, validTo) — Optimus `history` walks the chain.">{prior} prior version{prior > 1 ? 's' : ''}</span>}
                  <span className={'badge ' + (status === 'approved' ? 'ok' : status === 'pending' ? '' : 'err')}>{status}{a.props.approver ? ` · ${a.props.approver}` : ''}</span>
                  {act && STAGED}
                </span>
              </div>
              {a.props.kind && <div className="mer-h-act">{a.props.kind} · requested by {a.props.requestedBy}</div>}
              {a.props.evidence && <div className="mer-fact"><span className="k">Evidence</span><span className="v">{a.props.evidence}</span></div>}
              {a.props.ask && <div className="mer-fact"><span className="k">The ask</span><span className="v">{a.props.ask}</span></div>}
              {a.props.conditions && <div className="mer-h-act"><b>Conditions:</b> {a.props.conditions}</div>}
              {decision && <div className="mer-h-act"><b>Decision:</b> {decision.by} · {decision.at}{decision.conditions ? <> — {decision.conditions}</> : null}</div>}
              {status === 'pending' && !act && (
                aprForm && aprForm.id === a.localId ? (
                  <div className="mer-actform" style={{ marginTop: 8, padding: 10 }}>
                    <label className="mer-formrow">Conditions (recorded with the decision)
                      <input value={aprForm.conditions} onChange={e => setAprForm({ ...aprForm, conditions: e.target.value })}
                        placeholder="e.g. 10% audit sample reviewed weekly for the first quarter" />
                    </label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="asc-btn" onClick={() => decide(a, 'approved')}>Approve as Chief Claims Officer</button>
                      <button type="button" className="mer-link" onClick={() => decide(a, 'rejected')}>reject</button>
                      <button type="button" className="mer-link" onClick={() => setAprForm(null)}>cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="asc-btn" style={{ marginTop: 8 }} onClick={() => setAprForm({ id: a.localId, conditions: '' })}>
                    Decide — human-reserved
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>}
    </div>
    {show('runbooks') && <div className="asc-section">
      <div className="asc-sec-head"><div className="asc-sec-title">Runbooks — skills with named executors</div></div>
      <div className="mer-two">
        {cc.nodes('Runbook').map(rb => (
          <div className="mer-panel" key={rb.id}>
            <div className="mer-h-top"><b>{rb.label}</b><span className="mer-pat pn">{(cc.byId.get((cc.out(rb.id, 'uses_skill')[0] || {}).to) || {}).localId}</span></div>
            <div className="mer-h-act">Trigger: {rb.props.trigger}</div>
            <ol className="mer-steps">{(rb.props.steps || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
            <div className="mer-oms">{(rb.props.mcp || []).map(m => <span className="mer-om" key={m}><code style={{ fontSize: 10 }}>{m}</code></span>)}</div>
          </div>
        ))}
      </div>
    </div>}
  </>);
}

/* ---------- product lifecycle page (six phases from claimscore:*) ---------- */
const PHASES4 = [['envision', 'Envision'], ['discover', 'Discover'], ['design', 'Design'], ['build', 'Build'], ['operate', 'Operate'], ['realize', 'Realize']];

function EmptyPhase({ phase, ns }) {
  return (
    <div className="asc-panel asc-panel-pad" style={{ textAlign: 'center', padding: '42px 24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Not authored yet — and the graph says so</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', maxWidth: '52ch', margin: '0 auto', lineHeight: 1.6 }}>
        The owning team hasn’t done this phase’s work, so nothing derives here and the gate is honestly red (D-074/D-079):
        <div style={{ marginTop: 8 }}><code style={{ fontSize: 11 }}>node kg/gate.js kg/out/v4/{ns}/graph.json {phase}</code></div>
        Depth arrives via the authoring skills — never fabricated to fill a page.
      </div>
    </div>
  );
}

function MerProduct({ id, tab }) {
  const entry = M.prods4[id];
  const cc = entry ? entry.idx : null;
  const P = cc ? cc.nodes('Product')[0] : null;
  if (!P) {
    return <div className="asc-page"><div className="asc-panel asc-panel-pad">No lifecycle graph for this product yet — only packaging exists. <button type="button" className="mer-link" onClick={goChart}>Back to the org</button></div></div>;
  }
  const orgP = M.org.byLocal.get(id);
  const homeDomain = orgP ? M.ctxDomain.get((M.org.out(orgP.id, 'packages')[0] || {}).to) : null;
  const gates = P.props.gates || {};
  const t = PHASES4.some(([k]) => k === tab) ? tab : 'envision';

  const scs = cc.nodes('SuccessMetric'), vds = cc.nodes('ValueDriver'), ucs = cc.nodes('UseCase');
  const comps = cc.nodes('Component'), frs = cc.nodes('FunctionalRequirement');
  const lbl = nId => (cc.byId.get(nId) || {}).label;
  const scOf = vd => cc.out(vd.id, 'measured_by').map(e => cc.byId.get(e.to));
  const ctxOfComp = cmp => cc.byId.get((cc.out(cmp.id, 'part_of')[0] || {}).to);

  return (
    <div className="asc-page">
      <div className="mer-crumb">
        <button type="button" className="mer-link" onClick={goChart}>Meridian org</button> / {homeDomain && <><button type="button" className="mer-link" onClick={() => goDomain(homeDomain.localId)}>{homeDomain.label}</button> / </>}<b>{P.label}</b>
      </div>
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Product · {P.props.kind} · owner {P.props.owner}</div>
          <h1 className="asc-page-title">{P.label}</h1>
          <p className="asc-page-sub">{P.props.bet}</p>
        </div>
        <div className="asc-head-actions">
          <span className="badge ok" title={Object.entries(gates).map(([k, v]) => `${k}: ${v}`).join('\n')}><span className="dot ok"></span>{Object.keys(gates).length} gates recorded</span>
        </div>
      </div>

      <div className="mer-tabs">
        {PHASES4.map(([k, name]) => (
          <button type="button" key={k} className={'mer-tab' + (t === k ? ' on' : '')} onClick={() => goProduct(id, k)}>
            {name}{gates[k] && <span className="tick">✓</span>}
          </button>
        ))}
      </div>

      {t === 'envision' && (<>
        <div className="mer-two">
          <div className="mer-panel"><div className="mer-k">The problem</div><p>{P.props.problem}</p></div>
          <div className="mer-panel"><div className="mer-k">The bet</div><p>{P.props.bet}</p></div>
        </div>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Success criteria</div><div className="asc-sec-sub">Baseline → target, each with an outcome tracking it in Realize</div></div>
          {scs.map(sc => (
            <div className="mer-seam" key={sc.id}>
              <span className="mer-seam-ends" style={{ minWidth: 220 }}><b>{sc.label}</b></span>
              <span className="mer-pat other">{sc.props.baseline} → {sc.props.target}</span>
              <span className="mer-seam-what">{sc.props.statement}</span>
            </div>
          ))}
        </div>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Value drivers</div></div>
          <div className="mer-journeys">
            {vds.map(vd => (
              <div className="mer-jr" key={vd.id}><b>{vd.label}</b>
                <div className="mer-jr-home">{vd.props.statement}</div>
                <div className="mer-jr-meas">measured by {scOf(vd).map(s => s.label).join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mer-two">
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">People</div></div>
            {cc.nodes('Persona').map(p => <div className="mer-health" key={p.id}><div className="mer-h-top"><b>{p.label}</b><span className="badge">persona</span></div><div className="mer-h-act">{p.props.note}</div></div>)}
            {cc.nodes('Stakeholder').map(s => <div className="mer-health" key={s.id}><div className="mer-h-top"><b>{s.label}</b><span className="badge">stakeholder</span></div><div className="mer-h-act">{s.props.stake}</div></div>)}
          </div>
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Alignment &amp; risk</div></div>
            {cc.nodes('Objective').map(o => (
              <div className="mer-panel" key={o.id}><div className="mer-k">Objective</div><p><b>{o.label}</b></p>
                {cc.out(o.id, 'has').map(e => cc.byId.get(e.to)).map(kr => (
                  <div className="mer-kr" key={kr.id}>{kr.label} <span className="mer-pat other">targets {lbl((cc.out(kr.id, 'targets')[0] || {}).to)}</span></div>
                ))}
              </div>
            ))}
            {cc.nodes('Risk').map(r => <div className="mer-health" key={r.id}><div className="mer-h-top"><b>{r.label}</b><span className="badge err">risk</span></div><div className="mer-h-act">{r.props.note}</div></div>)}
          </div>
        </div>
      </>)}

      {t === 'discover' && ucs.length === 0 && <EmptyPhase phase="discover" ns={entry.ns} />}
      {t === 'discover' && ucs.length > 0 && (<>
        {cc.nodes('Journey').map(j => (
          <div className="mer-panel" key={j.id}><div className="mer-k">The journey</div><p><b>{j.label}</b> — {j.props.note}</p></div>
        ))}
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Use cases</div><div className="asc-sec-sub">Every one belongs to the journey, has an actor, advances a driver, and cites its evidence</div></div>
          <div className="mer-subgrid">
            {ucs.map(uc => (
              <div className="mer-sub" key={uc.id} style={{ cursor: 'default' }}>
                <div className="mer-sub-top"><span className="mer-pat other">{uc.localId}</span><h3>{uc.label}</h3></div>
                <div className="mer-sub-bc">{lbl((cc.out(uc.id, 'performed_by')[0] || {}).to)} · advances {cc.out(uc.id, 'advances').map(e => lbl(e.to)).join(', ')}</div>
                <p className="mer-sub-p">{uc.props.note}</p>
                <div className="mer-sub-foot"><span>cites {cc.out(uc.id, 'cites').map(e => lbl(e.to)).join(', ') || '—'}</span></div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {t === 'design' && comps.length === 0 && <EmptyPhase phase="design" ns={entry.ns} />}
      {t === 'design' && comps.length > 0 && (<>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">The modules — furniture on the walls</div><div className="asc-sec-sub">Each component is a packaged module `part_of` exactly one context (I1 at lifecycle depth)</div></div>
          <div className="mer-subgrid">
            {comps.map(cmp => {
              const ctx = ctxOfComp(cmp);
              const frsOf = cc.out(cmp.id, 'implements').map(e => cc.byId.get(e.to));
              const skill = cc.nodes('Skill').find(s => cc.out(s.id, 'realizes').some(e => e.to === cmp.id));
              return (
                <div className="mer-sub" key={cmp.id} style={{ cursor: 'default' }}>
                  <div className="mer-sub-top"><h3>{cmp.label}</h3></div>
                  <div className="mer-sub-bc">wall: {ctx ? <button type="button" className="mer-link" onClick={() => goContext(ctx.localId)}>{ctx.label}</button> : '—'}</div>
                  <p className="mer-sub-p">{frsOf.map(f => f.label).join(' · ')}</p>
                  <div className="mer-sub-foot"><code style={{ fontSize: 10 }}>{cmp.props.code}</code>{skill && <span className="mer-pat pn">{skill.localId} · {skill.props.tier}</span>}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="mer-two">
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Decisions (ADRs)</div></div>
            {cc.nodes('Decision').filter(d => d.localId.startsWith('ADR')).map(d => (
              <div className="mer-health" key={d.id}><div className="mer-h-top"><b>{d.label}</b><span className="badge ok">{d.props.status}</span></div><div className="mer-h-act">{d.props.note}</div></div>
            ))}
            <div className="asc-sec-head" style={{ marginTop: 14 }}><div className="asc-sec-title">Contracts</div></div>
            {cc.nodes('Contract').map(k => (
              <div className="mer-health" key={k.id}><div className="mer-h-top"><b>{k.label}</b><span className="badge">{k.props.contractType} · {lbl((cc.out(k.id, 'owned_by')[0] || {}).to)}</span></div><div className="mer-h-act">{k.props.note}</div></div>
            ))}
          </div>
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Acceptance — Gherkin on every use case</div></div>
            {cc.nodes('AcceptanceTest').map(at => (
              <div className="mer-gherkin" key={at.id}>
                <div className="mer-gh-top"><b>{at.localId}</b><span>{lbl((cc.out(at.id, 'tests')[0] || {}).to)}</span><span className={'badge ' + (at.props.status === 'pass' ? 'ok' : 'err')}>{at.props.status}</span></div>
                <pre>{at.props.gherkin}</pre>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {t === 'build' && cc.nodes('DeliveryItem').length === 0 && <EmptyPhase phase="build" ns={entry.ns} />}
      {t === 'build' && cc.nodes('DeliveryItem').length > 0 && (<>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Delivery slices</div><div className="asc-sec-sub">Every use case tracked; suite green before the gate</div></div>
          {cc.nodes('DeliveryItem').map(dl => (
            <div className="mer-seam" key={dl.id}>
              <span className="mer-seam-ends" style={{ minWidth: 280 }}><b>{dl.label}</b></span>
              <span className={'badge ' + (dl.props.status === 'done' ? 'ok' : '')}>{dl.props.status}</span>
              <span className="mer-seam-what">tracks {cc.out(dl.id, 'tracks').map(e => (cc.byId.get(e.to) || {}).localId).join(', ')}</span>
            </div>
          ))}
        </div>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">As built</div><div className="asc-sec-sub">Every module carries its code ref — the no-fabrication rule (D-079)</div></div>
          {comps.map(cmp => (
            <div className="mer-seam" key={cmp.id}>
              <span className="mer-seam-ends" style={{ minWidth: 280 }}><b>{cmp.label}</b></span>
              <code style={{ fontSize: 11 }}>{cmp.props.code}</code>
              {ctxOfComp(cmp) && <span className="mer-seam-what">on {ctxOfComp(cmp).label}</span>}
            </div>
          ))}
        </div>
      </>)}

      {t === 'operate' && (cc.nodes('Slo').length > 0 ? <MerOperate cc={cc} lbl={lbl} /> : <EmptyPhase phase="build" ns={entry.ns} />)}

      {t === 'realize' && cc.nodes('Outcome').length === 0 && <EmptyPhase phase="build" ns={entry.ns} />}
      {t === 'realize' && cc.nodes('Outcome').length > 0 && (<>
        <div className="mer-panel">
          <div className="mer-k">Value rollup</div>
          <p><b>{(P.props.valueRollup || {}).annualized}</b> annualized against a {(P.props.valueRollup || {}).target} target · {(P.props.valueRollup || {}).rampQuarter} · {(P.props.valueRollup || {}).basis}</p>
        </div>
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Outcomes vs criteria</div><div className="asc-sec-sub">Mid-ramp truth with attribution shares — sourced from Operate, never asserted</div></div>
          {cc.nodes('Outcome').map(o => {
            const sc = cc.byId.get((cc.out(o.id, 'actualizes')[0] || {}).to);
            return (
              <div className="mer-seam" key={o.id}>
                <span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{sc ? sc.label : o.label}</b></span>
                <span className="mer-pat other">{o.props.current} vs {sc ? sc.props.target : '—'}</span>
                <span className="mer-seam-what">{o.props.note} {cc.out(o.id, 'attributed_to').map(e => `${(cc.byId.get(e.to) || {}).localId} ${Math.round((e.props.share || 0) * 100)}%`).join(' · ')}</span>
              </div>
            );
          })}
        </div>
        <div className="mer-two">
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Learnings</div></div>
            {cc.nodes('Learning').map(l => (
              <div className="mer-health" key={l.id}><div className="mer-h-top"><b>{l.label}</b></div><div className="mer-h-act">{l.props.note}</div></div>
            ))}
          </div>
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Go-forward</div></div>
            {cc.nodes('Decision').filter(d => d.props.decided).map(d => (
              <div className="mer-panel" key={d.id}>
                <div className="mer-h-top"><b>{d.label}</b><span className="badge ok">{d.props.status}</span></div>
                <div className="mer-h-act">Options weighed: {(d.props.options || []).join(' · ')}</div>
                <div className="mer-h-act" style={{ marginTop: 6 }}><b>Conditions:</b> {d.props.conditions}</div>
                <div className="mer-h-act" style={{ marginTop: 6 }}>informed by {cc.out(d.id, 'informed_by').map(e => (cc.byId.get(e.to) || {}).localId).join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      <DerivedStrip graph={cc.g} extra={<>gates recorded: {Object.keys(gates).length ? Object.keys(gates).map(k => `${k} ✓`).join(' · ') : 'none yet'} · <code>kg/org/products/{entry.ns}.js</code></>} />
    </div>
  );
}

/* ---------- Build/Operate/Realize entries on the PRODUCT PAGE (D-107) ----------
   The v3 product page's registers, derived from the product's OWN v4 graph —
   never another product's. Rendered via DisDesContent's v4 branch when the
   PRD carries `productId`. Entries with no v4 content return null and the
   page shows its honest phase-status empty state. */
function Kg4RealizeEntry({ cc, entry }) {
  const P = cc.nodes('Product')[0];
  if (entry === 'value') {
    const v = (P.props || {}).valueRollup;
    if (!v) return null;
    return (
      <div className="mer-panel">
        <div className="mer-k">Value rollup — from the lifecycle graph</div>
        <p><b>{v.annualized}</b> annualized against a {v.target} target · {v.rampQuarter} · {v.basis}</p>
        <div className="mer-h-act" style={{ marginTop: 6 }}>Rolls into the domain envelope trends that feed the quarterly outcome review (D-097).</div>
      </div>
    );
  }
  if (entry === 'decision') {
    return (<>
      {cc.nodes('Decision').filter(d => d.props.decided).map(d => (
        <div className="mer-panel" key={d.id}>
          <div className="mer-h-top"><b>{d.label}</b><span className="badge ok">{d.props.status}</span></div>
          <div className="mer-h-act">Options weighed: {(d.props.options || []).join(' · ')}</div>
          <div className="mer-h-act" style={{ marginTop: 6 }}><b>Conditions:</b> {d.props.conditions}</div>
        </div>
      ))}
      {cc.nodes('Learning').map(l => (
        <div className="mer-health" key={l.id}><div className="mer-h-top"><b>{l.label}</b><span className="badge">learning</span></div><div className="mer-h-act">{l.props.note}</div></div>
      ))}
    </>);
  }
  /* outcomes */
  return (<>
    {cc.nodes('Outcome').map(o => {
      const sc = cc.byId.get((cc.out(o.id, 'actualizes')[0] || {}).to);
      return (
        <div className="mer-seam" key={o.id}>
          <span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{sc ? sc.label : o.label}</b></span>
          <span className="mer-pat other">{o.props.current} vs {sc ? sc.props.target : '—'}</span>
          <span className="mer-seam-what">{o.props.note} {cc.out(o.id, 'attributed_to').map(e => `${(cc.byId.get(e.to) || {}).localId} ${Math.round((e.props.share || 0) * 100)}%`).join(' · ')}</span>
        </div>
      );
    })}
  </>);
}
function Kg4BuildEntry({ cc, entry }) {
  if (entry === 'tests') {
    return (<>
      {cc.nodes('AcceptanceTest').map(at => (
        <div className="mer-gherkin" key={at.id}>
          <div className="mer-gh-top"><b>{at.localId}</b><span>{(cc.byId.get((cc.out(at.id, 'tests')[0] || {}).to) || {}).label}</span><span className={'badge ' + (at.props.status === 'pass' ? 'ok' : 'err')}>{at.props.status}</span></div>
          <pre>{at.props.gherkin}</pre>
        </div>
      ))}
    </>);
  }
  if (entry === 'backlog') {
    const rows = cc.nodes('DeliveryItem');
    if (!rows.length) return null;
    return (<>
      {rows.map(dl => (
        <div className="mer-seam" key={dl.id}>
          <span className="mer-seam-ends" style={{ minWidth: 280 }}><b>{dl.label}</b></span>
          <span className={'badge ' + (dl.props.status === 'done' ? 'ok' : '')}>{dl.props.status}</span>
          <span className="mer-seam-what">tracks {cc.out(dl.id, 'tracks').map(e => (cc.byId.get(e.to) || {}).localId).join(', ')}</span>
        </div>
      ))}
    </>);
  }
  if (entry === 'agents') {
    /* the D-065 pairs on this product's walls, from the claims member graph */
    const ctxIds = new Set(cc.nodes('Component').map(c => (cc.byId.get((cc.out(c.id, 'part_of')[0] || {}).to) || {}).localId).filter(Boolean));
    const walls = [...ctxIds].map(id => ({ id, dep: M.depth.get(id) })).filter(w => w.dep && (w.dep.agents || []).length);
    if (!walls.length) return null;
    return (<>
      {walls.map(w => (
        <div className="asc-section" key={w.id}>
          <div className="asc-sec-head"><div className="asc-sec-title">{w.dep.node.label}</div>
            <div className="asc-sec-sub">The two agents on this wall (D-065) — <button type="button" className="mer-link" onClick={() => goContext(w.id)}>open the context page →</button></div></div>
          <div className="mer-two">
            {w.dep.agents.map(a => (
              <div className="mer-panel" key={a.id}>
                <div className="mer-h-top"><b>{a.label}</b>
                  <span className={'badge ' + (a.props.kind === 'operations' ? 'ok' : '')}>{a.props.kind === 'operations' ? `deployed · ${a.props.tier}` : 'harness · builder'}</span>
                </div>
                {a.props.knows && <div className="mer-h-act">{a.props.knows}</div>}
                {a.props.tierNote && <div className="mer-h-act" style={{ marginTop: 4 }}>{a.props.tierNote}</div>}
                {(a.props.guardrails || []).length > 0 && (
                  <div className="mer-fact stack"><span className="k">Guardrails</span><span className="v">{a.props.guardrails.map((x, i) => <div key={i}>· {x}</div>)}</span></div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>);
  }
  if (entry === 'infra') {
    /* the as-built layer (D-112): environments + resources from the graph */
    const envs = cc.nodes('Environment'), res = cc.nodes('Resource');
    if (!envs.length && !res.length) return null;
    return (<>
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">Environments</div>
          <div className="asc-sec-sub">As built — from the lifecycle graph, never hand-listed</div></div>
        {envs.map(e => (
          <div className="mer-seam" key={e.id}><span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{e.label}</b></span><span className="mer-seam-what">{e.props.note}</span></div>
        ))}
      </div>
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">Deployed resources</div>
          <div className="asc-sec-sub">What each module binds to (`uses` edges) — platform-owned rails say so</div></div>
        {res.map(r => {
          const users = cc.inn(r.id, 'uses').map(e => (cc.byId.get(e.from) || {}).localId).join(', ');
          const owner = cc.byId.get((cc.out(r.id, 'owned_by')[0] || {}).to);
          return (
            <div className="mer-seam" key={r.id}>
              <span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{r.label}</b></span>
              <span className="badge">{r.props.kind} · {r.props.engine}</span>
              <span className="mer-seam-what">used by {users}{owner ? ` · owned by ${owner.label}` : ''} — {r.props.note}</span>
            </div>
          );
        })}
      </div>
    </>);
  }
  if (entry === 'integ') {
    /* the boundary as built: the Contract nodes + the credentials that cross it */
    const cons = cc.nodes('Contract'), secs = cc.nodes('Secret');
    if (!cons.length) return null;
    return (<>
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">The boundary as built</div>
          <div className="asc-sec-sub">Every surface crossing the product wall — the graph's Contract nodes with their owning modules</div></div>
        {cons.map(k => {
          const owner = cc.byId.get((cc.out(k.id, 'owned_by')[0] || {}).to);
          return (
            <div className="mer-seam" key={k.id}>
              <span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{k.label}</b></span>
              <span className="badge">{k.props.contractType}</span>
              <span className="mer-seam-what">{owner ? `owned by ${owner.label} — ` : ''}{k.props.note}</span>
            </div>
          );
        })}
      </div>
      {secs.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Credentials at the boundary</div>
            <div className="asc-sec-sub">Who authenticates where, and the rotation each credential lives by</div></div>
          {secs.map(s => {
            const users = cc.inn(s.id, 'authenticates_with').map(e => (cc.byId.get(e.from) || {}).localId).join(', ');
            return (
              <div className="mer-seam" key={s.id}>
                <span className="mer-seam-ends" style={{ minWidth: 240 }}><b>{s.label}</b></span>
                <span className="badge">{s.props.rotation}</span>
                <span className="mer-seam-what">used by {users} — {s.props.note}</span>
              </div>
            );
          })}
        </div>
      )}
    </>);
  }
  if (entry === 'evals') {
    /* eval records on the product's skills — the promotion evidence, queryable */
    const evs = cc.nodes('Eval');
    if (!evs.length) return null;
    return (<>
      {evs.map(ev => {
        const sk = cc.byId.get((cc.out(ev.id, 'evaluates')[0] || {}).to);
        const aprs = cc.out(ev.id, 'evidences').map(e => cc.byId.get(e.to)).filter(Boolean);
        return (
          <div className="mer-panel" key={ev.id} style={{ marginBottom: 12 }}>
            <div className="mer-h-top"><b>{ev.label}</b><span className="badge ok">{ev.props.pass}</span></div>
            {sk && <div className="mer-h-act">evaluates <b>{sk.localId}</b> ({sk.props.tier}) — {sk.props.note}</div>}
            <div className="mer-fact stack"><span className="k">Dataset · runs</span><span className="v">{ev.props.dataset} · {ev.props.runs} run{ev.props.runs === 1 ? '' : 's'}</span></div>
            <div className="mer-fact stack"><span className="k">Judge</span><span className="v">{ev.props.judge}</span></div>
            {aprs.length > 0 && <div className="mer-fact stack"><span className="k">Evidences</span><span className="v">{aprs.map(a => `${a.localId} — ${a.label}`).join(' · ')}</span></div>}
            <div className="mer-fact stack"><span className="k">Note</span><span className="v">{ev.props.note}</span></div>
          </div>
        );
      })}
    </>);
  }
  return null;
}
function Kg4PhaseEntry({ phase, entry, productId }) {
  const p4 = M && M.prods4[productId];
  if (!p4) return null;
  const cc = p4.idx;
  const lbl = nId => (cc.byId.get(nId) || {}).label;
  if (phase === 'Operate') {
    const sect = { fleet: 'slos', incidents: 'incidents', approvals: 'approvals', runbooks: 'runbooks' }[entry];
    if (!sect || !cc.nodes('Slo').length) return null;
    return <MerOperate cc={cc} lbl={lbl} only={sect} />;
  }
  if (phase === 'Realize') {
    if (!cc.nodes('Outcome').length) return null;
    return <Kg4RealizeEntry cc={cc} entry={entry} />;
  }
  if (phase === 'Build') return <Kg4BuildEntry cc={cc} entry={entry} />;
  return null;
}
if (typeof window !== 'undefined') window.Kg4PhaseEntry = Kg4PhaseEntry;
/* the indexed product graph, for surfaces outside this module (D-111: the
   System-design registers derive from it) */
if (typeof window !== 'undefined') window.__kg4Product = pid => (M && M.prods4[pid]) || null;

/* ---------- ⌘K search over the v4 graphs ---------- */
const PHASE_OF_TYPE = {
  SuccessMetric: 'envision', ValueDriver: 'envision', Persona: 'envision', Stakeholder: 'envision', Objective: 'envision', KeyResult: 'envision', Risk: 'envision',
  Journey: 'discover', UseCase: 'discover', Source: 'discover',
  FunctionalRequirement: 'design', Component: 'design', Contract: 'design', Decision: 'design', AcceptanceTest: 'design', Skill: 'design', Nfr: 'design',
  DeliveryItem: 'build',
  Slo: 'operate', Incident: 'operate', Approval: 'operate', Runbook: 'operate', DataSource: 'operate',
  Outcome: 'realize', Learning: 'realize',
};
function kg4Search(needle) {
  if (!M) return [];
  const hits = [];
  const scan = (idx, graphKey) => {
    for (const n of idx.g.nodes) {
      if ((n.label || '').toLowerCase().includes(needle) || (n.localId || '').toLowerCase().includes(needle)) hits.push({ n, graphKey });
    }
  };
  scan(M.org, 'org');
  for (const [key, mg] of Object.entries(M.members || {})) if (mg.ns === key) scan(mg, key);
  for (const [pid, { idx }] of Object.entries(M.prods4)) scan(idx, 'prod:' + pid);
  const goFor = ({ n, graphKey }) => {
    if (graphKey === 'org') {
      if (n.type === 'Domain') return () => goDomain(n.localId);
      if (n.type === 'BoundedContext') return () => goContext(n.localId);
      if (n.type === 'Product') {
        if (M.prods4[n.localId]) return () => goProduct(n.localId);
        const pk = M.products.find(p => p.node.id === n.id);
        const dom = pk && pk.packages[0] && pk.packages[0].ctx ? M.ctxDomain.get(pk.packages[0].ctx.id) : null;
        return dom ? () => goDomain(dom.localId) : goChart;
      }
      if (n.type === 'Team') {
        const dom = M.org.byId.get((M.org.out(n.id, 'part_of')[0] || {}).to);
        return dom ? () => goDomain(dom.localId) : goChart;
      }
      return goChart;
    }
    if (graphKey === 'claims') {
      if (n.type === 'BoundedContext') return () => goContext(n.localId);
      const ctxId = String(n.localId).split(':')[0];
      if (ctxId.startsWith('CTX-')) return () => goContext(ctxId);
      return () => goDomain('DOM-CLAIMS');
    }
    const pid = graphKey.startsWith('prod:') ? graphKey.slice(5) : null;
    return pid ? () => goProduct(pid, PHASE_OF_TYPE[n.type] || 'envision') : goChart;
  };
  return hits.slice(0, 8).map(h => ({
    type: h.n.type, id: h.n.id, localId: h.n.localId, label: h.n.label, graphKey: h.graphKey, go: goFor(h),
  }));
}
if (typeof window !== 'undefined') window.__kg4Search = kg4Search;

/* ---------- entry ---------- */
/* ============================================================
   The organization page redesign (D-114) — left-panel sections:
   Overview · Domains · Capabilities · Platforms · Risks · Governance.
   The OVERVIEW page renders Section 1 of the reference doc
   (ddd/auto-insurance-org-model_11.html — "The value chain, and
   the domains under it") in full: the six-step chain strip
   verbatim, with each cell clickable into the graph-backed
   domain pages, and the derived domain cards beneath it.
   ============================================================ */
const CHAIN_STRIP = [
  { step: 'Design the product', dom: 'Product & Pricing', id: 'DOM-PRICING',
    ex: 'Coverages, forms, endorsements, rating algorithm, rate and rule filings' },
  { step: 'Reach the buyer', dom: 'Distribution & Quoting', id: 'DOM-DISTRIBUTION',
    ex: 'Broker portal, direct funnel, aggregators, quote, commissions' },
  { step: 'Select and bind', dom: 'Underwriting & Policy', id: 'DOM-UW-POLICY',
    ex: 'Risk selection, referrals, bind, endorsements, renewal, cancellation' },
  { step: 'Collect the premium', dom: 'Billing & Money Movement', id: 'DOM-BILLING',
    ex: 'Instalments, collections, non-payment, disbursements, commission payout' },
  { step: 'Pay the loss', dom: 'Claims', id: 'DOM-CLAIMS',
    ex: 'FNOL, coverage decision, estimating, repair, total loss, accident benefits' },
  { step: 'Recover and learn', dom: 'Claims (recovery) + Data', id: 'DOM-CLAIMS',
    ex: 'Subrogation, salvage, fraud, loss experience feeding pricing' },
];

/* D-132: the verbatim chart's labels → live workspaces (event delegation keeps
   the embedded HTML byte-for-byte) */
const REF_DOM = { 'Product & Pricing': 'DOM-PRICING', 'Distribution & Quoting': 'DOM-DISTRIBUTION', 'Underwriting & Policy': 'DOM-UW-POLICY', 'Claims': 'DOM-CLAIMS', 'Billing & Money Movement': 'DOM-BILLING' };
const REF_CH = { 'Product management': 'CH-PM', 'Engineering': 'CH-ENG', 'Design & research': 'CH-DESIGN', 'Data & actuarial': 'CH-DATA', 'First-line risk & compliance': 'CH-RISK' };
function refchartClick(e) {
  let el = e.target;
  for (let hop = 0; el && hop < 4; hop++, el = el.parentElement) {
    const label = String(el.innerText || '').split('\n')[0].trim();
    if (REF_DOM[label]) { goDomain(REF_DOM[label]); return; }
    if (REF_CH[label]) { goChapter(REF_CH[label]); return; }
  }
}

function MerOverview() {
  if (!M) return <div className="asc-page"><div className="asc-panel asc-panel-pad">The v4 graphs are not generated yet — run <code>node kg/generate-v4.js</code>.</div></div>;
  const orgNode = M.org.byLocal.get('ORG');
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · overview</div>
          <h1 className="asc-page-title">{orgNode.label}</h1>
          <p className="asc-page-sub">How Meridian is structured: the value chain and the domains that own it, the chapters that staff them, and the platform band they stand on.</p>
          <div className="ovw-stats">
            <button type="button" className="ovw-stat click" onClick={() => goSec('domains')}><b>{M.domains.filter(d => d.node.props.kind === 'stream').length}</b><span>stream domains</span></button>
            <button type="button" className="ovw-stat click" onClick={() => goSec('domains')}><b>{M.org.nodes('BoundedContext').length}</b><span>subdomains</span></button>
            <button type="button" className="ovw-stat click" onClick={() => goSec('domains')}><b>{M.org.nodes('Team').length}</b><span>durable teams</span></button>
            <button type="button" className="ovw-stat click" onClick={() => goSec('domains')}><b>{M.products.length}</b><span>products</span></button>
            <button type="button" className="ovw-stat click" onClick={goChapters}><b>{M.chapters.length}</b><span>chapters</span></button>
            <button type="button" className="ovw-stat click" onClick={goChapters}><b>≈270</b><span>prod &amp; eng seats</span></button>
          </div>
        </div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">The value chain, and the domains under it</div>
          <div className="asc-sec-sub">How the business earns and pays out — and the domain accountable for each step. Every cell opens its domain workspace.</div>
        </div>
        <div className="ovw-strip">
          {CHAIN_STRIP.map((c, i) => (
            <button type="button" className="ovw-cs click" key={i} onClick={() => goDomain(c.id)}>
              <span className="step">{c.step}</span>
              <span className="dom">{c.dom}</span>
              <span className="ex">{c.ex}</span>
            </button>
          ))}
        </div>
      </div>

      {/* D-116: the MATRIX renders verbatim (markup + reference palette);
          D-122: the doc bands below it (.band/.platnote/.legend/.standing) hide,
          re-designed as the dashboard sections that follow. */}
      {typeof window !== 'undefined' && window.__REFCHART__ && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">The chart — domains × chapters</div>
            <div className="asc-sec-sub">Columns are the domain groups: durable, cross-functional, persistently funded, one named owner each. Rows are the chapters that supply people and set craft standards. Counts are product &amp; engineering seats — the operational workforce sits inside each domain's operations leg.</div>
          </div>
          <div className="ovw-evnote">
            The sponsor's own chart, embedded byte-for-byte as evidence <b>S2</b> (captured 2026-08-16). It is a historical artifact — the org has evolved since, so its counts may drift from the spec. Live derived counts: <button type="button" className="mer-link" onClick={() => goSec('domains')}>the Domains page →</button>. Domain and chapter names on the chart open their live workspaces.
          </div>
          <div className="ovw-refchart" onClick={refchartClick} dangerouslySetInnerHTML={{ __html: window.__REFCHART__.html }} />
        </div>
      )}

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">The platform band</div>
          <div className="asc-sec-sub">Six internal products whose customers are the stream teams — funded as products, measured on adoption. Vendor licences sit behind these teams, never in place of them.</div>
        </div>
        <div className="ovw-mini">
          {(M.domains.find(d => d.node.props.kind === 'platform') || { contexts: [] }).contexts.map(c => {
            const dep = M.depth.get(c.localId);
            return (
              <div className="ovw-minicard" key={c.id}>
                <b>{c.label}</b>
                <span>{dep ? dep.node.props.purpose : (c.props.publishes || '')}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Specialist teams</div>
          <div className="asc-sec-sub">Two team shapes beside the streams and the band — each with a different survival rule.</div>
        </div>
        <div className="ovw-mini2">
          <div>
            <p className="ovw-subhead">Complicated-subsystem teams — justify each one</p>
            <div className="ovw-mini" style={{ gridTemplateColumns: '1fr' }}>
              <div className="ovw-minicard"><b>Rating engine</b><span>Deterministic pricing execution — deep actuarial-engineering expertise behind a clean interface.</span></div>
              <div className="ovw-minicard"><b>Fraud &amp; triage models</b><span>The model families behind claim triage and fraud signals — data-science depth the stream teams consume.</span></div>
              <div className="ovw-minicard"><b>Reserving &amp; actuarial modelling</b><span>Reserve adequacy and indication models with their own craft and governance.</span></div>
            </div>
          </div>
          <div>
            <p className="ovw-subhead">Enabling teams — time-boxed, should shrink</p>
            <div className="ovw-mini" style={{ gridTemplateColumns: '1fr' }}>
              <div className="ovw-minicard"><b>Security engineering</b><span>Raises the streams' security practice, then steps back.</span></div>
              <div className="ovw-minicard"><b>SRE coaching</b><span>Operational maturity coaching for the stream teams — success is not being needed.</span></div>
              <div className="ovw-minicard"><b>Legacy policy admin decomposition</b><span>Guides the strangler burn-down; retires with the legacy system.</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Standing functions</div>
          <div className="asc-sec-sub">First-line control organizations that operate OUTSIDE the domain matrix — they run controls, workforces and technology of their own, on the platform band's paved roads.</div>
        </div>
        <div className="ovw-mini">
          <div className="ovw-minicard"><b>CISO office</b><span>Policy, standards and security architecture — owns the requirement and the control.</span></div>
          <div className="ovw-minicard"><b>SOC / security operations</b><span>The 24/7 operational workforce — first line, not assurance.</span></div>
          <div className="ovw-minicard"><b>Security engineering &amp; tooling</b><span>Deploys through the developer platform, so the function never drifts into a parallel IT shop.</span></div>
        </div>
      </div>

      {/* D-135 (option 1): the three-lines story lives on the Risk & compliance
          chapter workspace; the Overview keeps one clickable pointer */}
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Outside the matrix — independent assurance</div>
          <div className="asc-sec-sub">Who operates a control and who oversees it must be two different names on this chart.</div>
        </div>
        <div className="ovw-mini" style={{ gridTemplateColumns: '1fr' }}>
          <div className="ovw-minicard click" role="button" tabIndex={0} onClick={() => goChapter('CH-RISK')}>
            <b>The three lines of risk &amp; compliance →</b>
            <span>The first line sits INSIDE the matrix — the Risk &amp; compliance chapter's embedded seats in the stream teams. The second line (independent risk, compliance, actuarial, model validation) and third line (internal audit) keep their own solid lines outside every domain. The full story, line by line, lives on the chapter's workspace.</span>
          </div>
        </div>
      </div>

      <DerivedStrip graph={M.org.g} extra={<>value chain + matrix from the org model · platform band and counts derived from <code>meridian:*</code></>} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerOverview = MerOverview;

/* the Domains entry (D-116): the detailed domain cards, clickable → the domain pages */
function MerDomains() {
  if (!M) return null;
  const streamDomains = M.domains.filter(d => d.node.props.kind === 'stream');
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · domains</div>
          <h1 className="asc-page-title">Domains</h1>
          <p className="asc-page-sub">Durable, cross-functional, persistently funded, one named accountable owner each — derived live from the org graph. Open a domain for its executive, funding rhythm, subdomains and portfolio.</p>
        </div>
      </div>
      <div className="asc-section">
        <div className="ovw-domcards">
          {streamDomains.map(d => (
            <button type="button" className="ovw-domcard click" key={d.node.id} onClick={() => goDomain(d.node.localId)}>
              <div className="ovw-dc-top"><b>{d.node.label}</b><span className="badge">{d.node.props.valueChainStep}</span></div>
              <div className="ovw-dc-sum">{d.node.props.summary}</div>
              <div className="ovw-dc-meta">
                <span>{d.node.props.owner}</span>
                <span>{d.contexts.length} contexts · {d.teams.length} teams</span>
              </div>
              {(d.node.props.standingMeasures || []).length > 0 && (
                <div className="mer-oms" style={{ marginTop: 8 }}>{d.node.props.standingMeasures.map(m => <span className="mer-om" key={m}>{m}</span>)}</div>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* D-118: domain cards only — the platform band lives under Platforms; the
          derived two-axis chart keeps its page at sub=chart (URL-addressable). */}
    </div>
  );
}
if (typeof window !== 'undefined') window.MerDomains = MerDomains;

/* the Platforms section: the platform band as a first-class page */
function MerPlatforms() {
  if (!M) return null;
  const plat = M.domains.find(d => d.node.props.kind === 'platform');
  if (!plat) return null;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · platforms</div>
          <h1 className="asc-page-title">{plat.node.label}</h1>
          <p className="asc-page-sub">{plat.node.props.summary}</p>
        </div>
      </div>
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">The platform contexts</div>
          <div className="asc-sec-sub">X-as-a-Service by default: published capability, consumed as a service, packaged by zero products (I4) — each opens its context page</div>
        </div>
        <div className="ovw-domcards">
          {plat.contexts.map(c => {
            const dep = M.depth.get(c.localId);
            return (
              <button type="button" className="ovw-domcard" key={c.id} onClick={() => goContext(c.localId)}>
                <div className="ovw-dc-top"><b>{c.label}</b><Chip c={c.props.classification} /></div>
                <div className="ovw-dc-sum">{dep ? dep.node.props.purpose : (c.props.publishes || '')}</div>
                {dep && <div className="ovw-dc-meta"><span>{dep.team ? dep.team.label : ''}</span><span>{dep.models.length} model{dep.models.length === 1 ? '' : 's'} · {(dep.agents || []).length} agents</span></div>}
              </button>
            );
          })}
        </div>
      </div>
      <DerivedStrip graph={(M.members.platform || M.org).g} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerPlatforms = MerPlatforms;

/* the domain's Context map page (D-119): every typed seam touching the
   domain's contexts, from the org graph's context map */
function MerDomainMap({ id }) {
  if (!M) return null;
  const d = M.domains.find(x => x.node.localId === id);
  if (!d) return null;
  /* derive from the MEMBER graph's typed contracts — far richer than the
     org-level map slice: every consume/publish per subdomain, with pattern
     and mechanism (D-119). */
  const member = M.members[id];
  const rows = [];
  if (member) {
    for (const c of member.nodes('BoundedContext')) {
      for (const e of [...member.out(c.id, 'consumes'), ...member.out(c.id, 'publishes_to')]) {
        const k = member.byId.get(e.to);
        if (!k || k.type !== 'Contract') continue;
        const cp = member.byId.get((member.out(k.id, 'with')[0] || {}).to);
        const ends = k.props.dir === 'consumes' ? { from: cp, to: c } : { from: c, to: cp };
        rows.push({ ...ends, pattern: k.props.pattern, what: k.props.mechanism, cpType: cp ? cp.type : null });
      }
    }
  }
  const isInternal = r => r.from && r.to && r.from.type === 'BoundedContext' && r.to.type === 'BoundedContext';
  const seen = new Set();
  const internal = rows.filter(isInternal).filter(r => {
    const key = [r.from.localId, r.to.localId].sort().join('|') + '|' + r.pattern;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const crossing = rows.filter(r => !isInternal(r));
  const Row = (s, i) => (
    <div className="mer-seam" key={i}>
      <span className="mer-seam-ends">
        <b className={s.from && s.from.type === 'External' ? 'ext' : ''}>{s.from ? s.from.label : '—'}</b>
        <span className="mer-arrow">→</span>
        <b className={s.to && s.to.type === 'External' ? 'ext' : ''}>{s.to ? s.to.label : '—'}</b>
      </span>
      <Pattern p={s.pattern} />
      <span className="mer-seam-what">{s.what}</span>
    </div>
  );
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">{d.node.label} · context map</div>
          <h1 className="asc-page-title">Context map</h1>
          <p className="asc-page-sub">How {d.node.label}'s subdomains relate — every standing relationship typed by pattern; upstream on the left. Open a subdomain from the left menu for its full element.</p>
        </div>
      </div>
      {member && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">The map</div>
            <div className="asc-sec-sub">Subdomains and the published events crossing each seam — same visual language as the product maps</div></div>
          <div style={{ height: '560px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
            <FlowEmbed flowId={`dm-${member.ns}`} variant="contextmap" />
          </div>
        </div>
      )}

      {internal.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Inside the domain</div>
            <div className="asc-sec-sub">Seams between this domain's own subdomains</div></div>
          <div className="mer-map">{internal.map(Row)}</div>
        </div>
      )}
      <div className="asc-section">
        <div className="asc-sec-head"><div className="asc-sec-title">Crossing the domain wall</div>
          <div className="asc-sec-sub">Seams to other domains, the platform band and externals</div></div>
        <div className="mer-map">{crossing.map(Row)}</div>
      </div>
      <DerivedStrip graph={member ? member.g : M.org.g} extra={<>typed contracts from the {d.node.label} member graph</>} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerDomainMap = MerDomainMap;

/* the domain's System map page (D-120): the domain as one expandable box in
   its world — actors, subdomains inside, external systems around it */
function MerDomainSystem({ id }) {
  if (!M) return null;
  const d = M.domains.find(x => x.node.localId === id);
  const member = M.members[id];
  if (!d || !member) return null;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">{d.node.label} · system map</div>
          <h1 className="asc-page-title">System map</h1>
          <p className="asc-page-sub">{d.node.label} in its world — who acts on it and which systems feed and consume it. Select the domain box and hit the expand arrow to see the subdomains in place.</p>
        </div>
      </div>
      <div className="asc-section">
        <div style={{ height: '560px', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', overflow: 'hidden', position: 'relative', background: 'var(--panel)' }}>
          <FlowEmbed flowId={`ds-${member.ns}`} variant="contextmap" />
        </div>
      </div>
      <DerivedStrip graph={member.g} extra={<>the {d.node.label} member graph backs the detail; the map mirrors its seams</>} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerDomainSystem = MerDomainSystem;

/* ============================================================
   Chapters — skill management (D-124). Renamed from the Capabilities
   scaffold: chapters are the craft/discipline axis that actually
   supplies and develops skill (owns craft standards, staffs teams),
   distinct from the core/supporting/generic capability classification
   which stays a property surfaced elsewhere (the chart, context chips).
   Five sections, all derived — no person-level data invented:
     1 Chapters roster        — M.org Chapter nodes (owns/size/allocation)
     2 Skill catalog          — every Skill node across every product graph,
                                 cross-referenced to the agent that carries it
     3 Coverage matrix        — chapters × Claims subdomains: is the chapter
                                 represented (org graph `staffs` edges), and
                                 is there an agent skill on that wall
     4 Agent-skill whitespace — Claims contexts with no skill node, or
                                 stuck at Suggest — candidates for more
     5 Coverage stats         — Claims headcount grouped by agent tier
                                 (counts the WHOLE team behind a wall, not
                                 measured time-on-task — labelled as such)
   Sections 3–5 scope to Claims (the only domain with full agent-pair +
   skill depth); 1–2 read org-wide and stay honestly thin elsewhere.
   ============================================================ */
function chaptersModel() {
  const claimsMember = M.members['DOM-CLAIMS'];
  const claimsCtxIds = claimsMember ? claimsMember.nodes('BoundedContext').map(c => c.localId) : [];

  /* skill localId -> { agent, ctxLocalId } — scan every member graph's
     operations agents once, keyed by the shared skill id (the v4 seam rule) */
  const skillToAgent = new Map();
  for (const mg of new Set(Object.values(M.members))) {
    for (const a of mg.nodes('Agent')) {
      if (a.props.kind !== 'operations') continue;
      const ctx = mg.byId.get((mg.out(a.id, 'serves')[0] || {}).to);
      for (const sk of (a.props.skills || [])) skillToAgent.set(sk, { agent: a, ctxLocalId: ctx ? ctx.localId : null, member: mg });
    }
  }

  /* every Skill node across every product's lifecycle graph */
  const allSkills = [];
  for (const [pid, { idx }] of Object.entries(M.prods4)) {
    for (const sk of idx.nodes('Skill')) {
      const comp = idx.byId.get((idx.out(sk.id, 'realizes')[0] || {}).to);
      allSkills.push({ sk, pid, prodName: (idx.nodes('Product')[0] || {}).label || pid, comp, carrier: skillToAgent.get(sk.localId) });
    }
  }

  /* chapters staffing a context, via the ORG graph's staffs edges (the same
     source of truth the two-axis chart's bars read from) */
  const chaptersAt = ctxLocalId => {
    const ctxNode = M.org.byLocal.get(ctxLocalId);
    const teamTo = ctxNode ? (M.org.out(ctxNode.id, 'owned_by')[0] || {}).to : null;
    return teamTo ? M.org.inn(teamTo, 'staffs').map(e => M.org.byId.get(e.from)).filter(Boolean) : [];
  };

  /* D-125: the named-seat roster (supply side) — org graph Person nodes,
     joined to a wall via its owning team's member_of edges */
  const rosterAt = ctxLocalId => {
    const ctxNode = M.org.byLocal.get(ctxLocalId);
    const teamTo = ctxNode ? (M.org.out(ctxNode.id, 'owned_by')[0] || {}).to : null;
    return teamTo ? M.org.inn(teamTo, 'member_of').map(e => M.org.byId.get(e.from)).filter(Boolean) : [];
  };
  const LEVEL_RANK = { foundational: 0, intermediate: 1, advanced: 2 };

  /* the demand side — every Competency across the product mesh, correlated
     against the roster via the shared assistedBy Skill id (the same seam
     rule the skill catalog above already uses) */
  const competencies = [];
  for (const [pid, { idx }] of Object.entries(M.prods4)) {
    for (const cp of idx.nodes('Competency')) {
      const skill = idx.byId.get((idx.out(cp.id, 'assisted_by')[0] || {}).to);
      const comp = skill ? idx.byId.get((idx.out(skill.id, 'realizes')[0] || {}).to) : null;
      const ctxRef = comp ? idx.byId.get((idx.out(comp.id, 'part_of')[0] || {}).to) : null;
      const ctxLocalId = ctxRef ? ctxRef.localId : null;
      const seats = ctxLocalId ? rosterAt(ctxLocalId) : [];
      const holders = seats
        .map(p => ({ p, s: (p.props.skills || []).find(s => s.assistedBy === (skill && skill.localId)) }))
        .filter(x => x.s);
      const filled = holders.filter(({ s }) => (LEVEL_RANK[s.level] ?? -1) >= (LEVEL_RANK[cp.props.minLevel] ?? 0));
      competencies.push({ cp, skill, ctxLocalId, pid, holders, filled });
    }
  }

  const claimsCtxNodes = claimsCtxIds.map(id => ({ id, node: claimsMember.byLocal.get(id) }));
  const tierRank = { Suggest: 0, Assist: 1, Operate: 2, Codify: 3 };

  /* stat 5: Claims headcount grouped by ops-agent tier */
  const tierStats = {};
  for (const { id } of claimsCtxNodes) {
    const dep = M.depth.get(id);
    const ops = (dep && dep.agents || []).find(a => a.props.kind === 'operations');
    const tier = ops ? ops.props.tier : 'none';
    const size = dep && dep.team ? Number(dep.team.props.size) || 0 : 0;
    if (!tierStats[tier]) tierStats[tier] = { people: 0, walls: 0 };
    tierStats[tier].people += size; tierStats[tier].walls += 1;
  }
  const totalPeople = Object.values(tierStats).reduce((s, t) => s + t.people, 0);
  return { claimsMember, skillToAgent, allSkills, chaptersAt, rosterAt, LEVEL_RANK, competencies, claimsCtxNodes, tierRank, tierStats, totalPeople };
}

/* D-126 nav: the chapter workspace lives at sub=chapters & chp=<id> */
const goChapter = id => { window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'chapters', chp: id, phase: 'Envision', entry: 'overview', ctx: null, tab: 'flow' }); setTimeout(() => document.querySelector('.asc-main')?.scrollTo(0, 0), 0); };
const goChapters = () => { window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'chapters', phase: 'Envision', entry: 'overview', ctx: null, tab: 'flow' }); setTimeout(() => document.querySelector('.asc-main')?.scrollTo(0, 0), 0); };
/* D-132: overview click-through — any org rail section by name */
const goSec = s => { window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: s, phase: 'Envision', entry: 'overview', ctx: null, tab: 'flow' }); setTimeout(() => document.querySelector('.asc-main')?.scrollTo(0, 0), 0); };

/* the sections, each standalone so the index and the chapter workspace compose them (D-126) */
function ChSecRoster() {
  return (
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title">Chapters roster</div>
        <div className="asc-sec-sub">Craft standards, indicative headcount and allocation rule — select a chapter to open its workspace</div>
      </div>
        <div className="mer-units">
          {M.chapters.map(({ node: ch, staffed }) => (
            <div className="mer-unit click" key={ch.id} role="button" tabIndex={0} onClick={() => goChapter(ch.localId)}>
              <div className="mer-u-top"><b>{ch.label}</b><span className="mer-u-size">{ch.props.size}</span></div>
              <div className="mer-u-shape">{ch.props.owns}</div>
              <div className="mer-u-note">{ch.props.allocation} · staffs {staffed} team{staffed === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
    </div>
  );
}
function ChSecCatalog() {
  const { allSkills } = chaptersModel();
  return (
      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Skill catalog</div>
          <div className="asc-sec-sub">Every agent skill recorded across the product mesh — tier, what it realizes, who carries it. Thin outside Claims by design (honest depth).</div>
        </div>
        <div className="mer-map">
          {allSkills.map(({ sk, prodName, comp, carrier }) => (
            <div className="mer-seam" key={sk.id}>
              <span className="mer-seam-ends"><b>{sk.label}</b></span>
              <span className={'badge ' + (sk.props.tier === 'Operate' || sk.props.tier === 'Codify' ? 'ok' : '')}>{sk.props.tier}</span>
              <span className="mer-seam-what">
                {prodName}{comp ? ` · realizes ${comp.label}` : ''}
                {carrier && carrier.ctxLocalId ? <> · carried by <button type="button" className="mer-link" onClick={() => goContext(carrier.ctxLocalId)}>{carrier.agent.label} →</button></> : ' · no deployed carrier on record'}
                {sk.props.note ? <> — {sk.props.note}</> : ''}
              </span>
            </div>
          ))}
          {allSkills.length === 0 && <div className="ddd-empty-inline">No skills authored yet.</div>}
        </div>
      </div>
  );
}
function ChSecMatrix({ hi }) {
  const { claimsMember, claimsCtxNodes, chaptersAt } = chaptersModel();
  return claimsMember ? (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Coverage matrix — Claims</div>
            <div className="asc-sec-sub">Which chapters are represented on each subdomain (org graph <code>staffs</code> edges), and whether an agent skill already covers part of the work there</div>
          </div>
          <table className="dm-tbl mer-covmatrix">
            <thead><tr><th>chapter</th>{claimsCtxNodes.map(c => <th key={c.id}>{c.node.label}</th>)}</tr></thead>
            <tbody>
              {M.org.nodes('Chapter').map(ch => (
                <tr key={ch.id} className={hi === ch.localId ? 'hi' : ''}>
                  <td className="mer-covrow-h">{ch.label}</td>
                  {claimsCtxNodes.map(c => {
                    const here = chaptersAt(c.id).some(x => x.id === ch.id);
                    const dep = M.depth.get(c.id);
                    const ops = (dep && dep.agents || []).find(a => a.props.kind === 'operations');
                    const hasSkill = ops && (ops.props.skills || []).length > 0;
                    return (
                      <td key={c.id} className={'mer-covcell' + (here ? ' on' : '')}>
                        {here ? '●' : '—'}
                        {here && hasSkill && <span className="mer-covskill" title={`${ops.label} · ${ops.props.tier}`}>{ops.props.tier[0]}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mer-covlegend">● chapter represented (org graph) · letter badge = an agent skill is deployed on that wall, tier initial (S·A·O·C)</div>
        </div>
  ) : null;
}
function ChSecTeamRoster({ hi }) {
  const { claimsMember, claimsCtxNodes, rosterAt } = chaptersModel();
  return claimsMember ? (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Team roster — Claims</div>
            <div className="asc-sec-sub">Named illustrative seats standing in for each wall's real roster — not real individuals, same footing as the persona set. One per chapter the team lists, the craft skill each holds, and whether an agent skill already assists that slice of their work.</div>
          </div>
          <div className="mer-roster-grid">
            {claimsCtxNodes.map(({ id, node }) => {
              const seats = rosterAt(id);
              if (!seats.length) return null;
              return (
                <div className="mer-roster-ctx" key={id}>
                  <div className="mer-roster-ctx-h">{node.label}</div>
                  <div className="mer-roster-seats">
                    {seats.flatMap(p => (p.props.skills || []).map((s, i) => (
                      <div className={'mer-seat' + (hi && p.props.chapter === hi ? ' hi' : '')} key={p.id + '-' + i}>
                        <div className="mer-seat-top"><b>{p.label}</b><span className="mer-seat-role">{p.props.role}</span></div>
                        <div className="mer-seat-skill">
                          <span className={'badge ' + (s.kind === 'technical' ? 'info' : 'violet')}>{s.kind}</span>
                          {s.name} <span className="mer-seat-level">· {s.level}</span>
                          {s.assistedBy && <span className="mer-covskill" title={`agent-assisted · ${s.assistedBy}`}>A</span>}
                        </div>
                      </div>
                    )))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  ) : null;
}
function ChSecCoverageReq() {
  const { claimsMember, competencies } = chaptersModel();
  return claimsMember && competencies.length > 0 ? (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Skill coverage requirement — Claims</div>
            <div className="asc-sec-sub">What the product needs proven human proficiency for, correlated against who on the roster actually clears the bar — the gap an aggregate chapter count can hide</div>
          </div>
          <div className="mer-map">
            {competencies.map(({ cp, skill, ctxLocalId, filled }) => {
              const need = Number(cp.props.minHeadcount) || 1;
              const ok = filled.length >= need;
              const ctxNode = ctxLocalId ? M.org.byLocal.get(ctxLocalId) : null;
              return (
                <div className="mer-seam" key={cp.id}>
                  <span className="mer-seam-ends"><b>{cp.label}</b></span>
                  <span className={'badge ' + (ok ? 'ok' : 'warn')}>{filled.length} of {need} · {cp.props.minLevel}+</span>
                  <span className="mer-seam-what">
                    {ctxNode && <button type="button" className="mer-link" onClick={() => goContext(ctxLocalId)}>{ctxNode.label} →</button>}
                    {skill ? <> · assists {skill.label}</> : ' · no deployed agent skill on record'}
                    {filled.length
                      ? <> · held by {filled.map(({ p }) => p.label).join(', ')}</>
                      : ' · no one on the roster currently clears the bar'}
                    {cp.props.note ? <> — {cp.props.note}</> : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
  ) : null;
}
function ChSecWhitespace() {
  const { claimsMember, claimsCtxNodes } = chaptersModel();
  return claimsMember ? (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Agent-skill whitespace — Claims</div>
            <div className="asc-sec-sub">Walls with no recorded skill, or stuck at the lowest tier — candidates for the next agent-skill investment</div>
          </div>
          <div className="mer-map">
            {claimsCtxNodes
              .map(c => {
                const dep = M.depth.get(c.id);
                const ops = (dep && dep.agents || []).find(a => a.props.kind === 'operations');
                return { c, ops };
              })
              .filter(({ ops }) => !ops || (ops.props.tier === 'Suggest') || !(ops.props.skills || []).length)
              .map(({ c, ops }) => (
                <div className="mer-seam" key={c.id}>
                  <span className="mer-seam-ends"><b>{c.node.label}</b></span>
                  <span className="badge">{ops ? ops.props.tier : 'no agent'}</span>
                  <span className="mer-seam-what">
                    {ops ? <>{ops.label} — {(ops.props.acts || []).slice(0, 2).join('; ')}{!(ops.props.skills || []).length ? ' · no formal skill node authored yet' : ''}</> : 'No operations agent recorded on this wall.'}
                  </span>
                </div>
              ))}
          </div>
        </div>
  ) : null;
}
function ChSecStats() {
  const { claimsMember, tierRank, tierStats, totalPeople } = chaptersModel();
  return claimsMember && totalPeople > 0 ? (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Coverage stats — Claims</div>
            <div className="asc-sec-sub">Headcount behind each wall, grouped by the agent tier deployed there — counts the whole team behind a wall, not measured time-on-task</div>
          </div>
          <div className="ovw-stats">
            {Object.entries(tierStats).sort((a, b) => (tierRank[b[0]] ?? -1) - (tierRank[a[0]] ?? -1)).map(([tier, s]) => (
              <div className="ovw-stat" key={tier}><b>{s.people}</b><span>{tier} · {s.walls} wall{s.walls === 1 ? '' : 's'}</span></div>
            ))}
            <div className="ovw-stat"><b>{totalPeople}</b><span>total, 7 walls</span></div>
          </div>
        </div>
  ) : null;
}

/* the Chapters index (D-126): the roster only — each card opens its chapter workspace */
function MerChapters() {
  if (!M) return null;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · chapters</div>
          <h1 className="asc-page-title">Chapters</h1>
          <p className="asc-page-sub">The craft axis: who supplies and develops a skill, correlated with where product work needs it and where an agent skill already carries part of it. Select a chapter to open its workspace — the skill catalog and the per-domain coverage views live inside.</p>
        </div>
      </div>
      <ChSecRoster />
      <DerivedStrip graph={M.org.g} extra={<>chapters + staffs edges from <code>meridian:*</code></>} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerChapters = MerChapters;

/* the chapter workspace (D-126): Overview = the skill catalog (the roster
   stays on the index — re-showing it inside a chapter was redundant, sponsor
   polish); Domains = the five coverage sections in tabs (Claims depth today). */
const CH_DOM_TABS = [
  { key: 'matrix', label: 'Coverage matrix' },
  { key: 'team', label: 'Team roster' },
  { key: 'req', label: 'Skill coverage requirement' },
  { key: 'white', label: 'Agent-skill whitespace' },
  { key: 'stats', label: 'Coverage stats' },
];
function MerChapterPage({ id, view }) {
  const [tab, setTab] = useState('matrix');
  useEffect(() => { setTab('matrix'); }, [id, view]);
  if (!M) return null;
  const ch = M.org.byLocal.get(id);
  if (!ch || ch.type !== 'Chapter') return <div className="asc-page"><div className="asc-panel asc-panel-pad">Unknown chapter. <button type="button" className="mer-link" onClick={goChapters}>Back to chapters</button></div></div>;
  const staffed = M.org.out(ch.id, 'staffs').length;
  return (
    <div className="asc-page">
      <div className="mer-crumb"><button type="button" className="mer-link" onClick={goChapters}>Chapters</button> / <b>{ch.label}</b></div>
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · chapter{view === 'domains' ? ' · domains' : ''}</div>
          <h1 className="asc-page-title">{ch.label}</h1>
          <p className="asc-page-sub">{ch.props.owns}</p>
        </div>
      </div>
      <div className="mer-facts">
        <div className="mer-fact"><span className="k">Headcount</span><span className="v">{ch.props.size}</span></div>
        {ch.props.allocation && <div className="mer-fact"><span className="k">Allocation rule</span><span className="v">{ch.props.allocation}</span></div>}
        <div className="mer-fact"><span className="k">Staffs</span><span className="v">{staffed} team{staffed === 1 ? '' : 's'} across the org</span></div>
      </div>
      {view === 'domains' && (
        <div className="ddd-tabs">
          {CH_DOM_TABS.map(t => (
            <button key={t.key} type="button" className={'ddd-tab' + (tab === t.key ? ' on' : '')} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
      )}
      {/* D-135: the risk chapter is the navigable home of the whole three-lines
          story — line 1 IS this chapter; lines 2/3 are independent and only
          DESCRIBED here, never staffed here */}
      {view !== 'domains' && id === 'CH-RISK' && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">The three lines</div>
            <div className="asc-sec-sub">Who operates a control and who oversees it must be two different names. This chapter is the first line; the other two keep their own solid lines, outside every domain.</div>
          </div>
          <div className="ovw-mini">
            <div className="ovw-minicard"><b>First line — this chapter</b><span>Embedded control seats inside the stream teams: in-flow controls, regulatory clocks (SABS, statutory notice), evidence discipline. Solid line to the domain, craft line here. The standing security functions (CISO office, SOC) are first line too.</span></div>
            <div className="ovw-minicard"><b>Second line — independent risk &amp; compliance <span className="badge">independent · not staffed here</span></b><span>Risk, compliance, the actuarial function and security risk oversight. Model validation lives here and stays here — the rating engine and fraud models are exactly the assets a regulator will ask about.</span></div>
            <div className="ovw-minicard"><b>Third line — internal audit <span className="badge">independent · not staffed here</span></b><span>Independent assurance over the first and second lines, with its own solid line to the board. The appointed actuary keeps a statutory solid line of the same kind.</span></div>
          </div>
        </div>
      )}
      {view !== 'domains' && <ChSecCatalog />}
      {view === 'domains' && tab === 'matrix' && <ChSecMatrix hi={id} />}
      {view === 'domains' && tab === 'team' && <ChSecTeamRoster hi={id} />}
      {view === 'domains' && tab === 'req' && <ChSecCoverageReq />}
      {view === 'domains' && tab === 'white' && <ChSecWhitespace />}
      {view === 'domains' && tab === 'stats' && <ChSecStats />}
      <DerivedStrip graph={M.org.g} extra={<>chapters + staffs edges from <code>meridian:*</code> · skills from every product's lifecycle graph · roster (Person) and requirement (Competency) from D-125</>} />
    </div>
  );
}
if (typeof window !== 'undefined') window.MerChapterPage = MerChapterPage;

/* honest scaffolds for the sections the redesign has not reached yet */
const ORG_SECTION_NOTES = {
  risks: {
    title: 'Risks',
    sub: 'The organization’s risk registers, rolled up.',
    note: 'This section arrives with a later redesign pass. Today risks live per product (each lifecycle spec carries its risk register) and per domain (postures and watch items on the context pages).',
    linkLabel: 'Open a product risk register →', target: () => goProduct('PROD-CLAIMSCORE', 'envision'),
  },
  governance: {
    title: 'Governance',
    sub: 'Gates, approvals, funding rhythm and the trust ladder.',
    note: 'This section arrives with a later redesign pass. Today governance runs in the machinery: phase gates on every product, approval queues with human-reserved decisions, and the quarterly outcome reviews on every domain page.',
    linkLabel: 'Open the Claims funding rhythm →', target: () => goDomain('DOM-CLAIMS'),
  },
};
function MerOrgSection({ section }) {
  const s = ORG_SECTION_NOTES[section];
  if (!s) return null;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Organization · {section}</div>
          <h1 className="asc-page-title">{s.title}</h1>
          <p className="asc-page-sub">{s.sub}</p>
        </div>
      </div>
      <div className="asc-panel asc-panel-pad">
        <p style={{ margin: 0 }}>{s.note}</p>
        <button type="button" className="mer-link" style={{ marginTop: 10 }} onClick={s.target}>{s.linkLabel}</button>
      </div>
    </div>
  );
}
if (typeof window !== 'undefined') window.MerOrgSection = MerOrgSection;

function MeridianOrg() {
  const n = typeof window !== 'undefined' && window.cynParseUrl ? window.cynParseUrl() : {};
  if (!M) {
    return <div className="asc-page"><div className="asc-panel asc-panel-pad">The v4 graphs are not generated yet — run <code>node kg/generate-v4.js</code>.</div></div>;
  }
  if (n.bc) return <MerContext id={n.bc} />;
  if (n.mprod) return <MerProduct id={n.mprod} tab={n.mtab || 'envision'} />;
  if (n.dom) return <MerDomain id={n.dom} />;
  return <MerChart />;
}

window.MeridianOrg = MeridianOrg;
export default MeridianOrg;
