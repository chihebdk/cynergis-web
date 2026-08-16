import React from 'react';
import './kg-v4.gen';
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
const { useMemo } = React;

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
  const claims = K4.members && K4.members.claims ? indexGraph(K4.members.claims) : null;
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

  /* Claims member-graph depth, keyed by context localId */
  const depth = new Map();
  if (claims) {
    for (const c of claims.nodes('BoundedContext')) {
      const team = claims.byId.get((claims.out(c.id, 'owned_by')[0] || {}).to);
      const models = claims.nodes('DomainModel').filter(m => claims.out(m.id, 'part_of').some(e => e.to === c.id))
        .map(m => ({ node: m, aggregates: claims.inn(m.id, 'part_of').map(e => claims.byId.get(e.from)) }));
      const apps = claims.nodes('Application').filter(a => claims.out(a.id, 'implements').some(e => e.to === c.id));
      const contracts = [...claims.out(c.id, 'consumes'), ...claims.out(c.id, 'publishes_to')]
        .map(e => claims.byId.get(e.to)).filter(k => k && k.type === 'Contract')
        .map(k => ({ node: k, counterpart: claims.byId.get((claims.out(k.id, 'with')[0] || {}).to) }));
      const oms = claims.out(c.id, 'measured_by').map(e => claims.byId.get(e.to)).filter(Boolean);
      depth.set(c.localId, { node: c, team, models, apps, contracts, oms });
    }
  }
  const claimsUnits = claims ? claims.nodes('OrgUnit') : [];

  const ccoreGates = ccore ? ((ccore.nodes('Product')[0] || {}).props || {}).gates : null;
  return { org, claims, ccore, domains, ctxDomain, products, chapters, journeys, seams, depth, claimsUnits, ccoreGates };
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

/* ---------- domain page ---------- */
function MerDomain({ id }) {
  const d = M.domains.find(x => x.node.localId === id);
  if (!d) return <div className="asc-page"><div className="asc-panel asc-panel-pad">Unknown domain. <button type="button" className="mer-link" onClick={goChart}>Back to the org</button></div></div>;
  const isClaims = id === 'DOM-CLAIMS';
  const ctxIds = new Set(d.contexts.map(c => c.id));
  const slice = M.seams.filter(s => ctxIds.has(s.from.id) || ctxIds.has(s.to.id) || s.from.id === d.node.id || s.to.id === d.node.id);
  const portfolio = M.products.filter(p => p.packages.some(pk => pk.ctx && M.ctxDomain.get(pk.ctx.id) && M.ctxDomain.get(pk.ctx.id).id === d.node.id));
  const journeys = M.journeys.filter(j => (j.home && j.home.id === d.node.id) || j.crosses.some(c => c.id === d.node.id));
  return (
    <div className="asc-page">
      <div className="mer-crumb"><button type="button" className="mer-link" onClick={goChart}>Meridian org</button> / <b>{d.node.label}</b></div>
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow">Domain · {d.node.props.kind} · {d.node.props.valueChainStep}</div>
          <h1 className="asc-page-title">{d.node.label}</h1>
          <p className="asc-page-sub">{d.node.props.summary}</p>
        </div>
        <div className="asc-head-actions">
          {d.node.props.deepSlice && <span className="badge ok"><span className="dot ok"></span>the worked deep slice</span>}
        </div>
      </div>

      <div className="mer-facts">
        <div className="mer-fact"><span className="k">Accountable executive</span><span className="v">{d.node.props.owner}</span></div>
        {d.node.props.envelope && <div className="mer-fact"><span className="k">Envelope</span><span className="v">{d.node.props.envelope}</span></div>}
        {d.node.props.standingMeasures && <div className="mer-fact"><span className="k">Standing measures</span><span className="v">{d.node.props.standingMeasures.join(' · ')}</span></div>}
        {d.node.props.journeyNote && <div className="mer-fact"><span className="k">Note</span><span className="v">{d.node.props.journeyNote}</span></div>}
      </div>

      {isClaims && M.claimsUnits.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head">
            <div className="asc-sec-title">Sub-structure</div>
            <div className="asc-sec-sub">Two management logics inside one envelope — flat product side, hierarchical operations side</div>
          </div>
          <div className="mer-units">
            {M.claimsUnits.map(u => (
              <div className="mer-unit" key={u.id}>
                <div className="mer-u-top"><b>{u.label}</b><span className="mer-u-size">{u.props.size}</span></div>
                <div className="mer-u-shape">{u.props.shape}</div>
                <div className="mer-u-note">{u.props.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">This domain on the context map</div>
          <div className="asc-sec-sub">Every standing relationship, typed by pattern</div>
        </div>
        <div className="mer-map">
          {slice.map((s, i) => (
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

      {journeys.length > 0 && (
        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Journeys</div></div>
          <div className="mer-journeys">
            {journeys.map(j => (
              <div className="mer-jr" key={j.node.id}>
                <b>{j.node.label}</b>
                <div className="mer-jr-home">{j.home && j.home.id === d.node.id ? <span className="badge ok">home domain</span> : <span className="badge">crosses here · home {j.home ? j.home.label : '—'}</span>}</div>
                <div className="mer-jr-meas">{(j.node.props.measures || []).join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title">Product portfolio — the furniture</div>
          <div className="asc-sec-sub">Packaging over this domain's contexts · a module in another domain's colour means composition through a contract</div>
        </div>
        <div className="mer-prods">
          {portfolio.map(p => (
            <div className="mer-prod" key={p.node.id}>
              <div className="mer-prod-top">
                <b>{p.node.label}</b><span className="mer-prod-kind">{p.node.props.kind}</span>
                {M.ccore && (M.ccore.nodes('Product')[0] || {}).localId === p.node.localId && (
                  <button type="button" className="badge ok mer-gatelink" title={M.ccoreGates ? Object.entries(M.ccoreGates).map(([k, v]) => `${k}: ${v}`).join('\n') : ''}
                    onClick={() => goProduct(p.node.localId)}>
                    <span className="dot ok"></span>six-phase lifecycle · {Object.keys(M.ccoreGates || {}).length} gates ✓ →</button>
                )}
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
      </div>

      <DerivedStrip graph={isClaims && M.claims ? M.claims.g : M.org.g} extra={isClaims ? <>member graph <code>claims:*</code> · walls gated "Walls hold?" ✓</> : null} />
    </div>
  );
}

/* ---------- context page ---------- */
function MerContext({ id }) {
  const c = M.org.byLocal.get(id);
  if (!c || c.type !== 'BoundedContext') return <div className="asc-page"><div className="asc-panel asc-panel-pad">Unknown context. <button type="button" className="mer-link" onClick={goChart}>Back to the org</button></div></div>;
  const domain = M.ctxDomain.get(c.id);
  const dep = M.depth.get(id);
  const team = dep ? dep.team : M.org.byId.get((M.org.out(c.id, 'owned_by')[0] || {}).to);
  const packagedBy = M.products.filter(p => p.packages.some(pk => pk.ctx && pk.ctx.id === c.id));
  const seams = M.seams.filter(s => s.from.id === c.id || s.to.id === c.id);
  const isPlatform = !!c.props.publishes;
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
              return <span className="mer-om prod" key={p.node.id} title={p.node.props.note}>{p.node.label} ({mods.join(', ')})</span>;
            })}
          </div>
        </div>
      )}

      <DerivedStrip graph={dep && M.claims ? M.claims.g : M.org.g} />
    </div>
  );
}

/* ---------- product lifecycle page (six phases from claimscore:*) ---------- */
const PHASES4 = [['envision', 'Envision'], ['discover', 'Discover'], ['design', 'Design'], ['build', 'Build'], ['operate', 'Operate'], ['realize', 'Realize']];

function MerProduct({ id, tab }) {
  const cc = M.ccore;
  const P = cc ? cc.nodes('Product')[0] : null;
  if (!P || P.localId !== id) {
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

      {t === 'discover' && (<>
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

      {t === 'design' && (<>
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

      {t === 'build' && (<>
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

      {t === 'operate' && (<>
        <div className="asc-section">
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
        </div>
        <div className="mer-two">
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Incidents</div></div>
            {cc.nodes('Incident').map(inc => (
              <div className="mer-panel" key={inc.id}>
                <div className="mer-h-top"><b>{inc.label}</b><span className="badge">{inc.props.severity} · {inc.props.status}</span></div>
                <div className="mer-fact"><span className="k">Discovery</span><span className="v">{inc.props.discovery}</span></div>
                <div className="mer-fact"><span className="k">Finding</span><span className="v">{inc.props.finding}</span></div>
                <div className="mer-fact"><span className="k">Remediation</span><span className="v">{inc.props.remediation} · runbook {(cc.byId.get((cc.out(inc.id, 'remediated_by')[0] || {}).to) || {}).localId}</span></div>
              </div>
            ))}
            {cc.nodes('Approval').map(a => (
              <div className="mer-panel" key={a.id}>
                <div className="mer-h-top"><b>{a.label}</b><span className="badge ok">{a.props.status} · {a.props.approver}</span></div>
                <div className="mer-h-act">Conditions: {a.props.conditions}</div>
              </div>
            ))}
          </div>
          <div className="asc-section">
            <div className="asc-sec-head"><div className="asc-sec-title">Runbooks — skills with named executors</div></div>
            {cc.nodes('Runbook').map(rb => (
              <div className="mer-panel" key={rb.id}>
                <div className="mer-h-top"><b>{rb.label}</b><span className="mer-pat pn">{(cc.byId.get((cc.out(rb.id, 'uses_skill')[0] || {}).to) || {}).localId}</span></div>
                <div className="mer-h-act">Trigger: {rb.props.trigger}</div>
                <ol className="mer-steps">{(rb.props.steps || []).map((s, i) => <li key={i}>{s}</li>)}</ol>
                <div className="mer-oms">{(rb.props.mcp || []).map(m => <span className="mer-om" key={m}><code style={{ fontSize: 10 }}>{m}</code></span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {t === 'realize' && (<>
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

      <DerivedStrip graph={cc.g} extra={<>gates recorded: {Object.entries(gates).map(([k, v]) => `${k} ✓`).join(' · ')} · <code>kg/org/products/claimscore.js</code></>} />
    </div>
  );
}

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
  if (M.claims) scan(M.claims, 'claims');
  if (M.ccore) scan(M.ccore, 'claimscore');
  const goFor = ({ n, graphKey }) => {
    if (graphKey === 'org') {
      if (n.type === 'Domain') return () => goDomain(n.localId);
      if (n.type === 'BoundedContext') return () => goContext(n.localId);
      if (n.type === 'Product') {
        if (M.ccore && (M.ccore.nodes('Product')[0] || {}).localId === n.localId) return () => goProduct(n.localId);
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
    const pid = (M.ccore.nodes('Product')[0] || {}).localId;
    return () => goProduct(pid, PHASE_OF_TYPE[n.type] || 'envision');
  };
  return hits.slice(0, 8).map(h => ({
    type: h.n.type, id: h.n.id, localId: h.n.localId, label: h.n.label, graphKey: h.graphKey, go: goFor(h),
  }));
}
if (typeof window !== 'undefined') window.__kg4Search = kg4Search;

/* ---------- entry ---------- */
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
