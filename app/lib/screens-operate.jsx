import React from 'react';
import './trace-core';
import './ops-data';
import { kgSlos, kgFleet, kgIncidents, kgApprovals, kgRunbooks, kgExecutors, stageChange, telemetry as kgTelemetry } from './kg-query';
const { Ref: ORef } = window;

/* ============================================================
   Cynergis — Operate phase surfaces (D-054).
   The live-operations state per the Operate spec (D-016/017/018):
   Fleet & SLAs (the Operator control plane + governance profiles),
   Incidents (both planes), Approvals (trust-ladder queue + D-021
   ceiling), Runbooks (incl. the D-051 agent kill-switch).
   Driven by window.__OPS__, cross-referencing __ARCH__ ids.
   ============================================================ */

/* self-contained icons (babel scripts don't share scope) */
const OIco = ({ k, w = 15 }) => {
  const P = {
    gauge: <path d="M2.5 11.5a5.5 5.5 0 1 1 11 0M8 8l2.6-2.2" />,
    alert: <path d="M8 2.5 14 13H2zM8 6.5v3M8 11h.01" />,
    check: <path d="M3.5 8.5l3 3 6-6.5" />,
    board: <path d="M2.5 3.5h11v9h-11zM2.5 6.5h11M6 6.5v6" />,
    spark: <path d="M8 2.5l1.4 3.6L13 7.5l-3.6 1.4L8 12.5 6.6 8.9 3 7.5l3.6-1.4z" />,
    loop:  <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5" />,
    lock:  <path d="M4.5 7.5V5.5a3.5 3.5 0 0 1 7 0v2M3.5 7.5h9v6h-9zM8 10v1.5" />,
  };
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{P[k] || P.gauge}</svg>;
};
const OSec = ({ icon, title, sub, children }) => (
  <div className="asc-section">
    <div className="asc-sec-head">
      <div className="asc-sec-title"><OIco k={icon} w={15} /> {title}</div>
      {sub && <div className="asc-sec-sub">{sub}</div>}
    </div>
    {children}
  </div>
);

const opsNav = (entry) => {
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Operate', entry };
  window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
};
const archById = (id) => {
  const A = window.__ARCH__ || {};
  const comps = (A.domains || []).flatMap(dm => dm.components || []);
  return comps.find(c => c.id === id) || (A.agents || []).find(a => a.id === id) || null;
};
const nameOf = (id) => archById(id)?.name || id;

const KIND_LBL = { service: 'Service', data: 'Data', agentic: 'Agent', workflow: 'Workflow', webapp: 'Web app' };
const HealthDot = ({ h }) => <span className={'ops-health ' + h} title={h === 'ok' ? 'healthy' : 'degraded'} />;

/* ---- charts: hand-rolled SVG, no library ---- */
const Spark = ({ pts, w = 110, h = 26, tone = 'ok', target = null }) => {
  const lo = Math.min(...pts, target ?? Infinity), hi = Math.max(...pts, target ?? -Infinity);
  const span = (hi - lo) || 1;
  const y = v => h - 3 - ((v - lo) / span) * (h - 6);
  const xy = pts.map((v, i) => `${(i / (pts.length - 1)) * (w - 6) + 3},${y(v)}`).join(' ');
  return (
    <svg width={w} height={h} className={'ops-spark ' + tone}>
      {target != null && <line x1="3" x2={w - 3} y1={y(target)} y2={y(target)} className="ops-spark-target" />}
      <polyline points={xy} fill="none" />
      <circle cx={w - 3} cy={y(pts[pts.length - 1])} r="2.5" />
    </svg>
  );
};
const VolChart = ({ v }) => {
  const W = 640, H = 130, P = 8;
  const n = v.decisionsK.length;
  const x = i => P + (i / (n - 1)) * (W - 2 * P);
  const vMax = Math.max(...v.decisionsK) * 1.15;
  const vy = k => H - P - (k / vMax) * (H - 2 * P);
  const pLo = 260, pHi = Math.max(v.budget, ...v.p95) + 6;
  const py = ms => H - P - ((ms - pLo) / (pHi - pLo)) * (H - 2 * P);
  const area = 'M' + v.decisionsK.map((k, i) => `${x(i)},${vy(k)}`).join(' L') + ` L${x(n - 1)},${H - P} L${x(0)},${H - P} Z`;
  const line = v.p95.map((ms, i) => `${x(i)},${py(ms)}`).join(' ');
  return (
    <div className="ops-volwrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="ops-vol" preserveAspectRatio="none">
        <path d={area} className="ops-vol-area" />
        <line x1={P} x2={W - P} y1={py(v.budget)} y2={py(v.budget)} className="ops-vol-budget" />
        <polyline points={line} className="ops-vol-p95" fill="none" />
      </svg>
      <div className="ops-vol-legend">
        <span className="lg vol">decisions / hour (peak {Math.max(...v.decisionsK)}k)</span>
        <span className="lg p95">p95 latency (now {v.p95[v.p95.length - 1]} ms)</span>
        <span className="lg budget">300 ms budget (NFR1)</span>
        <span className="ops-asof">last 24 h</span>
      </div>
    </div>
  );
};

/* ---- big trend chart for the SLO detail (D-060) ---- */
const BigTrend = ({ pts, unit, tone, targetV = null, targetLabel = null, xlabels = ['10 w ago', '5 w', 'now'] }) => {
  const W = 640, H = 210, L = 52, R = 16, T = 18, B = 30;
  const lo0 = Math.min(...pts, targetV ?? Infinity), hi0 = Math.max(...pts, targetV ?? -Infinity);
  const pad = (hi0 - lo0) * 0.15 || 1;
  const min = lo0 - pad, max = hi0 + pad;
  const x = i => L + (i / (pts.length - 1)) * (W - L - R);
  const y = v => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const line = pts.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const area = `M${line.split(' ').join(' L')} L${x(pts.length - 1)},${H - B} L${x(0)},${H - B} Z`;
  const fmt = v => (Math.round(v * 100) / 100) + (unit === '%' ? '%' : unit ? ' ' + unit : '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={'ops-big ' + tone} preserveAspectRatio="none">
      {targetV != null && <line x1={L} x2={W - R} y1={y(targetV)} y2={y(targetV)} className="ops-big-target" />}
      {targetV != null && targetLabel && <text x={W - R} y={y(targetV) - 5} textAnchor="end" className="ops-big-tlabel">{targetLabel}</text>}
      <path d={area} className="ops-big-area" />
      <polyline points={line} className="ops-big-line" fill="none" />
      {pts.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === pts.length - 1 ? 4 : 2.5} className={i === pts.length - 1 ? 'cur' : ''}>
          <title>{fmt(v)}</title>
        </circle>
      ))}
      <text x={L - 8} y={y(hi0) + 4} textAnchor="end" className="ops-big-axis">{fmt(hi0)}</text>
      <text x={L - 8} y={y(lo0) + 4} textAnchor="end" className="ops-big-axis">{fmt(lo0)}</text>
      <text x={x(0)} y={H - 8} textAnchor="start" className="ops-big-axis">{xlabels[0]}</text>
      <text x={x(Math.floor((pts.length - 1) / 2))} y={H - 8} textAnchor="middle" className="ops-big-axis">{xlabels[1]}</text>
      <text x={x(pts.length - 1)} y={H - 8} textAnchor="end" className="ops-big-axis">{xlabels[2]}</text>
    </svg>
  );
};

/* ---- Operate · Fleet & SLAs (D-057, layout D-060: tabs + SLO detail) ---- */
const ACTION_META = {
  'throttle':    { label: 'Throttle',           agentTool: true },
  'rollback':    { label: 'Roll back',          agentTool: true },
  'pause':       { label: 'Pause',              agentTool: false },
  'pause-agent': { label: 'Pause agent',        agentTool: false },
  'envelope':    { label: 'Adjust envelope →',  agentTool: false },
};
function OpsFleet() {
  const O = window.__OPS__;
  // D-068/D-070: SLOs and fleet are saved queries over the derived knowledge
  // graph; series arrive through the graph's observed_via pointers (DS-OBS).
  // The hand-seeds remain only as fallbacks if the generated KB is absent.
  const slos = kgSlos() || O.slos;
  const fleet = kgFleet() || O.fleet;
  const [tab, setTab] = React.useState('slos');   // slos | fleet | log
  const [selSlo, setSelSlo] = React.useState(() => {
    const b = (typeof window !== 'undefined' && window.__cynOpsOpenSlo) || null;
    if (typeof window !== 'undefined') delete window.__cynOpsOpenSlo;
    return b;
  });
  const [selFleet, setSelFleet] = React.useState(null);
  const [, bump] = React.useState(0);   // console actions mutate the seed in memory (a reload restores it)
  if (!O) return null;

  const record = (action, target, via) => {
    O.actionLog.unshift({ t: new Date().toISOString().slice(0, 16).replace('T', ' '), actor: 'You — console (human-executed at Suggest)', action, target, via });
    bump(n => n + 1);
  };
  const act = (f, a) => {
    const nm = nameOf(f.id);
    if (a === 'pause-agent') {
      f.paused = !f.paused;
      record(f.paused ? 'Agent paused — MCP server disabled (kill-switch)' : 'Agent resumed — MCP server re-enabled', f.id, 'RB-6');
    } else if (a === 'envelope') {
      // D-085: the created approval goes to the SAME queue the surface reads
      // (the KG view models) and is staged onto the gated write path
      const aprs = kgApprovals() || O.approvals;
      const id = 'APR-' + (105 + aprs.filter(x => x.kind === 'envelope change').length);
      const apr = { id, status: 'pending', kind: 'envelope change', date: new Date().toISOString().slice(0, 10),
        title: 'Envelope change for ' + nm, requestedBy: 'You — console', approver: 'Regina Foss — Model Risk',
        evidence: 'Requested from the fleet view; scope and limits to be specified in review.',
        links: {}, note: 'Envelope changes are governance acts (D-056) — routed for approval, never applied directly.' };
      aprs.unshift(aprs === O.approvals ? apr : { ...apr, title: apr.title, _kg: true });
      stageChange('approval.create', id, apr).catch(() => {});
      record('Envelope change routed for approval (' + id + ') — staged for the write path', f.id, 'D-056');
    } else if (a === 'rollback') {
      record('Rollback to previous version requested', f.id, 'RB-3');
    } else {
      record(ACTION_META[a].label + ' applied', f.id, 'RB-1');
    }
  };
  const goRelated = (r) => {
    if (r.kind === 'incident') { window.__cynOpsOpenInc = r.id; opsNav('incidents'); }
    else if (r.kind === 'approval') { window.__cynOpsOpenApr = r.id; opsNav('approvals'); }
    else if (r.kind === 'runbook') { window.__cynOpsOpen = r.id; opsNav('runbooks'); }
    else if (r.kind === 'slo') { setTab('slos'); setSelFleet(null); setSelSlo(r.id); }
    else if (r.kind === 'agent') {
      window.__cynAgentOpen = { id: r.id, tab: 'knowledge' };
      const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
      const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Build', entry: 'agents' };
      window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
    }
  };

  // ---------- SLO detail: one objective, dashboard-style ----------
  const slo = slos.find(x => x.id === selSlo);
  if (tab === 'slos' && slo) {
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelSlo(null)}>← SLOs & value targets</button>
      <div className="tstx-dh">
        <span className="tst-uc-t">{slo.name}</span>
        {slo.ref && <span onClick={e => e.stopPropagation()}><ORef id={slo.ref} /></span>}
        <span className={'ops-slo-state ' + slo.state}>{slo.state === 'ok' ? 'on target' : 'off target'}</span>
        <span className="ops-asof">{slo.group.toLowerCase()} · as of {O.asOf}</span>
        {slo._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph (Slo node + typed edges); the trend series is dereferenced through the node's observed_via pointer into the DS-OBS DataSource.">KG · DS-OBS</span>}
      </div>

      <div className="ops-hero">
        <div className={'ops-hero-card ' + slo.state}>
          <div className="ops-hero-k">current</div>
          <div className="ops-hero-v">{slo.current}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">target</div>
          <div className="ops-hero-v muted">{slo.target}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">budget / gap</div>
          <div className="ops-hero-v small">{slo.budget}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">owner · window</div>
          <div className="ops-hero-v small">{slo.owner}<span className="ops-hero-sub">{slo.window} trend below</span></div>
        </div>
      </div>

      <div className="ops-bigwrap">
        <BigTrend pts={slo.history} unit={slo.unit} tone={slo.state} targetV={slo.targetV} targetLabel={'target ' + slo.target} />
        <div className="ops-big-strip">
          {slo.history.map((v, i) => (
            <span key={i} className={'evx-hrun' + (i === slo.history.length - 1 ? ' cur' : '')}>{slo.history.length - 1 - i === 0 ? 'now' : (slo.history.length - 1 - i) + ' w'}<b>{v}{slo.unit === '%' ? '%' : ' ' + slo.unit}</b></span>
          ))}
        </div>
      </div>

      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">context</span><div className="dd-idef-v">{slo.note}</div></div>
        {slo.related && (
          <div className="dd-idef"><span className="dd-iext-k">related</span>
            <div className="dd-idef-v ops-related">
              {slo.related.map((r, i) => r.kind === 'none'
                ? <span key={i} className="ops-rel plain">{r.label}</span>
                : <button key={i} type="button" className="ops-rel" onClick={() => goRelated(r)}>{r.label} →</button>)}
            </div>
          </div>
        )}
      </div>
    </>);
  }

  // ---------- fleet detail: one component, dashboard-style (D-060) ----------
  const fc = fleet.find(x => x.id === selFleet);
  if (tab === 'fleet' && fc) {
    const myLog = O.actionLog.filter(l => l.target === fc.id);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelFleet(null)}>← Fleet</button>
      <div className="tstx-dh">
        <HealthDot h={fc.paused ? 'warn' : fc.health} />
        <span className="tst-uc-t">{fc.name || nameOf(fc.id)}</span>
        {fc.paused && <span className="ops-paused">paused</span>}
        <span className={'ops-kind k-' + fc.kind}>{KIND_LBL[fc.kind] || fc.kind}</span>
        <span className="ops-profile">{fc.profile} profile</span>
        {fc.tier && <span className={'agb-tier ' + fc.tier.toLowerCase()}>{fc.tier}</span>}
        <span onClick={e => e.stopPropagation()}><ORef id={fc.id} /></span>
        {fc._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph (Component/Agent node governed by the Operator via governs_runtime); telemetry & trend are dereferenced through the node's observed_via pointer into DS-OBS.">KG · DS-OBS</span>}
      </div>

      <div className="ops-hero">
        <div className={'ops-hero-card ' + (fc.paused ? 'warn' : fc.health)}>
          <div className="ops-hero-k">throughput</div>
          <div className="ops-hero-v small">{fc.telemetry.runs}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">{fc.kind === 'agentic' ? 'doctrine' : 'quality'}</div>
          <div className="ops-hero-v small">{fc.telemetry.success}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">latency</div>
          <div className="ops-hero-v small">{fc.telemetry.latency}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">cost</div>
          <div className="ops-hero-v small">{fc.telemetry.cost}</div>
        </div>
      </div>

      <div className="ops-bigwrap">
        <BigTrend pts={fc.trend} unit="" tone={fc.health} xlabels={['14 d ago', '7 d', 'now']} />
        <div className="ops-vol-legend"><span className="ops-trendlbl">{fc.trendLabel}</span></div>
      </div>

      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">drift</span><div className="dd-idef-v">{fc.telemetry.drift}</div></div>
        {fc.note && <div className="dd-idef"><span className="dd-iext-k">note</span><div className="dd-idef-v">{fc.note}</div></div>}
        <div className="dd-idef"><span className="dd-iext-k">controls</span>
          <div className="dd-idef-v">
            <span className="ops-actions">
              {(fc.actions || []).map(a => (
                <button type="button" key={a} className={'ops-act' + (ACTION_META[a].agentTool ? '' : ' hu')}
                  title={ACTION_META[a].agentTool ? 'Operational act — also a tool of the subdomain agent, tier-governed (D-051)' : 'Governance act — human-reserved, never an agent tool (D-056)'}
                  onClick={() => act(fc, a)}>
                  {a === 'pause-agent' && fc.paused ? 'Resume agent' : ACTION_META[a].label}
                </button>
              ))}
            </span>
          </div>
        </div>
        {fc.related && (
          <div className="dd-idef"><span className="dd-iext-k">related</span>
            <div className="dd-idef-v ops-related">
              {fc.related.map((r, i) => r.kind === 'none'
                ? <span key={i} className="ops-rel plain">{r.label}</span>
                : <button key={i} type="button" className="ops-rel" onClick={() => goRelated(r)}>{r.label} →</button>)}
            </div>
          </div>
        )}
        {myLog.length > 0 && (
          <div className="dd-idef"><span className="dd-iext-k">recent actions</span>
            <div className="dd-idef-v">
              {myLog.map((l, i) => <div className="ops-mini-log" key={i}><span className="ops-log-t">{l.t}</span> {l.action} <span className="ops-log-via">{l.via}</span></div>)}
            </div>
          </div>
        )}
      </div>
    </>);
  }

  // ---------- the page: operator identity + three tabs ----------
  return (<>
    <p className="dd-lead">The live product under the <b>Operator</b> — one control loop ({O.operator.loop}) governs every deployed component through the governance profile its kind demands.</p>

    <div className="ops-operator">
      <span className="ops-operator-ic"><OIco k="loop" w={16} /></span>
      <div>
        <div className="ops-operator-h">Operator — the control plane <span className="agb-tier suggest">Suggest</span><span className="agb-status running">running</span><span className="ops-asof">as of {O.asOf}</span></div>
        <div className="ops-operator-note"><b>This is an agent, and it is implemented</b> — the same anatomy as the subdomain agents (knowledge · toolset · skills · trust tier), scoped to the whole mesh instead of one subdomain: its subdomain is the running product itself. {O.operator.note}</div>
        <div className="ops-op-grid">
          <div className="ops-op-col">
            <div className="ops-op-k">what it knows</div>
            {O.operator.knows.map((k, i) => <div className="ops-op-item" key={i}>{k}</div>)}
          </div>
          <div className="ops-op-col">
            <div className="ops-op-k">its skills — with proof on this page</div>
            {O.operator.skills.map((sk, i) => <div className="ops-op-item" key={i}>{sk.name} <span className="ops-op-proof">{sk.proof}</span></div>)}
          </div>
          <div className="ops-op-col">
            <div className="ops-op-k">what it never does</div>
            <div className="ops-op-item">{O.operator.never}</div>
          </div>
        </div>
      </div>
    </div>

    <div className="ddd-tabs">
      {[['slos', `SLOs & value targets · ${slos.length}`], ['fleet', `Fleet · ${fleet.length}`], ['log', `Recorded actions · ${O.actionLog.length}`]].map(([k, lbl]) => (
        <button key={k} type="button" className={'ddd-tab' + (tab === k ? ' on' : '')} onClick={() => { setTab(k); setSelSlo(null); setSelFleet(null); }}>{lbl}</button>
      ))}
    </div>

    {tab === 'slos' && (
      <div className="tstx-group ops-slolist">
        {slos[0] && slos[0]._kg && (
          <div className="ops-kgline">Derived surface — definitions, targets and relations read from the knowledge graph (<b>{window.__KG__.stats.nodes} nodes · {window.__KG__.stats.edges} edges · {window.__KG__.stats.unresolved} unresolved</b>, ontology {window.__KG__.ontologyVersion}); trend series dereferenced via <b>observed_via → DS-OBS</b>. The graph holds the pointer, never the telemetry (D-066).</div>
        )}
        {['Service objectives', 'Value targets'].map(grp => (
          <React.Fragment key={grp}>
            <div className="ops-slt-grp">{grp}</div>
            {slos.filter(x => x.group === grp).map(x => (
              <div role="button" tabIndex={0} className="tstx-row ops-slorow" key={x.id}
                onClick={() => setSelSlo(x.id)} onKeyDown={e => { if (e.key === 'Enter') setSelSlo(x.id); }}>
                <span className={'ops-health ' + (x.state === 'ok' ? 'ok' : 'warn')} />
                <span className="ops-slorow-nm">{x.name}{x.ref && <span onClick={e => e.stopPropagation()}><ORef id={x.ref} /></span>}</span>
                <span className={'ops-slorow-cur ' + x.state}>{x.current}</span>
                <span className="ops-slorow-tgt">target {x.target}</span>
                <Spark pts={x.history} tone={x.state} target={x.targetV} w={130} h={30} />
                <span className="ops-slorow-bud">{x.budget}</span>
                <span className="dd-irow-go">›</span>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    )}

    {tab === 'fleet' && (<>
      <VolChart v={kgTelemetry('volume24h') || O.volume24h} />
      {fleet[0] && fleet[0]._kg && (
        <div className="ops-kgline">Derived surface — the fleet is what the Operator governs (<b>governs_runtime</b> edges, in edge order); profiles, tiers & controls are node props, telemetry dereferenced via <b>observed_via → DS-OBS</b>. Tiers read in the canonical ladder (D-067).</div>
      )}
      <div className="asc-panel ops-panel">
        {fleet.map(f => (
          <div className="ops-fleet-row clickable" role="button" tabIndex={0} key={f.id}
            onClick={() => setSelFleet(f.id)} onKeyDown={e => { if (e.key === 'Enter') setSelFleet(f.id); }}>
            <div className="ops-fleet-h">
              <HealthDot h={f.paused ? 'warn' : f.health} />
              <span className="ops-fleet-nm">{f.name || nameOf(f.id)}</span>
              {f.paused && <span className="ops-paused">paused</span>}
              <span className={'ops-kind k-' + f.kind}>{KIND_LBL[f.kind] || f.kind}</span>
              <span className="ops-profile">{f.profile}</span>
              {f.tier && <span className={'agb-tier ' + f.tier.toLowerCase()}>{f.tier}</span>}
              <span className="ops-fleet-sp"><Spark pts={f.trend} tone={f.health} w={96} h={22} /><span className="ops-trendlbl">{f.trendLabel}</span></span>
              <span className="ops-actions" onClick={e => e.stopPropagation()}>
                {(f.actions || []).map(a => (
                  <button type="button" key={a} className={'ops-act' + (ACTION_META[a].agentTool ? '' : ' hu')}
                    title={ACTION_META[a].agentTool ? 'Operational act — also a tool of the subdomain agent, tier-governed (D-051)' : 'Governance act — human-reserved, never an agent tool (D-056)'}
                    onClick={() => act(f, a)}>
                    {a === 'pause-agent' && f.paused ? 'Resume agent' : ACTION_META[a].label}
                  </button>
                ))}
              </span>
              <span onClick={e => e.stopPropagation()}><ORef id={f.id} /></span>
              <span className="dd-irow-go">›</span>
            </div>
            <div className="ops-telemetry">
              <span>{f.telemetry.runs}</span><span>{f.telemetry.success}</span><span>{f.telemetry.latency}</span><span>{f.telemetry.cost}</span><span>{f.telemetry.drift}</span>
            </div>
            {f.note && <div className="ops-fleet-note">{f.note}</div>}
          </div>
        ))}
        <div className="ops-act-legend">Solid actions are <b>operational</b> — also tools of the subdomain agents, tier-governed (D-051). Outlined actions are <b>governance</b> — human-reserved, never agent tools (D-056); envelope changes route through Approvals.</div>
      </div>
    </>)}

    {tab === 'log' && (
      <div className="asc-panel ops-panel">
        {O.actionLog.map((l, i) => (
          <div className="ops-log-row" key={i}>
            <span className="ops-log-t">{l.t}</span>
            <span className="ops-log-a">{l.action}</span>
            <span onClick={e => e.stopPropagation()}><ORef id={l.target} /></span>
            <span className="ops-log-via">{l.via}</span>
            <span className="ops-log-who">{l.actor}</span>
          </div>
        ))}
      </div>
    )}
  </>);
}

/* ---- Operate · Incidents — full agent-operation mode (D-058) ---- */
const SEV_TONE = { SEV1: 'fail', SEV2: 'fail', SEV3: 'warn' };
const pipeState = (inc) => {
  if (inc.escalation) return inc.escalation.requested ? { k: 'harness', label: 'deep dive running' } : { k: 'input', label: 'needs human input' };
  if (inc.remediation?.status === 'proposed') return { k: 'apply', label: 'awaiting apply' };
  if (inc.remediation?.status === 'applied') return { k: 'done', label: 'remediated' };
  return { k: 'done', label: inc.status };
};
function OpsIncidents() {
  const O = window.__OPS__;
  const [selId, setSelId] = React.useState(() => {
    const b = (typeof window !== 'undefined' && window.__cynOpsOpenInc) || null;
    if (typeof window !== 'undefined') delete window.__cynOpsOpenInc;
    return b;
  });
  const [, bump] = React.useState(0);
  if (!O) return null;
  // D-071: the register is a saved query over Incident nodes (the structured
  // curated record); timeline dereferences via observed_via → DS-OBS.
  const incidents = kgIncidents() || O.incidents;
  const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  const applyRemediation = (inc) => {
    inc.remediation.status = 'applied';
    inc.remediation.appliedBy = 'You — console';
    inc.remediation.at = now();
    inc.status = 'monitoring';
    inc.timeline = [...inc.timeline, now() + '  remediation applied (human-approved via console) — ' + inc.remediation.action];
    O.actionLog.unshift({ t: now(), actor: 'You — console (human-approved)', action: 'Remediation applied: ' + inc.title, target: inc.impacted[0], via: inc.id + ' · ' + inc.remediation.runbook });
    // D-085: the optimistic echo above; the durable record travels the write path
    stageChange('incident.apply', inc.id, { appliedBy: inc.remediation.appliedBy, at: inc.remediation.at, action: inc.remediation.action })
      .then(res => { inc.staged = res; bump(n => n + 1); })
      .catch(() => { inc.staged = { error: 'intake unreachable — the apply is in-memory only until re-staged' }; bump(n => n + 1); });
    bump(n => n + 1);
  };
  const escalate = (inc) => {
    inc.escalation.requested = true;
    inc.timeline = [...inc.timeline, now() + '  deep-investigation session launched in the agentic harness (Claude Code) with the incident context'];
    O.actionLog.unshift({ t: now(), actor: 'You — console', action: 'Deep investigation launched in the harness (Claude Code)', target: inc.impacted[0], via: inc.id });
    stageChange('incident.escalate', inc.id, { at: now() })
      .then(res => { inc.staged = res; bump(n => n + 1); })
      .catch(() => { inc.staged = { error: 'intake unreachable — the escalation is in-memory only until re-staged' }; bump(n => n + 1); });
    bump(n => n + 1);
  };
  const sel = incidents.find(i => i.id === selId);

  if (sel) {
    const ps = pipeState(sel);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Incidents</button>
      <div className="tstx-dh">
        <span className={'ops-sev ' + (SEV_TONE[sel.sev] || 'warn')}>{sel.sev}</span>
        <span className="tst-uc-t">{sel.title}</span>
        <span className={'ops-inc-st ' + sel.status}>{sel.status}</span>
        <span className={'ops-plane ' + sel.plane}>{sel.plane} plane</span>
        <span className={'ops-pipe ' + ps.k}>{ps.label}</span>
        {sel._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph — the Incident node carries the structured curated record (discovery · findings · triage · remediation · hypotheses); impacted set and matched runbook are impacts / remediated_by edges; the raw timeline is dereferenced through observed_via into DS-OBS.">KG · DS-OBS</span>}
      </div>
      {sel.staged && (
        <div className="ops-kgline">{sel.staged.error
          ? <>⚠ {sel.staged.error}</>
          : <>Act <b>staged for the gated write path</b> — change <b>{sel.staged.id}</b> routed to <b>{sel.staged.route}</b>. Apply with <b>node kg/apply.js</b>: spec → regenerate → the record returns from the derived KB and survives reload (D-066 doctrine 4).</>}
        </div>
      )}
      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">opened</span><div className="dd-idef-v">{sel.opened}{sel.resolved && <> · resolved <b>{sel.resolved}</b></>}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">impacted</span><div className="dd-idef-v" onClick={e => e.stopPropagation()}>{sel.impacted.map(id => <ORef id={id} key={id} />)}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">impact</span><div className="dd-idef-v">{sel.impact}</div></div>
        {sel.discovery && <div className="dd-idef"><span className="dd-iext-k">discovered</span><div className="dd-idef-v"><b>{sel.discovery.by}</b> · {sel.discovery.at} — {sel.discovery.signal}</div></div>}
        {sel.investigation && (
          <div className="dd-idef"><span className="dd-iext-k">investigation</span>
            <div className="dd-idef-v">
              <div className="ops-inv-by">by <b>{sel.investigation.by}</b></div>
              <ul className="ops-inv">{sel.investigation.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          </div>
        )}
        <div className="dd-idef"><span className="dd-iext-k">runbook</span><div className="dd-idef-v"><button type="button" className="coa-kg-link evx-inline" onClick={() => { window.__cynOpsOpen = sel.runbook; opsNav('runbooks'); }}>{sel.runbook} — matched by the Operator, open it →</button></div></div>
        {sel.followUp && <div className="dd-idef"><span className="dd-iext-k">follow-up</span><div className="dd-idef-v">{sel.followUp}</div></div>}
      </div>

      {sel.remediation && (
        <div className={'ops-remed' + (sel.remediation.status === 'applied' ? ' applied' : '')}>
          <div className="ops-remed-h">
            <OIco k={sel.remediation.status === 'applied' ? 'check' : 'alert'} w={14} />
            {sel.remediation.status === 'applied'
              ? <>Remediation applied <span className="ops-remed-meta">by {sel.remediation.appliedBy} · {sel.remediation.at} · {sel.remediation.runbook}</span></>
              : <>Proposed remediation <span className="ops-remed-meta">low-risk · prepared by the agent · {sel.remediation.runbook}</span></>}
          </div>
          <div className="ops-remed-a">{sel.remediation.action}</div>
          {sel.remediation.why && sel.remediation.status !== 'applied' && <div className="ops-remed-why">{sel.remediation.why}</div>}
          {sel.remediation.status !== 'applied' && (
            <div className="ops-decide-btns">
              <button type="button" className="ops-btn approve" onClick={() => applyRemediation(sel)}>Apply remediation</button>
              <span className="ops-remed-note">One human approval — investigation and resolution were prepared by the agent.</span>
            </div>
          )}
        </div>
      )}

      {sel.hypotheses && (
        <div className="ops-hypo">
          <div className="ops-remed-h"><OIco k="spark" w={14} /> Remediation hypotheses <span className="ops-remed-meta">complex — the agent needs human direction</span></div>
          {sel.hypotheses.map((h, i) => (
            <div className="ops-hypo-row" key={i}>
              <div className="ops-hypo-t"><b>{h.h}</b><span className={'ops-hrisk ' + h.risk}>{h.risk} risk</span></div>
              <div className="ops-hypo-l">{h.likelihood}</div>
              <div className="ops-hypo-f">fix: {h.fix}</div>
            </div>
          ))}
          <div className="ops-esc">
            <div className="ops-esc-note">{sel.escalation.note}</div>
            {sel.escalation.requested
              ? <span className="ops-pipe harness">deep-investigation session launched — results land back on this incident</span>
              : <button type="button" className="ops-btn approve" onClick={() => escalate(sel)}>Launch deep investigation →</button>}
          </div>
        </div>
      )}

      <div className="tstx-log ops-timeline">{sel.timeline.map((l, i) => <div key={i}>{l}</div>)}</div>
    </>);
  }

  return (<>
    <p className="dd-lead">Full agent-operation mode: the <b>Operator discovers</b> each incident from a signal, <b>investigates</b>, matches the runbook, and triages. <b>Low-risk</b> → the remediation is prepared and waits for one human <i>Apply</i>. <b>Complex</b> → remediation hypotheses need human direction, with a deep-investigation escalation into an agentic harness (Claude Code).</p>
    {incidents[0] && incidents[0]._kg && (
      <div className="ops-kgline">Derived surface — each row is an <b>Incident</b> node: the structured record of judgment (discovery · findings · triage · remediation · hypotheses · escalation) lives on the node; impacted components and the matched runbook are <b>impacts</b> / <b>remediated_by</b> edges; raw timelines dereference via <b>observed_via → DS-OBS</b> (D-066).</div>
    )}
    <div className="tstx-group">
      {incidents.map(inc => {
        const ps = pipeState(inc);
        return (
          <button type="button" className="tstx-row" key={inc.id} onClick={() => setSelId(inc.id)}>
            <span className={'ops-sev ' + (SEV_TONE[inc.sev] || 'warn')}>{inc.sev}</span>
            <span className="tstx-row-id">{inc.id}</span>
            <span className="tstx-row-t">{inc.title}</span>
            <span className={'ops-plane ' + inc.plane}>{inc.plane}</span>
            <span className={'ops-pipe ' + ps.k}>{ps.label}</span>
            <span className={'ops-inc-st ' + inc.status}>{inc.status}</span>
            <span className="tstx-row-run">{inc.opened}</span>
            <span className="dd-irow-go">›</span>
          </button>
        );
      })}
    </div>
  </>);
}

/* ---- Operate · Approvals ---- */
function OpsApprovals() {
  const O = window.__OPS__;
  const [selId, setSelId] = React.useState(() => {
    const b = (typeof window !== 'undefined' && window.__cynOpsOpenApr) || null;
    if (typeof window !== 'undefined') delete window.__cynOpsOpenApr;
    return b;
  });
  const [note, setNote] = React.useState('');
  const [, bump] = React.useState(0);
  if (!O) return null;
  // D-077: the register is a saved query over Approval nodes; deciding is the
  // doctrine-4 act — the mutation below is only the optimistic echo, the real
  // write is STAGED onto the gated write path (change request → kg/apply.js →
  // owning spec → regenerate) and comes back from the derived KB.
  const approvals = kgApprovals() || O.approvals;
  const decide = (a, action) => {
    const today = new Date().toISOString().slice(0, 10);
    a.status = action;
    a.decision = (action === 'approved' ? 'Approved' : 'Rejected') + ' ' + today +
      (note.trim() ? ' — ' + note.trim().replace(/\.$/, '') : '') +
      '. Recorded by ' + a.approver.split(' — ')[0] + '; at Suggest, execution is human-run.';
    setNote('');
    stageChange('approval.decide', a.id, { status: a.status, decision: a.decision })
      .then(res => { a.staged = res; bump(n => n + 1); })
      .catch(() => { a.staged = { error: 'intake unreachable — decision is in-memory only until re-staged' }; bump(n => n + 1); });
    bump(n => n + 1);
  };
  const goEvals = () => {
    const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
    const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase: 'Build', entry: 'evals' };
    window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
  };
  const sel = approvals.find(a => a.id === selId);
  const pickApr = (id) => { setSelId(id); setNote(''); };

  if (sel) {
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Approvals</button>
      <div className="tstx-dh">
        <span className={'ops-apr-kind'}>{sel.kind}</span>
        <span className="tst-uc-t">{sel.title}</span>
        <span className={'ops-apr-st ' + sel.status}>{sel.status}</span>
        {sel._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph — Approval nodes are the governance records. Deciding stages a change request onto the gated write path; the durable record returns from the KB after kg/apply.js routes it into the owning spec and regenerates.">KG · write-path</span>}
      </div>
      {sel.staged && (
        <div className="ops-kgline">{sel.staged.error
          ? <>⚠ {sel.staged.error}</>
          : <>Decision <b>staged for the gated write path</b> — change <b>{sel.staged.id}</b> routed to <b>{sel.staged.route}</b> (the owning spec, per Optimus update_route). Apply with <b>node kg/apply.js</b>: spec → regenerate → this record returns from the derived KB and survives reload. The graph is never edited directly (D-066 doctrine 4).</>}
        </div>
      )}
      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">requested by</span><div className="dd-idef-v">{sel.requestedBy}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">approver</span><div className="dd-idef-v"><b>{sel.approver}</b></div></div>
        <div className="dd-idef"><span className="dd-iext-k">date</span><div className="dd-idef-v">{sel.date}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">evidence</span><div className="dd-idef-v">{sel.evidence}{sel.links?.evals && <> <button type="button" className="coa-kg-link evx-inline" onClick={goEvals}>eval runs & transcripts →</button></>}</div></div>
        {sel.decision && <div className="dd-idef"><span className="dd-iext-k">decision</span><div className="dd-idef-v">{sel.decision}</div></div>}
        {sel.note && <div className="dd-idef"><span className="dd-iext-k">note</span><div className="dd-idef-v">{sel.note}</div></div>}
      </div>
      {sel.status === 'pending' && (
        <div className="ops-decide">
          <div className="ops-decide-as">Acting as <b>{sel.approver}</b>. The decision is recorded permanently — approvals history is temporal and never overwritten.</div>
          <textarea className="ops-note" name="apr-decision-note" rows={2} placeholder="Conditions / rationale — recorded with the decision…"
            value={note} onChange={e => setNote(e.target.value)} />
          <div className="ops-decide-btns">
            <button type="button" className="ops-btn approve" onClick={() => decide(sel, 'approved')}>Approve</button>
            <button type="button" className="ops-btn reject" onClick={() => decide(sel, 'rejected')}>Reject</button>
          </div>
        </div>
      )}
    </>);
  }

  const pending = approvals.filter(a => a.status === 'pending');
  const decided = approvals.filter(a => a.status !== 'pending');
  const Row = (a) => (
    <button type="button" className="tstx-row" key={a.id} onClick={() => pickApr(a.id)}>
      <span className="ops-apr-kind">{a.kind}</span>
      <span className="tstx-row-t">{a.title}</span>
      <span className="ops-apr-who">→ {a.approver.split(' — ')[0]}</span>
      <span className={'ops-apr-st ' + a.status}>{a.status}</span>
      <span className="tstx-row-run">{a.date}</span>
      <span className="dd-irow-go">›</span>
    </button>
  );
  return (<>
    <p className="dd-lead">The human–agent coordination queue: trust-ladder promotions, model promotions through the ADR-02 gate, and agent-proposed changes awaiting their human decision. Every decision is a temporal, cited record — approvals history is never overwritten.</p>
    <div className="ops-ceiling"><OIco k="check" w={13} /> {O.ceiling}</div>
    {O.reserved && <div className="ops-ceiling"><OIco k="lock" w={13} /> {O.reserved}</div>}
    <OSec icon="alert" title={'Pending · ' + pending.length} sub="Waiting on a named human — the agent plane never self-approves">
      <div className="tstx-group">{pending.map(Row)}</div>
    </OSec>
    <OSec icon="board" title={'Decided · ' + decided.length} sub="The promotion history — temporal, cited, kept forever">
      <div className="tstx-group">{decided.map(Row)}</div>
    </OSec>
  </>);
}

/* ---- Operate · Runbooks — agent skills with executors (D-059) ---- */
const EXE_KIND = {
  'deployed':      { label: 'deployed agent',   cls: 'dep' },
  'off-the-shelf': { label: 'off-the-shelf',    cls: 'ots' },
  'harness':       { label: 'harness',          cls: 'har' },
  'evaluated':     { label: 'evaluated only',   cls: 'eva' },
};
function OpsRunbooks() {
  const O = window.__OPS__;
  const [selId, setSelId] = React.useState(() => {
    const b = (typeof window !== 'undefined' && window.__cynOpsOpen) || null;
    if (typeof window !== 'undefined') delete window.__cynOpsOpen;
    return b;
  });
  if (!O) return null;
  // D-080: runbooks are a saved query over Runbook nodes (trigger + body +
  // toolset ARE the skill, D-059); the executor registry is the executor-role
  // Agent nodes, both joined by the executed_by edges.
  const runbooks = kgRunbooks() || O.runbooks;
  const executors = kgExecutors() || O.opsAgents || [];
  const exeOf = id => executors.find(x => x.id === id) || null;
  const ExeChip = ({ exe }) => exe ? <span className={'ops-exe ' + (EXE_KIND[exe.kind]?.cls || '')} title={exe.provider}>{exe.name.split(' — ')[0]}</span> : null;
  const sel = runbooks.find(r => r.id === selId);

  if (sel) {
    const exe = exeOf(sel.executor);
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Runbooks</button>
      <div className="tstx-dh">
        <span className="tstx-dh-id">{sel.id}</span>
        <span className="tst-uc-t">{sel.title}</span>
        {exe && <ExeChip exe={exe} />}
        {sel._kg && <span className="ops-kgchip" title="This page is a saved query over the derived knowledge graph — the Runbook node carries the skill (trigger · body · toolset, D-059); the executor is its executed_by edge and the linked surfaces are its traces_to edges.">KG</span>}
      </div>
      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">trigger</span><div className="dd-idef-v">{sel.trigger}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">executed by</span><div className="dd-idef-v"><b>{exe ? exe.name : '—'}</b>{exe && <span className="agb-mcp-note"> · {exe.provider}{exe.kind === 'off-the-shelf' ? ' · registered — see the executor registry below' : ''}</span>}</div></div>
        {sel.humanActuated && <div className="dd-idef"><span className="dd-iext-k">human gate</span><div className="dd-idef-v">{sel.humanActuated}</div></div>}
        <div className="dd-idef"><span className="dd-iext-k">owner</span><div className="dd-idef-v"><b>{sel.owner}</b></div></div>
        <div className="dd-idef"><span className="dd-iext-k">last exercised</span><div className="dd-idef-v">{sel.lastExercised}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">linked</span><div className="dd-idef-v" onClick={e => e.stopPropagation()}>{sel.links.map(id => <ORef id={id} key={id} />)}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">skill body</span>
          <div className="dd-idef-v">
            <ol className="ops-steps">{sel.steps.map((st, i) => <li key={i}>{st}</li>)}</ol>
          </div>
        </div>
        {sel.tools && (
          <div className="dd-idef"><span className="dd-iext-k">toolset / MCPs</span>
            <div className="dd-idef-v">
              {sel.tools.map((t, i) => (
                <div className="ops-rbtool" key={i}><code className="ops-rbtool-m">{t.mcp}</code><span className="ops-rbtool-w">{t.what}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>);
  }

  return (<>
    <p className="dd-lead">Runbooks are not documents — they are <b>agent skills</b>: a trigger, a body, and a toolset of MCPs, each with a named <b>executor</b>. Executors are our deployed agents or <b>registered off-the-shelf platform agents</b> — source and scope below, even where we don’t own the implementation.</p>

    {runbooks[0] && runbooks[0]._kg && (
      <div className="ops-kgline">Derived surface — each row is a <b>Runbook</b> node carrying the skill itself (trigger · body · toolset, D-059); executors join via <b>executed_by</b> edges, linked surfaces via <b>traces_to</b> (D-066).</div>
    )}
    <div className="tstx-group">
      {runbooks.map(rb => {
        const exe = exeOf(rb.executor);
        return (
          <button type="button" className="tstx-row" key={rb.id} onClick={() => setSelId(rb.id)}>
            <span className="tstx-row-id">{rb.id}</span>
            <span className="tstx-row-t">{rb.title}</span>
            <ExeChip exe={exe} />
            <span className="ops-rb-trigger">{rb.trigger}</span>
            <span className="tstx-row-run">{rb.lastExercised.split(' ')[0]}</span>
            <span className="dd-irow-go">›</span>
          </button>
        );
      })}
    </div>

    <OSec icon="spark" title="Executor registry" sub="Who runs the runbooks — deployed agents, registered platform agents with their source and scope, and the harness the human drives">
      <div className="ops-exes">
        {executors.map(x => (
          <div className={'ops-exe-card ' + (EXE_KIND[x.kind]?.cls || '')} key={x.id}>
            <div className="ops-exe-h">
              <span className="ops-exe-nm">{x.name}</span>
              <span className={'ops-exe ' + (EXE_KIND[x.kind]?.cls || '')}>{EXE_KIND[x.kind]?.label}</span>
            </div>
            <div className="ops-exe-prov">{x.provider}{x.version ? ' · ' + x.version : ''}{x.registered ? ' · registered ' + x.registered : ''}</div>
            {x.note && <div className="ops-exe-note">{x.note}</div>}
            {x.scope && <div className="ops-exe-def"><span className="dd-iext-k">scope</span>{x.scope}</div>}
            {x.auth && <div className="ops-exe-def"><span className="dd-iext-k">auth</span>{x.auth}</div>}
            {x.guardrails && <div className="ops-exe-def"><span className="dd-iext-k">guardrails</span>{x.guardrails}</div>}
            {x.source && (
              <div className="ops-exe-def"><span className="dd-iext-k">source</span>
                <span className="ops-exe-links">{x.source.map((l, i) => <a key={i} href={l.href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{l.label} ↗</a>)}</span>
              </div>
            )}
            {x.runbooks.length > 0 && (
              <div className="ops-exe-def"><span className="dd-iext-k">runs</span>
                <span className="ops-exe-rbs">{x.runbooks.map(r => <button type="button" key={r} className="ops-exe-rb" onClick={() => { const id = r.split(' ')[0]; if (runbooks.some(b => b.id === id)) setSelId(id); }}>{r}</button>)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </OSec>
  </>);
}

Object.assign(window, { OpsFleet, OpsIncidents, OpsApprovals, OpsRunbooks, OpsBigTrend: BigTrend, OpsSpark: Spark });
