/* ============================================================
   Cynergis Product Studio — PRD data (window.__PRD__)
   Product: "Fraud Decisioning" — the product-altitude artifact for
   WealthGrow Bank's Card Fraud Defense domain (Cynergis Ascent).
   ============================================================ */
window.__PRD__ = {
  overview:{
    projectName:'Fraud Decisioning — Real-Time Card Fraud Platform',
    author:'Atlas',
    date:'2026-06-28',
    problem:'Card fraud losses run 18 bps. Batch rules miss fast-moving attack rings and over-decline good customers (6.2% false positives), while analysts triage four hours behind the fraud — chasing losses after they settle instead of stopping them.',
    background:'WealthGrow Bank authorizes ~2.4M card transactions a day. Detection today is a nightly batch of static rules with manual fraud referral; there is no real-time scoring and no explainable, reversible block. Real-time payment rails make timely, defensible decisioning materially valuable — and the authorization telemetry to do it already exists on the event bus.',
    objectives:[
      'Score every transaction in real time and block fraud within seconds, not hours.',
      'Cut false declines so good customers are not turned away.',
      'Make every decision explainable, reversible, and auditable — supervised by analysts.'
    ],
    vision:'Stop card fraud in the moment: score every transaction as it happens, block the bad ones in under two minutes, and let analysts supervise the edge cases instead of chasing them after the loss.',
    differentiator:'Every block is explainable and reversible — the model’s reasoning and the exact rules that fired are attached to each decision, so customers, analysts, and auditors can all see why.',
    targetUsers:'WealthGrow cardholders, the fraud operations analysts who work flagged cases, the fraud-ops managers accountable for loss and false-decline rates, and model-risk governance.',
    criteria:[
      {id:'SC1', text:'Reduce fraud loss rate from 18 bps to 7 bps', metric:'<= 7 bps'},
      {id:'SC2', text:'Reduce false-positive (false-decline) rate from 6.2% to 2.5%', metric:'<= 2.5%'},
      {id:'SC3', text:'Cut median time-to-block from 4 hours to 90 seconds', metric:'<= 90 s'},
      {id:'SC4', text:'Score authorizations within the network timeout', metric:'p95 < 300 ms'},
      {id:'SC5', text:'Notify the customer of any block quickly', metric:'<= 60 s after block'}
    ],
    hypothesis:'We believe that scoring every authorization in real time and auto-blocking fraud with explainable, reversible decisions will cut fraud losses from 18 to 7 bps and false declines from 6.2% to 2.5% — protecting roughly $14M a year — and we will know we are right when SC1–SC5 hold in production for a full quarter.',
    exit:{
      decisionRight:'Elena Cho — Fraud & Risk Lead (Executive Sponsor), with portfolio steering.',
      killCriteria:[
        'Scoring cannot meet the 300 ms p95 authorization budget on the live path, even after feature-store and serving optimization.',
        'Modelled false-decline reduction does not clear 2.5% in offline replay, removing the customer-experience case.',
        'Model Risk will not govern a path to supervised autonomy, leaving every block as a permanent manual review.'
      ],
      reviewCadence:'Phase-gate review at each lifecycle transition; portfolio steering reviews rank and sponsorship monthly.'
    }
  },
  /* Envision Block 4 — value drivers with target KPIs (D-007; authored via
     the ascent-phase-gate skill to close the Design-gate value chain
     UC → advances → VD → measured_by → SC, D-075). Primary refs follow the
     Realize attribution (SC1 ← UC1/UC2/UC3 · SC3 ← UC2 · UC4 = the unbuilt
     step-up slice that rescues medium-band declines). */
  valueDrivers:[
    {id:'VD1', name:'Stop fraud in-stream', metric:'SC1', weight:0.4, measured:true,
      kpi:{current:'18 bps', target:'7 bps', unit:'bps', direction:'down'}},
    {id:'VD2', name:'Approve good customers', metric:'SC2', weight:0.35, measured:true,
      kpi:{current:'6.2% false declines', target:'2.5%', unit:'%', direction:'down'}},
    {id:'VD3', name:'Act in seconds, not hours', metric:'SC3', weight:0.25, measured:true,
      kpi:{current:'4 h median time-to-block', target:'90 s', unit:'s', direction:'down'}},
  ],
  portfolio:{
    domain:'Risk — Card Fraud',
    capability:'Fraud Decisioning (real-time scoring, blocking, and case triage)',
    valueStream:'Authorize → Score → Decide → Protect — turning a card authorization into a fast, fair, explainable fraud decision.',
    position:'Fraud Decisioning sits in the authorization path between the Card Authorization Switch (upstream) and the Core Ledger (downstream). It reads features from the Feature Store, calls the Model Registry for the active model, and hands blocked cases to Case Management and customer alerts to the Notification Service.',
    owners:[
      {role:'Executive Sponsor', name:'Elena Cho — Fraud & Risk Lead'},
      {role:'Product Owner', name:'Atlas'},
      {role:'Engineering Lead', name:'Marcus Lee'},
      {role:'Architecture', name:'Priya Nair'},
      {role:'Data / ML', name:'Tom Alvarez'},
      {role:'Model Risk', name:'Regina Foss'}
    ],
    dependencies:[
      {id:'D1', product:'Card Authorization Switch', direction:'upstream', nature:'Real-time authorization stream and the decision callback that holds or approves a transaction.', status:'Available', notes:'Hard 300 ms budget (R1).'},
      {id:'D2', product:'Feature Store', direction:'upstream', nature:'Low-latency features + lineage feeding the scoring model.', status:'Available', notes:'Owned within the domain.'},
      {id:'D3', product:'Model Registry', direction:'upstream', nature:'Versioned models with shadow deploys before promotion.', status:'Available', notes:'Governs which model version is live.'},
      {id:'D4', product:'Notification Service', direction:'downstream', nature:'Real-time customer alerts across push, SMS, and app.', status:'Available', notes:'Shared platform service.'},
      {id:'D5', product:'Core Ledger', direction:'downstream', nature:'Posts holds, reversals, and confirmed-fraud write-offs.', status:'Available', notes:'Daily reconciliation.'}
    ],
    objectives:[
      {id:'O1', objective:'Protect customers and the lending book', owner:'CRO', keyResults:[
        {id:'KR1', kr:'Cut fraud losses 55% (18 → 7 bps)', contribution:'Real-time scoring + auto-block stop fraud before it settles.', metric:'SC1'},
        {id:'KR2', kr:'Halve false declines (6.2% → 2.5%)', contribution:'Risk-based decisioning and step-up replace blunt rules.', metric:'SC2'}
      ]},
      {id:'O2', objective:'Decide in the moment, explainably', owner:'Fraud & Risk Lead', keyResults:[
        {id:'KR3', kr:'Median time-to-block under 90 seconds', contribution:'Stream scoring on the authorization bus with a soft-hold.', metric:'SC3'},
        {id:'KR4', kr:'Score within the network timeout (p95 < 300 ms)', contribution:'Low-latency feature store + in-stream model serving.', metric:'SC4'}
      ]}
    ]
  },
  personas:[
    {id:'P1', name:'Maya Lindqvist', role:'Cardholder', tier:'Primary', situation:'Her card is used for a legitimate large purchase abroad — and, weeks later, by a fraud ring testing stolen numbers.', goal:'Be protected from fraud without being falsely declined at the checkout.', obstacle:'Blunt rules decline her real travel purchase and miss the actual fraud.', solution:'Risk-based decisioning that lets good transactions through and blocks fraud with an instant, reversible alert.', successMetric:'No fraud loss; no embarrassing false decline.', permissions:'Can confirm or dispute a flagged transaction from the alert; sees only her own activity.', frequency:'Rare — only when something is flagged.', volume:'A handful of flags a year.', authority:'Can release a hold by confirming the charge.', collaboration:'Interacts with alerts and, rarely, an analyst.', touchpoints:'Push / SMS alert, in-app confirm.', tools:'Mobile app.', regulatory:'Protected PII; fair-treatment obligations.', quote:'Stop the fraud — just don’t decline me when I’m actually buying something.'},
    {id:'P2', name:'Lena Park', role:'Fraud Analyst', tier:'Primary', situation:'Works a queue of flagged cases and must confirm or clear fraud quickly with evidence.', goal:'Resolve cases fast and right, with the model’s reasoning and history in one place.', obstacle:'Thin context on referrals; cross-card ring patterns are hard to see.', solution:'A case workspace with the score explanation, linked transactions, and one-click reverse.', successMetric:'Higher confirmed-fraud rate; fewer false referrals.', permissions:'Can resolve cases, place or release holds, and record dispositions.', frequency:'Continuous, all shift.', volume:'~40 cases a day.', authority:'Can release a hold or confirm fraud within policy.', collaboration:'Escalates rings to the SIU lead; works with the manager.', touchpoints:'Case workspace.', tools:'Case Manager, evidence viewer.', regulatory:'Mandatory fraud reporting.', quote:'Bring me the signal and the history, not a hunch.'},
    {id:'P3', name:'Elena Cho', role:'Fraud Ops Manager', tier:'Admin', situation:'Accountable for loss rate, false-decline rate, and analyst capacity across the book.', goal:'Keep loss and false declines down without overwhelming analysts.', obstacle:'After-the-fact reporting; no live view of model behaviour.', solution:'Live dashboards on loss, declines, latency, drift, and the approvals queue.', successMetric:'Targets met; no surprise drift or backlog.', permissions:'Configures thresholds and queues; approves autonomy promotions; no case-level edits.', frequency:'Daily glance; weekly review.', volume:'Whole book.', authority:'Owns thresholds and promotion approvals.', collaboration:'Reports to the CRO; directs the analyst team.', touchpoints:'Ops dashboards, approvals.', tools:'Live-ops console.', regulatory:'Accountable for the fraud control posture.', quote:'Tell me what’s drifting and what it’s costing us this week.'},
    {id:'P4', name:'Regina Foss', role:'Model Risk Officer', tier:'Secondary', situation:'Validates the scoring model and governs its promotion to autonomy.', goal:'Ensure decisions are explainable, validated, and within model-risk policy.', obstacle:'Black-box scores and manual validation evidence.', solution:'Per-decision explanations, shadow-deploy evidence, and a documented promotion trail.', successMetric:'Validated model; clean audit; no ungoverned autonomy.', permissions:'Can approve or block model promotions; read-only on decisions.', frequency:'At each promotion and quarterly review.', volume:'A few promotions a quarter.', authority:'Gate on autonomy promotion.', collaboration:'Works with Data/ML and the manager.', touchpoints:'Promotion board, validation reports.', tools:'Model Registry, trust ladder.', regulatory:'Model-risk governance (SR 11-7-style).', quote:'No autonomy without evidence I can defend.'}
  ],
  stakeholders:[
    {id:'ST1', name:'Compliance Office', role:'Compliance', interest:'Explainable, reversible decisions and a complete audit trail.', govLink:'G1'},
    {id:'ST2', name:'Card Product', role:'Product', interest:'Approval rates and customer experience at checkout.', govLink:'G4'},
    {id:'ST3', name:'CISO', role:'Security', interest:'PII safeguards and tamper-evident decision logs.', govLink:'G3'}
  ],
  product:{
    approach:'Problem-solving MVP — prove real-time scoring + reversible auto-block on credit cards, supervised by analysts, then extend to debit, wallets, and merchant-side fraud.',
    inScope:['Real-time transaction scoring','Risk-based step-up auth','Auto-block & customer notify','Analyst case triage','Per-decision explanation & audit'],
    outScope:['Chargeback recovery workflow','Merchant acquiring fraud (Phase 2)','AML / sanctions screening','Identity onboarding fraud'],
    mvp:['Real-time scoring on credit cards','Reversible auto-block','Customer notify','Analyst case workspace','Decision audit log'],
    growth:['Debit & wallet rails','Adaptive step-up auth','Chargeback prediction','Ring-detection across cards'],
    vision:['Merchant-side fraud','Cross-product risk signal mesh','Fully autonomous low-risk decisioning']
  },
  journeys:[
    {id:'J1', title:'A suspicious charge is stopped before it settles', personaId:'P1', opening:'A stolen card number is tested with a small charge, then a large one minutes later.', rising:'The platform scores the second authorization high-risk in real time as it hits the switch.', climax:'The transaction is soft-held within 300 ms and Maya gets an instant alert to confirm or deny.', resolution:'She taps “I didn’t make this”; the card is protected and a case is queued with the evidence.', capabilities:'Real-time scoring, soft-hold, instant alert, customer confirm, case creation'},
    {id:'J2', title:'Lena triages a flagged case', personaId:'P2', opening:'A high-risk case lands in Lena’s queue, already enriched.', rising:'She sees the score explanation, the linked transactions, and a cross-card ring signal in one place.', climax:'She confirms the ring and places holds across the related cards.', resolution:'Fraud is confirmed and reported; the model gets a labelled outcome for learning.', capabilities:'Case workspace, score explanation, linked evidence, multi-card hold, disposition'},
    {id:'J3', title:'Regina governs a model promotion', personaId:'P4', opening:'The scoring skill has run supervised for six weeks with zero reversals.', rising:'Regina opens the promotion board with the shadow-deploy evidence and validation report.', climax:'She approves promotion of score-transaction to autonomous, with conditions.', resolution:'The promotion is recorded with a defensible trail; autonomy is governed, not assumed.', capabilities:'Trust ladder, validation evidence, promotion approval, audit trail'}
  ],
  usecases:[
    {id:'UC1', driverRef:'VD1', title:'Score a transaction in real time', journeyId:'J1', primaryActor:'P1', supportingActors:'Card Authorization Switch, Feature Store, Model Registry', frs:['FR1','FR2','FR8'],
      trigger:'An authorization arrives on the event bus from the card switch.',
      preconditions:'The card is active; the scoring model is live; features are available.',
      orchestration:'Switch → auth.requested event → Scoring Service → features + model → decision → auth.decided callback.',
      repeatability:'Once per authorization; idempotent on retries within the auth window.',
      postconditions:'A decision (approve / step-up / block) with an explanation is returned within the timeout and logged.',
      mainFlow:['An authorization is published to the bus.','The Scoring Service fetches features for the card and merchant.','It requests a score from the live model version.','Rules and policy are layered over the score to choose a decision.','The decision plus its explanation is returned to the switch and logged.'],
      extensions:[{at:'2a', text:'Features unavailable → fall back to rules-only decision and flag degraded mode.'},{at:'3a', text:'Model timeout approaching → return the rules decision before the 300 ms budget.'},{at:'4a', text:'Medium risk → return a step-up auth challenge instead of a block.'}],
      terminalStates:[{type:'Success', text:'Decision returned within budget with an explanation.'},{type:'Failure', text:'Hard timeout → fail open to approve and queue for review (policy-bound).'}],
      workflow:'flowchart TD\n  A([auth.requested]) --> B[Fetch features]\n  B --> C[Score with live model]\n  C --> D[Layer rules + policy]\n  D --> E{Risk band}\n  E -- Low --> F([Approve])\n  E -- Medium --> G([Step-up auth])\n  E -- High --> H([Soft-hold + block])\n  H --> I[Log decision + explanation]',
      acceptance:[
        {title:'High-risk authorization is blocked within budget', given:['an active card','an authorization scored high-risk'], when:['the Scoring Service decides'], then:['the transaction is soft-held within 300 ms','the decision and its explanation are logged']},
        {title:'Good transaction is approved', given:['an authorization scored low-risk'], when:['the Scoring Service decides'], then:['the transaction is approved','no customer friction is added']}
      ]},
    {id:'UC2', driverRef:'VD3', title:'Auto-block and notify the customer', journeyId:'J1', primaryActor:'P1', supportingActors:'Notification Service, Case Manager', frs:['FR3','FR4','FR9'],
      trigger:'The Scoring Service returns a high-risk block decision.',
      preconditions:'A reachable notification channel exists for the cardholder.',
      orchestration:'block decision → soft-hold on ledger → Notification Service alert → Case Manager case → await customer response.',
      repeatability:'Per blocked transaction.',
      postconditions:'A soft-hold is placed, the customer is notified within 60 s, and a case is queued with the explanation.',
      mainFlow:['A high-risk block is decided.','A reversible soft-hold is placed on the transaction.','The customer is notified within 60 seconds to confirm or deny.','A case is queued to an analyst with the decision explanation.','If the customer confirms it was them, the hold is released automatically.'],
      extensions:[{at:'3a', text:'No reachable channel → escalate straight to an analyst.'},{at:'5a', text:'Customer denies → confirm fraud, keep the hold, and label the outcome.'}],
      terminalStates:[{type:'Success', text:'Fraud stopped or false-positive reversed within minutes.'},{type:'Failure', text:'No response and no analyst action → policy timeout keeps the hold.'}],
      workflow:'flowchart TD\n  A([High-risk block]) --> B[Soft-hold transaction]\n  B --> C[Notify customer < 60s]\n  C --> D[Queue analyst case]\n  D --> E{Customer response}\n  E -- Mine --> F([Release hold])\n  E -- Not mine --> G([Confirm fraud])',
      acceptance:[
        {title:'Customer is notified within a minute', given:['a transaction has been blocked'], when:['the block is placed'], then:['the customer is notified within 60 seconds','a case is queued with the explanation']},
        {title:'False positive is reversed', given:['a blocked transaction the customer confirms is theirs'], when:['the customer confirms'], then:['the hold is released automatically']}
      ]},
    {id:'UC3', driverRef:'VD1', title:'Analyst triages a flagged case', journeyId:'J2', primaryActor:'P2', supportingActors:'Case Manager, Feature Store', frs:['FR5','FR6'],
      trigger:'A case is queued from a blocked or escalated transaction.',
      preconditions:'The case carries the decision explanation and linked transactions.',
      orchestration:'case queued → analyst opens → review explanation + links → disposition → outcome label.',
      repeatability:'Per case.',
      postconditions:'The case is resolved with a disposition and the outcome is labelled for the model.',
      mainFlow:['The analyst opens the highest-priority case.','They review the score explanation and the linked transactions.','They confirm fraud or clear it, placing or releasing holds.','They record a disposition; the outcome is labelled for learning.'],
      extensions:[{at:'2a', text:'Cross-card ring detected → place holds across the related cards.'}],
      terminalStates:[{type:'Success', text:'Case resolved with a defensible disposition.'},{type:'Failure', text:'Insufficient evidence → escalate to the SIU lead.'}],
      workflow:'flowchart TD\n  A([Case queued]) --> B[Review explanation + links]\n  B --> C{Fraud?}\n  C -- Yes --> D[Hold + confirm + report]\n  C -- No --> E[Release + clear]\n  D --> F([Label outcome])\n  E --> F',
      acceptance:[
        {title:'Case carries its explanation', given:['a queued case'], when:['the analyst opens it'], then:['the score explanation and linked transactions are shown']}
      ]},
    {id:'UC4', driverRef:'VD2', title:'Step-up authentication on medium risk', journeyId:'J1', primaryActor:'P1', supportingActors:'Notification Service', frs:['FR2','FR7'],
      trigger:'The Scoring Service returns a medium-risk decision.',
      preconditions:'The cardholder has an enrolled step-up channel.',
      orchestration:'medium decision → step-up challenge → response → approve or block.',
      repeatability:'Per medium-risk authorization.',
      postconditions:'The transaction is approved on a passed challenge or blocked on failure.',
      mainFlow:['A medium-risk decision is returned.','A step-up challenge is sent to the enrolled channel.','The customer passes the challenge.','The transaction is approved and the outcome is recorded.'],
      extensions:[{at:'3a', text:'Challenge fails or times out → block and queue a case.'}],
      terminalStates:[{type:'Success', text:'Genuine customer passes and is approved.'},{type:'Failure', text:'Challenge fails → blocked.'}],
      workflow:'flowchart TD\n  A([Medium risk]) --> B[Send step-up]\n  B --> C{Passed?}\n  C -- Yes --> D([Approve])\n  C -- No --> E([Block + case])',
      acceptance:[
        {title:'Passed step-up approves', given:['a medium-risk authorization'], when:['the customer passes the step-up'], then:['the transaction is approved']}
      ]}
  ],
  specs:{
    functional:[
      {id:'FR1', area:'Scoring', text:'Score every authorization against the live model and feature set.', traceJ:'J1', traceSC:'SC4'},
      {id:'FR2', area:'Scoring', text:'Return a risk band (low / medium / high) with a per-decision explanation.', traceJ:'J1', traceSC:'SC1'},
      {id:'FR8', area:'Scoring', text:'Fall back to a rules-only decision when features or the model are unavailable.', traceJ:'J1', traceSC:'SC4'},
      {id:'FR3', area:'Decisioning', text:'Place a reversible soft-hold on high-risk transactions.', traceJ:'J1', traceSC:'SC3'},
      {id:'FR4', area:'Decisioning', text:'Notify the customer of a block within 60 seconds with a confirm/deny action.', traceJ:'J1', traceSC:'SC5'},
      {id:'FR7', area:'Decisioning', text:'Issue a step-up challenge on medium-risk decisions.', traceJ:'J1', traceSC:'SC2'},
      {id:'FR9', area:'Decisioning', text:'Release a hold automatically when the customer confirms the charge.', traceJ:'J1', traceSC:'SC2'},
      {id:'FR5', area:'Analyst', text:'Queue blocked and escalated transactions as cases with their explanation.', traceJ:'J2', traceSC:'SC1'},
      {id:'FR6', area:'Analyst', text:'Let analysts place or release holds across linked cards and record a disposition.', traceJ:'J2', traceSC:'SC1'},
      {id:'FR10', area:'Governance', text:'Record every decision as a tamper-evident, queryable audit entry.', traceJ:'J3', traceSC:'SC1'}
    ],
    nonfunctional:[
      {id:'NFR1', cat:'Performance', text:'p95 scoring latency under 300 ms at 3,000 TPS sustained.'},
      {id:'NFR2', cat:'Reliability', text:'99.95% availability for the scoring decision path, with a defined fail-open policy.'},
      {id:'NFR3', cat:'Auditability', text:'Every decision is explainable and reversible within 60 seconds and retained for 7 years.'},
      {id:'NFR4', cat:'Security', text:'PAN is tokenized end-to-end; no clear card number is persisted by the platform.'}
    ],
    policies:[
      {id:'POL1', name:'Notify on block', statement:'A customer must be notified within 60 seconds of any block, with a way to confirm or deny.', traceFR:'FR4'},
      {id:'POL2', name:'Human-gated autonomy', statement:'A scoring skill may only act autonomously after model-risk validation and a recorded promotion.', traceFR:'FR10'}
    ]
  },
  release:{
    strategy:'Shadow-first rollout: run the model in shadow over live traffic, then enable soft-block for a 5% cohort, then ramp. Analysts supervise throughout; autonomy is promoted only after validation.',
    milestones:[
      {id:'M1', name:'Shadow scoring live', date:'2026-01', status:'Done', notes:'Model scoring observed over live traffic, no enforcement.'},
      {id:'M2', name:'Soft-block on 5% cohort', date:'2026-02', status:'Done', notes:'Reversible holds + customer notify on a pilot cohort.'},
      {id:'M3', name:'Full ramp + analyst workspace', date:'2026-03', status:'Shipped', notes:'All credit-card traffic; Case Manager in production.'},
      {id:'M4', name:'Autonomy promotion (score-transaction)', date:'2026-04', status:'Done', notes:'Promoted to Tier 3 after validation.'},
      {id:'M5', name:'Debit & wallet rails', date:'2026-Q3', status:'Planned', notes:'Scale wave — opens a new Envision/Discover cycle.'}
    ]
  },
  governance:[
    {id:'G1', type:'Compliance', item:'Explainable & reversible decisions', owner:'Compliance Office', status:'Active', notes:'Every block must carry a human-readable reason and be reversible within 60 s.'},
    {id:'G2', type:'Approval', item:'Autonomy promotion board', owner:'Model Risk', status:'Active', notes:'Promotion up the trust ladder requires validation evidence and sign-off.'},
    {id:'G3', type:'Compliance', item:'PII & PAN protection', owner:'CISO', status:'Active', notes:'Tokenized PAN; decision logs scrubbed of sensitive data.'},
    {id:'G4', type:'Decision', item:'Fail-open vs fail-closed on timeout', owner:'Fraud & Risk Lead', status:'Decided', notes:'Fail open to approve on hard timeout, with mandatory review (see ADR-03).'},
    {id:'G5', type:'Ownership', item:'Model lifecycle ownership', owner:'Data / ML', status:'Active', notes:'Data/ML owns the model; Model Risk governs promotion.'}
  ],
  risk:[
    {id:'R1', cat:'Technical', title:'300 ms latency budget is tight at peak TPS', likelihood:'Medium', impact:'High', mitigation:'Low-latency feature store, in-stream serving, and a rules fallback within budget.', owner:'Marcus Lee'},
    {id:'R2', cat:'Technical', title:'Model drift from new attack patterns degrades precision', likelihood:'Medium', impact:'Medium', mitigation:'Drift monitoring, shadow re-training, and a fast rollback path.', owner:'Tom Alvarez'},
    {id:'R3', cat:'Market', title:'False declines harm customer trust', likelihood:'Medium', impact:'High', mitigation:'Reversible soft-holds, instant notify, and step-up instead of hard block.', owner:'Elena Cho'},
    {id:'R4', cat:'Resource', title:'Analyst capacity during attack spikes', likelihood:'Low', impact:'Medium', mitigation:'Auto-resolution of confirmed customer responses; triage copilot.', owner:'Elena Cho'}
  ],
  glossary:[
    {term:'Authorization', definition:'A real-time request to approve a card transaction, decided within the network timeout.'},
    {term:'Soft-hold', definition:'A reversible hold on a transaction that blocks settlement but can be released within seconds.'},
    {term:'Risk band', definition:'The low / medium / high classification a scored transaction falls into, driving the decision.'},
    {term:'Step-up auth', definition:'An extra verification challenge issued on medium-risk transactions instead of a block.'},
    {term:'Explanation', definition:'The human-readable reasons (model features + rules) attached to every decision.'},
    {term:'Trust ladder', definition:'The tiered path a scoring skill climbs (Shadow → Assisted → Supervised → Autonomous) as it earns autonomy.'},
    {term:'Drift', definition:'A shift in input or fraud patterns that degrades model accuracy over time.'},
    {term:'Feature Store', definition:'The low-latency store of pre-computed features, with lineage, that feeds the model.'}
  ]
};


/* ============================================================
   Meridian PRD registry (R2, D-106) — window.__PRD4__.
   PRDs for v4 products, keyed by product id. Each is a PROJECTION
   of the product's lifecycle spec (kg/org/products/*.js) and the
   claims member graph into the Studio PRD grammar — the graphs
   stay the source of truth. `evidence` rides inside the PRD so
   Sources/grounding never leak another product's citations.
   ============================================================ */
window.__PRD4__ = {
  'PROD-CLAIMSCORE': {
    productId:'PROD-CLAIMSCORE',   // v4 marker: Build/Operate/Realize entries derive from THIS product's graph (D-107)
    overview:{
      projectName:'ClaimsCore — the Claims domain\u2019s transactional backbone',
      author:'Atlas', date:'2026-08-16',
      problem:'Claim facts were scattered across intake spreadsheets, an aging adjudication suite and vendor portals: no single file of record, coverage checked by phone against live policy systems, SABS clocks tracked by hand. Cycle time, leakage and claimant trust all pay for it.',
      background:'One deployable, four service modules, each owned by its context\u2019s team: the claim file becomes an evented model the whole domain works against — workbenches deploy separately on top, and splitting the deployable later is a repackaging decision, not a reorganization.',
      objectives:[
        'Make the claim file the single, evented record every module works against.',
        'Adjudicate against the immutable coverage snapshot — temporal correctness by construction.',
        'Put SABS clocks in the model, not in adjusters\u2019 heads — a conduct risk becomes an SLO.'
      ],
      vision:'The claim file as the fastest, truest record in Ontario auto: one loss event, one report; one claim, one snapshot; every reserve move evented; every statutory clock watched.',
      differentiator:'Temporal correctness as architecture: the immutable as-at-date-of-loss snapshot removes the run-time dependency on Underwriting entirely — the reference corpus\u2019 canonical design-time-versus-run-time seam, made real.',
      targetUsers:'Claimants (often not the insured), the ~600-person claims operations leg — intake, desk, field and AB adjusters — total-loss specialists, and the first-line risk seats embedded in the stream teams.',
      criteria:[
        {id:'SC1', text:'Median days from loss report to file close: 24 → 14', metric:'<= 14 days'},
        {id:'SC2', text:'Indemnity paid beyond entitlement (leakage): 3.1% → 2.0% of incurred', metric:'<= 2.0%'},
        {id:'SC3', text:'Post-close claimant NPS: +18 → +40', metric:'>= +40'},
        {id:'SC4', text:'Losses reported digitally without a phone call: 22% → 60%', metric:'>= 60%'},
        {id:'SC5', text:'SABS decisions missed into deemed approval: → ~zero per quarter', metric:'0 / quarter'}
      ],
      hypothesis:'We believe that one evented claim model — snapshot-adjudicated, clock-guarded, with supplements tracked rather than overwritten — will take cycle time from 24 to 14 days, leakage from 3.1% to 2.0%, and deemed approvals from 11 a quarter to zero; we will know when SC1–SC5 hold for a full quarter. Mid-ramp truth: 17.2 days · 2.4% · +31 · 47% · 3/quarter.',
      exit:{
        decisionRight:'Chief Claims Officer, with the quarterly outcome review (evidence in, trade-offs out).',
        killCriteria:[
          'Bind\u2019s snapshot event schema churns faster than the customer–supplier seam can absorb — adjudication correctness exposed (risk R1).',
          'HCAI conformance drift converts to a rising deemed-approval rate that the ACL cannot hold (risk R2).',
          'Module boundaries erode inside the single deployable — module→context stops being exactly one (risk R3, invariant I1).'
        ],
        reviewCadence:'Phase-gate review at each lifecycle transition; the domain\u2019s quarterly outcome review governs the envelope.'
      }
    },
    valueDrivers:[
      {id:'VD1', name:'Faster files', metric:'SC1', weight:0.3, measured:true,
        kpi:{current:'17.2 days', target:'14 days', unit:'days', direction:'down'}},
      {id:'VD2', name:'Accurate indemnity', metric:'SC2', weight:0.3, measured:true,
        kpi:{current:'2.4%', target:'2.0%', unit:'%', direction:'down'}},
      {id:'VD3', name:'Claimant trust', metric:'SC3', weight:0.2, measured:true,
        kpi:{current:'+31', target:'+40', unit:'NPS', direction:'up'}},
      {id:'VD4', name:'Regulatory safety', metric:'SC5', weight:0.2, measured:true,
        kpi:{current:'3 / quarter', target:'0', unit:'deemed approvals', direction:'down'}}
    ],
    portfolio:{
      domain:'Claims — pay the loss, recover and learn',
      capability:'The claim file of record: intake, coverage adjudication, statutory benefits, salvage disposition',
      valueStream:'Report → Adjudicate → Repair or settle → Close — turning a loss event into a fast, fair, statutorily safe outcome.',
      position:'ClaimsCore sits at the centre of the Claims domain: it consumes the immutable coverage snapshot from Underwriting & Policy (customer–supplier) and party records from the platform band, publishes payment instructions to Billing & Money Movement and loss experience to Product & Pricing, and conforms to HCAI behind an ACL. The workbenches and portals are separate deployables on top.',
      owners:[
        {role:'Accountable Executive', name:'Chief Claims Officer'},
        {role:'Owning group', name:'Four Claims stream teams (one domain group)'},
        {role:'Notice of loss', name:'Notice of loss team (8)'},
        {role:'Coverage & adjudication', name:'Coverage & adjudication team (9)'},
        {role:'Accident benefits', name:'Accident benefits team (9)'},
        {role:'First-line risk', name:'Embedded control seats (heaviest in AB)'}
      ],
      dependencies:[
        {id:'D1', product:'Underwriting & Policy — snapshot', direction:'upstream', nature:'The immutable coverage snapshot as at date of loss, consumed as an event (CoverageSnapshot v3).', status:'Available', notes:'The canonical design-time-only seam; no live calls at adjudication time.'},
        {id:'D2', product:'Party, vehicle & driver platform', direction:'upstream', nature:'Canonical party and vehicle records for claimants, drivers and third parties.', status:'Available', notes:'Open host + published language.'},
        {id:'D3', product:'HCAI (industry gateway)', direction:'upstream', nature:'OCF forms and invoices for all Ontario med/rehab billing.', status:'Available', notes:'Non-negotiable schema — conformist behind our ACL; watched by SLO3.'},
        {id:'D4', product:'Billing & Money Movement', direction:'downstream', nature:'Payment instructions for indemnity and expense; void/reissue and recovery receipts flow back.', status:'Available', notes:'Published events (PaymentInstruction v2).'},
        {id:'D5', product:'Product & Pricing — loss experience', direction:'downstream', nature:'Reserve movements and closed-claim outcomes feeding rate indications.', status:'Available', notes:'The long feedback loop that prices next year\u2019s risk.'}
      ],
      objectives:[
        {id:'O1', objective:'Make the claim file the fastest, truest record in Ontario auto', owner:'Chief Claims Officer', keyResults:[
          {id:'KR1', kr:'Cycle time to 14 days by Q4', contribution:'Every handoff that becomes an event shortens the file.', metric:'SC1'},
          {id:'KR2', kr:'Leakage under 2.0% for two consecutive quarters', contribution:'Snapshot adjudication + tracked supplements are where leakage dies.', metric:'SC2'}
        ]},
        {id:'O2', objective:'Statutory safety as an operating property', owner:'First-line risk & control', keyResults:[
          {id:'KR3', kr:'Digital FNOL over 60% with NPS ≥ +40', contribution:'One front door, status transparency, kept cycle promises.', metric:'SC4'},
          {id:'KR4', kr:'Zero deemed approvals per quarter', contribution:'SABS clocks in the model; escalation at 80% cannot be muted.', metric:'SC5'}
        ]}
      ]
    },
    personas:[
      {id:'P1', name:'Dana Whitfield', role:'Claimant', tier:'Primary', situation:'Rear-ended on the 401; needs her car repaired and her treatment covered — she may not even be the insured.', goal:'Report once, be kept honestly informed, get repaired or paid without chasing anyone.', obstacle:'Historically: phone queues, re-telling the story per department, silence between milestones.', solution:'Digital first notice into one report, status events at every state change, a cycle promise the shop actually committed to.', successMetric:'Claim handled inside the promise; NPS +40.', permissions:'Sees only her own file; confirms or disputes via the portal.', frequency:'Rare — a claim every few years.', volume:'One file.', authority:'Provides facts; accepts settlements.', collaboration:'Portal + her adjuster.', touchpoints:'Customer Portal (Claims status & digital FNOL).', tools:'Mobile / web.', regulatory:'Fair-treatment and privacy obligations.', quote:'Tell me what happens next — and mean it.'},
      {id:'P2', name:'Omar Haddad', role:'Intake adjuster', tier:'Primary', situation:'Licensed intake on rotation from operations into the stream team; first notice shapes the whole claim.', goal:'Capture a complete report and route it to the right lane, fast.', obstacle:'Channel fragmentation used to mean duplicate files and lost facts.', solution:'One loss-report model behind every channel, with model-assisted severity (Operate tier, audited).', successMetric:'Report completeness at handoff; first-contact resolution.', permissions:'Creates and completes reports; overrides severity with reason.', frequency:'All shift.', volume:'~30 first notices a day.', authority:'Judgement-heavy intake; overrides audited at 10%.', collaboration:'Ops workforce management; desk lanes.', touchpoints:'Intake workbench.', tools:'FNOL intake, triage service.', regulatory:'Licensing; recorded-line obligations.', quote:'The first conversation is where the claim is won or lost.'},
      {id:'P3', name:'Priya Raman', role:'Desk adjuster', tier:'Primary', situation:'Runs a lane of open claims: coverage, reserves, authority, payments.', goal:'Decide coverage correctly against the snapshot and keep reserves honest.', obstacle:'Four surfaces per decision, authority by email thread.', solution:'The Adjuster Workbench on ClaimsCore\u2019s claim module; reserve suggestions with drivers shown; authority checks in-flow.', successMetric:'Indemnity accuracy; settlement cycle by lane.', permissions:'Decides coverage, moves reserves, instructs payments inside her band.', frequency:'All shift.', volume:'~120 open files.', authority:'Settlement authority per band; breaches prevented in-flow.', collaboration:'Team lead, SIU on flags, Billing on instructions.', touchpoints:'Adjuster Workbench.', tools:'Coverage decision service, reserve module.', regulatory:'Fault rules; conduct expectations.', quote:'Give me the snapshot and the facts — I\u2019ll make the call.'},
      {id:'P4', name:'Grace Osei', role:'AB adjuster', tier:'Primary', situation:'Licensed accident-benefits handling under SABS clocks and HCAI.', goal:'Decide treatment plans inside every statutory clock.', obstacle:'A missed clock IS a deemed approval — the loss event itself.', solution:'Clocks in the model: OCF intake classified, escalation at 80% that cannot be muted, payments only on approved plans.', successMetric:'Deemed approvals ~zero; med/rehab cycle time.', permissions:'Decides plans; authorizes payments on approved plans.', frequency:'All shift.', volume:'~80 open plans.', authority:'SABS adjudication — never delegated to the agent.', collaboration:'First-line risk seat in the team; HCAI providers.', touchpoints:'AB adjudication workbench.', tools:'Treatment plan service, SABS rules module.', regulatory:'SABS, LAT exposure, FSRA conduct.', quote:'The statute sets the clock; the model has to carry it.'},
      {id:'P5', name:'Viktor Milos', role:'Total-loss specialist', tier:'Secondary', situation:'Handles write-offs: valuation, owner settlement, lienholders, salvage.', goal:'Settle fairly on a defensible ACV and recover from the asset.', obstacle:'Valuation disputes and split files between settlement and salvage.', solution:'One disposition file: ACV with comparables attached, brand filings, auction proceeds — never two files.', successMetric:'ACV dispute rate; days threshold → settlement.', permissions:'Prepares offers; humans settle.', frequency:'Daily.', volume:'~25 dispositions in flight.', authority:'Offer preparation; settlement is his call within band.', collaboration:'Estimating on threshold handoffs; Billing on payoffs.', touchpoints:'Total loss workbench.', tools:'Valuation ACL, salvage disposal module.', regulatory:'Title branding; lienholder obligations.', quote:'One vehicle, one file — settlement and salvage together.'}
    ],
    stakeholders:[
      {id:'ST1', name:'Chief Claims Officer', role:'Executive', interest:'One scoreboard across both legs: cycle time, accuracy, leakage, complaints.', govLink:'G1'},
      {id:'ST2', name:'Claims Operations (~600)', role:'Operations', interest:'The daily tools ride this core; capacity, licensing, surge.', govLink:'G2'},
      {id:'ST3', name:'First-line risk & control', role:'Risk', interest:'SABS clocks, LAT exposure and FSRA conduct as in-flow controls, not end-of-line checklists.', govLink:'G1'}
    ],
    product:{
      approach:'Modular monolith on the walls: four service modules in one deployable, each owned by its context\u2019s team; workbenches and portals deploy separately on top. Splitting later is a repackaging decision, not a reorganization.',
      inScope:['Multi-channel loss capture into one report','Snapshot-based coverage adjudication','Reserve management, every move evented','SABS-versioned benefit adjudication with HCAI ACL','ACV settlement and salvage disposition','Claim status event stream for the portals'],
      outScope:['Repair-network operations (Repair Network Portal, same wall, separate product)','Recovery & subrogation (its own context)','Fraud scoring (Fraud & SIU observes via events)','Policy administration (a different domain)'],
      mvp:['Intake slice: channels into one report','Adjudication slice: snapshot, coverage, reserves','AB slice: SABS rules, HCAI ACL, clocks','Money & disposition slice','Status stream'],
      growth:['Photo-AI estimate assist deepening','Repair cycle promises surfaced to claimants','Recovery-potential spotting'],
      vision:['The claim file as the domain\u2019s single evented truth, with every workbench a projection']
    },
    journeys:[
      {id:'J1', title:'Have my claim handled', personaId:'P1', opening:'A collision on the 401; Dana reports the loss in the app in eleven minutes.', rising:'One report opens one claim against the frozen snapshot; triage routes it; the shop commits a window she can see.', climax:'Coverage decided, repair under way, treatment plan approved inside its clock.', resolution:'The file closes inside the cycle promise; every state change reached her as it happened.', capabilities:'Digital FNOL, snapshot adjudication, clock guard, status stream'}
    ],
    usecases:[
      {id:'UC1', driverRef:'VD3', title:'Report a loss digitally', journeyId:'J1', primaryActor:'P1', supportingActors:'Party platform, Underwriting & Policy (snapshot request)', frs:['FR1'],
        trigger:'A claimant or broker opens digital FNOL in the portal pane.',
        preconditions:'A policy-in-force check succeeds; party resolution identifies the claimant.',
        orchestration:'Portal pane → guided intake → channel merge (one report) → snapshot request keyed to date of loss.',
        repeatability:'Once per loss event — later channel inputs MERGE into the same report.',
        postconditions:'One loss report exists with parties, vehicles and circumstances; the snapshot request is on its way.',
        mainFlow:['Guided intake captures circumstances, parties, vehicles.','Party resolution attaches canonical records.','The channel-merge rule lands the input on one report.','The snapshot request is keyed to the date of loss.'],
        acceptance:[
          {title:'One loss event, one report', given:['a claimant reports a collision in the app'], when:['the police feed later references the same loss'], then:['both land on one loss report','no duplicate file exists']}
        ]},
      {id:'UC2', driverRef:'VD1', title:'Take first notice by phone with model-assisted triage', journeyId:'J1', primaryActor:'P2', supportingActors:'Telephony platform (vendor), operations workforce management', frs:['FR2'],
        trigger:'A first-notice conversation completes on the recorded line.',
        preconditions:'The report is complete enough to score.',
        orchestration:'Intake workbench → severity model (SKL-FNOL-triage, Operate per APR-2) → lane rules → initial reserve suggestion.',
        repeatability:'Severity is recalculated as facts land — never frozen at intake.',
        postconditions:'The report carries a severity score and a lane; overrides are audited at a 10% sample.',
        mainFlow:['The intake adjuster completes the guided conversation.','The severity model scores the report and proposes a lane.','Lane rules route to desk, field, AB or fast-track.','An initial reserve suggestion attaches.'],
        acceptance:[
          {title:'Injury indicators route to the AB lane', given:['a phoned-in first notice with injury indicators'], when:['intake completes the guided conversation'], then:['a severity score is attached','the file routes to the AB lane with an initial reserve suggestion']}
        ]},
      {id:'UC3', driverRef:'VD2', title:'Open the claim against the coverage snapshot', journeyId:'J1', primaryActor:'P3', supportingActors:'Underwriting & Policy (CoverageSnapshot v3)', frs:['FR3'],
        trigger:'The completed loss report event arrives.',
        preconditions:'The snapshot event was recorded at intake.',
        orchestration:'Loss report event → open claim → engage coverages from the stored snapshot — no live policy call, ever.',
        repeatability:'Once per claim.',
        postconditions:'The claim exists with its coverage basis frozen as at date of loss.',
        mainFlow:['The loss report event opens the claim.','Coverages engage from the stored snapshot.','Later policy changes never touch the open claim.'],
        workflow:'flowchart TD\n  A([loss.reported]) --> B[Open claim]\n  B --> C[Engage coverages from snapshot]\n  C --> D{Post-loss endorsement?}\n  D -- arrives later --> E([No effect on open claim])',
        acceptance:[
          {title:'Temporal correctness holds', given:['a policy endorsed AFTER the date of loss'], when:['the claim opens'], then:['adjudication uses the snapshot as at date of loss','the later endorsement has no effect on coverage basis']}
        ]},
      {id:'UC4', driverRef:'VD2', title:'Decide coverage and set reserves', journeyId:'J1', primaryActor:'P3', supportingActors:'Fraud & SIU (holds), actuarial (reserve events)', frs:['FR4','FR5'],
        trigger:'Facts land on an open claim.',
        preconditions:'The snapshot is engaged; no unresolved SIU hold.',
        orchestration:'Reserve.suggest (drivers shown) → the adjuster decides coverage and moves reserves → every move evented.',
        repeatability:'Reserves move as facts develop; each move is a new event.',
        postconditions:'Coverage response recorded with limits, deductibles and endorsement effects; reserve events flow to actuarial.',
        mainFlow:['The agent suggests a reserve with its drivers shown.','The adjuster decides coverage — limits, deductibles, 47R election effects.','The reserve move is evented for actuarial consumption.','Authority is checked in-flow before any payment.'],
        acceptance:[
          {title:'Election effects apply from the snapshot alone', given:['a snapshot carrying an OPCF 47R election and a $1,000 deductible'], when:['the desk adjuster records the coverage decision'], then:['limits, deductible and election effects are applied from the snapshot alone','the reserve move is evented for actuarial consumption']}
        ]},
      {id:'UC5', driverRef:'VD4', title:'Adjudicate a treatment plan inside the SABS clock', journeyId:'J1', primaryActor:'P4', supportingActors:'HCAI (via the ACL), first-line risk seat', frs:['FR7','FR8'],
        trigger:'An OCF-18 arrives via the HCAI ACL.',
        preconditions:'The AB claim is engaged with its elections applied.',
        orchestration:'OCF intake + classify → clock ledger (SKL-AB-clockwatch escalates at 80%) → human plan decision → payment authorization.',
        repeatability:'Per treatment plan; every decision timestamped against its clock.',
        postconditions:'The plan is decided inside its clock — or escalated before any deemed approval can occur.',
        mainFlow:['The OCF-18 is classified and queued from HCAI.','The clock ledger starts; the watch skill escalates at 80%.','The AB adjuster decides the plan — SABS adjudication is never delegated.','Payment authorizes only on the approved plan.'],
        workflow:'flowchart TD\n  A([OCF-18 via HCAI ACL]) --> B[Classify + queue]\n  B --> C[Clock ledger starts]\n  C --> D{80% of clock?}\n  D -- yes, undecided --> E([Escalate to queue head + risk seat])\n  D -- decided --> F([Timestamped decision])\n  F --> G[Authorize payment on approved plan]',
        acceptance:[
          {title:'The clock guard escalates before a deemed approval', given:['an OCF-18 received via HCAI'], when:['the adjournment clock reaches 80% with no decision'], then:['the file escalates to the AB adjuster\u2019s queue head','the risk seat is notified before any deemed approval can occur']}
        ]},
      {id:'UC6', driverRef:'VD1', title:'Issue an indemnity payment', journeyId:'J1', primaryActor:'P3', supportingActors:'Billing & Money Movement', frs:['FR6'],
        trigger:'An approved indemnity payment on the claim.',
        preconditions:'The payment is inside the adjuster\u2019s authority band.',
        orchestration:'Build instruction → publish PaymentInstruction v2 → ledger holds instructed-not-yet-settled until the outcome event returns.',
        repeatability:'Per payment; void/reissue arrives as events.',
        postconditions:'Billing acknowledged; the claim ledger is consistent with the money\u2019s true state.',
        mainFlow:['The instruction is built from the approved payment.','It publishes to Billing as PaymentInstruction v2.','The ledger holds instructed-not-yet-settled until the outcome event returns.'],
        acceptance:[
          {title:'The ledger tracks the instruction lifecycle', given:['an approved indemnity payment'], when:['the instruction is published'], then:['Billing acknowledges the event','the claim ledger reflects instructed-not-yet-settled until the outcome event returns']}
        ]},
      {id:'UC7', driverRef:'VD1', title:'Settle a total loss and dispose of the salvage', journeyId:'J1', primaryActor:'P5', supportingActors:'Estimating & repair (threshold event), valuation vendors (ACL), Billing (payoffs)', frs:['FR9'],
        trigger:'Repair estimate revisions cross the total-loss threshold.',
        preconditions:'The estimate of record and teardown facts ride the threshold-breach event.',
        orchestration:'Threshold event → ACV from the valuation ACL → human settlement offer → brand filing + salvage disposal on the SAME file.',
        repeatability:'Once per vehicle — one disposition, ever.',
        postconditions:'Owner settled, title branded, salvage proceeds credited against indemnity.',
        mainFlow:['The threshold-breach event hands the vehicle over.','ACV is determined from the valuation ACL, comparables attached.','The specialist settles with the owner; lienholders are paid off.','Brand is filed; salvage is disposed; proceeds credit the file.'],
        acceptance:[
          {title:'The handoff carries the estimate of record', given:['repair estimate revisions crossing the total-loss threshold'], when:['the threshold-breach event fires'], then:['the vehicle moves to salvage disposition with the estimate of record attached','the repair job closes']}
        ]},
      {id:'UC8', driverRef:'VD3', title:'Track my claim\u2019s status', journeyId:'J1', primaryActor:'P1', supportingActors:'Integration & API platform (event backbone)', frs:['FR10'],
        trigger:'Any module changes file state.',
        preconditions:'The claim exists; the claimant is entitled to the file.',
        orchestration:'State change → status projection → the portal pane owned by Notice of loss.',
        repeatability:'Per state change.',
        postconditions:'The claimant sees the change within the freshness SLO.',
        mainFlow:['A module changes file state.','The status projection updates.','The portal pane renders the change within its freshness SLO.'],
        acceptance:[
          {title:'Status freshness holds', given:['an open claim'], when:['any module changes file state'], then:['a status event reaches the portal pane within its freshness SLO']}
        ]}
    ],
    specs:{
      functional:[
        {id:'FR1', area:'Intake', text:'Multi-channel loss capture into a single report — one loss event, one report.', traceJ:'J1', traceSC:'SC4'},
        {id:'FR2', area:'Intake', text:'Severity scoring and lane assignment, recalculated as facts land.', traceJ:'J1', traceSC:'SC1'},
        {id:'FR3', area:'Adjudication', text:'Snapshot consumption and local storage keyed to date of loss — no live policy calls.', traceJ:'J1', traceSC:'SC2'},
        {id:'FR4', area:'Adjudication', text:'Coverage determination with endorsement effects (OPCF 47R elections) from the snapshot alone.', traceJ:'J1', traceSC:'SC2'},
        {id:'FR5', area:'Adjudication', text:'Reserve and authority management — every move evented for actuarial consumption.', traceJ:'J1', traceSC:'SC2'},
        {id:'FR6', area:'Money', text:'Payment instruction events to Billing with the instructed-not-yet-settled ledger state.', traceJ:'J1', traceSC:'SC1'},
        {id:'FR7', area:'Benefits', text:'SABS-versioned benefit adjudication with HCAI intake behind the ACL.', traceJ:'J1', traceSC:'SC5'},
        {id:'FR8', area:'Benefits', text:'Adjournment-clock guard: no silent deemed approvals — escalation at 80%.', traceJ:'J1', traceSC:'SC5'},
        {id:'FR9', area:'Disposition', text:'ACV settlement and salvage disposition on one file.', traceJ:'J1', traceSC:'SC1'},
        {id:'FR10', area:'Status', text:'Claim status event stream for the portals.', traceJ:'J1', traceSC:'SC3'}
      ],
      nonfunctional:[
        {id:'NFR1', cat:'Availability', text:'Digital FNOL intake availability ≥ 99.9% — the front door stays open.'},
        {id:'NFR2', cat:'Freshness', text:'Snapshot event consumption lag < 5 minutes — temporal correctness needs a fresh copy.'},
        {id:'NFR3', cat:'Conformance', text:'HCAI round-trip success ≥ 99.5% — conformance drift converts to deemed-approval risk.'}
      ],
      policies:[
        {id:'POL1', name:'Clock escalation cannot be muted', statement:'Adjournment-clock escalations at 80% reach the queue head and the risk seat, always.', traceFR:'FR8'},
        {id:'POL2', name:'Snapshot-only adjudication', statement:'No module may call live policy systems at adjudication time; the snapshot is the coverage truth.', traceFR:'FR3'}
      ]
    },
    release:{
      strategy:'Slice-by-slice on the walls: intake first (the front door), then adjudication, then the statutory AB slice, then money & disposition — each slice owned end-to-end by its context\u2019s team, workbenches deploying separately on top.',
      milestones:[
        {id:'M1', name:'Intake slice: channels into one report', date:'2026-Q1', status:'Done', notes:'UC1/UC2 — digital FNOL + phone intake on one model.'},
        {id:'M2', name:'Adjudication slice: snapshot, coverage, reserves', date:'2026-Q2', status:'Done', notes:'UC3/UC4 — the temporal-correctness core.'},
        {id:'M3', name:'AB slice: SABS rules, HCAI ACL, clocks', date:'2026-Q2', status:'Done', notes:'UC5 — deemed approvals 11 → 3/quarter and falling.'},
        {id:'M4', name:'Money & disposition slice', date:'2026-Q3', status:'Done', notes:'UC6/UC7 — PaymentInstruction v2 + one-file salvage.'},
        {id:'M5', name:'Status stream & portal panes', date:'2026-Q3', status:'Shipped', notes:'UC8 — digital share climbing ~4 pts/quarter since.'}
      ]
    },
    governance:[
      {id:'G1', type:'Compliance', item:'SABS clocks as in-flow controls', owner:'First-line risk & control', status:'Active', notes:'The risk seat is a team member, not a reviewer; escalations cannot be muted.'},
      {id:'G2', type:'Decision', item:'Fast-track settlement authority $7,500', owner:'Chief Claims Officer', status:'Active', notes:'APR-1: lane leakage audited monthly; auto-revert above 2.2%.'},
      {id:'G3', type:'Approval', item:'Trust-ladder promotions (severity triage at Operate)', owner:'Chief Claims Officer', status:'Active', notes:'APR-2: 10% audit sample; auto-revert below 90% severity-band agreement.'},
      {id:'G4', type:'Ownership', item:'Module → context is exactly one (I1)', owner:'Engineering chapter', status:'Active', notes:'The modular monolith survives only if the walls hold inside the deployable.'}
    ],
    risk:[
      {id:'R1', cat:'Technical', title:'Snapshot contract slip', likelihood:'Low', impact:'High', mitigation:'The customer–supplier seam is versioned (CoverageSnapshot v3) and contract-tested; churn is a partnership conversation, not a surprise.', owner:'Coverage & adjudication team'},
      {id:'R2', cat:'Regulatory', title:'HCAI conformance drift → deemed approvals', likelihood:'Medium', impact:'High', mitigation:'The ACL is watched by SLO3; the clock guard escalates before any deemed approval; INC-1/INC-2 hardened the retry policy.', owner:'Accident benefits team'},
      {id:'R3', cat:'Technical', title:'Module boundary erosion inside one deployable', likelihood:'Medium', impact:'Medium', mitigation:'I1 gate-checked (module → exactly one context); splitting the deployable stays a repackaging option.', owner:'Engineering chapter'}
    ],
    glossary:[
      {term:'Policy (in Claims)', definition:'The coverage snapshot as at date of loss: frozen, never the current contract — the polyseme the walls exist for.'},
      {term:'Customer (in Claims)', definition:'A claimant — who may not be the insured at all.'},
      {term:'Date (in Claims)', definition:'Date of loss: the moment that fixes coverage, SABS wording and rate version for the file.'},
      {term:'Snapshot', definition:'The immutable coverage picture consumed as an event from Bind & issuance; the canonical design-time-only seam.'},
      {term:'Deemed approval', definition:'A SABS decision missed past its adjournment clock — converted from conduct risk to SLO by the clock guard.'},
      {term:'Supplement', definition:'A post-teardown addition to an estimate: tracked, never overwritten — the leakage signal.'}
    ],
    /* evidence rides INSIDE the PRD (D-106): sources + citation map, so
       Sources/grounding never read another product's registry */
    evidence:{
      sources:[
        {id:'S3', name:'Auto-insurer org site — Claims pages', type:'doc', status:'current', origin:'ddd/auto-insurer-org-site_3.html',
         summary:'The Claims domain page and its seven context pages: models, applications, contracts, outcome measures, posture notes — the corpus this product\u2019s walls are cited to.'}
      ],
      cites:{
        SC1:['S3'], SC2:['S3'], SC3:['S3'], SC4:['S3'], SC5:['S3'],
        P1:['S3'], P2:['S3'], P3:['S3'], P4:['S3'], P5:['S3'],
        J1:['S3'],
        UC1:['S3'], UC2:['S3'], UC3:['S3'], UC4:['S3'], UC5:['S3'], UC6:['S3'], UC7:['S3'], UC8:['S3']
      }
    }
  },
};
