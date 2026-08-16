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
