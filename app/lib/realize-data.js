/* ============================================================
   Cynergis — Realize seed (window.__REALIZE__), D-061.
   The value-realization state per the Realize spec (D-019):
     Block 1  KPI realization — actuals vs the Charter targets
              (SC1–SC5), % of gap closed, trend, time-to-target
     Block 2  $ realized vs the Envision business case
     Block 3  attribution along the spine (UC / agent skills)
     Block 4  portfolio roll-up + re-score (D-005: V drops as
              the gap closes — capital rotates)
     Block 5  sustain / scale / pivot / retire
     Block 6  learnings looped back to Envision · Discover ·
              prioritization
   KPI histories deliberately mirror the Operate SLO feeds —
   Realize reads the same telemetry, framed against the Charter.
   ============================================================ */
window.__REALIZE__ = {
  asOf: '2026-08-08',

  kpis: [
    { sc: 'SC1', name: 'Fraud loss rate', baseline: '18 bps', target: '≤ 7 bps', actual: '8.1 bps',
      unit: 'bps', targetV: 7, history: [18, 15.2, 13.1, 11.4, 10.2, 9.4, 8.9, 8.6, 8.3, 8.1],
      gapClosed: 90, state: 'ontrack', timeToTarget: '~2 quarters at the current slope',
      source: { slo: 'SLO-5', label: 'fed by SLO-5 — fraud loss rate (Operate)' },
      drivers: [{ id: 'UC1', share: '~55%' }, { id: 'UC2', share: '~30%' }, { id: 'UC3', share: '~15%' }],
      note: 'The residual gap is concentrated in the medium band — the unbuilt UC4 step-up slice.' },
    { sc: 'SC2', name: 'False-decline rate', baseline: '6.2%', target: '≤ 2.5%', actual: '2.9%',
      unit: '%', targetV: 2.5, history: [6.2, 5.4, 4.8, 4.1, 3.8, 3.5, 3.3, 3.1, 3.0, 2.9],
      gapClosed: 89, state: 'ontrack', timeToTarget: 'APR-101 (threshold change) projects −0.3 pp on approval',
      source: { slo: 'SLO-4', label: 'fed by SLO-4 — false-decline rate (Operate)' },
      drivers: [{ id: 'UC1', share: '~70%' }, { id: 'UC2', share: '~30%' }],
      note: 'Model precision plus the reversible soft-hold (ADR-03) did most of the work; the agent’s threshold proposals now close the tail.' },
    { sc: 'SC3', name: 'Median time-to-block', baseline: '4 h (14,400 s)', target: '≤ 90 s', actual: '62 s',
      unit: 's', targetV: 90, history: [240, 180, 150, 120, 105, 95, 88, 75, 68, 62],
      gapClosed: 100, state: 'met', timeToTarget: 'met — holding',
      source: { slo: null, label: 'measured on the decision log (in-stream blocking)' },
      drivers: [{ id: 'UC1', share: 'in-stream scoring' }, { id: 'UC2', share: 'auto-block' }],
      note: 'Chart shows the post-launch window; the 4-hour baseline was the pre-launch batch review.' },
    { sc: 'SC4', name: 'Scoring latency', baseline: 'n/a (new path)', target: 'p95 < 300 ms', actual: 'p95 287 ms',
      unit: 'ms', targetV: 300, history: [312, 304, 298, 306, 295, 291, 288, 331, 293, 287],
      gapClosed: 100, state: 'met', timeToTarget: 'met — regression-tested on every deploy',
      source: { slo: 'SLO-1', label: 'fed by SLO-1 — scoring latency (Operate)' },
      drivers: [{ id: 'UC1', share: 'the hot path itself' }],
      note: 'The Jul 12 spike is INC-201 — recovered inside the error budget.' },
    { sc: 'SC5', name: 'Customer notification', baseline: 'none (no notify)', target: '≤ 60 s after block', actual: 'p95 41 s',
      unit: 's', targetV: 60, history: [55, 52, 48, 47, 44, 46, 58, 43, 42, 41],
      gapClosed: 100, state: 'met', timeToTarget: 'met — holding',
      source: { slo: 'SLO-3', label: 'fed by SLO-3 — customer notification (Operate)' },
      drivers: [{ id: 'UC2', share: 'block → notify flow' }],
      note: 'The Jul 24 bump is INC-202 (vendor outage) — queue buffered, nothing lost.' },
  ],

  value: {
    atStake: '$14M', realized: '$11.8M', pct: 84,
    variance: '−$2.2M against the business case — concentrated in the unbuilt UC4 step-up slice and the last threshold gap (APR-101).',
    ramp: [0.8, 3.1, 6.9, 9.8, 11.8],
    rampLabels: ['Q3 ’25', 'Q4 ’25', 'Q1 ’26', 'Q2 ’26', 'now'],
    levers: [
      { name: 'Fraud loss avoidance', amount: '$7.4M', kpi: 'SC1',
        how: '18 → 8.1 bps on ~$8.5B of authorization volume.',
        attribution: [{ id: 'UC1', share: '55%' }, { id: 'UC2', share: '30%' }, { id: 'UC3', share: '15%' }] },
      { name: 'False-decline recovery', amount: '$3.6M', kpi: 'SC2',
        how: 'Recovered legitimate spend and retained customers as declines halved (6.2% → 2.9%).',
        attribution: [{ id: 'UC1', share: '70%' }, { id: 'UC2', share: '30%' }] },
      { name: 'Analyst efficiency', amount: '$0.8M', kpi: 'SC3',
        how: 'Case throughput up with evidence assembly and drafting assisted by the Case Agent (Suggest tier — every draft human-reviewed).',
        attribution: [{ id: 'UC3', share: '100%' }] },
    ],
    rollup: {
      portfolio: 'Cards & Payments', portfolioAtStake: '$36M', share: '$11.8M of $14M',
      rescore: 'Re-score (D-005): as the KPI gap closes, remaining Value drops 4.2 → ~2.9 — capital rotates to the next product. Feasibility rises 3.8 → 4.5 (the pattern is proven).',
      wave: 'Quadrant graduates Quick Win → Scale on the next roadmap wave.' },
  },

  decision: {
    status: 'decided', recommendation: 'scale',
    decided: {"option":"scale","on":"2026-08-15","by":"Product board — Elena Cho (sponsor) · Cards & Payments portfolio lead · Regina Foss (Model Risk)","note":"Complete UC4 first (BLK2), carry the agent doctrine unchanged"},
    board: 'Product board — Elena Cho (sponsor) · Cards & Payments portfolio lead · Regina Foss (Model Risk)',
    options: [
      { k: 'scale', title: 'Scale', what: 'Extend the proven pattern across the enterprise.',
        fit: 'Recommended — 90% of the loss gap closed; the event-storming → EDA → subdomain-agent pattern is reusable as-is for Real-Time Payments and the retail-fraud book.' },
      { k: 'sustain', title: 'Sustain', what: 'Hold the current scope; keep operating and tuning.',
        fit: 'The floor, not the ceiling — the remaining $2.2M needs UC4, which Sustain would leave on the table.' },
      { k: 'pivot', title: 'Pivot', what: 'Change approach on underperformance.',
        fit: 'No signal for it — every KPI is met or on-track.' },
      { k: 'retire', title: 'Retire', what: 'Wind down; value not realized.',
        fit: 'Not applicable — 84% of the case is realized and compounding.' },
    ],
    rationale: [
      'KPIs: SC3/SC4/SC5 met; SC1 at 90% and SC2 at 89% of gap closed with clear paths (UC4 + APR-101).',
      'Value: $11.8M of $14M realized (84%), ramping ~$1M/quarter with attribution traced to use cases.',
      'The machinery is the asset: the deterministic workflow + governed agents + Operator pattern transfers to Real-Time Payments with the same knowledge-graph spine.',
    ],
    conditions: 'Scale with two conditions: complete the UC4 step-up slice first (unblocks on BLK2), and carry the D-051/D-056 agent doctrine unchanged into the next product.',
    learnings: [
      { text: 'The medium band held the largest unrealized value — step-up (UC4) should be first-wave, not last, in the next product.', feeds: 'Discover', note: 'use-case sequencing' },
      { text: 'Agent evals as promotion evidence (D-052) let Model Risk govern autonomy without slowing delivery — adopt as the standard gate.', feeds: 'Envision', note: 'operating model' },
      { text: 'The Suggest-tier loop (agent proposes, human applies) closed the threshold-tuning gap faster than quarterly reviews ever did.', feeds: 'Prioritization', note: 'value of agent proposals' },
      { text: 'Reversibility (soft-hold, ADR-03) is what made aggressive blocking safe — carry “reversible by design” into the RTP charter.', feeds: 'Envision', note: 'design principle' },
    ],
  },
};
