import React from 'react';
import './org-data';
const { ORG } = window;
/* ============================================================
   Cynergis — Prioritization screens (two-level model on the V×F 2×2).
   Criteria chips and ranked-list rows open DETAIL modals that explain
   meaning and how the score was computed. Exports to window.
   ============================================================ */
(function () {
  const { useState } = React;
  const Pico = ({ d, w=14 }) => (
    <svg width={w} height={w} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
  const IB = <path d="M2 2v12h12M5 11V7M8.5 11V4.5M12 11V8.5"/>;
  const fmt = (n, d=1) => Number(n).toFixed(d);
  // bubble encodings: size = investment / job size, color = urgency / time-criticality
  const urgClass = (r) => r <= 3 ? 'u-low' : r <= 6 ? 'u-mod' : r <= 8 ? 'u-high' : 'u-crit';
  const bubbleD = (r) => 16 + ((r ?? 5) - 1) / 9 * 22;   // 16..38px

  /* ---------- modal shell ---------- */
  function Modal({ eyebrow, title, onClose, children }) {
    React.useEffect(() => {
      const h = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', h);
      return () => document.removeEventListener('keydown', h);
    }, [onClose]);
    return (
      <div className="prio-ovl" onClick={onClose}>
        <div className="prio-modal" onClick={(e) => e.stopPropagation()}>
          <div className="prio-mh">
            <div><div className="eyebrow">{eyebrow}</div><h3>{title}</h3></div>
            <button className="prio-x" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="prio-mb">{children}</div>
        </div>
      </div>
    );
  }
  const Row = ({ k, children }) => (
    <div className="prio-drow"><div className="dk">{k}</div><div className="dv">{children}</div></div>
  );

  /* ---------- criterion detail ---------- */
  function CritDetail({ crit, onClose }) {
    const sum = ORG.PF_CRITERIA.reduce((a, c) => a + c.weight, 0);
    const pct = Math.round(crit.weight / sum * 100);
    return (
      <Modal eyebrow={`Criterion · ${pct}% of the decision`} title={crit.name} onClose={onClose}>
        <p className="prio-lead">{crit.meaning}</p>
        {crit.id === 'sa' && (
          <div className="prio-north">
            <div className="nlabel">★ The bank’s North Star</div>
            <div className="ntext">{ORG.org.northStar}</div>
            <div className="nsub">“Fit with North Star” means how directly a portfolio moves one of those pillars — primary relationships, cost-to-serve, loss rates, or trustworthy AI.</div>
          </div>
        )}
        <Row k="Scored on">{crit.basis}</Row>
        <Row k="Why this weight">{crit.weightWhy}</Row>
        <Row k="On the map">
          {crit.dir === 'cost'
            ? <><span className="prio-tag cost">COST ↓</span> inverted as <code>(10 − raw) ÷ 10</code>, so lower is better — feeds the <b>Feasibility</b> axis.</>
            : <><span className="prio-tag benefit">BENEFIT ↑</span> <code>raw ÷ 10</code>, higher is better — feeds the <b>Value</b> axis.</>}
        </Row>
      </Modal>
    );
  }

  /* ---------- portfolio score breakdown ---------- */
  function PfItemDetail({ id, onClose }) {
    const pf = ORG.portfolio(id);
    const sum = ORG.PF_CRITERIA.reduce((a, c) => a + c.weight, 0);
    const rows = ORG.PF_CRITERIA.map(c => {
      const raw = pf.crit[c.id] ?? 5;
      const norm = c.dir === 'cost' ? (10 - raw) / 10 : raw / 10;
      const w = c.weight / sum;
      return { c, raw, norm, w, contrib: w * norm * 100 };
    });
    const composite = rows.reduce((a, r) => a + r.contrib, 0);
    const value = ORG.pfValue(pf), feas = ORG.pfFeasibility(pf);
    const quad = ORG.quadOf(value, feas);
    return (
      <Modal eyebrow="Portfolio · how it scored" title={pf.name} onClose={onClose}>
        <div className="prio-scorehead">
          <div><div className="big">{fmt(composite)}</div><div className="cap">composite / 100</div></div>
          <div className="prio-vf"><span>Value <b>{fmt(value)}</b></span><span>Feasibility <b>{fmt(feas)}</b></span><span className={'asc-quad ' + ORG.quadClass(quad)}>{quad}</span></div>
        </div>
        <div className="prio-formula"><b>Composite</b> = Σ ( weight% × normalize(score, direction) )</div>
        <table className="prio-dtable">
          <thead><tr><th>Criterion</th><th className="n">Raw</th><th className="n">Norm</th><th className="n">Weight</th><th className="n">Contribution</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.c.id}>
                <td>
                  <div className="cn">{r.c.name} <span className={'prio-tag ' + r.c.dir}>{r.c.dir === 'cost' ? 'cost ↓' : 'ben ↑'}</span></div>
                  {pf.why?.[r.c.id] && <div className="cr">{pf.why[r.c.id]}</div>}
                </td>
                <td className="n">{r.raw}/10</td>
                <td className="n">{fmt(r.norm, 2)}</td>
                <td className="n">{Math.round(r.w * 100)}%</td>
                <td className="n"><b style={{ color:'var(--accent-ink)' }}>{fmt(r.contrib)}</b></td>
              </tr>
            ))}
            <tr className="tot"><td colSpan="4">Composite score</td><td className="n"><b>{fmt(composite)}</b></td></tr>
          </tbody>
        </table>
        <div className="prio-callout">
          Benefit criteria (Strategic alignment, Value at stake, Market urgency) build the <b>Value</b> axis; the inverted cost criteria (Investment, Risk) build the <b>Feasibility</b> axis — which is where this portfolio sits on the map.
        </div>
      </Modal>
    );
  }

  /* ---------- product (WSJF) breakdown ---------- */
  function ProdItemDetail({ product, onClose }) {
    const w = product.wsjf;
    const num = w.bv + w.tc + w.rr;
    const score = ORG.wsjf(product);
    const value = ORG.prodValue(product), feas = ORG.prodFeasibility(product);
    const quad = ORG.quadOf(value, feas);
    return (
      <Modal eyebrow="Product · how it scored" title={product.name} onClose={onClose}>
        <div className="prio-scorehead">
          <div><div className="big">{fmt(score, 2)}</div><div className="cap">WSJF</div></div>
          <div className="prio-vf"><span>Value <b>{fmt(value)}</b></span><span>Feasibility <b>{fmt(feas)}</b></span><span className={'asc-quad ' + ORG.quadClass(quad)}>{quad}</span></div>
        </div>
        {product.rationale && <p className="prio-lead">{product.rationale}</p>}
        <div className="prio-formula"><b>WSJF</b> = ( Business Value + Time Criticality + Risk Reduction ) ÷ Job Size</div>
        <table className="prio-dtable">
          <tbody>
            <tr><td>Business Value</td><td className="n">{w.bv}/10</td></tr>
            <tr><td>Time Criticality</td><td className="n">{w.tc}/10</td></tr>
            <tr><td>Risk Reduction</td><td className="n">{w.rr}/10</td></tr>
            <tr className="sub"><td>Cost of Delay (sum)</td><td className="n"><b>{num}</b></td></tr>
            <tr><td>Job Size</td><td className="n">{w.js}/10</td></tr>
            <tr className="tot"><td>WSJF = {num} ÷ {w.js}</td><td className="n"><b>{fmt(score, 2)}</b></td></tr>
          </tbody>
        </table>
        <div className="prio-callout">
          The numerator (Cost of Delay = {num}) is the <b>Value</b> axis; the inverse of Job Size ({w.js}) is the <b>Feasibility</b> axis. A higher WSJF means more value for less effort — do it sooner.
        </div>
      </Modal>
    );
  }

  /* ---------- the V×F 2×2 map ---------- */
  function VFBoard({ items, onItem, sizeLabel = 'Investment', colorLabel = 'Market urgency' }) {
    return (
      <div className="asc-vf-wrap">
        <div>
          <div className="prio-plot-row">
            <div className="prio-yaxis"><span>Value →</span></div>
            <div className="asc-vf">
              <div className="asc-vf-plot">
                <div className="asc-vf-quad asc-vf-q-tl"><span>Big Bet</span></div>
                <div className="asc-vf-quad asc-vf-q-tr"><span>Quick Win</span></div>
                <div className="asc-vf-quad asc-vf-q-bl"><span>Avoid</span></div>
                <div className="asc-vf-quad asc-vf-q-br"><span>Fill-in</span></div>
                {items.map(it => {
                  const left = ((it.feasibility - 1) / 4) * 100;
                  const bottom = ((it.value - 1) / 4) * 100;
                  const leftSide = it.feasibility >= 3.6;
                  const d = bubbleD(it.invest);
                  const off = (d + 9) + 'px';
                  return (
                    <div className="asc-vf-dot" key={it.id}
                      style={{ left: `${left}%`, bottom: `${bottom}%` }} onClick={() => onItem(it)}>
                      <div className={'pt ' + urgClass(it.urgency ?? 5) + (it.fail ? ' flagged' : '')} style={{ width: d, height: d }}></div>
                      <div className="lab" style={leftSide ? { left:'auto', right: off } : { left: off }}>{it.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="asc-vf-axis-x">Feasibility →</div>
        </div>

        <div>
          <div className="asc-sec-title" style={{ marginBottom:'12px' }}>Ranked</div>
          <div className="asc-rank">
            {items.map((it, i) => (
              <div className="asc-rank-row" key={it.id} onClick={() => onItem(it)}>
                <div className="asc-rank-n">{i + 1}</div>
                <div className="asc-rank-body"><div className="nm">{it.name}</div><div className="mt">{it.sub}</div></div>
                <span className={'rk-u ' + urgClass(it.urgency ?? 5)} title={colorLabel + ' · ' + (it.urgency ?? 5) + '/10'}></span>
                <span className={'prio-tier ' + it.tier}>{ORG.TIER_LABEL[it.tier]}</span>
                <div className="asc-rank-sc"><div className="vf">{it.scoreLabel}</div><div className="lbl">{it.scoreUnit}</div></div>
              </div>
            ))}
          </div>
          <div className="prio-legend">
            <div className="lg-group">
              <span className="lg-h">Size · {sizeLabel}</span>
              <span className="lg-sizes">
                <i style={{ width:13, height:13 }}></i>
                <i style={{ width:19, height:19 }}></i>
                <i style={{ width:26, height:26 }}></i>
              </span>
              <span className="lg-cap">small → large</span>
            </div>
            <div className="lg-group">
              <span className="lg-h">Color · {colorLabel}</span>
              <span className="lg-swatches">
                <span><i className="u-low"></i>Low</span>
                <span><i className="u-mod"></i>Moderate</span>
                <span><i className="u-high"></i>High</span>
                <span><i className="u-crit"></i>Critical</span>
              </span>
            </div>
          </div>
          <div className="prio-note">
            <Pico d={<path d="M8 11.5v.01M6.3 6.2a1.7 1.7 0 1 1 2.4 1.6c-.5.3-.7.6-.7 1.2"/>} w={13} />
            <span>Click any item for its breakdown. Position = <b>Value</b> × <b>Feasibility</b> · bubble <b>size</b> = {sizeLabel.toLowerCase()} · <b>color</b> = {colorLabel.toLowerCase()}.</span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- criteria / weights readout ---------- */
  function WeightsReadout({ onCrit }) {
    const sum = ORG.PF_CRITERIA.reduce((a, c) => a + c.weight, 0);
    return (
      <div className="prio-weights">
        {ORG.PF_CRITERIA.map(c => (
          <button className={'prio-wchip ' + (c.dir === 'cost' ? 'cost' : 'benefit')} key={c.id} onClick={() => onCrit(c)}>
            <div className="wc-top"><span className="wc-name">{c.name}</span><span className="wc-pct">{Math.round(c.weight / sum * 100)}%</span></div>
            <div className="wc-sub">{c.sub}</div>
            <div className="wc-tags">
              <span className={'wc-dir ' + c.dir}>{c.dir === 'cost' ? 'COST ↓' : 'BENEFIT ↑'}</span>
              <span className="wc-axis">{c.axis === 'value' ? 'Value axis' : 'Feasibility axis'}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }

  /* ---------- Prioritize PORTFOLIOS ---------- */
  function PrioritizePortfolios() {
    const [modal, setModal] = useState(null);
    const scored = ORG.portfolios.map(p => ({
      id:p.id, name:p.name, sub:`Lead · ${p.lead} · ${p.value}`,
      value: ORG.pfValue(p), feasibility: ORG.pfFeasibility(p), score: ORG.pfScore(p),
      invest: p.crit.inv, urgency: p.crit.mu,
    }));
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const max = ranked.length ? ranked[0].score : 1;
    ranked.forEach(it => { it.tier = ORG.tierOf(it.score, max); it.scoreLabel = fmt(it.score); it.scoreUnit = 'SCORE /100'; });

    return (
      <div className="asc-page">
        <div className="asc-page-head">
          <div>
            <div className="asc-eyebrow"><Pico d={IB} w={12} /> Organization · Steering</div>
            <h1 className="asc-page-title">Prioritize portfolios</h1>
            <p className="asc-page-sub">Weighted multi-criteria scoring — leadership ranks portfolios on strategic criteria to allocate capital. Plotted on Value × Feasibility. Click a criterion or a portfolio for details.</p>
          </div>
        </div>

        <div className="asc-section" style={{ marginTop:0 }}>
          <div className="asc-sec-head"><div className="asc-sec-title">Criteria &amp; weights</div><div className="asc-sec-sub">click a criterion to see what it means</div></div>
          <WeightsReadout onCrit={(c) => setModal({ kind:'crit', crit:c })} />
        </div>

        <div className="asc-section">
          <div className="asc-sec-head"><div className="asc-sec-title">Prioritization map</div><div className="asc-sec-sub">Value (benefits) × Feasibility (inverse investment + risk)</div></div>
          <VFBoard items={ranked} onItem={(it) => setModal({ kind:'pf', id:it.id })} sizeLabel="Investment" colorLabel="Market urgency" />
        </div>

        {modal?.kind === 'crit' && <CritDetail crit={modal.crit} onClose={() => setModal(null)} />}
        {modal?.kind === 'pf' && <PfItemDetail id={modal.id} onClose={() => setModal(null)} />}
      </div>
    );
  }

  /* ---------- Prioritize PRODUCTS ---------- */
  function PrioritizeProducts({ portfolioId }) {
    const [modal, setModal] = useState(null);
    const pf = ORG.portfolio(portfolioId);
    const products = pf?.products || [];
    const scored = products.map(d => ({
      id:d.id, name:d.name, sub:d.tagline, fail: !d.sponsor,
      value: ORG.prodValue(d), feasibility: ORG.prodFeasibility(d), score: ORG.wsjf(d),
      invest: d.wsjf.js, urgency: d.wsjf.tc,
    }));
    const ranked = [...scored].sort((a, b) => b.score - a.score);
    const max = ranked.length ? ranked[0].score : 1;
    ranked.forEach(it => { it.tier = ORG.tierOf(it.score, max); it.scoreLabel = fmt(it.score, 2); it.scoreUnit = 'WSJF'; });

    return (
      <div className="asc-page">
        <div className="asc-page-head">
          <div>
            <div className="asc-eyebrow"><Pico d={IB} w={12} /> Portfolio · Steering · {pf?.name}</div>
            <h1 className="asc-page-title">Prioritize products</h1>
            <p className="asc-page-sub">WSJF sequencing — Cost of Delay ÷ Job Size. Products rank within the portfolio; plotted on Value × Feasibility. Click a product for its WSJF breakdown.</p>
          </div>
        </div>

        <div className="formula-line">
          <b>WSJF</b> = ( Business Value + Time Criticality + Risk Reduction ) ÷ Job Size
          <span className="fl-note">components scored 1–10 · higher = do sooner</span>
        </div>

        <div className="asc-section" style={{ marginTop:'18px' }}>
          <div className="asc-sec-head"><div className="asc-sec-title">Prioritization map</div><div className="asc-sec-sub">Value (WSJF numerator) × Feasibility (inverse job size)</div></div>
          <VFBoard items={ranked} onItem={(it) => setModal({ kind:'prod', id:it.id })} sizeLabel="Job size" colorLabel="Time criticality" />
        </div>

        {modal?.kind === 'prod' && <ProdItemDetail product={products.find(p => p.id === modal.id)} onClose={() => setModal(null)} />}
      </div>
    );
  }

  /* D-127: the board + WSJF breakdown are shared with the Meridian domain
     pages (Prioritize products tab) — same visual language on both altitudes */
  Object.assign(window, { PrioritizePortfolios, PrioritizeProducts, CynVFBoard: VFBoard, CynProdWsjfDetail: ProdItemDetail });
})();
