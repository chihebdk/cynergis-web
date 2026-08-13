import React from 'react';
import './trace-core';
import './realize-data';
const { Ref: RRef } = window;

/* ============================================================
   Cynergis — Realize phase surfaces (D-061).
   Per the Realize spec (D-019): Outcomes vs targets (Block 1),
   Value realized (Blocks 2–4), Go-forward decision (Blocks 5–6).
   Reads window.__REALIZE__; charts reuse the Operate SVGs
   (window.OpsBigTrend / OpsSpark). Realize reads the same
   telemetry Operate watches — framed against the Charter.
   ============================================================ */

const RIco = ({ k, w = 15 }) => {
  const P = {
    target:  <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M8 8h.01" />,
    board:   <path d="M2.5 3.5h11v9h-11zM2.5 6.5h11M6 6.5v6" />,
    compass: <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12M10.5 5.5 9 9l-3.5 1.5L7 7z" />,
    loop:    <path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5" />,
    check:   <path d="M3.5 8.5l3 3 6-6.5" />,
  };
  return <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{P[k] || P.target}</svg>;
};
const RSec = ({ icon, title, sub, children }) => (
  <div className="asc-section">
    <div className="asc-sec-head">
      <div className="asc-sec-title"><RIco k={icon} w={15} /> {title}</div>
      {sub && <div className="asc-sec-sub">{sub}</div>}
    </div>
    {children}
  </div>
);
const goPhase = (phase, entry, flag, val) => {
  if (flag) window[flag] = val;
  const nav = (typeof window !== 'undefined' && window.__cynNav) || {};
  const t = { v: 'prod', pf: nav.pf, prod: nav.prod, sub: 'dashboard', phase, entry };
  window.cynPushUrl?.(t); window.__cynApplyProd?.(t);
};
const KpiState = ({ st }) => <span className={'rlz-state ' + st}>{st === 'met' ? 'met' : 'on track'}</span>;
const GapBar = ({ pct }) => (
  <span className="rlz-gap" title={pct + '% of the baseline → target gap closed'}>
    <span className="rlz-gap-bar"><span className={'rlz-gap-fill' + (pct >= 100 ? ' met' : '')} style={{ width: Math.min(pct, 100) + '%' }} /></span>
    <span className="rlz-gap-n">{pct}%</span>
  </span>
);

/* ---- Realize · Outcomes vs targets (Block 1) ---- */
function RealOutcomes() {
  const R = window.__REALIZE__;
  const [selId, setSelId] = React.useState(null);
  if (!R) return null;
  const Big = window.OpsBigTrend, Sp = window.OpsSpark;
  const sel = R.kpis.find(k => k.sc === selId);

  if (sel && Big) {
    return (<>
      <button type="button" className="dd-iback" onClick={() => setSelId(null)}>← Outcomes vs targets</button>
      <div className="tstx-dh">
        <span className="tst-uc-t">{sel.name}</span>
        <span onClick={e => e.stopPropagation()}><RRef id={sel.sc} /></span>
        <KpiState st={sel.state} />
        <span className="ops-asof">as of {R.asOf}</span>
      </div>
      <div className="ops-hero">
        <div className="ops-hero-card">
          <div className="ops-hero-k">baseline</div>
          <div className="ops-hero-v muted">{sel.baseline}</div>
        </div>
        <div className={'ops-hero-card ' + (sel.state === 'met' ? 'ok' : 'warn')}>
          <div className="ops-hero-k">actual</div>
          <div className="ops-hero-v">{sel.actual}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">target</div>
          <div className="ops-hero-v muted">{sel.target}</div>
        </div>
        <div className="ops-hero-card">
          <div className="ops-hero-k">gap closed · time to target</div>
          <div className="ops-hero-v small"><GapBar pct={sel.gapClosed} /><span className="ops-hero-sub">{sel.timeToTarget}</span></div>
        </div>
      </div>
      <div className="ops-bigwrap">
        <Big pts={sel.history} unit={sel.unit} tone={sel.state === 'met' ? 'ok' : 'warn'} targetV={sel.targetV} targetLabel={'target ' + sel.target} />
      </div>
      <div className="dd-idetail">
        <div className="dd-idef"><span className="dd-iext-k">context</span><div className="dd-idef-v">{sel.note}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">attribution</span>
          <div className="dd-idef-v ops-related" onClick={e => e.stopPropagation()}>
            {sel.drivers.map((d, i) => <span key={i} className="rlz-attr"><RRef id={d.id} /> <b>{d.share}</b></span>)}
          </div>
        </div>
        <div className="dd-idef"><span className="dd-iext-k">source</span>
          <div className="dd-idef-v">
            {sel.source.slo
              ? <button type="button" className="coa-kg-link evx-inline" onClick={() => goPhase('Operate', 'fleet', '__cynOpsOpenSlo', sel.source.slo)}>{sel.source.label} →</button>
              : sel.source.label}
          </div>
        </div>
      </div>
    </>);
  }

  return (<>
    <p className="dd-lead">The measurable heart of Realize: every Charter success criterion against its <b>actual</b> — the % of the baseline→target gap closed, the trend, and the time to target. The actuals are the same telemetry Operate watches, framed against the promise.</p>
    <div className="tstx-group">
      {R.kpis.map(k => (
        <div role="button" tabIndex={0} className="tstx-row ops-slorow" key={k.sc}
          onClick={() => setSelId(k.sc)} onKeyDown={e => { if (e.key === 'Enter') setSelId(k.sc); }}>
          <span className={'ops-health ' + (k.state === 'met' ? 'ok' : 'warn')} />
          <span className="ops-slorow-nm">{k.name}<span onClick={e => e.stopPropagation()}><RRef id={k.sc} /></span></span>
          <span className="rlz-bta"><span className="rlz-b">{k.baseline}</span> → <b>{k.actual}</b> <span className="rlz-t">(target {k.target})</span></span>
          {Sp && <Sp pts={k.history} tone={k.state === 'met' ? 'ok' : 'warn'} target={k.targetV} w={110} h={26} />}
          <GapBar pct={k.gapClosed} />
          <KpiState st={k.state} />
          <span className="dd-irow-go">›</span>
        </div>
      ))}
    </div>
  </>);
}

/* ---- Realize · Value realized (Blocks 2–4) ---- */
function RealValue() {
  const R = window.__REALIZE__;
  if (!R) return null;
  const Big = window.OpsBigTrend;
  const V = R.value;
  return (<>
    <p className="dd-lead">KPI movement translated into money, reconciled against the Envision business case, and <b>attributed along the spine</b> — which use cases moved which metric. Rolled up to the portfolio, where realization triggers the re-score.</p>

    <div className="ops-hero">
      <div className="ops-hero-card ok">
        <div className="ops-hero-k">value realized</div>
        <div className="ops-hero-v">{V.realized}</div>
      </div>
      <div className="ops-hero-card">
        <div className="ops-hero-k">business case (envision)</div>
        <div className="ops-hero-v muted">{V.atStake}</div>
      </div>
      <div className="ops-hero-card">
        <div className="ops-hero-k">realized</div>
        <div className="ops-hero-v small"><GapBar pct={V.pct} /></div>
      </div>
      <div className="ops-hero-card">
        <div className="ops-hero-k">variance</div>
        <div className="ops-hero-v small">{V.variance}</div>
      </div>
    </div>

    {Big && (
      <div className="ops-bigwrap">
        <Big pts={V.ramp} unit="M" tone="ok" xlabels={[V.rampLabels[0], V.rampLabels[2], V.rampLabels[4]]} />
        <div className="ops-vol-legend"><span className="ops-trendlbl">cumulative $ realized ($M) — ramping ~$1M / quarter</span></div>
      </div>
    )}

    <RSec icon="board" title="Value levers" sub="Where the money came from — each lever tied to its KPI and attributed to the use cases that moved it">
      <div className="rlz-levers">
        {V.levers.map((l, i) => (
          <div className="rlz-lever" key={i}>
            <div className="rlz-lever-h"><span className="rlz-lever-nm">{l.name}</span><span className="rlz-lever-amt">{l.amount}</span></div>
            <div className="rlz-lever-how">{l.how}</div>
            <div className="rlz-lever-foot" onClick={e => e.stopPropagation()}>
              <span className="dd-iext-k">kpi</span><RRef id={l.kpi} />
              <span className="dd-iext-k rlz-att-k">attribution</span>
              {l.attribution.map((a, j) => <span key={j} className="rlz-attr"><RRef id={a.id} /> <b>{a.share}</b></span>)}
            </div>
          </div>
        ))}
      </div>
    </RSec>

    <RSec icon="target" title="Portfolio roll-up & re-score" sub="Realized value replaces the estimate; the D-005 re-score rotates capital">
      <div className="asc-panel agb-panel">
        <div className="dd-idef"><span className="dd-iext-k">portfolio</span><div className="dd-idef-v"><b>{V.rollup.portfolio}</b> — {V.rollup.share} realized of this product’s case; portfolio at stake {V.rollup.portfolioAtStake}.</div></div>
        <div className="dd-idef"><span className="dd-iext-k">re-score</span><div className="dd-idef-v">{V.rollup.rescore}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">wave</span><div className="dd-idef-v">{V.rollup.wave}</div></div>
      </div>
    </RSec>
  </>);
}

/* ---- Realize · Go-forward decision (Blocks 5–6) ---- */
function RealDecision() {
  const R = window.__REALIZE__;
  const [note, setNote] = React.useState('');
  const [, bump] = React.useState(0);   // the decision mutates the seed in memory (a reload restores it)
  if (!R) return null;
  const D = R.decision;
  const record = (k) => {
    D.status = 'decided';
    D.decided = { option: k, on: new Date().toISOString().slice(0, 10), by: D.board, note: note.trim() };
    setNote('');
    bump(n => n + 1);
  };
  return (<>
    <p className="dd-lead">The gate that closes the loop: <b>sustain · scale · pivot · retire</b>, decided by the named humans on realized evidence — then the learnings feed back into Envision, Discover and prioritization. Not a hard exit: Operate keeps running either way.</p>

    <RSec icon="compass" title="The options" sub="One recommendation, argued on the evidence — the board decides">
      <div className="rlz-opts">
        {D.options.map(o => (
          <div className={'rlz-opt' + (o.k === D.recommendation ? ' rec' : '') + (D.status === 'decided' && D.decided.option === o.k ? ' chosen' : '')} key={o.k}>
            <div className="rlz-opt-h">
              <span className="rlz-opt-t">{o.title}</span>
              {o.k === D.recommendation && <span className="rlz-rec">recommended</span>}
              {D.status === 'decided' && D.decided.option === o.k && <span className="agb-verd holding">decided</span>}
            </div>
            <div className="rlz-opt-w">{o.what}</div>
            <div className="rlz-opt-f">{o.fit}</div>
          </div>
        ))}
      </div>
    </RSec>

    <RSec icon="check" title="Rationale & conditions" sub="Why Scale — argued from outcomes, value, and the transferable machinery">
      <div className="asc-panel agb-panel">
        <ul className="ops-inv rlz-rat">{D.rationale.map((r, i) => <li key={i}>{r}</li>)}</ul>
        <div className="dd-idef"><span className="dd-iext-k">conditions</span><div className="dd-idef-v">{D.conditions}</div></div>
        <div className="dd-idef"><span className="dd-iext-k">evidence</span>
          <div className="dd-idef-v ops-related">
            <button type="button" className="ops-rel" onClick={() => goPhase('Realize', 'outcomes')}>Outcomes vs targets →</button>
            <button type="button" className="ops-rel" onClick={() => goPhase('Realize', 'value')}>Value realized →</button>
            <button type="button" className="ops-rel" onClick={() => goPhase('Operate', 'fleet')}>Operate — fleet & SLOs →</button>
          </div>
        </div>
      </div>
    </RSec>

    {D.status === 'decided' ? (
      <div className="ops-remed applied">
        <div className="ops-remed-h"><RIco k="check" w={14} /> Decision recorded <span className="ops-remed-meta">{D.decided.on} · {D.decided.by}</span></div>
        <div className="ops-remed-a"><b>{D.options.find(o => o.k === D.decided.option)?.title}</b>{D.decided.note ? ' — ' + D.decided.note : ''}</div>
        <div className="ops-remed-why">A temporal record — the decision history is never overwritten; the loop-back items below are now the next products’ inputs.</div>
      </div>
    ) : (
      <div className="ops-decide">
        <div className="ops-decide-as">Acting as the <b>product board</b> ({D.board}). The go-forward decision is a governance act — humans decide; the record is permanent.</div>
        <textarea className="ops-note" name="rlz-decision-note" rows={2} placeholder="Conditions / rationale — recorded with the decision…" value={note} onChange={e => setNote(e.target.value)} />
        <div className="ops-decide-btns">
          {D.options.map(o => (
            <button type="button" key={o.k} className={'ops-btn ' + (o.k === D.recommendation ? 'approve' : 'reject')} onClick={() => record(o.k)}>{o.title}</button>
          ))}
        </div>
      </div>
    )}

    <RSec icon="loop" title="Learnings — looped back" sub="Block 6: what this product taught the machine, filed where the next one starts">
      <div className="asc-panel agb-panel">
        {D.learnings.map((l, i) => (
          <div className="rlz-learn" key={i}>
            <span className={'rlz-feeds f-' + l.feeds.toLowerCase()}>{l.feeds}</span>
            <span className="rlz-learn-t">{l.text}</span>
            <span className="rlz-learn-n">{l.note}</span>
          </div>
        ))}
      </div>
    </RSec>
  </>);
}

Object.assign(window, { RealOutcomes, RealValue, RealDecision });
