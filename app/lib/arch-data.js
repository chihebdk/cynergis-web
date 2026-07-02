/* ============================================================
   Cynergis Product Studio — Architecture data (window.__ARCH__)
   Architecture & Design for the "Fraud Decisioning" product.
   Cross-refs (FR/NFR/G) link back into the PRD.
   ============================================================ */
window.__ARCH__ = {
  context:{
    summary:'A streaming decision service in the card authorization path. It scores every authorization in real time, layers deterministic rules and policy over the model score, and returns an explainable, reversible decision within the network timeout — then hands blocked cases to analysts and alerts to customers.',
    drivers:[
      'Hard 300 ms decision budget inside the authorization path (NFR1).',
      'Every decision must be explainable and reversible (NFR3, G1).',
      'High, spiky throughput — ~2.4M decisions/day with attack-driven peaks.',
      'Model autonomy must be governed and validated before it acts (G2).'
    ],
    constraints:[
      'PAN must be tokenized end-to-end; no clear card number persisted (NFR4, G3).',
      'Fail-open policy on hard timeout, with mandatory review (ADR-03).',
      'Model version changes go through shadow deploys before promotion (ADR-02).'
    ],
    assumptions:[
      'The card switch can call back a hold/approve decision synchronously.',
      'Features can be served from cache within a few milliseconds.',
      'A reachable notification channel exists for most cardholders.'
    ],
    diagram:'flowchart LR\n  SW[Card Switch] -->|auth.requested| SC[Scoring Service]\n  FS[(Feature Store)] --> SC\n  MR[Model Registry] --> SC\n  SC -->|decision| SW\n  SC --> CM[Case Manager]\n  SC --> NS[Notification Service]\n  CM --> AN([Analyst])\n  NS --> CU([Cardholder])'
  },
  decisions:[
    {id:'ADR-01', cat:'Architecture style', title:'Stream scoring on the authorization event bus', status:'Accepted', affects:['FR1','NFR1','UC1'],
      rationale:'In-stream scoring on the bus meets the latency budget and decouples scoring from the switch.', alternatives:'Synchronous REST call from the switch (tighter coupling, higher tail latency); nightly batch (too slow).', consequences:'Requires an event backbone and idempotent consumers; enables replay and shadow scoring.'},
    {id:'ADR-02', cat:'ML lifecycle', title:'Model registry with shadow deploys before promotion', status:'Accepted', affects:['FR2','G2'],
      rationale:'Shadow-deploying a candidate over live traffic produces the evidence model risk needs before it can act.', alternatives:'Direct promotion (ungoverned); A/B only (slower to evidence).', consequences:'A registry + shadow harness; promotion is gated by validation.'},
    {id:'ADR-03', cat:'Resilience', title:'Reversible soft-hold, fail open on hard timeout', status:'Accepted', affects:['FR3','NFR2','G4'],
      rationale:'A soft-hold blocks settlement but reverses in seconds, protecting customers from hard false declines; failing open on a hard timeout protects approval rates, with mandatory review.', alternatives:'Hard decline (customer harm); fail closed (declines good traffic on any outage).', consequences:'Needs a reversal path and a review queue for fail-open decisions.'},
    {id:'ADR-04', cat:'Data', title:'Append-only, tamper-evident decision log', status:'Accepted', affects:['FR10','NFR3'],
      rationale:'An append-only log with hash-chaining gives a defensible audit trail and 7-year retention.', alternatives:'Mutable table (weak audit); external SIEM only (loses domain context).', consequences:'Write amplification; archived to object storage.'},
    {id:'ADR-05', cat:'Architecture style', title:'CQRS split between decisioning and case handling', status:'Accepted', affects:['FR5','FR6'],
      rationale:'Decisioning is a hot write path; case handling is a richer read/update workload — splitting them isolates latency from analyst workloads.', alternatives:'Single service (latency coupling).', consequences:'Two stores and an event link between them.'}
  ],
  stack:[
    {layer:'Stream / events', tech:'Apache Kafka', version:'3.x', why:'Authorization backbone; replay and shadow scoring.'},
    {layer:'Scoring service', tech:'Rust + ONNX Runtime', version:'1.x', why:'Low, predictable latency for in-stream model serving.'},
    {layer:'Feature store', tech:'Redis + Feast', version:'7.x / 0.3x', why:'Single-digit-ms feature reads with lineage.'},
    {layer:'Case & API', tech:'TypeScript / Node (Fastify)', version:'20 LTS', why:'Analyst APIs and case workflow.'},
    {layer:'Decision store', tech:'PostgreSQL', version:'16', why:'Append-only decision log with strong consistency.'},
    {layer:'Runtime', tech:'Kubernetes (EKS)', version:'1.30', why:'Elastic scaling through attack spikes.'},
    {layer:'Model registry', tech:'MLflow', version:'2.x', why:'Versioned models and shadow deploys.'}
  ],
  subdomainMaps:[
    {title:'Context map — decisioning ↔ case & response', mermaid:'flowchart LR\n  subgraph Decisioning\n    SC[Scoring Service]\n    RE[Rules Engine]\n    FS[Feature Store]\n  end\n  subgraph CaseResponse[Case & Response]\n    CM[Case Manager]\n    NS[Notification Service]\n  end\n  SC --> RE\n  FS --> SC\n  SC -->|block event| CM\n  SC -->|alert event| NS'}
  ],
  domains:[
    {id:'dec', name:'Decisioning', color:'oklch(0.52 0.14 265)', summary:'The hot path: score an authorization, layer rules and policy, and return an explainable decision within the latency budget.',
      aggregate:{ name:'Decision', store:'PostgreSQL · decision_log', description:'The append-only record of every decision with its score, band, and explanation.',
        tables:[
          {name:'decision_log', purpose:'One immutable row per decision.', columns:[
            {name:'decision_id', type:'uuid', desc:'Primary key.'},
            {name:'auth_id', type:'uuid', desc:'The authorization decided.'},
            {name:'card_token', type:'text', desc:'Tokenized PAN (no clear number).'},
            {name:'band', type:'enum', desc:'low / medium / high.'},
            {name:'score', type:'numeric', desc:'Model risk score 0–1.'},
            {name:'explanation', type:'jsonb', desc:'Top features + rules that fired.'},
            {name:'model_version', type:'text', desc:'Active model version used.'},
            {name:'decided_at', type:'timestamptz', desc:'Decision time.'}
          ]},
          {name:'feature_snapshot', purpose:'The features used, for replay & audit.', columns:[
            {name:'decision_id', type:'uuid', desc:'FK to decision_log.'},
            {name:'features', type:'jsonb', desc:'Feature vector snapshot.'}
          ]}
        ]},
      maps:[{title:'Decision flow', mermaid:'flowchart TD\n  A([auth.requested]) --> B[Fetch features]\n  B --> C[Score]\n  C --> D[Rules + policy]\n  D --> E{Band}\n  E -->|low| F([Approve])\n  E -->|med| G([Step-up])\n  E -->|high| H([Soft-hold])'}],
      components:[
        {id:'C1', name:'Scoring Service', overview:'Consumes authorizations, fetches features, scores with the live model, layers rules, and returns an explainable decision within budget.', mapsTo:['FR1','FR2','FR8'],
          trigger:[{type:'Event', name:'auth.requested', source:'Card Authorization Switch (auth-bus)', schema:'{ authId, cardToken, amount, merchant, mcc, ts }', why:'Every authorization that must be decided.'}],
          businessRules:[
            {rule:'Return a decision within the 300 ms budget; if the model is slow, fall back to a rules-only decision.', ref:'NFR1'},
            {rule:'Map score to band — high → soft-hold, medium → step-up, low → approve.', ref:'FR2'},
            {rule:'Attach a human-readable explanation (top features + rules) to every decision.', ref:'FR2'}
          ],
          command:[{command:'ScoreAuthorization(auth)', ref:'FR1'},{command:'DecideAndRespond(score)', ref:'FR2'}],
          readModel:[
            {type:'Database', table:'feature_cache', desc:'Low-latency features for the card + merchant.'},
            {type:'External', api:'Model Registry · active model', desc:'The live model version and weights.'}
          ],
          writeModel:[
            {type:'Database', table:'decision_log', desc:'Append the decision and its explanation.'},
            {type:'Subdomain', queue:'decision-events', desc:'Emit the decision back to the switch and to downstream consumers.'}
          ],
          resource:['res-featcache','res-decisiondb','res-bus'],
          code:{ path:'services/scoring', repo:'https://example.com/fraud-scoring', tests:'142 / 142 passing', coverage:'88%', dashboard:'https://example.com/dash/scoring', runbook:'https://example.com/runbook/scoring', owners:'Decisioning squad' },
          dependency:[
            {type:'resource', ref:'res-featcache', note:'Feature reads on the hot path.'},
            {type:'integration', ref:'INT-switch', note:'Authorization stream + decision callback.'},
            {type:'integration', ref:'INT-registry', note:'Active model version.'}
          ],
          hotspot:[
            {level:'Performance', text:'Tail latency at peak TPS is the main threat to the 300 ms budget — needs continuous load headroom.'},
            {level:'Reliability', text:'The fail-open path must be exercised under model/feature outage, not just in theory.'}
          ]},
        {id:'C2', name:'Rules Engine', overview:'Deterministic guardrails and policy layered over the model score — velocity checks, blocklists, and the fallback decision.', mapsTo:['FR8'],
          businessRules:[{rule:'Hard blocklist and velocity rules can override a low model score.', ref:'FR8'},{rule:'Provide a rules-only decision within budget when the model is unavailable.', ref:'NFR1'}],
          command:[{command:'ApplyRules(score, context)', ref:'FR8'}],
          dependency:[{type:'component', ref:'C1', note:'Invoked inline by the Scoring Service.'}],
          hotspot:[{level:'Consistency', text:'Rule changes must be versioned with the model to keep decisions reproducible.'}]},
        {id:'C5', name:'Feature Store', overview:'Computes and serves low-latency features with lineage for the scoring model.', mapsTo:['FR1'],
          writeModel:[{type:'Database', table:'feature_cache', desc:'Materialized features keyed by card + merchant.'}],
          readModel:[{type:'Subdomain', desc:'Served to the Scoring Service on the hot path.'}],
          resource:['res-featcache'],
          code:{ path:'services/features', repo:'https://example.com/feature-store', tests:'60 / 60 passing', coverage:'80%', owners:'Data/ML' },
          hotspot:[{level:'Question', text:'Should feature freshness SLAs differ for velocity vs profile features?'}]}
      ]},
    {id:'case', name:'Case & Response', color:'oklch(0.58 0.08 195)', summary:'The supervised side: notify the customer, queue analyst cases, and capture dispositions that label outcomes for the model.',
      aggregate:{ name:'Case', store:'PostgreSQL · case', description:'A fraud case opened from a block or escalation, with its links and disposition.',
        tables:[
          {name:'case', purpose:'One row per fraud case.', columns:[
            {name:'case_id', type:'uuid', desc:'Primary key.'},
            {name:'status', type:'enum', desc:'open / holding / resolved.'},
            {name:'card_token', type:'text', desc:'Tokenized PAN.'},
            {name:'disposition', type:'enum', desc:'fraud / cleared / pending.'},
            {name:'opened_at', type:'timestamptz', desc:'When the case opened.'}
          ]},
          {name:'case_link', purpose:'Transactions linked to a case (rings).', columns:[
            {name:'case_id', type:'uuid', desc:'FK to case.'},
            {name:'auth_id', type:'uuid', desc:'A linked authorization.'}
          ]}
        ]},
      maps:[{title:'Case lifecycle', mermaid:'stateDiagram-v2\n  [*] --> Open\n  Open --> Holding: place hold\n  Holding --> Resolved: disposition\n  Open --> Resolved: clear'}],
      components:[
        {id:'C3', name:'Case Manager', overview:'Analyst workspace and API: queue cases with their explanation, support multi-card holds, and record dispositions that label outcomes.', mapsTo:['FR5','FR6'],
          trigger:[
            {type:'Event', name:'transaction.blocked', source:'decision-events', schema:'{ authId, cardToken, explanation }', why:'Open a case for each block.'},
            {type:'User', actor:'Fraud Analyst', action:'Open, hold, or resolve a case', why:'Human supervision of edge cases.'}
          ],
          businessRules:[
            {rule:'Every case must carry the decision explanation and its linked transactions.', ref:'FR5'},
            {rule:'A disposition labels the outcome for model learning.', ref:'FR6'},
            {rule:'Holds may be placed across all cards linked to a ring.', ref:'FR6'}
          ],
          command:[{command:'ResolveCase(disposition)', ref:'FR6'},{command:'PlaceHold(cards)', ref:'FR6'}],
          readModel:[
            {type:'Subdomain', table:'decision_log', desc:'The decision + explanation behind the case.'},
            {type:'Database', table:'case', desc:'The case and its linked transactions.'}
          ],
          writeModel:[
            {type:'Database', table:'case', desc:'Update status and disposition.'},
            {type:'Subdomain', queue:'outcome-labels', desc:'Emit labelled outcomes for model training.'}
          ],
          resource:['res-casedb'],
          code:{ path:'services/cases', repo:'https://example.com/fraud-cases', tests:'54 / 61 passing', coverage:'76%', owners:'Case & Response squad' },
          dependency:[{type:'component', ref:'C1', note:'Consumes block events.'},{type:'resource', ref:'res-casedb', note:'Case state.'}],
          hotspot:[{level:'Risk', text:'Case Manager is at 76% coverage and still in build — the triage copilot is not yet shipped.'}]},
        {id:'C4', name:'Notification Service', overview:'Sends the real-time customer alert on a block and relays the confirm/deny response.', mapsTo:['FR4','FR9'],
          trigger:[{type:'Event', name:'block.placed', source:'decision-events', why:'Alert the customer within 60 s.'}],
          businessRules:[{rule:'Notify within 60 seconds with a confirm/deny action.', ref:'FR4'},{rule:'A customer “it was me” auto-releases the hold.', ref:'FR9'}],
          command:[{command:'NotifyCustomer(block)', ref:'FR4'}],
          writeModel:[{type:'Subdomain', queue:'notify-queue', desc:'Enqueue the outbound alert.'}],
          resource:['res-notify'],
          dependency:[{type:'integration', ref:'INT-notify', note:'Push/SMS/app delivery.'}],
          hotspot:[{level:'Reliability', text:'Channel reachability varies — fall back to an analyst when no channel is available.'}]}
      ]}
  ],
  resources:[
    {id:'res-bus', name:'auth-bus', cat:'Messaging', engine:'Kafka', desc:'The authorization event backbone — requests in, decisions out.', environments:['prod','staging'], config:[{k:'Partitions', v:'48'},{k:'Retention', v:'72h'},{k:'Replication', v:'3'},{k:'Idempotent producers', v:'on'}]},
    {id:'res-featcache', name:'feature-cache', cat:'Cache', engine:'Redis', desc:'Single-digit-ms feature reads for scoring.', environments:['prod','staging'], config:[{k:'Mode', v:'Cluster'},{k:'Eviction', v:'noeviction'},{k:'Replicas', v:'2'},{k:'TTL', v:'per-feature'}]},
    {id:'res-decisiondb', name:'decision-db', cat:'Databases', engine:'PostgreSQL 16', desc:'Append-only decision log.', environments:['prod','staging'], config:[{k:'Mode', v:'Primary + 2 replicas'},{k:'Partitioning', v:'by day'},{k:'Retention', v:'7 years (archived)'},{k:'Backups', v:'PITR'}]},
    {id:'res-casedb', name:'case-db', cat:'Databases', engine:'PostgreSQL 16', desc:'Case state and links.', environments:['prod','staging'], config:[{k:'Mode', v:'Primary + replica'},{k:'Backups', v:'PITR'}]},
    {id:'res-notify', name:'notify-queue', cat:'Messaging', engine:'SQS', desc:'Outbound customer-alert queue.', environments:['prod'], config:[{k:'Type', v:'Standard'},{k:'Visibility', v:'30s'},{k:'DLQ', v:'on'}]},
    {id:'res-audit', name:'audit-archive', cat:'Object storage', engine:'S3', desc:'Long-term, immutable decision-log archive.', environments:['prod'], config:[{k:'Object lock', v:'Compliance (7y)'},{k:'Encryption', v:'SSE-KMS'}]},
    {id:'res-kms', name:'token-kms', cat:'Secrets', engine:'KMS', desc:'Keys for PAN tokenization and log encryption.', environments:['prod','staging'], config:[{k:'Rotation', v:'annual'},{k:'Access', v:'IAM-scoped'}]}
  ],
  /* Contract registry — every event / table / API payload that crosses a boundary.
     producers/consumers reference components (C*) and integrations (INT-*), so
     alignment is checkable: who publishes, who reads, at which version. */
  schemas:[
    {id:'SCH-auth-requested', name:'auth.requested', kind:'event', version:'2.1', ownedBy:'INT-switch',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'amount', type:'number'},{name:'merchant', type:'string'},{name:'mcc', type:'string'},{name:'ts', type:'timestamp'}],
      producers:['INT-switch'], consumers:['C1']},
    {id:'SCH-decision', name:'decision', kind:'event', version:'1.2', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'band', type:'enum(low|medium|high)'},{name:'score', type:'numeric'},{name:'explanation', type:'json'},{name:'modelVersion', type:'string'}],
      producers:['C1'], consumers:['INT-switch','INT-ledger']},
    {id:'SCH-blocked', name:'transaction.blocked', kind:'event', version:'1.0', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'explanation', type:'json'}],
      producers:['C1'], consumers:['C3','C4']},
    {id:'SCH-decision-row', name:'decision_log (table)', kind:'table', version:'1.3', ownedBy:'C1',
      fields:[{name:'decision_id', type:'uuid'},{name:'auth_id', type:'uuid'},{name:'band', type:'enum'},{name:'explanation', type:'jsonb'},{name:'model_version', type:'text'}],
      producers:['C1'], consumers:['C3']},
    {id:'SCH-outcome-label', name:'outcome.labelled', kind:'event', version:'1.0', ownedBy:'C3',
      fields:[{name:'caseId', type:'uuid'},{name:'authId', type:'uuid'},{name:'disposition', type:'enum(fraud|cleared)'}],
      producers:['C3'], consumers:['C5']},
    {id:'SCH-score-req', name:'POST /v1/score (request)', kind:'api-req', version:'1.1', ownedBy:'C1', api:'API-1',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'amount', type:'number'}],
      producers:['INT-switch'], consumers:['C1']}
  ],
  /* Secret-management inventory — every credential the system needs, where it is
     managed, who uses it, and where it exists. usedBy references components and
     integrations; environments reference infra.environments. */
  secrets:[
    {id:'SCRT-switch-mtls', name:'switch-mtls-cert', kind:'mTLS certificate', manager:'AWS Secrets Manager', pathHint:'/fraud/switch/mtls', usedBy:['C1','INT-switch'], rotation:'90d', environments:['prod','staging']},
    {id:'SCRT-registry-token', name:'model-registry-token', kind:'API token', manager:'AWS Secrets Manager', pathHint:'/fraud/registry/token', usedBy:['C1','INT-registry'], rotation:'30d', environments:['prod','staging']},
    {id:'SCRT-notify-oauth', name:'notify-oauth-client', kind:'OAuth2 client', manager:'AWS Secrets Manager', pathHint:'/fraud/notify/oauth', usedBy:['C4','INT-notify'], rotation:'180d', environments:['prod']},
    {id:'SCRT-pan-key', name:'pan-token-key', kind:'KMS key', manager:'KMS (res-kms)', pathHint:'alias/fraud/pan-token', usedBy:['C1'], rotation:'annual', environments:['prod','staging']}
  ],
  apis:[
    {id:'API-1', method:'POST', path:'/v1/score', purpose:'Score an authorization and return a decision + explanation (internal, hot path).', realizes:['FR1','FR2'], errors:'504 on budget exceeded → caller applies fail-open policy.'},
    {id:'API-2', method:'POST', path:'/v1/decisions/{id}/reverse', purpose:'Release a soft-hold (customer confirm or analyst clear).', realizes:['FR9','FR3'], errors:'409 if already settled or reversed.'},
    {id:'API-3', method:'GET', path:'/v1/cases', purpose:'List the analyst case queue with explanations.', realizes:['FR5'], errors:'403 outside the analyst role.'},
    {id:'API-4', method:'POST', path:'/v1/cases/{id}/disposition', purpose:'Record a disposition and label the outcome.', realizes:['FR6'], errors:'409 on an already-resolved case.'}
  ],
  integrations:[
    {id:'INT-switch', system:'Card Authorization Switch', direction:'bidirectional', protocol:'Kafka (events) + sync callback', data:'Authorizations in; hold/approve decisions out.', auth:'mTLS', notes:'The 300 ms budget lives here.', dependsOn:'D1'},
    {id:'INT-registry', system:'Model Registry (MLflow)', direction:'inbound', protocol:'gRPC', data:'Active model version + weights; shadow candidates.', auth:'mTLS', notes:'Governs which model is live.', dependsOn:'D3'},
    {id:'INT-notify', system:'Notification Service', direction:'outbound', protocol:'REST', data:'Customer alerts (push / SMS / app) and responses.', auth:'OAuth2', notes:'Shared platform service.', dependsOn:'D4'},
    {id:'INT-ledger', system:'Core Ledger', direction:'outbound', protocol:'Events', data:'Holds, reversals, confirmed-fraud write-offs.', auth:'mTLS', notes:'Daily reconciliation.', dependsOn:'D5'}
  ],
  security:[
    {id:'SEC-1', control:'PAN tokenization', approach:'Card numbers are tokenized at the edge; only tokens flow through and are persisted by the platform.', addresses:['NFR4','G3']},
    {id:'SEC-2', control:'Tamper-evident decision log', approach:'Hash-chained, append-only decision log archived under object-lock for 7 years.', addresses:['NFR3','G1']},
    {id:'SEC-3', control:'Role-based access & least privilege', approach:'Analyst, manager, and model-risk roles scoped via IAM; case APIs gated by role.', addresses:['G3']},
    {id:'SEC-4', control:'Governed model promotion', approach:'Models act autonomously only after validation and a recorded promotion on the trust ladder.', addresses:['G2']}
  ],
  infra:{
    cloud:'AWS', platform:'Kubernetes (EKS)',
    summary:'Elastic, multi-AZ deployment sized for spiky authorization volume. Scoring runs close to the bus; case and notify scale independently.',
    adrs:['ADR-01','ADR-03'], meets:['NFR1','NFR2'],
    environments:[
      {id:'prod', name:'Production', cluster:'eks-fraud-prod', region:'us-east-1 (multi-AZ)', accountUrl:'https://example.com/aws/prod', iacUrl:'https://example.com/iac/prod', notes:'Auto-scaling on TPS; scoring pinned for latency.',
        services:[{name:'EKS cluster', url:'#'},{name:'MSK (Kafka)', url:'#'},{name:'ElastiCache (Redis)', url:'#'}],
        dashboards:[{name:'Latency & TPS', url:'#'},{name:'Drift monitor', url:'#'}]},
      {id:'staging', name:'Staging', cluster:'eks-fraud-stg', region:'us-east-1', accountUrl:'https://example.com/aws/stg', iacUrl:'https://example.com/iac/stg', notes:'Shadow-scoring harness runs here over mirrored traffic.',
        services:[{name:'EKS cluster', url:'#'},{name:'Shadow harness', url:'#'}],
        dashboards:[{name:'Shadow eval', url:'#'}]}
    ]
  },
  design:{ links:[
    {name:'Cynergis Ascent — lifecycle prototype', url:'../Cynergis Ascent.html'},
    {name:'Design system & component reference', url:'../Cynergis — System & Design Reference.html'},
    {name:'Analyst Case Manager — UX flows (Figma)', url:'#'}
  ]},
  structure:{
    tree:'fraud-decisioning/\n  services/\n    scoring/        # C1 · Rust in-stream scorer\n    rules/          # C2 · deterministic guardrails\n    features/       # C5 · feature materialization\n    cases/          # C3 · analyst API + workflow\n    notify/         # C4 · customer alerts\n  contracts/        # event + API schemas\n  models/           # registry clients + shadow harness\n  infra/            # IaC (per environment)\n  platform/         # shared libs (audit log, tokenization)',
    mapping:[
      {area:'Real-time scoring (C1)', path:'services/scoring'},
      {area:'Rules & policy (C2)', path:'services/rules'},
      {area:'Feature store (C5)', path:'services/features'},
      {area:'Case workflow (C3)', path:'services/cases'},
      {area:'Customer alerts (C4)', path:'services/notify'},
      {area:'Audit log & tokenization', path:'platform'}
    ],
    patterns:[
      'Event-driven, idempotent consumers on the authorization bus.',
      'CQRS split: hot decision path vs analyst read/update workloads (ADR-05).',
      'Append-only, hash-chained audit log for every decision (ADR-04).',
      'Shadow-deploy harness for every model change before promotion (ADR-02).'
    ]
  },
  kb:{
    intro:'Reference patterns and decision criteria for a low-latency, explainable decisioning service in a payment path.',
    guidance:[
      'Put scoring in the stream, not behind a synchronous REST hop, when you have a hard latency budget.',
      'Always have a deterministic fallback that meets the budget when the model is slow or down.',
      'Make the audit and reversibility story first-class — it is what lets a model act in production.'
    ],
    criteria:[
      {name:'Latency budget', q:'Is the decision inside a hard real-time path (network timeout)?'},
      {name:'Explainability', q:'Must each decision carry a defensible, human-readable reason?'},
      {name:'Reversibility', q:'Can a wrong decision be undone fast enough to protect customers?'},
      {name:'Governance', q:'Does autonomy require validation evidence before it acts?'}
    ],
    patterns:[
      {id:'PT1', name:'In-stream scoring', family:'Streaming', summary:'Score events as they flow on the bus rather than via a synchronous call.', whenUse:['Hard latency budgets','High, spiky throughput','Need for replay/shadow'], whenAvoid:['Low volume','No event backbone'], tradeoffs:'Adds an event backbone and idempotency requirements; buys latency headroom and replay.', signals:'A real-time path with a strict timeout and bursty load.'},
      {id:'PT2', name:'CQRS', family:'Data', summary:'Separate the write/decision model from the read/analyst model.', whenUse:['Hot write path coupled to slower reads','Different scaling needs'], whenAvoid:['Simple CRUD','Strong single-transaction needs'], tradeoffs:'Two stores and an event link; isolates latency from analyst workloads.', signals:'Latency-sensitive writes competing with richer reads.'},
      {id:'PT3', name:'Shadow deployment', family:'ML lifecycle', summary:'Run a candidate model over live traffic without enforcing, to gather evidence.', whenUse:['Governed autonomy','Model-risk validation'], whenAvoid:['Throwaway experiments'], tradeoffs:'Extra compute and a harness; produces the evidence promotion needs.', signals:'A regulated decision that a model will eventually make autonomously.'}
    ]
  }
};
