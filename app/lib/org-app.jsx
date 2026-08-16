import React from 'react';
import './org-meridian';
/* ============================================================
   Cynergis — the organization shell (post-cutover, D-102).
   One organization: Meridian Auto Insurance, rendered entirely
   from the derived v4 graphs (window.__KG4__). The shell owns the
   topbar, the ⌘K palette (probing the v4 graphs) and the router;
   org-meridian.jsx owns every surface.
   WealthGrow (v3) retired at parity — its seeds, screens and
   pipeline live in git history; Optimus `as_of` still answers
   about them from the git-versioned KB artifacts.
   ============================================================ */
const { useState, useEffect } = React;

/* ---------- URL routing (shareable links + browser Back/Forward) ----------
   All nav state lives in the query string. The Meridian altitude's params:
     ?dom=<domainId> | ?bc=<contextId> | ?mprod=<productId>&mtab=<phase>
   Legacy v3 params (v=pf/prod, sub=…) parse harmlessly to the org home. */
if (typeof window !== 'undefined' && !window.__cynRouter) {
  window.__cynRouter = { subs: new Set() };
  const ping = () => window.__cynRouter.subs.forEach(f => f());
  window.cynParseUrl = () => {
    const q = new URLSearchParams(location.search);
    return {
      v: 'org', sub: 'meridian',
      dom: q.get('dom') || null, bc: q.get('bc') || null,
      mprod: q.get('mprod') || null, mtab: q.get('mtab') || null,
    };
  };
  window.cynBuildUrl = (n) => {
    const q = new URLSearchParams();
    if (n.bc) q.set('bc', n.bc);
    else if (n.mprod) { q.set('mprod', n.mprod); if (n.mtab && n.mtab !== 'envision') q.set('mtab', n.mtab); }
    else if (n.dom) q.set('dom', n.dom);
    const s = q.toString();
    return location.pathname + (s ? '?' + s : '');
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

/* ---------- minimal icon set ---------- */
const OI = {
  org:    <path d="M2 14h12M3 14V6l4-2 4 2v8M6 9h.01M10 9h.01M6 11.5h.01M10 11.5h.01"/>,
  back:   <path d="M9.5 3.5 5 8l4.5 4.5"/>,
  search: <path d="M7 7m-4.5 0a4.5 4.5 0 1 0 9 0 4.5 4.5 0 1 0-9 0M10.5 10.5L14 14"/>,
};
function Ico({ k, w = 16 }) {
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{OI[k] || OI.org}</svg>;
}

/* ---------- ⌘K palette — the shell search probes the v4 graphs ---------- */
function KgPalette({ open, onClose }) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  if (!open) return null;
  const needle = q.trim().toLowerCase();
  const v4 = needle && window.__kg4Search ? window.__kg4Search(needle) : [];
  return (
    <div className="kgp-backdrop" onClick={onClose}>
      <div className="kgp" onClick={e => e.stopPropagation()}>
        <input autoFocus className="kgp-in" placeholder="Search the organization's knowledge graphs…"
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') onClose(); }} />
        {needle !== '' && (
          <div className="kgp-res">
            {v4.length > 0 && <div className="kgp-k">meridian — the derived knowledge base</div>}
            {v4.map((h, i) => (
              <button type="button" className="kgp-row" key={'v' + i}
                onClick={() => { h.go(); onClose(); }}>
                <span className="kgp-type">{h.type}</span>
                <span className="kgp-id">{h.localId}</span>
                <span className="kgp-lab">{h.label}</span>
                <span className="kgp-go">open →</span>
              </button>
            ))}
            {v4.length === 0 && <div className="kgp-none">No matches in the knowledge base.</div>}
          </div>
        )}
        <div className="kgp-foot">Every hit is a node in the derived knowledge graph — the same index Optimus serves (<code>kg/mcp-server.js</code> · D-066).</div>
      </div>
    </div>
  );
}

/* ---------- App shell ---------- */
function OrgApp() {
  const [, bump] = useState(0);
  useEffect(() => {
    const ping = () => bump(h => h + 1);
    window.__cynRouter?.subs.add(ping);
    window.cynReplaceUrl?.(window.cynParseUrl());   // normalize the URL on load
    const onPop = () => { window.__cynNav = window.cynParseUrl(); ping(); };
    window.addEventListener('popstate', onPop);
    return () => { window.__cynRouter?.subs.delete(ping); window.removeEventListener('popstate', onPop); };
  }, []);
  const canBack = typeof window !== 'undefined' && (window.cynCanBack?.() || false);

  const [palOpen, setPalOpen] = useState(false);
  useEffect(() => {
    const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalOpen(v => !v); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const orgName = (typeof window !== 'undefined' && window.__KG4__ && window.__KG4__.org) ? window.__KG4__.org.org.name : 'Meridian Auto Insurance';
  const goHome = () => {
    window.cynPushUrl({ v: 'org', sub: 'meridian', dom: null, bc: null, mprod: null, mtab: null });
    setTimeout(() => document.querySelector('.asc-main')?.scrollTo(0, 0), 0);
  };

  return (
    <div className="asc-app" style={{ gridTemplateRows: '56px 1fr' }}>
      <header className="asc-topbar">
        <div className="asc-brand" onClick={goHome}>
          <div className="asc-mark">C</div>
          <div><b>Cynergis</b><span>{orgName}</span></div>
        </div>

        <button className="asc-backbtn" disabled={!canBack} onClick={() => window.history.back()}
          title="Back" aria-label="Back"><Ico k="back" w={15} /></button>

        <button type="button" className="asc-search" style={{ marginLeft: 'auto' }} onClick={() => setPalOpen(true)}>
          <Ico k="search" w={13} /> <span className="stxt">Search the knowledge base</span> <span className="kbd">⌘K</span>
        </button>
        <div className="asc-userav">AT</div>
      </header>

      <KgPalette open={palOpen} onClose={() => setPalOpen(false)} />

      <div className="asc-body">
        <aside className="asc-rail">
          <div className="asc-rail-sect">Organization</div>
          <div className="asc-nav on" onClick={goHome}><Ico k="org" w={15} /> Meridian org</div>
        </aside>
        <main className="asc-main">
          {React.createElement(window.MeridianOrg)}
        </main>
      </div>
    </div>
  );
}

export default OrgApp;
