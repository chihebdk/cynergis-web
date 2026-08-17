import React from 'react';
import './org-data';
import './org-prio';
import './org-envision';
import './kg-mesh.gen';
import './org-meridian';
import { kgSearch } from './kg-query';
const { ORG, PrioritizePortfolios, PrioritizeProducts } = window;
/* ============================================================
   Cynergis — Organization app.
   Org Dashboard (portfolios) → Portfolio page (products) → Product page.
   The product page shows the product's LIFECYCLE in the left panel.
   ============================================================ */
const { useState, useEffect, useCallback } = React;

/* ---------- URL routing (shareable links + native browser Back/Forward) ----------
   The whole nav state lives in the query string, so every screen is a real URL the browser
   can bookmark, share, and walk with Back/Forward. Each navigation pushState()s the new
   state; popstate re-applies it; a cold load parses the URL into a deep link. State shape:
     ?v=org|pf|prod  &pf=<portfolioId> &prod=<productId> &sub=dashboard|prioritize
     &phase=<Phase>  &entry=<entry>     &ctx=<contextId>  &tab=<tab>
   _d is a monotonic depth stamp so we know whether Back can stay inside the app. */
if (typeof window !== 'undefined' && !window.__cynRouter) {
  window.__cynRouter = { subs: new Set() };
  const ping = () => window.__cynRouter.subs.forEach(f => f());
  window.cynParseUrl = () => {
    const q = new URLSearchParams(location.search);
    const tab = q.get('tab');
    return {
      v: q.get('v') || 'org', pf: q.get('pf') || null, prod: q.get('prod') || null,
      /* D-096 cutover: Meridian is the default org altitude; WealthGrow lives at sub=dashboard (legacy v3) */
      sub: q.get('sub') || (q.get('v') && q.get('v') !== 'org' ? 'dashboard' : 'meridian'),
      phase: q.get('phase') || 'Envision',
      entry: q.get('entry') || 'overview', ctx: q.get('ctx') || null,
      tab: (tab && tab !== 'rels') ? tab : 'flow',   // legacy ?tab=rels links land on Event flow
      dom: q.get('dom') || null, bc: q.get('bc') || null,   // Meridian v4 altitude (D-094)
      mprod: q.get('mprod') || null, mtab: q.get('mtab') || null,   // v4 product lifecycle (D-095)
    };
  };
  window.cynBuildUrl = (n) => {
    const q = new URLSearchParams();
    q.set('v', n.v);
    if (n.v === 'org') {
      if (n.sub && n.sub !== 'meridian') q.set('sub', n.sub);
      if (n.sub === 'meridian' || n.sub === 'domains' || !n.sub) {
        if (n.dom) q.set('dom', n.dom); if (n.bc) q.set('bc', n.bc);
        if (n.mprod) { q.set('mprod', n.mprod); if (n.mtab && n.mtab !== 'envision') q.set('mtab', n.mtab); }
      }
    }
    else if (n.v === 'pf') { if (n.pf) q.set('pf', n.pf); if (n.sub && n.sub !== 'dashboard') q.set('sub', n.sub); }
    else if (n.v === 'prod') {
      if (n.pf) q.set('pf', n.pf);
      if (n.prod) q.set('prod', n.prod);
      q.set('phase', n.phase || 'Envision'); q.set('entry', n.entry || 'overview');
      if (n.entry === 'contexts' && n.ctx) { q.set('ctx', n.ctx); if (n.tab && n.tab !== 'flow') q.set('tab', n.tab); }
    }
    return location.pathname + '?' + q.toString();
  };
  window.cynPushUrl = (n) => {
    const d = (((history.state && history.state._d) || 0) + 1);
    window.__cynNav = n;
    try { history.pushState({ ...n, _d: d }, '', window.cynBuildUrl(n)); } catch (e) { /* file:// etc. */ }
    ping();
  };
  window.cynReplaceUrl = (n) => {
    const d = (history.state && history.state._d) || 0;
    window.__cynNav = n;
    try { history.replaceState({ ...n, _d: d }, '', window.cynBuildUrl(n)); } catch (e) { /* noop */ }
    ping();
  };
  window.cynCanBack = () => (((history.state && history.state._d) || 0) > 0);
  window.cynRouterPing = ping;
}

/* ---------- R1 (D-103/D-104): Meridian products drive the FULL product page ----------
   Rehome, never remove: the v4 org's products open the SAME ProductPage machinery
   the v3 world uses. Each org-graph Product node synthesizes an ORG-shaped product
   object (real facts only — owner as sponsor, phase from the recorded gates; WSJF
   honestly unscored until R2), and its DOMAIN plays the portfolio's structural role. */
function v4Catalog() {
  if (window.__cynV4Cat !== undefined) return window.__cynV4Cat;
  const K4 = window.__KG4__;
  if (!K4 || !K4.org) { window.__cynV4Cat = null; return null; }
  const g = K4.org;
  const byId = Object.fromEntries(g.nodes.map(n => [n.id, n]));
  const ctxDom = {};
  for (const e of g.edges) if (e.type === 'contains') ctxDom[e.to] = e.from;
  /* phase = where the product IS, read from its lifecycle graph's recorded gates */
  const lifeNodes = Object.values(K4.products || {}).map(pr => pr.nodes.find(n => n.type === 'Product')).filter(Boolean);
  const phaseOf = (localId) => {
    const lc = lifeNodes.find(n => n.localId === localId);
    if (!lc) return 'Operate';                                  // packaging-only: live systems per the corpus
    const gates = (lc.props || {}).gates || {};
    if (gates.build) return (lc.props || {}).valueRollup ? 'Realize' : 'Operate';
    if (gates.design) return 'Build';
    if (gates.discover) return 'Design';
    if (gates.envision) return 'Discover';
    return 'Envision';
  };
  const domains = {};   // domainLocalId -> pseudo-portfolio
  for (const n of g.nodes) if (n.type === 'Domain')
    domains[n.localId] = { id: n.localId, name: n.label, lead: n.props.owner, desc: n.props.summary, value: n.props.envelope || '', products: [], _v4: true };
  const prods = g.nodes.filter(n => n.type === 'Product');
  for (const n of prods) {
    const pkg = g.edges.find(e => e.type === 'packages' && e.from === n.id);
    const dom = pkg ? byId[ctxDom[pkg.to]] : null;
    const ownerEdge = g.edges.find(e => e.type === 'owned_by' && e.from === n.id);
    const owner = ownerEdge ? byId[ownerEdge.to] : null;
    const product = {
      id: n.localId, name: n.label, tagline: n.props.note || n.props.kind, phase: phaseOf(n.localId),
      sponsor: (dom && dom.props.owner) || (owner && owner.label) || null,   // the domain's accountable executive
      owner: owner ? owner.label : null,
      quadrant: null, wsjf: null, value: null, feasibility: null,            // honestly unscored (R2)
      valueAtStake: null, rationale: null, studio: false, _v4: true,
    };
    if (dom && domains[dom.localId]) { product._dom = dom.localId; domains[dom.localId].products.push(product); }
  }
  window.__cynV4Cat = { domains, products: Object.fromEntries(prods.map((n, i) => [n.localId, null])) };
  window.__cynV4Cat.byProduct = {};
  for (const d of Object.values(domains)) for (const p of d.products) window.__cynV4Cat.byProduct[p.id] = { prod: p, pid: p._dom };
  return window.__cynV4Cat;
}

// resolve a product id to its object + owning portfolio/domain (for deep links / breadcrumb)
function cynResolveProduct(id) {
  for (const pf of (window.ORG ? window.ORG.portfolios : [])) {
    const p = pf.products.find(x => x.id === id);
    if (p) return { prod: p, pid: pf.id };
  }
  const cat = v4Catalog();
  if (cat && cat.byProduct[id]) return cat.byProduct[id];
  return null;
}
// resolve a portfolio OR domain id to the object ProductPage's breadcrumb needs
function cynResolveScope(pid) {
  if (!pid) return null;
  const pf = window.ORG && window.ORG.portfolio(pid);
  if (pf) return pf;
  const cat = v4Catalog();
  return (cat && cat.domains[pid]) || null;
}

/* ---------- minimal icon set ---------- */
const OI = {
  org:      <path d="M2 14h12M3 14V6l4-2 4 2v8M6 9h.01M10 9h.01M6 11.5h.01M10 11.5h.01"/>,
  portfolio:<path d="M2 5.5h5l1.2 1.5H14v6.5H2zM2 5.5V4h4l1 1.2"/>,
  product:  <path d="M8 2 2.8 4.8v6.4L8 14l5.2-2.8V4.8z M2.8 4.8 8 7.6l5.2-2.8M8 7.6V14"/>,
  arrow:    <path d="M5 3l5 5-5 5"/>,
  back:     <path d="M9.5 3.5 5 8l4.5 4.5"/>,
  search:   <path d="M7 7m-4.5 0a4.5 4.5 0 1 0 9 0 4.5 4.5 0 1 0-9 0M10.5 10.5L14 14"/>,
  check:    <path d="M3.5 8.5l3 3 6-6.5"/>,
  lock:     <path d="M4.5 7V5.2a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6.5h-9z"/>,
  dot:      <circle cx="8" cy="8" r="2.4"/>,
  board:    <path d="M2 2v12h12M5 11V7M8.5 11V4.5M12 11V8.5"/>,
  dash:     <path d="M2.5 2.5h4v5h-4zM9.5 2.5h4v3h-4zM2.5 10h4v3.5h-4zM9.5 8h4v5.5h-4z"/>,
  layers:   <path d="M8 2 14 5 8 8 2 5zM2 8l6 3 6-3M2 11l6 3 6-3"/>,
  shield:   <path d="M8 2l5 2v4c0 3.2-2.1 5.2-5 6-2.9-.8-5-2.8-5-6V4z"/>,
  risk:     <path d="M8 2.5 14.5 13.5H1.5zM8 7v3M8 11.8h.01"/>,
  cap:      <path d="M8 3 1.5 6 8 9l6.5-3zM4 7.2V11c0 1 1.8 2 4 2s4-1 4-2V7.2"/>,
};
function Ico({ k, w=16 }) {
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{OI[k] || OI.product}</svg>;
}

/* ---------- shared atoms ---------- */
function Meter({ cls, val, max=5 }) {
  return <div className="asc-meter"><span className={cls} style={{ width: `${(val / max) * 100}%` }}></span></div>;
}
function sumVAS(products){
  const n = products.reduce((s, p) => s + (parseFloat((p.valueAtStake||'').replace(/[^0-9.]/g,'')) || 0), 0);
  return '$' + (Math.round(n * 10) / 10) + 'M';
}
function LifeStrip({ phase }) {
  const edge = ORG.phaseIndex(phase);
  return (
    <div className="pp-life">
      {ORG.PHASES.map((ph, i) => (
        <span key={ph} className={'pp-seg' + (i < edge ? ' done' : i === edge ? ' edge' : '')} title={ph}></span>
      ))}
    </div>
  );
}

/* ---------- Organization dashboard ---------- */
/* ---------- ⌘K palette (D-073): the shell search probes the mesh ---------- */
function KgPalette({ open, onClose, onOpenPortfolio, onOpenProduct, onOpenMeridian }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const needle = q.trim().toLowerCase();
  const navHits = [];
  if (needle) {
    ORG.portfolios.forEach(pf => {
      if (pf.name.toLowerCase().includes(needle)) navHits.push({ kind: 'portfolio', label: pf.name, sub: pf.value, go: () => { onOpenPortfolio(pf.id); onClose(); } });
      pf.products.forEach(p => { if (p.name.toLowerCase().includes(needle)) navHits.push({ kind: 'product', label: p.name, sub: p.phase, go: () => { onOpenProduct(p); onClose(); } }); });
    });
  }
  const kg = needle ? kgSearch(needle) : [];
  const v4 = needle && window.__kg4Search ? window.__kg4Search(needle) : [];
  return (
    <div className="kgp-backdrop" onClick={onClose}>
      <div className="kgp" onClick={e => e.stopPropagation()}>
        <input autoFocus className="kgp-in" placeholder="Search the organization and the knowledge mesh…"
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onClose(); }} />
        {needle !== '' && (
          <div className="kgp-res">
            {navHits.length > 0 && <div className="kgp-k">navigate</div>}
            {navHits.slice(0, 5).map((h, i) => (
              <button type="button" className="kgp-row" key={'n' + i} onClick={h.go}>
                <span className={'kgp-kind ' + h.kind}>{h.kind}</span>
                <span className="kgp-lab">{h.label}</span>
                <span className="kgp-sub">{h.sub}</span>
              </button>
            ))}
            {kg.length > 0 && <div className="kgp-k">knowledge mesh — the same index the concierge serves</div>}
            {kg.map((h, i) => {
              const peek = typeof window.cynTraceHas === 'function' && window.cynTraceHas(h.id);
              return (
                <button type="button" className={'kgp-row' + (peek ? '' : ' plain')} key={'k' + i}
                  onClick={() => { if (peek) { window.cynTraceOpen(h.id); onClose(); } }}>
                  <span className="kgp-type">{h.type}</span>
                  <span className="kgp-id">{h.id}</span>
                  <span className="kgp-lab">{h.label}</span>
                  {h.status !== 'current' && <span className="kgp-st">{h.status}</span>}
                  {peek ? <span className="kgp-go">peek →</span> : <span className="kgp-sub">{h.graph === 'org' ? 'control plane' : (h.module !== 'product' && h.module) || ''}</span>}
                </button>
              );
            })}
            {v4.length > 0 && <div className="kgp-k">meridian v4 — the DDD org (derived)</div>}
            {v4.map((h, i) => (
              <button type="button" className="kgp-row" key={'v' + i}
                onClick={() => { onOpenMeridian?.(); h.go(); onClose(); }}>
                <span className="kgp-type">{h.type}</span>
                <span className="kgp-id">{h.localId}</span>
                <span className="kgp-lab">{h.label}</span>
                <span className="kgp-go">open →</span>
              </button>
            ))}
            {navHits.length === 0 && kg.length === 0 && v4.length === 0 && <div className="kgp-none">No matches in the org or the mesh.</div>}
          </div>
        )}
        <div className="kgp-foot">Every hit is a node in the derived knowledge graph — the same index Optimus serves (<code>kg/mcp-server.js</code> · D-066).</div>
      </div>
    </div>
  );
}

/* ---------- Knowledge mesh (D-069): the control plane's derived index ---------- */
function MeshPanel() {
  const M = typeof window !== 'undefined' ? window.__KGMESH__ : null;
  if (!M) return null;
  const prods = M.modules.filter(m => m.kind === 'product');
  const shortName = ns => (prods.find(p => p.namespace === ns) || { name: ns }).name.split(' graph')[0].split(' — ')[0];
  return (
    <div className="asc-section">
      <div className="asc-sec-head">
        <div className="asc-sec-title"><Ico k="org" w={15} /> Knowledge mesh — the control plane</div>
        <div className="asc-sec-sub">One derived index over the product knowledge graphs · find · identify · route (D-066)</div>
      </div>
      <div className="mesh-wrap">
        <div className="mesh-col">
          <div className="mesh-k">member graphs</div>
          {M.modules.filter(m => m.kind !== 'org').map(m => (
            <div className="mesh-row" key={m.id}>
              <span className={'mesh-kind ' + m.kind}>{m.kind === 'bounded-context' ? 'BC' : 'product'}</span>
              <span className="mesh-nm">{m.name}</span>
              {m.classification && <span className={'ddd-class ' + m.classification} title="DDD distillation (D-026): core — differentiating, invest & build deep · supporting — necessary, keep lean · generic — commodity, buy or wrap. Richness scales with coreness.">{m.classification}</span>}
              <span className="mesh-ns">{m.namespace}</span>
              <span className="mesh-stats">{m.nodes != null ? `${m.nodes} nodes` : ''}{m.edges != null ? ` · ${m.edges} edges` : ''}{m.unresolved != null ? ` · ${m.unresolved} unresolved` : ''}</span>
            </div>
          ))}
        </div>
        <div className="mesh-col">
          <div className="mesh-k">seams — where the graphs converge</div>
          {[...M.seams].sort((a, b) => b.referencedBy.length - a.referencedBy.length).map(s => (
            <div className={'mesh-row' + (s.referencedBy.length > 1 ? ' converges' : '')} key={s.id}>
              <span className="mesh-nm">{s.label}</span>
              <span className="mesh-refs">{s.referencedBy.map(r => <span className="mesh-ref" key={r}>{shortName(r)}</span>)}</span>
              {s.referencedBy.length > 1 && <span className="mesh-conv">converges</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="mesh-foot">The org graph is <b>derived, never hand-authored</b> — writes go to the owning module's spec and regenerate (D-066 doctrine 4). Ask the concierge: <code>node kg/ask.js &lt;id&gt;</code> · <code>--seams</code> · <code>--modules</code></div>
    </div>
  );
}

function OrgDashboard({ onOpenPortfolio }) {
  const products = ORG.portfolios.flatMap(p => p.products);
  const live = products.filter(p => ['Operate','Realize'].includes(p.phase)).length;
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><Ico k="org" w={12} /> Organization · {ORG.org.kind}</div>
          <h1 className="asc-page-title">{ORG.org.name}</h1>
          <p className="asc-page-sub">{ORG.org.desc} Each portfolio is a book of AI-augmented products moving through the Envision → Realize lifecycle.</p>
        </div>
        <div className="asc-head-actions">
          <span className="badge" title="The v3 demo org: its product graphs still carry the full two-way machinery (write path, agents, evals). Retires when Meridian reaches product-depth parity — it stays queryable via as_of either way.">legacy v3 · retires at parity</span>
          <button className="asc-btn"><Ico k="portfolio" w={14} /> New portfolio</button>
        </div>
      </div>

      <div className="asc-kpis">
        <div className="asc-kpi"><div className="l">Portfolios</div><div className="v">{ORG.portfolios.length}</div><div className="m">across the bank</div></div>
        <div className="asc-kpi"><div className="l">Products</div><div className="v">{products.length}</div><div className="m">in delivery</div></div>
        <div className="asc-kpi"><div className="l">Value at stake</div><div className="v">{sumVAS(products)}</div><div className="m">/ yr · rolled up</div></div>
        <div className="asc-kpi"><div className="l">Live or realized</div><div className="v">{live}</div><div className="m"><b>1</b> proving value</div></div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><Ico k="portfolio" w={15} /> Portfolios</div>
          <div className="asc-sec-sub">Open a portfolio to see its products</div>
        </div>
        <div className="pf-grid">
          {ORG.portfolios.map(pf => {
            const dist = ORG.PHASES.map(ph => pf.products.filter(p => p.phase === ph).length);
            return (
              <div className="pf-card" key={pf.id} onClick={() => onOpenPortfolio(pf.id)}>
                <div className="pf-top">
                  <div><h3>{pf.name}</h3><div className="pf-lead">Lead · {pf.lead}</div></div>
                  <span className="pf-value">{pf.value}</span>
                </div>
                <p className="pf-desc">{pf.desc}</p>
                <div className="pf-phasebar">
                  {ORG.PHASES.map((ph, i) => (
                    <div className="pf-phasecell" key={ph} title={`${ph}: ${dist[i]}`}>
                      <div className={'pf-phasecount' + (dist[i] ? ' on' : '')}>{dist[i] || '·'}</div>
                      <div className="pf-phaselbl">{ph.slice(0,4)}</div>
                    </div>
                  ))}
                </div>
                <div className="pf-foot">
                  <span className="pf-count"><b>{pf.products.length}</b> products</span>
                  <span className="pf-vas">{sumVAS(pf.products)} at stake</span>
                  <span className="pf-open">Open <Ico k="arrow" w={12} /></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MeshPanel />
    </div>
  );
}

/* ---------- Portfolio page ---------- */
function PortfolioPage({ id, onBack, onOpenProduct }) {
  const pf = ORG.portfolio(id);
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><Ico k="portfolio" w={12} /> Portfolio · {ORG.org.name} · Lead {pf.lead}</div>
          <h1 className="asc-page-title">{pf.name}</h1>
          <p className="asc-page-sub">{pf.desc}</p>
        </div>
        <div className="asc-head-actions">
          <span className="badge">{pf.value} book</span>
          <button className="asc-btn"><Ico k="product" w={14} /> New product</button>
        </div>
      </div>

      <div className="asc-kpis">
        <div className="asc-kpi"><div className="l">Products</div><div className="v">{pf.products.length}</div><div className="m">in this portfolio</div></div>
        <div className="asc-kpi"><div className="l">Value at stake</div><div className="v">{sumVAS(pf.products)}</div><div className="m">/ yr</div></div>
        <div className="asc-kpi"><div className="l">Leading edge</div><div className="v" style={{ fontSize:'22px' }}>{pf.products.filter(p=>p.phase==='Realize').length ? 'Realize' : pf.products[0].phase}</div><div className="m">furthest product</div></div>
        <div className="asc-kpi"><div className="l">With Studio</div><div className="v">{pf.products.filter(p=>p.studio).length}</div><div className="m">full PRD + architecture</div></div>
      </div>

      <div className="asc-section">
        <div className="asc-sec-head">
          <div className="asc-sec-title"><Ico k="product" w={15} /> Products</div>
          <div className="asc-sec-sub">Open a product to see its lifecycle</div>
        </div>
        <div className="asc-domgrid">
          {pf.products.map(p => <ProductCard key={p.id} p={p} onOpen={() => onOpenProduct(p)} />)}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, onOpen }) {
  return (
    <div className="asc-domcard" onClick={() => onOpen(p)}>
      <div className="asc-domcard-top">
        <div><h3>{p.name}</h3><div className="meta">{p.tagline}</div></div>
        <span className={'asc-quad ' + ORG.quadClass(p.quadrant)}>{p.quadrant}</span>
      </div>
      <div className="asc-scores">
        <div className="asc-score"><div className="sl"><span>Value</span><b>{p.value.toFixed(1)}</b></div><Meter cls="val" val={p.value} /></div>
        <div className="asc-score"><div className="sl"><span>Feasibility</span><b>{p.feasibility.toFixed(1)}</b></div><Meter cls="fea" val={p.feasibility} /></div>
      </div>
      <div>
        <div className="pp-life-head">
          <span className="asc-phasetag"><span className="d"></span>{p.phase}</span>
          {p.realized
            ? <span className="badge ok" style={{ marginLeft:'auto' }}><span className="dot ok"></span>{p.realized} realized</span>
            : p.sponsor
              ? <span className="badge" style={{ marginLeft:'auto' }}>{p.sponsor}</span>
              : <span className="badge err" style={{ marginLeft:'auto' }}><span className="dot err"></span>No sponsor</span>}
        </div>
        <LifeStrip phase={p.phase} />
      </div>
      <div className="pp-open-row">Open product <Ico k="arrow" w={12} /></div>
    </div>
  );
}

/* ---------- Product page (lifecycle in the left panel) ---------- */
/* ---------- Product page now lives in org-envision.jsx (window.ProductPage) ---------- */
const ProductPage = window.ProductPage;

/* ---------- topbar scope: Organization > Domain > Product (D-115) ----------
   Resolves the active domain/product scope from the org-altitude URL params
   (dom / bc / mprod) against the org graph, so the header path stays in sync
   with the Meridian drills. bc resolves to its containing domain; mprod to the
   domain of its first packaged context. */
function merScopeFromUrl(q) {
  const K = typeof window !== 'undefined' && window.__KG4__;
  if (!K || !K.org) return {};
  const g = K.org;
  const byLocal = id => g.nodes.find(n => n.localId === id);
  const byId = id => g.nodes.find(n => n.id === id);
  const domOfCtx = ctxNode => {
    const e = g.edges.find(x => x.type === 'contains' && x.to === ctxNode.id);
    return e ? byId(e.from) : null;
  };
  let domId = q.dom || null;
  const prodId = q.mprod || null;
  if (!domId && q.bc) {
    const c = byLocal(q.bc);
    const d = c && domOfCtx(c);
    if (d) domId = d.localId;
  }
  if (!domId && prodId) {
    const p = byLocal(prodId);
    const pk = p && g.edges.find(x => x.type === 'packages' && x.from === p.id);
    const d = pk && domOfCtx(byId(pk.to) || {});
    if (d) domId = d.localId;
  }
  return {
    domId, domName: domId ? (byLocal(domId) || {}).label : null,
    prodId, prodName: prodId ? (byLocal(prodId) || {}).label : null,
  };
}

/* ---------- left-rail nav ---------- */
function NavRail({ sect, items, active, onSelect, foot }) {
  return (
    <aside className="asc-rail">
      <div className="asc-rail-sect">{sect}</div>
      {items.map(it => (
        <div key={it.id} className={'asc-nav' + (active === it.id ? ' on' : '')} onClick={() => onSelect(it.id)}>
          <Ico k={it.icon} w={15} /> {it.label}
        </div>
      ))}
      {foot}
    </aside>
  );
}

/* ---------- prioritization (placeholder, nothing here yet) ---------- */
function Prioritize({ level }) {
  const unit = level === 'org' ? 'portfolios' : 'products';
  return (
    <div className="asc-page">
      <div className="asc-page-head">
        <div>
          <div className="asc-eyebrow"><Ico k="board" w={12} /> {level === 'org' ? 'Organization' : 'Portfolio'} · Steering</div>
          <h1 className="asc-page-title">Prioritization</h1>
          <p className="asc-page-sub">Rank and sequence {unit} by value and feasibility.</p>
        </div>
      </div>
      <div className="asc-panel asc-panel-pad" style={{ padding:'56px 28px', textAlign:'center' }}>
        <div style={{ width:'46px', height:'46px', borderRadius:'11px', background:'var(--panel-3)', color:'var(--ink-3)', display:'grid', placeItems:'center', margin:'0 auto 14px' }}><Ico k="board" w={21} /></div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'17px', color:'var(--ink)', marginBottom:'6px' }}>Nothing to prioritize yet</div>
        <div style={{ fontSize:'13px', color:'var(--ink-3)', maxWidth:'46ch', margin:'0 auto', lineHeight:1.55 }}>
          Prioritization for {unit} will live here.
        </div>
      </div>
    </div>
  );
}

/* ---------- App shell ---------- */
function OrgApp() {
  // boot the initial view from the URL (deep link), then normalize the URL
  const boot = React.useMemo(() => {
    const n = window.cynParseUrl ? window.cynParseUrl() : { v: 'org', sub: 'dashboard' };
    let view = 'org', pid = null, prod = null;
    if (n.v === 'pf' && n.pf && ORG.portfolio(n.pf)) { view = 'portfolio'; pid = n.pf; }
    else if (n.v === 'prod' && n.prod) {
      const r = cynResolveProduct(n.prod);
      if (r) { view = 'product'; prod = r.prod; pid = r.pid; }
    }
    const nav = { v: view === 'portfolio' ? 'pf' : view === 'product' ? 'prod' : 'org',
      pf: pid, prod: prod ? prod.id : null, sub: n.sub,
      phase: n.phase, entry: n.entry, ctx: n.ctx, tab: n.tab,
      dom: n.dom, bc: n.bc, mprod: n.mprod, mtab: n.mtab };
    window.__cynNav = nav;   // plain assignment only — no setState/ping during render
    return { view, pid, prod, sub: n.sub };
  }, []);
  const [view, setView] = useState(boot.view);
  const [pid, setPid] = useState(boot.pid);
  const [prod, setProd] = useState(boot.prod);
  const [sub, setSub] = useState(boot.sub);

  const [, bumpHist] = useState(0);
  useEffect(() => {
    const ping = () => bumpHist(h => h + 1);
    window.__cynRouter?.subs.add(ping);
    window.cynReplaceUrl?.(window.__cynNav);   // normalize the URL on load (effect, not render)
    const onPop = () => {                                   // browser Back / Forward
      const n = window.cynParseUrl(); window.__cynNav = n;
      if (n.v === 'pf') { setView('portfolio'); setPid(n.pf); setSub(n.sub); }
      else if (n.v === 'prod') {
        const r = cynResolveProduct(n.prod);
        if (r) { setProd(r.prod); setPid(r.pid); }
        setSub('dashboard'); setView('product');
        window.__cynApplyProd?.(n);                          // phase / entry / ctx / tab
      } else { setView('org'); setSub(n.sub); }
      ping();
    };
    window.addEventListener('popstate', onPop);
    return () => { window.__cynRouter?.subs.delete(ping); window.removeEventListener('popstate', onPop); };
  }, []);
  const canBack = window.cynCanBack?.() || false;

  const pf = pid ? cynResolveScope(pid) : null;   // a portfolio (v3) or a DOMAIN (v4) — same structural role (R1, D-104)
  const scrollTop = () => document.querySelector('.asc-main')?.scrollTo(0, 0);
  const RESET = { phase: 'Envision', entry: 'overview', ctx: null, tab: 'flow' };

  const [palOpen, setPalOpen] = useState(false);
  useEffect(() => {
    const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalOpen(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openPortfolio = useCallback((id) => {
    setPid(id); setSub('dashboard'); setView('portfolio');
    window.cynPushUrl({ v: 'pf', pf: id, prod: null, sub: 'dashboard', ...RESET });
    setTimeout(scrollTop, 0);
  }, []);
  const goOrg = useCallback(() => {
    setSub('meridian'); setView('org');
    window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'meridian', ...RESET });
    setTimeout(scrollTop, 0);
  }, []);
  const goLegacyOrg = useCallback(() => {
    setSub('dashboard'); setView('org');
    window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'dashboard', ...RESET });
    setTimeout(scrollTop, 0);
  }, []);
  const goMerDomain = useCallback((id) => {
    setView('org'); setSub('meridian');
    window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'meridian', dom: id, ...RESET });
    setTimeout(scrollTop, 0);
  }, []);
  const goMerProduct = useCallback((id) => {
    setView('org'); setSub('meridian');
    window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'meridian', mprod: id, ...RESET });
    setTimeout(scrollTop, 0);
  }, []);
  const openProduct = useCallback((p) => {
    const r = cynResolveProduct(p.id);
    setProd(p); if (r) setPid(r.pid); setSub('dashboard'); setView('product');
    window.__cynCtxSel = null; window.__cynCtxTab = 'flow';
    window.cynPushUrl({ v: 'prod', pf: r ? r.pid : pid, prod: p.id, sub: 'dashboard', ...RESET });   // always land on Envision — the lifecycle reads left→right
    setTimeout(scrollTop, 0);
  }, [pid]);
  const navSub = (s) => {
    setSub(s);
    window.cynPushUrl({ v: view === 'portfolio' ? 'pf' : 'org', pf: pid, prod: null, sub: s, ...RESET });
  };
  const goPortfolioView = () => {
    if (!pid) return;
    if (pf && pf._v4) {   // the middle tier is a DOMAIN: its page lives on the Meridian altitude
      setSub('meridian'); setView('org');
      window.cynPushUrl({ v: 'org', pf: null, prod: null, sub: 'meridian', dom: pid, ...RESET });
      setTimeout(scrollTop, 0);
      return;
    }
    setSub('dashboard'); setView('portfolio');
    window.cynPushUrl({ v: 'pf', pf: pid, prod: null, sub: 'dashboard', ...RESET });
    setTimeout(scrollTop, 0);
  };
  /* the bridge org-meridian's domain pages call to open the FULL product page */
  useEffect(() => {
    window.__cynOpenV4Product = (id) => { const r = cynResolveProduct(id); if (r) openProduct(r.prod); };
    return () => { delete window.__cynOpenV4Product; };
  }, [openProduct]);
  const goProductView = () => {
    if (!prod) return; setSub('dashboard'); setView('product');
    window.__cynCtxSel = null; window.__cynCtxTab = 'flow';
    window.cynPushUrl({ v: 'prod', pf: pid, prod: prod.id, sub: 'dashboard', ...RESET });
    setTimeout(scrollTop, 0);
  };

  return (
    <div className="asc-app" style={{ gridTemplateRows:'56px 1fr' }}>
      <header className="asc-topbar">
        <div className="asc-brand" onClick={goOrg}>
          <div className="asc-mark">C</div>
          <div><b>Cynergis</b><span>{(window.__KG4__ && window.__KG4__.org) ? window.__KG4__.org.org.name : ORG.org.name}</span></div>
        </div>

        <button className="asc-backbtn" disabled={!canBack} onClick={() => window.history.back()}
          title="Back" aria-label="Back"><Ico k="back" w={15} /></button>

        {(() => {
          /* D-115: the path reads Organization > Domain > Product, synced with the
             Meridian drills (dom/bc/mprod). "Portfolio" survives only on the legacy
             WealthGrow surfaces. */
          const q = (typeof window !== 'undefined' && window.cynParseUrl) ? window.cynParseUrl() : {};
          const mer = view === 'org' ? merScopeFromUrl(q) : {};
          const legacyPf = pf && !pf._v4 && view !== 'org';
          const domName = view === 'org' ? mer.domName : (pf ? pf.name : null);
          const domOn = (view === 'org' && !!(q.dom || q.bc) && !q.mprod) || view === 'portfolio';
          const domDisabled = view === 'org' ? !mer.domId : !pid;
          const prodName = view === 'org' ? mer.prodName : (prod ? prod.name : null);
          const prodOn = (view === 'org' && !!q.mprod) || view === 'product';
          const prodDisabled = view === 'org' ? !mer.prodId : !prod;
          const orgOn = view === 'org' && !mer.domId && !mer.prodId;
          const onDomain = () => { if (view === 'org' && mer.domId) goMerDomain(mer.domId); else goPortfolioView(); };
          const onProduct = () => { if (view === 'org' && mer.prodId) goMerProduct(mer.prodId); else goProductView(); };
          return (
            <div className="asc-scope asc-scope-path">
              <button className={orgOn ? 'on' : ''} onClick={goOrg}><Ico k="org" w={13} /> Organization</button>
              <button className={domOn ? 'on' : ''} disabled={domDisabled} onClick={onDomain}>
                <Ico k={legacyPf ? 'portfolio' : 'org'} w={13} />
                <span className="lab2">{legacyPf ? 'Portfolio' : 'Domain'}{domName && <><span className="sep">·</span><span className="ent">{domName}</span></>}</span>
              </button>
              <button className={prodOn ? 'on' : ''} disabled={prodDisabled} onClick={onProduct}>
                <Ico k="product" w={13} />
                <span className="lab2">Product{prodName && <><span className="sep">·</span><span className="ent">{prodName}</span></>}</span>
              </button>
            </div>
          );
        })()}

        <button type="button" className="asc-search" onClick={() => setPalOpen(true)}><Ico k="search" w={13} /> <span className="stxt">Search org &amp; knowledge mesh</span> <span className="kbd">⌘K</span></button>
        <div className="asc-userav">AT</div>
      </header>

      <KgPalette open={palOpen} onClose={() => setPalOpen(false)} onOpenPortfolio={openPortfolio} onOpenProduct={openProduct}
        onOpenMeridian={() => { setView('org'); setSub('meridian'); }} />

      {view === 'product'
        ? <ProductPage product={prod} portfolio={pf} />
        : view === 'org'
          ? (() => {
              /* D-114 org-page redesign: the six sections, with legacy kept below
                 (rehome, never remove). sub=meridian (old links) maps to Overview,
                 or to Domains when a drill param rides along. */
              const q = (typeof window !== 'undefined' && window.cynParseUrl) ? window.cynParseUrl() : {};
              const drill = q.dom || q.bc || q.mprod;
              const sec = sub === 'meridian' ? (drill ? 'domains' : 'overview') : sub;
              return <div className="asc-body">
                <NavRail sect="Organization" active={sec} onSelect={navSub}
                  items={[
                    { id:'overview', label:'Overview', icon:'org' },
                    { id:'domains', label:'Domains', icon:'dash' },
                    { id:'capabilities', label:'Capabilities', icon:'cap' },
                    { id:'platforms', label:'Platforms', icon:'layers' },
                    { id:'risks', label:'Risks', icon:'risk' },
                    { id:'governance', label:'Governance', icon:'shield' },
                  ]}
                  foot={<>
                    <div className="asc-rail-sect" style={{ marginTop:'14px' }}>Legacy</div>
                    <div className={'asc-nav' + (sec === 'dashboard' ? ' on' : '')} onClick={() => navSub('dashboard')}><Ico k="dash" w={15} /> WealthGrow (legacy v3)</div>
                    <div className={'asc-nav' + (sec === 'prioritize' ? ' on' : '')} onClick={() => navSub('prioritize')}><Ico k="board" w={15} /> Prioritize portfolios</div>
                  </>} />
                <main className="asc-main">
                  {sec === 'dashboard' ? <OrgDashboard onOpenPortfolio={openPortfolio} />
                    : sec === 'prioritize' ? <PrioritizePortfolios onOpenPortfolio={openPortfolio} />
                    : sec === 'overview' ? React.createElement(window.MerOverview || window.MeridianOrg)
                    : sec === 'domains' ? React.createElement(window.MeridianOrg)
                    : sec === 'platforms' ? React.createElement(window.MerPlatforms)
                    : React.createElement(window.MerOrgSection, { section: sec })}
                </main>
              </div>;
            })()
          : <div className="asc-body">
              <NavRail sect={pf ? pf.name : 'Portfolio'} active={sub} onSelect={navSub}
                items={[{ id:'dashboard', label:'Dashboard', icon:'dash' }, { id:'prioritize', label:'Prioritize products', icon:'board' }]}
                foot={<div className="asc-nav" style={{ marginTop:'8px' }} onClick={goLegacyOrg}><Ico k="back" w={15} /> All portfolios</div>} />
              <main className="asc-main">
                {sub === 'dashboard' ? <PortfolioPage id={pid} onBack={goOrg} onOpenProduct={openProduct} /> : <PrioritizeProducts portfolioId={pid} />}
              </main>
            </div>}
    </div>
  );
}

export default OrgApp;
