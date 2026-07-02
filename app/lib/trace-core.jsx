import React from 'react';
/* ============================================================
   Cynergis — Traceability core (window-shared).
   Ports Product Studio's cross-linking model into the org app:
     · a single id → entity index across PRD + Architecture
     · a complete, bidirectional edge graph (everything that
       references everything related, both directions)
     · <Ref> clickable trace chips
     · <MermaidView> for value-stream / OKR / workflow / context
     · <EntityModal> universal detail with a back-stack and a
       "view in <section>" jump that drives the page rail.

   Detail bodies live in trace-details.jsx (window.renderEntityDetail).
   ============================================================ */
const { useState: useTS, useEffect: useTE, useRef: useTR, useContext: useTC, createContext: createTCx } = React;

/* ---------- section routing (which rail entry owns each kind) ---------- */
const SECTION = {
  sc:          { phase: 'Envision', entry: 'metrics' },
  objective:   { phase: 'Envision', entry: 'context' },
  kr:          { phase: 'Envision', entry: 'context' },
  dependency:  { phase: 'Discover', entry: 'xdeps' },
  persona:     { phase: 'Discover', entry: 'personas' },
  stakeholder: { phase: 'Discover', entry: 'stakeholders' },
  journey:     { phase: 'Discover', entry: 'journeys' },
  usecase:     { phase: 'Discover', entry: 'usecases' },
  fr:          { phase: 'Discover', entry: 'fr' },
  nfr:         { phase: 'Discover', entry: 'nfr' },
  policy:      { phase: 'Discover', entry: 'policies' },
  risk:        { phase: 'Discover', entry: 'xrisk' },
  governance:  { phase: 'Design',   entry: 'xgov' },
  security:    { phase: 'Design',   entry: 'xgov' },
  adr:         { phase: 'Design',   entry: 'arch' },
  component:   { phase: 'Design',   entry: 'arch' },
  integration: { phase: 'Design',   entry: 'arch' },
  api:         { phase: 'Design',   entry: 'arch' },
  resource:    { phase: 'Design',   entry: 'arch' },
};
/* glyph per kind — used on chips + in trace boxes */
const KGLYPH = {
  sc:'◎', objective:'◇', kr:'·', dependency:'⛓', persona:'☻', journey:'➤', risk:'△',
  usecase:'▤', fr:'⚙', nfr:'◈', policy:'§', governance:'⚖', security:'🔒', adr:'🧭',
  component:'▢', integration:'🔌', api:'❲❳', resource:'🗃', stakeholder:'♟',
};
const KLABEL = {
  sc:'Success metric', objective:'Objective', kr:'Key result', dependency:'Dependency',
  persona:'Persona', journey:'Journey', risk:'Risk', usecase:'Use case',
  fr:'Functional requirement', nfr:'Non-functional requirement', policy:'Policy',
  governance:'Governance', security:'Security control', adr:'Decision (ADR)',
  component:'Component', integration:'Integration', api:'API', resource:'Resource',
  stakeholder:'Stakeholder',
};

/* ============================================================
   Index builder — id → record, plus a bidirectional edge graph
   ============================================================ */
function buildTraceIndex(PRD, ARCH) {
  const byId = {};
  const add = (kind, id, label, sub, data) => {
    if (!id) return;
    byId[id] = { kind, id, label: label || id, sub: sub || '', section: SECTION[kind] || null, data: data || {} };
  };

  if (PRD) {
    (PRD.overview.criteria || []).forEach(c => add('sc', c.id, c.text, c.metric, c));
    (PRD.portfolio.objectives || []).forEach(o => {
      add('objective', o.id, o.objective, o.owner, o);
      (o.keyResults || []).forEach(k => add('kr', k.id, k.kr, k.contribution, k));
    });
    (PRD.portfolio.dependencies || []).forEach(d => add('dependency', d.id, d.product, d.direction, d));
    (PRD.personas || []).forEach(p => add('persona', p.id, p.name, p.role, p));
    (PRD.stakeholders || []).forEach(s => add('stakeholder', s.id, s.name, s.role, s));
    (PRD.journeys || []).forEach(j => add('journey', j.id, j.title, '', j));
    (PRD.usecases || []).forEach(u => add('usecase', u.id, u.title, '', u));
    (PRD.risk || []).forEach(r => add('risk', r.id, r.title, r.cat, r));
    ((PRD.specs && PRD.specs.functional) || []).forEach(f => add('fr', f.id, f.text, f.area, f));
    ((PRD.specs && PRD.specs.nonfunctional) || []).forEach(n => add('nfr', n.id, n.text, n.cat, n));
    ((PRD.specs && PRD.specs.policies) || []).forEach(p => add('policy', p.id, p.name, p.statement, p));
    (PRD.governance || []).forEach(g => add('governance', g.id, g.item, g.type, g));
  }
  if (ARCH) {
    (ARCH.decisions || []).forEach(d => add('adr', d.id, d.title, d.cat, d));
    (ARCH.domains || []).forEach(dm => (dm.components || []).forEach(c => add('component', c.id, c.name, dm.name, { ...c, domain: dm.name, domainColor: dm.color })));
    (ARCH.integrations || []).forEach(i => add('integration', i.id, i.system, i.direction, i));
    (ARCH.apis || []).forEach(a => add('api', a.id, a.method + ' ' + a.path, a.purpose, a));
    (ARCH.resources || []).forEach(r => add('resource', r.id, r.name, r.engine, r));
    (ARCH.security || []).forEach(s => add('security', s.id, s.control, '', s));
  }

  /* ---- edges: [from, to, fwdLabel, revLabel] ---- */
  const edges = [];
  const E = (from, to, fwd, rev) => { if (from && to && byId[from] && byId[to]) edges.push({ from, to, fwd, rev }); };

  if (PRD) {
    (PRD.portfolio.objectives || []).forEach(o => (o.keyResults || []).forEach(k => {
      E(o.id, k.id, 'Key result', 'Under objective');
      E(k.id, k.metric, 'Measured by', 'Moved by');
    }));
    ((PRD.specs && PRD.specs.functional) || []).forEach(f => {
      E(f.id, f.traceJ, 'Serves journey', 'Requires');
      E(f.id, f.traceSC, 'Targets metric', 'Met by requirement');
    });
    ((PRD.specs && PRD.specs.policies) || []).forEach(p => E(p.id, p.traceFR, 'Governs requirement', 'Bound by policy'));
    (PRD.usecases || []).forEach(u => {
      E(u.id, u.journeyId, 'Realizes journey', 'Realized by use case');
      E(u.id, u.primaryActor, 'Primary actor', 'Acts in use case');
      (u.frs || []).forEach(fr => E(u.id, fr, 'Exercises requirement', 'Exercised by use case'));
    });
    (PRD.journeys || []).forEach(j => E(j.id, j.personaId, 'Lived by', 'Drives journey'));
    (PRD.stakeholders || []).forEach(s => E(s.id, s.govLink, 'Cares about', 'Watched by stakeholder'));
  }
  if (ARCH) {
    (ARCH.decisions || []).forEach(d => (d.affects || []).forEach(r => E(d.id, r, 'Affects', 'Decided by ADR')));
    (ARCH.domains || []).forEach(dm => (dm.components || []).forEach(c => {
      (c.mapsTo || []).forEach(fr => E(c.id, fr, 'Implements', 'Implemented by component'));
      (c.businessRules || []).forEach(b => E(c.id, b.ref, 'Enforces', 'Enforced by component'));
      (c.dependency || []).forEach(dep => {
        const t = dep.type === 'resource' ? dep.ref : dep.type === 'integration' ? dep.ref : dep.ref;
        E(c.id, t, 'Depends on', 'Used by component');
      });
    }));
    (ARCH.apis || []).forEach(a => (a.realizes || []).forEach(fr => E(a.id, fr, 'Realizes', 'Exposed via API')));
    (ARCH.security || []).forEach(s => (s.addresses || []).forEach(r => E(s.id, r, 'Addresses', 'Controlled by')));
    (ARCH.integrations || []).forEach(i => E(i.id, i.dependsOn, 'Fulfils dependency', 'Realized by integration'));
  }

  /* dedupe identical (from,to,fwd) */
  const seen = new Set();
  const cleanEdges = edges.filter(e => { const k = e.from + '>' + e.to + '|' + e.fwd; if (seen.has(k)) return false; seen.add(k); return true; });

  /* grouped relationships for any id, deduped by target (first label wins) */
  function related(id) {
    const groups = {}; const used = new Set();
    const push = (label, targetId) => {
      const dedupeKey = label + '|' + targetId;
      if (used.has(dedupeKey)) return; used.add(dedupeKey);
      (groups[label] = groups[label] || []).push(targetId);
    };
    cleanEdges.forEach(e => { if (e.from === id) push(e.fwd, e.to); });
    cleanEdges.forEach(e => { if (e.to === id) push(e.rev, e.from); });
    return groups;  // { "label": [id, id...] }
  }

  return {
    get: id => byId[id] || null,
    has: id => !!byId[id],
    all: kind => Object.values(byId).filter(r => r.kind === kind),
    related,
    edges: cleanEdges,
    glyph: id => KGLYPH[(byId[id] || {}).kind] || '•',
    kindLabel: id => KLABEL[(byId[id] || {}).kind] || '',
  };
}

/* ============================================================
   Context + provider
   ============================================================ */
const TraceCtx = createTCx(null);
function useTrace() { return useTC(TraceCtx); }

function TraceProvider({ prd, arch, goTo, children }) {
  const idx = React.useMemo(() => buildTraceIndex(prd, arch), [prd, arch]);
  const [stack, setStack] = useTS([]);          // back-stack of ids
  const open = id => { if (idx.has(id)) setStack(s => (s[s.length - 1] === id ? s : [...s, id])); };
  // Global bridge so surfaces outside this React tree (e.g. the embedded event-flow
  // board) can open an entity's detail modal by id. No-ops for unindexed ids.
  useTE(() => {
    window.cynTraceOpen = id => { if (idx.has(id)) setStack(s => (s[s.length - 1] === id ? s : [...s, id])); };
    window.cynTraceHas = id => idx.has(id);
    return () => { if (window.cynTraceOpen) delete window.cynTraceOpen; if (window.cynTraceHas) delete window.cynTraceHas; };
  }, [idx]);
  const back = () => setStack(s => s.slice(0, -1));
  const close = () => setStack([]);
  const jump = (phase, entry) => { close(); if (goTo) goTo(phase, entry); };
  const ctx = { idx, open, back, close, jump, stack };
  return (
    <TraceCtx.Provider value={ctx}>
      {children}
      <EntityModal />
    </TraceCtx.Provider>
  );
}

/* ============================================================
   <Ref> — a clickable trace chip
   ============================================================ */
function Ref({ id, children, plain, showKind }) {
  const t = useTrace();
  if (!t || !t.idx.has(id)) return <span className="tr-ref tr-ref-dead">{children || id}</span>;
  const rec = t.idx.get(id);
  return (
    <button type="button" className={'tr-ref' + (plain ? ' plain' : '')}
      onClick={e => { e.stopPropagation(); t.open(id); }}
      title={(KLABEL[rec.kind] || '') + ' · ' + rec.label}>
      <span className="tr-ref-g">{KGLYPH[rec.kind] || '•'}</span>
      <span className="tr-ref-id">{children || id}</span>
      {showKind && <span className="tr-ref-k">{KLABEL[rec.kind]}</span>}
    </button>
  );
}
/* a row that reads "<glyph> ID · label" — used inside trace boxes */
function RefRow({ id }) {
  const t = useTrace();
  if (!t || !t.idx.has(id)) return null;
  const rec = t.idx.get(id);
  return (
    <button type="button" className="tr-refrow" onClick={e => { e.stopPropagation(); t.open(id); }}>
      <span className="tr-refrow-g">{KGLYPH[rec.kind] || '•'}</span>
      <span className="tr-refrow-id">{id}</span>
      <span className="tr-refrow-label">{rec.label}</span>
      <span className="tr-refrow-go">→</span>
    </button>
  );
}
/* a labelled group of related refs */
function TraceBox({ title, ids, sub }) {
  if (!ids || !ids.length) return null;
  return (
    <div className="tr-box">
      <div className="tr-box-h">{title}{sub && <span className="tr-box-sub">{sub}</span>}</div>
      <div className="tr-box-rows">{ids.map(id => <RefRow id={id} key={id} />)}</div>
    </div>
  );
}
/* renders ALL bidirectional relationships of an id, grouped by label */
function RelationshipPanel({ id }) {
  const t = useTrace();
  const groups = t.idx.related(id);
  const labels = Object.keys(groups);
  if (!labels.length) return null;
  return (
    <div className="tr-rel">
      <div className="tr-rel-h">Traceability — everything linked to this, both directions</div>
      <div className="tr-rel-grid">
        {labels.map(label => <TraceBox key={label} title={label} ids={groups[label]} />)}
      </div>
    </div>
  );
}

/* ============================================================
   <MermaidView> — render a mermaid graph, themed to the product
   ============================================================ */
let __mmId = 0;
/* mermaid's base theme runs khroma color math that throws on oklch();
   resolve a CSS color expression to #rrggbb regardless of source space. */
function oklchToHex(str) {
  const m = /oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/i.exec(str);
  if (!m) return null;
  let L = parseFloat(m[1]); if (m[1].indexOf('%') >= 0) L /= 100;
  const C = parseFloat(m[2]); const H = parseFloat(m[3]) * Math.PI / 180;
  const a = C * Math.cos(H), b = C * Math.sin(H);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, mm = m_ * m_ * m_, s = s_ * s_ * s_;
  let R = 4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  let G = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  let B = -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s;
  const g = x => { x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, x)); };
  const h = x => Math.round(g(x) * 255).toString(16).padStart(2, '0');
  return '#' + h(R) + h(G) + h(B);
}
function resolveColor(probe, expr, fallback) {
  try {
    probe.style.color = ''; probe.style.color = expr;
    const c = getComputedStyle(probe).color || '';
    if (c.indexOf('oklch') >= 0) return oklchToHex(c) || fallback;
    if (/^rgb/.test(c)) return c;
    return c || fallback;
  } catch (e) { return fallback; }
}
function MermaidView({ code, caption }) {
  const host = useTR(null);
  useTE(() => {
    let dead = false;
    const el = host.current;
    if (!el) return;
    if (!window.mermaid) { el.innerHTML = '<pre class="mm-fallback">' + (code || '').replace(/</g, '&lt;') + '</pre>'; return; }
    try {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      el.appendChild(probe);
      const cs = getComputedStyle(el);
      const accent = resolveColor(probe, 'var(--accent)', '#5b54d6');
      const accentSoft = resolveColor(probe, 'var(--accent-soft)', '#eef1ff');
      const ink1 = resolveColor(probe, 'var(--ink-1)', '#1c1c22');
      const ink4 = resolveColor(probe, 'var(--ink-4)', '#9aa0ad');
      const panel = resolveColor(probe, 'var(--panel)', '#ffffff');
      const bg = resolveColor(probe, 'var(--bg)', '#f7f7fb');
      const line = resolveColor(probe, 'var(--line)', '#e6e6ee');
      el.removeChild(probe);
      window.mermaid.initialize({
        startOnLoad: false, securityLevel: 'loose', flowchart: { curve: 'basis', useMaxWidth: true }, theme: 'base',
        themeVariables: {
          fontFamily: (cs.getPropertyValue('--font-sans').trim() || 'system-ui') + ', sans-serif', fontSize: '13px',
          primaryColor: accentSoft, primaryBorderColor: accent, primaryTextColor: ink1, lineColor: ink4,
          secondaryColor: panel, tertiaryColor: bg, clusterBkg: bg, clusterBorder: line,
          mainBkg: panel, nodeBorder: accent, edgeLabelBackground: panel, titleColor: ink1,
        }
      });
      const id = 'mm' + (++__mmId);
      window.mermaid.render(id, code).then(({ svg, bindFunctions }) => {
        if (dead || !host.current) return;
        host.current.innerHTML = svg;
        if (bindFunctions) bindFunctions(host.current);   // wires click/tooltip directives (Mermaid v11)
      })
        .catch(() => { if (host.current) host.current.innerHTML = '<pre class="mm-fallback">' + (code || '').replace(/</g, '&lt;') + '</pre>'; });
    } catch (e) {
      el.innerHTML = '<pre class="mm-fallback">' + (code || '').replace(/</g, '&lt;') + '</pre>';
    }
    return () => { dead = true; };
  }, [code]);
  return (
    <div className="mm-block">
      <div className="mm-wrap" ref={host}></div>
      {caption && <div className="mm-cap">{caption}</div>}
    </div>
  );
}

/* mermaid source builders shared across surfaces */
function mclean(t) { return (t || '').replace(/"/g, '').replace(/\n/g, ' ').trim(); }
function valueStreamMermaid(valueStream) {
  const raw = (valueStream || '').split('—')[0];
  const stages = raw.split(/->|→|⟶/).map(s => mclean(s)).filter(Boolean);
  if (stages.length < 2) return '';
  return 'flowchart LR\n' + stages.map((s, i) => `  N${i}["${s}"]`).join('\n') + '\n' +
    stages.slice(1).map((_, i) => `  N${i} --> N${i + 1}`).join('\n');
}
function okrTreeMermaid(objectives) {
  let s = 'flowchart LR\n';
  (objectives || []).forEach((o, i) => {
    const on = 'O' + i; s += `  ${on}["${mclean(o.objective)}"]\n`;
    (o.keyResults || []).forEach((k, j) => {
      const kn = on + 'K' + j;
      s += `  ${on} --> ${kn}["${mclean(k.kr)}"]\n`;
      if (k.metric) s += `  ${kn} --> ${kn}M(["${mclean(k.metric)}"])\n`;
    });
  });
  return s;
}

/* ============================================================
   <EntityModal> — universal detail with back-stack + jump
   ============================================================ */
function EntityModal() {
  const t = useTrace();
  const { stack, idx, back, close, jump } = t;
  useTE(() => {
    const onKey = e => { if (e.key === 'Escape') { stack.length > 1 ? back() : close(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stack.length]);
  if (!stack.length) return null;
  const id = stack[stack.length - 1];
  const rec = idx.get(id);
  if (!rec) return null;
  const sect = rec.section;
  const helpers = { Ref, RefRow, TraceBox, RelationshipPanel, MermaidView, open: t.open, idx };
  const body = (typeof window.renderEntityDetail === 'function')
    ? window.renderEntityDetail(rec, helpers)
    : <div className="tr-fallback">{rec.label}</div>;
  return (
    <div className="tr-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="tr-modal" role="dialog" aria-modal="true">
        <div className="tr-modal-head">
          <div className="tr-modal-head-l">
            {stack.length > 1 && <button className="tr-modal-back" onClick={back} title="Back">←</button>}
            <span className="tr-modal-kind">{KGLYPH[rec.kind]} {KLABEL[rec.kind]}</span>
            <span className="tr-modal-id">{rec.id}</span>
          </div>
          <div className="tr-modal-head-r">
            {sect && <button className="tr-modal-jump" onClick={() => jump(sect.phase, sect.entry)}>View in {sect.phase}</button>}
            <button className="tr-modal-x" onClick={close} title="Close">×</button>
          </div>
        </div>
        <div className="tr-modal-title">{rec.label}</div>
        <div className="tr-modal-body">{body}</div>
      </div>
    </div>
  );
}

/* share across babel scripts */
Object.assign(window, {
  buildTraceIndex, TraceProvider, useTrace, Ref, RefRow, TraceBox, RelationshipPanel,
  MermaidView, valueStreamMermaid, okrTreeMermaid, mclean, TRACE_KGLYPH: KGLYPH, TRACE_KLABEL: KLABEL,
});
