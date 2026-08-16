/* ============================================================
   Cynergis — Organization model.
   Organization → Portfolios → Products → (Product Studio).
   Includes the two-level PRIORITIZATION model adapted from the
   Prioritization Control Plane:
     · Portfolios → weighted multi-criteria score (benefit + cost)
     · Products   → WSJF  (value-over-size ratio)
   Both decompose onto Value × Feasibility axes (aligned with the
   Ascent 2×2): Value = benefits / WSJF numerator;
   Feasibility = inverse cost / inverse job-size.
   ============================================================ */
window.ORG = (function () {
  const PHASES = ['Envision','Discover','Design','Build','Operate','Realize'];

  const org = {
    name:'WealthGrow Bank',
    kind:'Tier-1 retail & commercial bank',
    totalValue:'$4.2B',
    desc:'Transformation portfolios across the bank — each a book of AI-augmented products moving through the delivery lifecycle.',
    northStar:'Be the primary, most-trusted bank for 10M households by 2030 — growing primary-account relationships while cutting cost-to-serve and loss rates through trustworthy AI.',
  };

  /* ---- prioritization config ---- */
  // Portfolio criteria (weighted multi-criteria). dir: benefit ↑ better, cost ↓ better (inverted).
  const PF_CRITERIA = [
    { id:'sa',  name:'Strategic alignment', sub:'fit with North Star',  weight:30, dir:'benefit', axis:'value',
      meaning:'How directly the portfolio advances the bank’s North Star — its single stated destination. On-strategy is the precondition for everything else, so this leads the model.',
      basis:'Scored 1–10 by the steering committee against the North Star pillars: 9–10 advances a pillar head-on (grows primary relationships or cuts loss rates), 5–6 supports one indirectly, 1–2 is orthogonal.',
      weightWhy:'Heaviest at 30% — strategy is the one input only leadership sets, and misaligned spend is the costliest mistake we can make.' },
    { id:'vs',  name:'Value at stake',      sub:'revenue / cost / risk', weight:25, dir:'benefit', axis:'value',
      meaning:'The size of the prize — revenue uplift, cost taken out, or loss avoided. What separates a big bet from a small one once both are on-strategy.',
      basis:'Modeled from the addressable book over a 3-year horizon, then banded 1–10 against the largest single opportunity in the bank.',
      weightWhy:'25% — among on-strategy options, magnitude is what should decide funding order.' },
    { id:'mu',  name:'Market urgency',      sub:'cost of delay',         weight:15, dir:'benefit', axis:'value',
      meaning:'The cost of waiting — a closing competitive window, a regulatory deadline, or customers lost if we are late.',
      basis:'Scored 1–10 on cost of delay: 9–10 means a window that closes this year (mandate or fast-moving competitor); 1–2 means no real time pressure.',
      weightWhy:'15% — a sequencing lever that pulls work earlier without overriding strategy or value.' },
    { id:'inv', name:'Investment',          sub:'capital + capacity',    weight:15, dir:'cost',    axis:'feasibility',
      meaning:'The capital and squad capacity needed to deliver. A cost criterion — inverted, so a smaller ask scores higher (more feasible to fund).',
      basis:'Banded 1–10 against the largest ask in the set, counting build cost plus the delivery capacity it locks up.',
      weightWhy:'15% — an affordability check that keeps expensive bets honest against a finite envelope.' },
    { id:'rk',  name:'Risk / feasibility',  sub:'execution + regulatory', weight:15, dir:'cost',    axis:'feasibility',
      meaning:'Execution, model, and regulatory risk. A cost criterion — inverted, so lower, better-understood risk scores higher.',
      basis:'Scored 1–10 on likelihood of not capturing the value: novelty, model dependence, and regulatory exposure all raise it.',
      weightWhy:'15% — a deliverability check that discounts value we are unlikely to actually capture.' },
  ];

  const portfolios = [
    {
      id:'retail', name:'Retail Banking', value:'$1.9B', lead:'Priya Nair', hue:265,
      desc:'Everyday banking — lending, deposits, and onboarding for personal customers.',
      crit:{ sa:7, vs:8, mu:6, inv:6, rk:5 },
      why:{
        sa:'Onboarding and lending grow primary relationships — a core pillar — but offer less loss-reduction upside than Cards.',
        vs:'The largest book ($1.9B), with broad revenue and cost-to-serve upside across everyday banking.',
        mu:'Steady competitive pressure rather than a hard deadline.',
        inv:'Moderate — leans on existing channels and data.',
        rk:'Mostly well-understood delivery; only credit-risk modeling carries real risk.',
      },
      products:[
        { id:'mortgages', name:'Mortgages', tagline:'Near-real-time, AI-augmented mortgage origination.',
          phase:'Envision', value:3.4, feasibility:3.1, quadrant:'Quick Win', sponsor:'Priya Nair', valueAtStake:'$12M',
          wsjf:{ bv:7, tc:6, rr:5, js:6 }, rationale:'High value but a heavy build (job size 6) — a solid bet rather than an urgent one.' },
        { id:'onboarding', name:'Account Onboarding', tagline:'Open and fund an account in minutes, not days.',
          phase:'Discover', value:3.4, feasibility:4.0, quadrant:'Quick Win', sponsor:'Marcus Bell', valueAtStake:'$8M',
          wsjf:{ bv:8, tc:7, rr:5, js:4 }, rationale:'High value on a small job — the fastest payback in Retail.' },
        { id:'credit-risk', name:'Credit Risk', tagline:'Continuous, model-driven portfolio risk assessment.',
          phase:'Envision', value:3.4, feasibility:2.1, quadrant:'Big Bet', sponsor:null, valueAtStake:'$20M',
          wsjf:{ bv:8, tc:6, rr:7, js:8 }, rationale:'Strong risk-reduction, but the largest job (8) drags its WSJF down despite the big prize.' },
      ],
    },
    {
      id:'cards', name:'Cards & Payments', value:'$1.4B', lead:'Elena Cho', hue:265,
      desc:'Card issuing, real-time payments, and the fraud controls that protect them.',
      crit:{ sa:9, vs:9, mu:8, inv:7, rk:6 },
      why:{
        sa:'Real-time payments and fraud advance two North Star pillars at once — relationship growth and loss reduction.',
        vs:'A $1.4B book holding the bank’s single largest loss-avoidance prize (fraud).',
        mu:'Instant-payment mandates and rising fraud make this the fastest-closing window.',
        inv:'Heavy — real-time rails and ML infrastructure need sustained capital, which lowers feasibility.',
        rk:'Material model and regulatory risk, though fraud is already proven in Realize.',
      },
      products:[
        { id:'fraud', name:'Fraud Decisioning', tagline:'Score every transaction in real time; block fraud in seconds.',
          phase:'Realize', value:4.2, feasibility:3.8, quadrant:'Quick Win', sponsor:'Elena Cho', valueAtStake:'$14M',
          studio:'Product Studio.html', realized:'$11.8M', wsjf:{ bv:9, tc:9, rr:8, js:4 }, phaseFlags:{ Operate:'commands' }, rationale:'Top of the bank — high cost of delay, a small remaining job, and already realizing value.' },
        { id:'rtp', name:'Real-Time Payments', tagline:'Instant account-to-account rails with built-in risk checks.',
          phase:'Build', value:3.8, feasibility:3.2, quadrant:'Quick Win', sponsor:'Devin Osei', valueAtStake:'$16M',
          wsjf:{ bv:8, tc:7, rr:6, js:6 }, rationale:'High value and mandate-driven, but a sizable build keeps it just behind fraud.' },
        { id:'rewards', name:'Card Rewards Engine', tagline:'Personalized, real-time rewards at the point of sale.',
          phase:'Discover', value:2.9, feasibility:3.6, quadrant:'Fill-in', sponsor:'Sara Lindqvist', valueAtStake:'$6M',
          wsjf:{ bv:5, tc:5, rr:3, js:4 }, rationale:'Lower value on a small job — a fill-in that waits behind the core bets.' },
      ],
    },
    {
      id:'wealth', name:'Wealth Management', value:'$0.9B', lead:'Tom Alvarez', hue:265,
      desc:'Advisory and investing products for mass-affluent and private clients.',
      crit:{ sa:6, vs:6, mu:5, inv:5, rk:4 },
      why:{
        sa:'Advisory supports relationships but contributes less to the headline pillars.',
        vs:'A real but smaller prize — the $0.9B book is the lightest of the three.',
        mu:'Competitive, with no near-term forcing function.',
        inv:'Lighter build, mostly advisor-facing tooling.',
        rk:'Lower regulatory exposure; advisor-augmentation is well-trodden ground.',
      },
      products:[
        { id:'robo', name:'Robo-Advisor', tagline:'Automated, goal-based portfolio management.',
          phase:'Design', value:3.6, feasibility:3.0, quadrant:'Quick Win', sponsor:'Tom Alvarez', valueAtStake:'$10M',
          wsjf:{ bv:7, tc:6, rr:5, js:6 }, rationale:'Good value with a moderate build — the lead bet for Wealth.' },
        { id:'insights', name:'Portfolio Insights', tagline:'Explainable, proactive guidance for advisors.',
          phase:'Operate', value:3.2, feasibility:3.7, quadrant:'Quick Win', sponsor:'Nadia Rahman', valueAtStake:'$7M',
          wsjf:{ bv:6, tc:6, rr:5, js:4 }, rationale:'Solid value on a small job — a quick advisor win.' },
      ],
    },
  ];

  /* ---- helpers ---- */
  function portfolio(id){ return portfolios.find(p => p.id === id); }
  function allProducts(){ return portfolios.flatMap(p => p.products); }
  function quadClass(q){ return ({ 'Quick Win':'qw','Big Bet':'bb','Fill-in':'fi','Avoid':'av' })[q] || 'av'; }
  function quadOf(v, f){ const hv = v >= 3, hf = f >= 3; return hv && hf ? 'Quick Win' : hv && !hf ? 'Big Bet' : !hv && hf ? 'Fill-in' : 'Avoid'; }
  function phaseIndex(ph){ return PHASES.indexOf(ph); }

  // ---- portfolio scoring (weighted multi-criteria) ----
  function pfAxis(pf, axis){           // returns 1..5 on Value or Feasibility
    const crits = PF_CRITERIA.filter(c => c.axis === axis);
    let wsum = 0, acc = 0;
    for (const c of crits){
      const raw = pf.crit[c.id] ?? 5;
      const norm = c.dir === 'cost' ? (10 - raw) / 10 : raw / 10;   // 0..1
      acc += c.weight * norm; wsum += c.weight;
    }
    return 1 + (wsum ? acc / wsum : 0) * 4;
  }
  function pfValue(pf){ return pfAxis(pf, 'value'); }
  function pfFeasibility(pf){ return pfAxis(pf, 'feasibility'); }
  function pfScore(pf){                 // 0..100 full weighted composite (control-plane)
    const sum = PF_CRITERIA.reduce((a, c) => a + c.weight, 0) || 1;
    let t = 0;
    for (const c of PF_CRITERIA){
      const raw = pf.crit[c.id] ?? 5;
      const norm = c.dir === 'cost' ? (10 - raw) / 10 : raw / 10;
      t += (c.weight / sum) * norm;
    }
    return t * 100;
  }

  // ---- product scoring (WSJF) ----
  function prodValue(d){ const w = d.wsjf; return 1 + ((w.bv + w.tc + w.rr) / 30) * 4; }      // 1..5
  function prodFeasibility(d){ return 1 + ((10 - d.wsjf.js) / 9) * 4; }                        // 1..5 (low job size → high feasibility)
  function wsjf(d){ const w = d.wsjf; return (w.bv + w.tc + w.rr) / Math.max(0.1, w.js); }

  function tierOf(score, max){ if (max <= 0) return 'later'; const r = score / max; return r >= 0.75 ? 'now' : r >= 0.5 ? 'next' : r >= 0.28 ? 'later' : 'hold'; }
  const TIER_LABEL = { now:'NOW', next:'NEXT', later:'LATER', hold:'HOLD' };

  return {
    org, portfolios, PHASES, PF_CRITERIA,
    portfolio, allProducts, quadClass, quadOf, phaseIndex,
    pfValue, pfFeasibility, pfScore,
    prodValue, prodFeasibility, wsjf, tierOf, TIER_LABEL,
  };
})();
