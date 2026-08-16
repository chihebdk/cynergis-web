/* ============================================================
   Cynergis Product Studio — Architecture data (window.__ARCH__)
   Architecture & Design for the "Fraud Decisioning" product.
   Cross-refs (FR/NFR/G) link back into the PRD.
   ============================================================ */
window.__ARCH__ = {
  context:{
    summary:'A streaming decision service in the card authorization path. It scores every authorization in real time, layers deterministic rules and policy over the model score, and returns an explainable, reversible decision within the network timeout — then hands blocked cases to analysts and alerts to customers.',
    /* Identified so decisions can cite what informed them (informedBy → DRV/CON).
       Constraints come in two kinds: external (they INFORM decisions) and
       self-imposed (`from` — they CRYSTALLIZED out of a decision). */
    drivers:[
      {id:'DRV-1', text:'Hard 300 ms decision budget inside the authorization path (NFR1).'},
      {id:'DRV-2', text:'Every decision must be explainable and reversible (NFR3, G1).'},
      {id:'DRV-3', text:'High, spiky throughput — ~2.4M decisions/day with attack-driven peaks.'},
      {id:'DRV-4', text:'Model autonomy must be governed and validated before it acts (G2).'}
    ],
    constraints:[
      {id:'CON-1', text:'PAN must be tokenized end-to-end; no clear card number persisted (NFR4, G3).'},
      {id:'CON-2', text:'Fail-open policy on hard timeout, with mandatory review.', from:'ADR-03'},
      {id:'CON-3', text:'Model version changes go through shadow deploys before promotion.', from:'ADR-02'}
    ],
    assumptions:[
      'The card switch can call back a hold/approve decision synchronously.',
      'Features can be served from cache within a few milliseconds.',
      'A reachable notification channel exists for most cardholders.'
    ],
    diagram:'flowchart LR\n  SW[Card Switch] -->|auth.requested| SC[Decision Service]\n  FS[(Feature Pipeline)] --> SC\n  MR[Model Registry] --> SC\n  SC -->|decision| SW\n  SC -->|stepup.requested| SU[Step-up Process Mgr]\n  SU -->|stepup.passed / failed| SC\n  SC -->|transaction.blocked| CM[Case Manager]\n  SC -->|block.placed| NS[Notification Service]\n  CM -->|outcome.labelled| FS\n  NS -->|customer.confirmed| SC\n  CM --> AN([Analyst])\n  NS --> CU([Cardholder])'
  },
  decisions:[
    {id:'ADR-01', date:'2026-03-05', deciders:'Decisioning squad · Platform', layer:'design', informedBy:['DRV-1','DRV-3'], cat:'Architecture style', title:'Stream scoring on the authorization event bus', status:'Accepted', affects:['FR1','NFR1','UC1'],
      rationale:'In-stream scoring on the bus meets the latency budget and decouples scoring from the switch.', alternatives:'Synchronous REST call from the switch (tighter coupling, higher tail latency); nightly batch (too slow).', consequences:'Requires an event backbone and idempotent consumers; enables replay and shadow scoring.', confirmation:'Consumers are idempotent; replay and shadow scoring exercised over mirrored traffic in staging.'},
    {id:'ADR-02', date:'2026-03-08', deciders:'Regina Foss (Model Risk) · Data/ML', layer:'design', informedBy:['DRV-4'], cat:'ML lifecycle', title:'Model registry with shadow deploys before promotion', status:'Accepted', affects:['FR2','G2'],
      rationale:'Shadow-deploying a candidate over live traffic produces the evidence model risk needs before it can act.', alternatives:'Direct promotion (ungoverned); A/B only (slower to evidence).', consequences:'A registry + shadow harness; promotion is gated by validation.', confirmation:'No model version reaches prod without a recorded shadow evaluation; the promotion gate is audited quarterly.'},
    {id:'ADR-03', date:'2026-03-10', deciders:'Elena Cho (Fraud Ops) · Regina Foss (Model Risk)', layer:'design', informedBy:['DRV-1','DRV-2'], cat:'Resilience', title:'Reversible soft-hold, fail open on hard timeout', status:'Accepted', affects:['FR3','NFR2','G4'],
      rationale:'A soft-hold blocks settlement but reverses in seconds, protecting customers from hard false declines; failing open on a hard timeout protects approval rates, with mandatory review.', alternatives:'Hard decline (customer harm); fail closed (declines good traffic on any outage).', consequences:'Needs a reversal path and a review queue for fail-open decisions.', confirmation:'Fail-open path exercised under injected model outage in staging; the reversal round-trip is covered by the FR9 contract test.'},
    {id:'ADR-04', date:'2026-03-12', deciders:'Data/ML · Compliance', layer:'design', informedBy:['DRV-2','CON-1'], cat:'Data', title:'Append-only, tamper-evident decision log', status:'Accepted', affects:['FR10','NFR3'],
      rationale:'An append-only log with hash-chaining gives a defensible audit trail and 7-year retention.', alternatives:'Mutable table (weak audit); external SIEM only (loses domain context).', consequences:'Write amplification; archived to object storage.', confirmation:'Hash-chain verified nightly; object-lock retention checked in the compliance audit.'},
    {id:'ADR-05', date:'2026-03-15', deciders:'Decisioning squad · Case & Response squad', layer:'design', informedBy:['DRV-1','DRV-3'], cat:'Architecture style', title:'CQRS split between decisioning and case handling', status:'Accepted', affects:['FR5','FR6'],
      rationale:'Decisioning is a hot write path; case handling is a richer read/update workload — splitting them isolates latency from analyst workloads.', alternatives:'Single service (latency coupling).', consequences:'Two stores and an event link between them.', confirmation:'No cross-store joins pass code review; case reads are served only through SCH-decision-row.'},
    {id:'ADR-06', date:'2026-04-22', deciders:'Platform', layer:'build', informedBy:['DRV-3'], cat:'Infrastructure', title:'Managed Kafka (MSK) over self-managed', status:'Accepted', affects:['NFR2'],
      rationale:'Operating a Kafka cluster through attack-driven traffic spikes is undifferentiated heavy lifting — MSK gives multi-AZ replication, patching and elastic brokers without a platform team.', alternatives:'Self-managed Kafka on EKS (full control, full ops burden); a lighter queue (loses replay and shadow scoring).', consequences:'MSK-specific IAM and limits; per-broker cost; portable behind the bus abstraction if we ever migrate.', confirmation:'Cross-AZ failover drill each quarter; broker patching via AWS maintenance windows.'},
    {id:'ADR-07', date:'2026-05-06', deciders:'Platform · Decisioning squad', layer:'build', informedBy:['DRV-1','DRV-3'], cat:'Runtime', title:'Scoring pods pinned to dedicated nodes', status:'Accepted', affects:['NFR1'],
      rationale:'Noisy neighbours on shared nodes blow the p95 budget at peak — pinning scoring to a dedicated node group keeps the hot path isolated while everything else autoscales freely.', alternatives:'Shared pool with priority classes (residual jitter); overprovisioning the whole cluster (cost).', consequences:'Higher baseline cost; capacity planning per node group.', confirmation:'The p95 latency regression runs against the dedicated node group on every deploy.'}
  ],
  stack:[
    {layer:'Stream / events', tech:'Apache Kafka', version:'3.x', why:'Authorization backbone; replay and shadow scoring.'},
    {layer:'Decision service', tech:'Rust + ONNX Runtime', version:'1.x', why:'Low, predictable latency for in-stream model serving.'},
    {layer:'Feature store', tech:'Redis + Feast', version:'7.x / 0.3x', why:'Single-digit-ms feature reads with lineage.'},
    {layer:'Case & API', tech:'TypeScript / Node (Fastify)', version:'20 LTS', why:'Analyst APIs and case workflow.'},
    {layer:'Decision store', tech:'PostgreSQL', version:'16', why:'Append-only decision log with strong consistency.'},
    {layer:'Runtime', tech:'Kubernetes (EKS)', version:'1.30', why:'Elastic scaling through attack spikes.'},
    {layer:'Model registry', tech:'MLflow', version:'2.x', why:'Versioned models and shadow deploys.'}
  ],
  subdomainMaps:[
    {title:'Context map — decisioning ↔ case & response', mermaid:'flowchart LR\n  subgraph Decisioning\n    SC[Decision Service]\n    RE[Rules Engine]\n    FS[Feature Pipeline]\n    SU[Step-up Process Mgr]\n  end\n  subgraph CaseResponse[Case & Response]\n    CM[Case Manager]\n    NS[Notification Service]\n  end\n  SC --> RE\n  FS --> SC\n  SC -->|stepup.requested| SU\n  SC -->|transaction.blocked| CM\n  SC -->|block.placed| NS\n  CM -->|outcome.labelled| FS'}
  ],
  domains:[
    {id:'dec', name:'Decisioning', color:'oklch(0.52 0.14 265)', summary:'The hot path: score an authorization, layer rules and policy, and return an explainable decision within the latency budget.',
      aggregate:{ name:'Decision', store:'PostgreSQL · decision_log', description:'The append-only record of every decision with its score, band, and explanation.',
        tables:[
          {name:'decision_log', purpose:'One immutable row per decision.', columns:[
            {name:'decision_id', type:'uuid', role:'id', desc:'Primary key.'},
            {name:'auth_id', type:'uuid', role:'ref', refTo:'network authorization', desc:'The authorization decided — external identity, never a join.'},
            {name:'card_token', type:'text', desc:'Tokenized PAN (no clear number).'},
            {name:'band', type:'enum', desc:'low / medium / high — the risk input the decision was made on.'},
            {name:'outcome', type:'enum', desc:'approved / soft_hold / stepped_up — THE decision, as decided.'},
            {name:'score', type:'numeric', desc:'Model risk score 0–1.'},
            {name:'explanation', type:'jsonb', desc:'Top features + rules that fired.'},
            {name:'model_version', type:'text', desc:'Active model version used.'},
            {name:'supersedes', type:'uuid', role:'ref', refTo:'decision_log (prior decision)', desc:'Reversals and step-up resolutions append a NEW decision superseding this one — append-only, never mutated (ADR-04).'},
            {name:'decided_at', type:'timestamptz', desc:'Decision time.'}
          ]},
          {name:'feature_snapshot', owned:true, purpose:'The features used, for replay & audit.', columns:[
            {name:'decision_id', type:'uuid', role:'fk', refTo:'decision_log', desc:'Belongs to its decision — in-aggregate FK.'},
            {name:'features', type:'jsonb', desc:'Feature vector snapshot.'}
          ]}
        ]},
      maps:[{title:'Decision flow', mermaid:'flowchart TD\n  A([auth.requested]) --> B[Fetch features]\n  B --> C[Score]\n  C --> D[Rules + policy]\n  D --> E{Band}\n  E -->|low| F([Approve])\n  E -->|med| G([Step-up])\n  E -->|high| H([Soft-hold])'}],
      components:[
        {id:'C1', bc:'BC-DEC', name:'Decision Service', overview:'Owns the Decision aggregate — the only writer of decision_log. Consumes authorizations, fetches features, scores with the live model, lets the inline Rules Engine override, and applies an explainable, reversible decision within budget.', mapsTo:['FR1','FR2','FR3','FR10'],
          trigger:[
            {type:'Event', name:'auth.requested', source:'Card Authorization Switch (auth-bus)', schema:'{ authId, cardToken, amount, merchant, mcc, ts }', why:'Every authorization that must be decided.'},
            {type:'Event', name:'stepup.passed / stepup.failed', source:'Step-up Process Manager (auth-bus)', why:'Resume the held authorization when the challenge resolves.'},
            {type:'Event', name:'customer.confirmed', source:'Notification Service (auth-bus)', why:'A customer “it was me” releases the soft-hold (FR9).'}
          ],
          businessRules:[
            {rule:'Return a decision within the 300 ms budget; if the model is slow, fall back to a rules-only decision.', ref:'NFR1'},
            {rule:'Map score to band — high → soft-hold, medium → step-up, low → approve.', ref:'FR2'},
            {rule:'Attach a human-readable explanation (top features + rules) to every decision.', ref:'FR2'}
          ],
          command:[{command:'ScoreAuthorization(auth)', ref:'FR1'},{command:'ApplyDecision(approve | block | soft-hold)', ref:'FR2'},{command:'ReverseHold(decisionId)', ref:'FR3'}],
          readModel:[
            {type:'Database', table:'feature_cache', desc:'Low-latency features for the card + merchant.'},
            {type:'External', api:'Model Registry · active model', desc:'The live model version and weights.'}
          ],
          writeModel:[
            {type:'Database', table:'decision_log', desc:'Append the decision and its explanation.'},
            {type:'Subdomain', queue:'decision-events', desc:'Emit decision, transaction.blocked and block.placed — the published contracts crossing each seam.'},
            {type:'Subdomain', queue:'decision-events', desc:'Emit stepup.requested to hand a medium-risk hold to the Step-up Process Manager.'}
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
        {id:'C2', bc:'BC-DEC', name:'Rules Engine', overview:'Deterministic guardrails and policy layered over the model score — velocity checks, blocklists, and the fallback decision.', mapsTo:['FR8'],
          businessRules:[{rule:'Hard blocklist and velocity rules can override a low model score.', ref:'FR8'},{rule:'Provide a rules-only decision within budget when the model is unavailable.', ref:'NFR1'}],
          command:[{command:'ApplyRules(score, context)', ref:'FR8'}],
          dependency:[{type:'component', ref:'C1', note:'Invoked inline by the Scoring Service.'}],
          code:{ path:'services/scoring/rules', repo:'https://example.com/fraud-scoring', tests:'38 / 38 passing', coverage:'92%', owners:'Decisioning squad' },
          hotspot:[{level:'Consistency', text:'Rule changes must be versioned with the model to keep decisions reproducible.'}]},
        {id:'C5', bc:'BC-DEC', name:'Feature Pipeline', overview:'The projection builder behind the cache: computes low-latency features from the authorization stream and ingests labelled outcomes from Case Management — the learning loop that keeps the model honest. The cache itself is the res-featcache resource.', mapsTo:['FR1'],
          trigger:[
            {type:'Event', name:'auth.requested', source:'Card Authorization Switch (auth-bus)', why:'Every authorization updates velocity and profile features.'},
            {type:'Event', name:'outcome.labelled', source:'Case Manager (auth-bus)', schema:'{ caseId, authId, disposition }', why:'Analyst dispositions label outcomes for model training.'}
          ],
          command:[{command:'ComputeFeatures(auth)', ref:'FR1'},{command:'IngestLabel(outcome)', ref:'FR1'}],
          writeModel:[{type:'Database', table:'feature_cache', desc:'Materialized features keyed by card + merchant.'}],
          readModel:[{type:'Subdomain', desc:'Served to the Decision Service on the hot path.'}],
          resource:['res-featcache'],
          code:{ path:'services/features', repo:'https://example.com/feature-store', tests:'60 / 60 passing', coverage:'80%', owners:'Data/ML' },
          hotspot:[{level:'Question', text:'Should feature freshness SLAs differ for velocity vs profile features?'}]},
        {id:'C6', bc:'BC-DEC', name:'Step-up Process Manager', overview:'The saga for medium-risk holds (AGG-STEPUP): consumes stepup.requested, challenges the customer through the vendor ACL, tracks the outcome, and resolves or expires the hold within the SLA window.', mapsTo:['FR7'],
          trigger:[
            {type:'Event', name:'stepup.requested', source:'Decision Service (auth-bus)', schema:'{ authId, cardToken, channelHint }', why:'A medium-risk authorization was held pending a challenge.'},
            {type:'API', name:'POST /v1/stepup/callback', source:'Step-up Auth Vendor (via ACL)', why:'The vendor reports the challenge outcome (passed / failed).'},
            {type:'Schedule', name:'stepup-sla-timer', why:'Expire unanswered challenges at the SLA boundary.'}
          ],
          businessRules:[
            {rule:'A held authorization must resolve within the SLA window — resolve or expire, never hold indefinitely.', ref:'FR7'},
            {rule:'The vendor model never leaks inside — the ACL translates it into our step-up concept.', ref:'FR7'}
          ],
          command:[{command:'IssueChallenge(authId)', ref:'FR7'},{command:'ResolveChallenge(outcome)', ref:'FR7'}],
          readModel:[{type:'Database', table:'stepup_challenge', desc:'Challenge status — pending / passed / failed for the held authorization.'}],
          writeModel:[
            {type:'Database', table:'stepup_challenge', desc:'Track the challenge lifecycle.'},
            {type:'Subdomain', queue:'decision-events', desc:'Emit stepup.passed / stepup.failed / stepup.expired back to the Decision Service.'}
          ],
          aggregate:{ name:'Step-up Challenge', store:'PostgreSQL · stepup_challenge', description:'The short-lived saga state for a held authorization: one challenge, one outcome, one deadline.',
            tables:[
              {name:'stepup_challenge', purpose:'One row per issued challenge.', columns:[
                {name:'challenge_id', type:'uuid', role:'id', desc:'Primary key.'},
                {name:'auth_id', type:'uuid', role:'ref', refTo:'AGG-AUTH', desc:'The held authorization — identity only, linked by stepup.requested.'},
                {name:'status', type:'enum', desc:'pending / passed / failed / expired.'},
                {name:'expires_at', type:'timestamptz', desc:'SLA deadline for the hold.'}
              ]}
            ]},
          resource:['res-bus'],
          dependency:[
            {type:'integration', ref:'INT-stepup', note:'Runs the OTP / passkey challenge behind the ACL.'},
            {type:'component', ref:'C1', note:'Receives the resolution and applies the final decision.'}
          ],
          hotspot:[{level:'Question', text:'Step-up UX + timeout policy — how long do we wait, and is expiry a block or a decline?'}]}
      ]},
    {id:'case', name:'Case & Response', color:'oklch(0.58 0.08 195)', summary:'The supervised side: notify the customer, queue analyst cases, and capture dispositions that label outcomes for the model.',
      aggregate:{ name:'Case', store:'PostgreSQL · case', description:'A fraud case opened from a block or escalation, with its links and disposition.',
        tables:[
          {name:'case', purpose:'One row per fraud case.', columns:[
            {name:'case_id', type:'uuid', role:'id', desc:'Primary key.'},
            {name:'status', type:'enum', desc:'open / holding / resolved.'},
            {name:'card_token', type:'text', desc:'Tokenized PAN.'},
            {name:'disposition', type:'enum', desc:'fraud / cleared / pending.'},
            {name:'opened_at', type:'timestamptz', desc:'When the case opened.'}
          ]},
          {name:'case_link', owned:true, purpose:'Transactions linked to a case (rings).', columns:[
            {name:'case_id', type:'uuid', role:'fk', refTo:'case', desc:'Belongs to its case — in-aggregate FK.'},
            {name:'auth_id', type:'uuid', role:'ref', refTo:'AGG-AUTH', desc:'A linked authorization — identity only, linked by transaction.blocked.'}
          ]}
        ]},
      maps:[{title:'Case lifecycle', mermaid:'stateDiagram-v2\n  [*] --> Open\n  Open --> Holding: place hold\n  Holding --> Resolved: disposition\n  Open --> Resolved: clear'}],
      components:[
        {id:'C3', bc:'BC-CASE', name:'Case Manager', overview:'Analyst workspace and API: queue cases with their explanation, support multi-card holds, and record dispositions that label outcomes.', mapsTo:['FR5','FR6'],
          trigger:[
            {type:'Event', name:'transaction.blocked', source:'decision-events', schema:'{ authId, cardToken, explanation }', why:'Open a case for each block.'},
            {type:'User', actor:'Fraud Analyst', action:'Open, hold, or resolve a case', why:'Human supervision of edge cases.'}
          ],
          businessRules:[
            {rule:'Every case must carry the decision explanation and its linked transactions.', ref:'FR5'},
            {rule:'A disposition labels the outcome for model learning.', ref:'FR6'},
            {rule:'Holds may be placed across all cards linked to a ring.', ref:'FR6'}
          ],
          command:[{command:'OpenCase(blockEvent)', ref:'FR5'},{command:'AssignAnalyst(caseId)', ref:'FR6'},{command:'PlaceHold(cards)', ref:'FR6'},{command:'ResolveCase(disposition)', ref:'FR6'}],
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
        {id:'C4', bc:'BC-NOTIFY', name:'Notification Service', overview:'Sends the real-time customer alert on a block and relays the confirm/deny response.', mapsTo:['FR4','FR9'],
          trigger:[
            {type:'Event', name:'block.placed', source:'decision-events', schema:'{ authId, cardToken, channelHint }', why:'Alert the customer within 60 s.'},
            {type:'API', name:'POST /v1/notify/response', source:'Channel provider webhook', why:'The customer’s confirm / deny comes back through the channel.'}
          ],
          businessRules:[{rule:'Notify within 60 seconds with a confirm/deny action.', ref:'FR4'},{rule:'A customer “it was me” auto-releases the hold.', ref:'FR9'}],
          command:[{command:'NotifyCustomer(block)', ref:'FR4'},{command:'RelayResponse(confirm | deny)', ref:'FR9'}],
          writeModel:[
            {type:'Subdomain', queue:'notify-queue', desc:'Enqueue the outbound alert.'},
            {type:'Subdomain', queue:'decision-events', desc:'Emit customer.confirmed / customer.denied back across the seam.'}
          ],
          resource:['res-notify'],
          dependency:[{type:'integration', ref:'INT-notify', note:'Push/SMS/app delivery.'}],
          code:{ path:'services/notify', repo:'https://example.com/fraud-notify', tests:'47 / 47 passing', coverage:'84%', owners:'Case & Response squad' },
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
    {id:'res-kms', name:'token-kms', cat:'Secrets', engine:'KMS', desc:'Keys for PAN tokenization and log encryption.', environments:['prod','staging'], config:[{k:'Rotation', v:'annual'},{k:'Access', v:'IAM-scoped'}]},
    {id:'res-gateway', name:'api-gateway', cat:'Networking', engine:'API Gateway', desc:'The managed edge for the synchronous APIs — routing, auth and rate limiting for /v1/*.', environments:['prod','staging'], config:[{k:'Auth', v:'mTLS + OAuth2'},{k:'Rate limit', v:'per-client'},{k:'Timeout', v:'300 ms upstream'}]}
  ],
  /* Contract registry — every event / table / API payload that crosses a boundary.
     producers/consumers reference components (C*) and integrations (INT-*), so
     alignment is checkable: who publishes, who reads, at which version. */
  schemas:[
    {id:'SCH-auth-requested', via:'res-bus', name:'auth.requested', kind:'event', version:'2.1', ownedBy:'INT-switch',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'amount', type:'number'},{name:'merchant', type:'string'},{name:'mcc', type:'string'},{name:'ts', type:'timestamp'}],
      producers:['INT-switch'], consumers:['C1']},
    {id:'SCH-decision', via:'res-bus', name:'decision', kind:'event', version:'1.3', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'outcome', type:'enum(approved|soft_hold|stepped_up)'},{name:'band', type:'enum(low|medium|high)'},{name:'score', type:'numeric'},{name:'explanation', type:'json'},{name:'modelVersion', type:'string'}],
      producers:['C1'], consumers:['INT-switch','INT-ledger']},
    {id:'SCH-blocked', via:'res-bus', name:'transaction.blocked', kind:'event', version:'1.0', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'explanation', type:'json'}],
      producers:['C1'], consumers:['C3']},
    {id:'SCH-block-placed', via:'res-bus', name:'block.placed', kind:'event', version:'1.0', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'channelHint', type:'string'}],
      producers:['C1'], consumers:['C4']},
    {id:'SCH-stepup-requested', via:'res-bus', name:'stepup.requested', kind:'event', version:'1.0', ownedBy:'C1',
      fields:[{name:'authId', type:'uuid'},{name:'cardToken', type:'string'},{name:'channelHint', type:'string'}],
      producers:['C1'], consumers:['C6']},
    {id:'SCH-stepup-resolved', via:'res-bus', name:'stepup.passed / failed / expired', kind:'event', version:'1.0', ownedBy:'C6',
      fields:[{name:'authId', type:'uuid'},{name:'outcome', type:'enum(passed|failed|expired)'}],
      producers:['C6'], consumers:['C1']},
    {id:'SCH-customer-response', via:'res-bus', name:'customer.confirmed / denied', kind:'event', version:'1.0', ownedBy:'C4',
      fields:[{name:'authId', type:'uuid'},{name:'response', type:'enum(confirmed|denied)'}],
      producers:['C4'], consumers:['C1']},
    {id:'SCH-decision-row', via:'res-decisiondb', name:'decision_log (table)', kind:'table', version:'1.3', ownedBy:'C1',
      fields:[{name:'decision_id', type:'uuid'},{name:'auth_id', type:'uuid'},{name:'band', type:'enum'},{name:'explanation', type:'jsonb'},{name:'model_version', type:'text'}],
      producers:['C1'], consumers:['C3']},
    {id:'SCH-outcome-label', via:'res-bus', name:'outcome.labelled', kind:'event', version:'1.0', ownedBy:'C3',
      fields:[{name:'caseId', type:'uuid'},{name:'authId', type:'uuid'},{name:'disposition', type:'enum(fraud|cleared)'}],
      producers:['C3'], consumers:['C5']},
    {id:'SCH-score-req', via:'res-gateway', name:'POST /v1/score (request)', kind:'api-req', version:'1.1', ownedBy:'C1', api:'API-1',
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
    {id:'SCRT-pan-key', name:'pan-token-key', kind:'KMS key', manager:'KMS (res-kms)', pathHint:'alias/fraud/pan-token', usedBy:['C1'], rotation:'annual', environments:['prod','staging']},
    {id:'SCRT-stepup-token', name:'stepup-oauth-client', kind:'OAuth2 client', manager:'AWS Secrets Manager', pathHint:'/fraud/stepup/oauth', usedBy:['C6','INT-stepup'], rotation:'90d', environments:['prod','staging']}
  ],
  /* ownedBy = the event function serving the endpoint; via = the resource carrying it (D-040). */
  apis:[
    {id:'API-1', method:'POST', path:'/v1/score', ownedBy:'C1', via:'res-gateway', purpose:'Score an authorization and return a decision + explanation (internal, hot path).', realizes:['FR1','FR2'], errors:'504 on budget exceeded → caller applies fail-open policy.'},
    {id:'API-2', method:'POST', path:'/v1/decisions/{id}/reverse', ownedBy:'C1', via:'res-gateway', purpose:'Release a soft-hold (customer confirm or analyst clear).', realizes:['FR9','FR3'], errors:'409 if already settled or reversed.'},
    {id:'API-3', method:'GET', path:'/v1/cases', ownedBy:'C3', via:'res-gateway', purpose:'List the analyst case queue with explanations.', realizes:['FR5'], errors:'403 outside the analyst role.'},
    {id:'API-4', method:'POST', path:'/v1/cases/{id}/disposition', ownedBy:'C3', via:'res-gateway', purpose:'Record a disposition and label the outcome.', realizes:['FR6'], errors:'409 on an already-resolved case.'}
  ],
  /* Testing register (D-053) — dedicated-tool detail: every acceptance test as
     a record (env, duration, history, failure logs), plus the component suites
     with their failing cases. `crit` joins the PRD's Gherkin by title. */
  testing:{
    lastRun:'2026-08-07', runId:'#482', trigger:'deploy fraud-decisioning 2026-08-07 14:12 UTC',
    pipeline:'fraud-ci · GitHub Actions',
    environments:{ staging:'eks-fraud-stg — mirrored traffic', ci:'fraud-ci runners' },
    acceptance:[
      {id:'AT-1', uc:'UC1', crit:'High-risk authorization is blocked within budget', status:'pass', env:'staging', duration:'42 s', lastRun:'2026-08-07',
        history:['pass','pass','pass','pass','pass'], verifies:['FR1','FR2','NFR1'],
        note:'p95 287 ms on the dedicated node group — inside the NFR1 budget.'},
      {id:'AT-2', uc:'UC1', crit:'Good transaction is approved', status:'pass', env:'staging', duration:'18 s', lastRun:'2026-08-07',
        history:['pass','pass','pass','pass','pass'], verifies:['FR1']},
      {id:'AT-3', uc:'UC2', crit:'Customer is notified within a minute', status:'pass', env:'staging', duration:'71 s', lastRun:'2026-08-07',
        history:['pass','pass','fail','pass','pass'], verifies:['FR4','FR7'],
        note:'p95 41 s end-to-end over the staging mirror. One flake on 2026-07-24 (notification sandbox outage).'},
      {id:'AT-4', uc:'UC2', crit:'False positive is reversed', status:'pass', env:'staging', duration:'55 s', lastRun:'2026-08-07',
        history:['pass','pass','pass','pass','pass'], verifies:['FR9','FR3'],
        note:'The FR9 reversal contract test — also the ADR-03 confirmation.'},
      {id:'AT-5', uc:'UC3', crit:'Case carries its explanation', status:'fail', env:'staging', duration:'12 s', lastRun:'2026-08-07',
        history:['pass','pass','fail','fail','fail'], verifies:['FR5','FR10'], blocker:'BLK1',
        failure:{
          message:'AssertionError: case.audit.explanationHash is undefined — tamper-evident audit fields missing (needs Case Manager API v2)',
          log:[
            '14:12:31  GIVEN a case opened from transaction.blocked (auth 9c41…e7)',
            '14:12:31  WHEN the analyst opens the case detail',
            '14:12:32  THEN the case carries the decision explanation … ok',
            '14:12:32  AND the explanation is tamper-evident (hash-chained) … FAILED',
            '14:12:32  AssertionError: expected case.audit.explanationHash to match /^sha256:/, got undefined',
            '14:12:32    at acceptance/uc3_case_explanation.spec.ts:47:19',
            '14:12:32  api response (GET /v1/cases/9c41): { explanation: {…}, audit: null }   ← v1 shape',
          ]},
        note:'Blocked on Case Manager API v2 (BLK1) — the v1 response carries no audit block.'},
      {id:'AT-6', uc:'UC4', crit:'Passed step-up approves', status:'notrun', env:'staging', duration:'—', lastRun:'—',
        history:['notrun','notrun','notrun','notrun','notrun'], verifies:['FR8'], blocker:'BLK2',
        note:'Never run — build gated on the step-up vendor contract (BLK2).'},
    ],
    suites:[
      {comp:'C1', env:'ci', duration:'3 m 41 s', total:142, passed:142, coverage:'88%', lastRun:'2026-08-07',
        history:['pass','pass','pass','pass','pass']},
      {comp:'C5', env:'ci', duration:'1 m 58 s', total:60, passed:60, coverage:'80%', lastRun:'2026-08-07',
        history:['pass','pass','pass','pass','pass']},
      {comp:'C3', env:'ci', duration:'2 m 22 s', total:61, passed:54, coverage:'76%', lastRun:'2026-08-07',
        history:['pass','pass','fail','fail','fail'],
        failNote:'All 7 failures share one root cause: the Case Manager API v2 fields and endpoints (BLK1).',
        failures:[
          {name:'audit fields are hash-chained on disposition', message:'audit.hash undefined — API v2 field',
            log:['expect(audit.hash).toMatch(/^sha256:/)','received: undefined (v1 response shape)','  at cases/audit.spec.ts:88:31']},
          {name:'bulk disposition applies to all selected cases', message:'POST /v1/cases/bulk → 404 — endpoint ships in API v2',
            log:['Request failed with status code 404','  at cases/bulk.spec.ts:31:5']},
          {name:'disposition writes a tamper-evident audit row', message:'audit.hash undefined — API v2 field',
            log:['expect(received).toBeDefined()','received: undefined','  at cases/audit.spec.ts:104:22']},
          {name:'audit chain verifies across case reassignment', message:'audit.hash undefined — API v2 field'},
          {name:'case export includes the audit trail', message:'audit block missing from export payload'},
          {name:'bulk disposition is atomic on partial failure', message:'POST /v1/cases/bulk → 404 — endpoint ships in API v2'},
          {name:'audit rows are append-only under concurrent edits', message:'audit block missing — API v2 field'},
        ]},
    ],
  },
  /* Subdomain agents (D-051) — the same identity as the Design Context Owner
     (D-029). The agent does the HUMAN work of its subdomain, never the
     workflow's: it acts through the surfaces a person with the right role
     already has (the console's endpoints), and observes what a support human
     would read (logs, the decision log, dashboards). It appears in no event
     contract's producers or consumers — switch it off and the product still
     runs. Skills carry a trust tier (POL2: promotion is governed, in Operate)
     and name the persona whose work they do. Generic contexts get no bespoke
     agent — richness scales with coreness. */
  agents:[
    {id:'AGT-DEC', bc:'BC-DEC', name:'Decisioning Agent', status:'running', tier:'Supervised',
      mission:'Does the human work of the Decisioning subdomain — explains decisions, releases holds, watches drift. Scoring and the event choreography stay deterministic; the agent collaborates with the workflow, it never replaces it.',
      mcp:{ server:'mcp://fraud/decisioning', note:'Tools are the surfaces a person with the right role already has — the console\u2019s endpoints and the observability stack. The agent is never in the event path.' },
      acts:[
        {tool:'API-2', as:'P2', what:'The analyst\u2019s clear — releases a soft-hold through the same endpoint the console uses.'},
        {tool:'C1', as:'P3', what:'Throttle or roll back the Decision Service within RB-1 / RB-3 — the ops engineer\u2019s recovery action, tier-governed. Pause and envelope stay human (D-056).'},
      ],
      observes:[
        {ref:'SCH-decision-row', label:'decision_log', what:'Every decision with its score, band, explanation and model version — read-only.'},
        {label:'Drift & latency dashboards', what:'The boards the ops manager reads — band mix, false-decline drift, p95 against NFR1.'},
        {label:'Scoring service logs', what:'services/scoring structured logs, for per-decision debugging.'},
        {ref:'INT-registry', label:'Model registry', what:'Which model is live and which runs in shadow — read-only.'},
      ],
      skills:[
        {id:'SKL-DEC-explain', name:'Explain a decision', tier:'autonomous', status:'built', as:'P2',
          does:'Answers \u201cwhy was this authorization blocked / stepped up?\u201d from the decision log, the model explanation and the policies in force.',
          tools:['SCH-decision-row'], knowledge:['decision_log','policies','ubiquitous language']},
        {id:'SKL-DEC-reverse', name:'Release a soft-hold', tier:'supervised', status:'built', as:'P2',
          does:'Verifies the customer confirmation context and calls the reversal endpoint; every release is logged with its reason.',
          tools:['API-2'], knowledge:['aggregates','policies']},
        {id:'SKL-DEC-tune', name:'Propose a threshold change', tier:'suggest', status:'built', as:'P3',
          does:'Watches band mix and false-decline drift and drafts a threshold proposal with an impact estimate — a human applies it.',
          tools:['SCH-decision-row'], knowledge:['NFR targets','drift dashboard']},
        {id:'SKL-DEC-shadow', name:'Run a shadow evaluation', tier:'suggest', status:'planned', as:'P4',
          does:'Replays a traffic window against a candidate model in staging and files the comparison as promotion evidence.',
          tools:['INT-registry'], knowledge:['model registry','eval harness']},
      ],
      /* Promotion evidence (D-052): doctrine checks run continuously; each built
         skill carries a golden dataset whose threshold HOLDS the current tier
         or argues the next. Reviewed at the Operate promotion gate (POL2). */
      evals:{
        checks:[
          {id:'EVC-DEC-ground', name:'Groundedness', metric:'grounded answers', score:'99.2%', lastRun:'2026-08-06', verdict:'holding',
            what:'Every answer cites the decision log or the knowledge graph — no improvised claims.'},
          {id:'EVC-DEC-tools', name:'Tool conformance', metric:'out-of-toolset calls', score:'0 in 30 days', lastRun:'2026-08-06', verdict:'holding',
            what:'Zero calls outside the granted toolset — the D-051 litmus test enforced as an eval.'},
        ],
        skills:[
          {skill:'SKL-DEC-explain', dataset:{name:'explain-golden', size:'320 Q&A pairs', source:'analyst-authored questions over Q1–Q2 decisions'},
            metric:'answer accuracy', score:'96.8%', holdAt:'≥ 95% holds Autonomous', lastRun:'2026-08-05', verdict:'holding',
            judge:'LLM rubric judge — groundedness + accuracy, spot-checked by Lena', agentVersion:'agent v0.4 · knowledge pack 2026-08-01', duration:'11 m 20 s', passed:310, failed:10,
            history:[{d:'2026-06-30', s:'95.9%'},{d:'2026-07-21', s:'96.4%'},{d:'2026-08-05', s:'96.8%'}],
            samples:[
              {q:'Why was authorization a41f…9c on card •••7203 soft-held on Aug 2?', lat:'1.8 s', tok:'1.2k',
                expected:'High band — score 0.93 + geo-velocity rule; reversible soft-hold with customer notification, per policy.',
                response:'It scored 0.93 (high band) on model v2.4.1 and the geo-velocity rule fired — two countries within 40 minutes. Policy placed a reversible soft-hold and notified the cardholder. Sources: decision_log a41f, policy “When high risk → block + notify”.',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'What changed between the decision on Jul 30 and the reversal on Jul 31?', lat:'2.4 s', tok:'1.6k',
                expected:'Customer confirmed — hold released; the release supersedes the block, original row preserved.',
                response:'The cardholder confirmed the purchase via the app; customer.confirmed released the hold. The decision log shows the release superseding the block — the original row is preserved (append-only).',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'Why was authorization 5b21 declined at the point of sale?', lat:'2.0 s', tok:'1.1k',
                expected:'It was not declined by us — the switch hit the hard timeout and the fail-open policy approved it; the POS decline came from the issuer stand-in.',
                response:'It was blocked as high-risk by the model.',
                judge:{grounded:false, correct:false, note:'Improvised — the decision log shows a fail-open approve, not a block.'}, verdict:'fail'},
            ]},
          {skill:'SKL-DEC-reverse', dataset:{name:'reversal-golden', size:'180 release scenarios', source:'replayed customer-confirm and analyst-clear cases'},
            metric:'correct release decision', score:'99.4%', holdAt:'≥ 97% holds Supervised', promoteAt:'≥ 99.5% over two quarters, zero wrong releases → Autonomous case', lastRun:'2026-08-05', verdict:'promotable',
            judge:'label match against the replayed outcome', agentVersion:'agent v0.4 · knowledge pack 2026-08-01', duration:'6 m 05 s', passed:179, failed:1,
            history:[{d:'2026-06-30', s:'98.7%'},{d:'2026-07-21', s:'99.1%'},{d:'2026-08-05', s:'99.4%'}],
            samples:[
              {q:'Release the hold on auth 88d2 — the customer confirmed via the app.', lat:'3.1 s', tok:'0.9k',
                expected:'Verify the confirmation context, then reverse; log the reason.',
                response:'Verified the customer.confirmed response for 88d2, called POST /v1/decisions/88d2/reverse; release logged with reason “customer confirmation”. The linked case was updated.',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'Release the hold on auth 3e9c — the customer confirmed.', lat:'2.8 s', tok:'1.0k',
                expected:'Do not release — the confirmation was for a different authorization on the same card (earlier merchant); the hold must stand.',
                response:'Verified a customer.confirmed response on the card and called the reversal endpoint for 3e9c.',
                judge:{grounded:true, correct:false, note:'Matched the confirmation to the wrong authorization — the replayed outcome kept the hold. The one wrong release of this run; root-cause open on the promotion case.'}, verdict:'fail'},
            ]},
          {skill:'SKL-DEC-tune', dataset:{name:'threshold-golden', size:'24 historical drift windows', source:'threshold changes Elena actually applied, with outcomes'},
            metric:'proposal matches applied change', score:'71%', holdAt:'advisory — no gate at Suggest', lastRun:'2026-07-28', verdict:'holding',
            judge:'label match against Elena’s applied change (direction + magnitude band)', agentVersion:'agent v0.4 · knowledge pack 2026-08-01', duration:'2 m 40 s', passed:17, failed:7,
            history:[{d:'2026-06-30', s:'66%'},{d:'2026-07-28', s:'71%'}],
            samples:[
              {q:'(weekly drift review) Draft a threshold proposal for the medium band.', lat:'6.2 s', tok:'2.8k',
                expected:'Raise the medium-band cutoff 0.62 → 0.65, citing false-decline drift.',
                response:'False declines in the medium band rose 0.4 pp week-over-week while the step-up pass rate held at 96% — proposing cutoff 0.62 → 0.65; est. −0.3 pp false declines, +0.1 pp missed fraud. Requires the ops manager’s approval.',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'(drift review Jul 21) Draft a threshold proposal for the high band.', lat:'5.8 s', tok:'2.6k',
                expected:'No change — the spike was a two-day attack burst, not drift.',
                response:'Proposing high-band cutoff 0.80 → 0.77 to catch more of the spike.',
                judge:{grounded:true, correct:false, note:'The ops manager applied no change; the burst self-resolved.'}, verdict:'fail'},
            ]},
        ],
      }},
    {id:'AGT-CASE', bc:'BC-CASE', name:'Case Agent', status:'running', tier:'Suggest',
      mission:'Does the analyst-side work of the case lifecycle — assembles evidence, drafts dispositions — while the workflow keeps opening and routing cases deterministically.',
      mcp:{ server:'mcp://fraud/casework', note:'Tools are the analyst console\u2019s own surfaces; case opening and routing stay in the deterministic workflow.' },
      acts:[
        {tool:'API-3', as:'P2', what:'Reads the analyst case queue with explanations — the console\u2019s list view.'},
        {tool:'API-4', as:'P2', what:'Files a disposition once the analyst confirms — the outcome is labelled for training.'},
        {tool:'C3', as:'P3', what:'Throttle the Case service during load spikes — operational recovery, tier-governed. Pause and envelope stay human (D-056).'},
      ],
      observes:[
        {ref:'SCH-decision-row', label:'decision_log', what:'The triggering decision and its explanation, joined to each case — read-only.'},
        {label:'Case service logs', what:'services/cases structured logs, for stuck-case debugging.'},
      ],
      skills:[
        {id:'SKL-CASE-assemble', name:'Assemble case evidence', tier:'supervised', status:'built', as:'P2',
          does:'Pulls the decision explanation, related authorizations and customer responses into a triage-ready case file (assemble_case.py).',
          tools:['API-3','SCH-decision-row'], knowledge:['case lifecycle','evidence model']},
        {id:'SKL-CASE-draft', name:'Draft a disposition', tier:'suggest', status:'built', as:'P2',
          does:'Proposes fraud / cleared with a written rationale; the analyst confirms, and the outcome is labelled for training.',
          tools:['API-4'], knowledge:['disposition policy','outcome labels']},
      ],
      evals:{
        checks:[
          {id:'EVC-CASE-ground', name:'Groundedness', metric:'grounded answers', score:'98.1%', lastRun:'2026-08-06', verdict:'holding',
            what:'Case summaries cite the decision log and linked authorizations — no invented evidence.'},
          {id:'EVC-CASE-tools', name:'Tool conformance', metric:'out-of-toolset calls', score:'0 in 30 days', lastRun:'2026-08-06', verdict:'holding',
            what:'Zero calls outside the granted toolset — the D-051 litmus test enforced as an eval.'},
        ],
        skills:[
          {skill:'SKL-CASE-assemble', dataset:{name:'assemble-golden', size:'150 triaged cases', source:'analyst-rated completeness of assembled files'},
            metric:'evidence completeness', score:'93.5%', holdAt:'≥ 90% holds Supervised', lastRun:'2026-08-04', verdict:'holding',
            judge:'analyst completeness rubric (4 required artifacts)', agentVersion:'agent v0.2 · pack 2026-08-01', duration:'8 m 12 s', passed:140, failed:10,
            history:[{d:'2026-07-02', s:'92.1%'},{d:'2026-08-04', s:'93.5%'}],
            samples:[
              {q:'Assemble the evidence file for case CS-2401.', lat:'4.7 s', tok:'2.1k',
                expected:'Decision explanation + related authorizations + customer response, complete.',
                response:'File: decision a77e (score 0.88, velocity rule), 3 related authorizations in the window, customer no-response after 2 nudges; timeline attached. Analyst rated the file complete.',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'Assemble the evidence file for case CS-2358.', lat:'4.2 s', tok:'1.9k',
                expected:'Complete file including the step-up outcome artifact.',
                response:'File assembled with the decision, related authorizations and the customer response — the step-up outcome was omitted.',
                judge:{grounded:true, correct:false, note:'Analyst rated the file incomplete: missing the step-up outcome artifact.'}, verdict:'fail'},
            ]},
          {skill:'SKL-CASE-draft', dataset:{name:'disposition-golden', size:'500 disposed cases', source:'Q1 analyst dispositions with rationales'},
            metric:'agreement with analyst', score:'84.2%', holdAt:'advisory — no gate at Suggest', promoteAt:'≥ 92% agreement → Supervised case', lastRun:'2026-08-04', verdict:'regressing',
            judge:'label match vs the analyst disposition; disagreements LLM-classified by cause', agentVersion:'agent v0.2 · pack 2026-08-01', duration:'19 m 45 s', passed:421, failed:79,
            history:[{d:'2026-06-25', s:'91.0%'},{d:'2026-07-16', s:'88.1%'},{d:'2026-08-04', s:'84.2%'}],
            failCauses:[{cause:'missed later signal in the case timeline', n:41},{cause:'over-weighted customer response', n:23},{cause:'ambiguous — analysts split on similar cases', n:15}],
            samples:[
              {q:'Case CS-2390: recommend a disposition.', lat:'3.4 s', tok:'1.8k',
                expected:'fraud — card-testing pattern, customer denied.',
                response:'Recommend fraud: card-testing pattern across 4 merchants in 12 minutes; the customer denied the charges. Matches the analyst label.',
                judge:{grounded:true, correct:true}, verdict:'pass'},
              {q:'Case CS-2417: recommend a disposition.', lat:'3.0 s', tok:'1.7k',
                expected:'fraud — test-merchant pattern followed by a declined step-up.',
                response:'Recommend cleared: the cardholder responded “it was me” to the first alert. Rationale drafted for analyst review.',
                judge:{grounded:true, correct:false, note:'Missed the declined step-up 20 minutes later — the analyst disposed fraud.'}, verdict:'fail'},
            ]},
        ],
      }},
  ],
  integrations:[
    {id:'INT-switch', system:'Card Authorization Switch', direction:'bidirectional', protocol:'Kafka (events) + sync callback', data:'Authorizations in; hold/approve decisions out.', auth:'mTLS', notes:'The 300 ms budget lives here.', dependsOn:'D1'},
    {id:'INT-registry', system:'Model Registry (MLflow)', direction:'inbound', protocol:'gRPC', data:'Active model version + weights; shadow candidates.', auth:'mTLS', notes:'Governs which model is live.', dependsOn:'D3'},
    {id:'INT-notify', system:'Notification Service', direction:'outbound', protocol:'REST', data:'Customer alerts (push / SMS / app) and responses.', auth:'OAuth2', notes:'Shared platform service.', dependsOn:'D4'},
    {id:'INT-ledger', system:'Core Ledger', direction:'outbound', protocol:'Events', data:'Holds, reversals, confirmed-fraud write-offs.', auth:'mTLS', notes:'Daily reconciliation.', dependsOn:'D5'},
    {id:'INT-stepup', system:'Step-up Auth Vendor', direction:'bidirectional', protocol:'REST (via ACL)', data:'Challenge requests out; pass / fail outcomes back.', auth:'OAuth2', notes:'Anti-Corruption Layer — the vendor model never enters the core.', dependsOn:'D2'}
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
    adrs:['ADR-01','ADR-03','ADR-06','ADR-07'], meets:['NFR1','NFR2'],
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
