/* ============================================================
   Cynergis — Operate seed (window.__OPS__), D-054.
   The live-operations state of the worked product (Fraud
   Decisioning), per the Operate spec (D-016/017/018):
     · the Operator control plane (itself a skill on the ladder)
     · SLOs / fleet telemetry by governance profile (D-018)
     · incidents & drift (both planes: workflow AND agent)
     · the approvals queue (trust-ladder + model promotions,
       agent-proposed changes) with the D-021 tier ceiling
     · runbooks, incl. the D-051 agent kill-switch
   Everything cross-references the Build seeds: components,
   agents, evals, ADR confirmations, delivery blockers.
   ============================================================ */
window.__OPS__ = {
  asOf: '2026-08-08',

  /* The Operator — the component-agnostic control plane (D-017). Recursive
     trust: the Operator is itself a skill on the ladder. */
  operator: {
    tier: 'Suggest',
    loop: 'observe → evaluate → act → record',
    note: 'One control loop governs every deployed component through its profile. At Suggest, the Operator recommends — tier changes, rollbacks, freezes — and humans execute. A human can always override.',
    /* The Operator IS an agent (D-017): same anatomy as the subdomain agents,
       scoped to the mesh instead of one subdomain. This is what's implemented: */
    knows: ['SLOs & error budgets', 'promotion gates & guardrails', 'runbooks', 'the fleet contract (kind → profile)'],
    skills: [
      { name: 'Watch SLOs → raise incidents', proof: 'raised INC-203 on the eval regression' },
      { name: 'Evaluate promotion gates → raise approval requests', proof: 'raised APR-103 (deferred by Regina)' },
      { name: 'Recommend rollback / throttle / freeze', proof: 'recommended the INC-203 promotion freeze' },
    ],
    never: 'Governance acts (D-056): it raises requests and recommends — approve, promote, envelope, kill-switch stay human. At Suggest, every action on this page is human-executed.',
  },

  /* SLOs — the universal layer (D-018), targets from the NFRs and the
     product's value targets. */
  slos: [
    { id: 'SLO-1', group: 'Service objectives', name: 'Scoring latency', unit: 'ms', current: 'p95 287 ms', target: '< 300 ms', targetV: 300, history: [312, 304, 298, 306, 295, 291, 288, 331, 293, 287],
      ref: 'NFR1', state: 'ok', budget: '13 ms headroom', owner: 'Decisioning squad', window: '10 w', note: 'Dedicated node group (ADR-07); the Jul 12 spike is INC-201.',
      related: [{ kind: 'incident', id: 'INC-201', label: 'INC-201 — the Jul 12 spike' }, { kind: 'runbook', id: 'RB-1', label: 'RB-1 — the matched runbook' }] },
    { id: 'SLO-2', group: 'Service objectives', name: 'Decision-path availability', unit: '%', current: '99.97%', target: '≥ 99.95%', targetV: 99.95, history: [99.96, 99.98, 99.97, 99.99, 99.95, 99.9, 99.97, 99.98, 99.96, 99.97],
      ref: 'NFR2', state: 'ok', budget: 'error budget 38% burned', owner: 'Platform', window: '10 w', note: 'The Jul 12 dip (INC-201) took most of the quarterly budget.',
      related: [{ kind: 'incident', id: 'INC-201', label: 'INC-201 — the error-budget spender' }] },
    { id: 'SLO-3', group: 'Service objectives', name: 'Customer notification', unit: 's', current: 'p95 41 s', target: '< 60 s', targetV: 60, history: [55, 52, 48, 47, 44, 46, 58, 43, 42, 41],
      state: 'ok', budget: '19 s headroom', owner: 'Case & Response', window: '10 w', note: 'block.placed → first channel attempt. The Jul 24 bump is INC-202.',
      related: [{ kind: 'incident', id: 'INC-202', label: 'INC-202 — the Jul 24 vendor outage' }, { kind: 'runbook', id: 'RB-4', label: 'RB-4 — the matched runbook' }] },
    { id: 'SLO-6', group: 'Service objectives', name: 'Feature freshness', unit: 's', current: '2.1 s', target: '< 5 s', targetV: 5, history: [2.8, 2.6, 2.4, 2.5, 2.3, 2.2, 2.4, 2.2, 2.1, 2.1],
      state: 'ok', budget: '2.9 s headroom', owner: 'Data/ML', window: '10 w', note: 'Data SLA for the feature pipeline (C5) — event-time to servable.',
      related: [{ kind: 'incident', id: 'INC-204', label: 'INC-204 — cache eviction pressure (open)' }, { kind: 'runbook', id: 'RB-7', label: 'RB-7 — the matched runbook' }] },
    { id: 'SLO-4', group: 'Value targets', name: 'False-decline rate', unit: '%', current: '2.9%', target: '2.5%', targetV: 2.5, history: [6.2, 5.4, 4.8, 4.1, 3.8, 3.5, 3.3, 3.1, 3.0, 2.9],
      state: 'warn', budget: 'gap 0.4 pp', owner: 'Fraud Ops (Elena)', window: '10 w', note: 'Down from the 6.2% baseline; threshold proposal APR-101 targets the gap.',
      related: [{ kind: 'approval', id: 'APR-101', label: 'APR-101 — the agent’s threshold proposal (pending)' }] },
    { id: 'SLO-5', group: 'Value targets', name: 'Fraud loss rate', unit: 'bps', current: '8.1 bps', target: '7 bps', targetV: 7, history: [18, 15.2, 13.1, 11.4, 10.2, 9.4, 8.9, 8.6, 8.3, 8.1],
      state: 'warn', budget: 'gap 1.1 bps', owner: 'Fraud Ops (Elena)', window: '10 w', note: 'Down from 18 bps; the remaining gap is the unbuilt UC4 step-up slice.',
      related: [{ kind: 'none', id: 'UC4', label: 'UC4 — blocked on the vendor contract (BLK2)' }] },
  ],

  /* 24-hour live feed for the volume/latency chart (per hour): decisions in
     thousands, p95 in ms against the 300 ms budget. */
  volume24h: {
    decisionsK: [58, 52, 49, 47, 46, 48, 55, 68, 84, 96, 104, 110, 114, 116, 118, 121, 124, 128, 132, 138, 129, 102, 84, 71],
    p95: [281, 278, 276, 275, 274, 276, 280, 284, 287, 289, 290, 291, 293, 295, 294, 296, 295, 297, 299, 296, 293, 288, 285, 283],
    budget: 300,
  },

  /* The fleet — every deployed component under the Operator, with its
     governance profile keyed by kind (D-018). Telemetry is the live feed. */
  fleet: [
    { id: 'C1', kind: 'service', profile: 'SLO', health: 'ok',
      telemetry: { runs: '2.4M decisions/day', success: '99.98%', latency: 'p95 287 ms', cost: '$410/day', drift: 'model drift: none (PSI 0.04)' },
      trend: [2.21, 2.25, 2.28, 2.24, 2.31, 2.35, 2.38, 2.36, 2.40, 2.42, 2.39, 2.41, 2.44, 2.40], trendLabel: 'M decisions/day · 14 d',
      actions: ['throttle', 'rollback'],
      related: [{ kind: 'slo', id: 'SLO-1', label: 'SLO-1 — scoring latency (this component’s budget)' }, { kind: 'incident', id: 'INC-201', label: 'INC-201 — the Jul 12 latency breach' }, { kind: 'runbook', id: 'RB-1', label: 'RB-1 — latency-breach runbook' }] },
    { id: 'C5', kind: 'data', profile: 'Data SLA', health: 'ok',
      telemetry: { runs: '38M features/day', success: 'quality 99.9%', latency: 'freshness 2.1 s', cost: '$95/day', drift: 'schema drift: none' },
      trend: [36.1, 36.8, 37.2, 36.9, 37.6, 38.1, 38.4, 38.0, 38.6, 38.9, 38.5, 38.8, 39.1, 38.7], trendLabel: 'M features/day · 14 d',
      actions: ['pause', 'rollback'],
      related: [{ kind: 'slo', id: 'SLO-6', label: 'SLO-6 — feature freshness (its data SLA)' }, { kind: 'incident', id: 'INC-204', label: 'INC-204 — cache eviction pressure (open)' }, { kind: 'runbook', id: 'RB-7', label: 'RB-7 — data-SLA runbook' }] },
    { id: 'C3', kind: 'service', profile: 'SLO', health: 'warn',
      telemetry: { runs: '11.8k case ops/day', success: '99.7%', latency: 'p95 340 ms', cost: '$60/day', drift: '—' },
      trend: [10.2, 10.5, 10.9, 10.7, 11.1, 11.4, 11.2, 11.6, 11.5, 11.8, 11.7, 11.9, 11.8, 11.8], trendLabel: 'k case ops/day · 14 d',
      actions: ['throttle', 'rollback'],
      related: [{ kind: 'none', id: 'BLK1', label: 'BLK1 — Case Manager API v2 (delivery blocker)' }],
      note: 'Running on the v1 case API — the triage console slice is still in build (BLK1).' },
    { id: 'AGT-DEC', kind: 'agentic', profile: 'Trust ladder', health: 'ok', tier: 'Supervised',
      telemetry: { runs: '310 tasks/day', success: 'doctrine checks holding', latency: 'p95 2.9 s', cost: '$18/day', drift: 'evals: 2 holding · 1 promotable' },
      trend: [262, 270, 268, 281, 288, 285, 296, 301, 298, 305, 302, 308, 312, 310], trendLabel: 'tasks/day · 14 d',
      actions: ['pause-agent', 'envelope'],
      related: [{ kind: 'agent', id: 'AGT-DEC', label: 'Agent page — knowledge · toolset · skills · evals' }, { kind: 'approval', id: 'APR-103', label: 'APR-103 — the deferred Autonomous promotion' }] },
    { id: 'AGT-CASE', kind: 'agentic', profile: 'Trust ladder', health: 'warn', tier: 'Suggest',
      telemetry: { runs: '95 tasks/day', success: 'doctrine checks holding', latency: 'p95 4.1 s', cost: '$9/day', drift: 'draft-disposition regressing (−3.9 pp) — INC-203' },
      trend: [68, 72, 75, 74, 79, 82, 85, 83, 88, 90, 89, 93, 96, 95], trendLabel: 'tasks/day · 14 d',
      actions: ['pause-agent', 'envelope'],
      related: [{ kind: 'agent', id: 'AGT-CASE', label: 'Agent page — knowledge · toolset · skills · evals' }, { kind: 'incident', id: 'INC-203', label: 'INC-203 — the eval-regression drift incident' }, { kind: 'runbook', id: 'RB-5', label: 'RB-5 — agent drift response' }] },
  ],

  /* Recorded actions (D-009: temporal, never overwritten). Console actions
     append here; at the Operator's Suggest tier every action is human-executed. */
  actionLog: [
    { t: '2026-08-04 09:12', actor: 'Operator (recommendation) · confirmed by Case squad', action: 'Promotion freeze for “Draft a disposition”', target: 'AGT-CASE', via: 'INC-203 · RB-5' },
    { t: '2026-07-12 21:46', actor: 'Priya Nair — Platform', action: 'Scaled scoring pods on the dedicated node group', target: 'C1', via: 'INC-201 · RB-1' },
  ],

  /* Incidents & drift (Block 4) — full agent-operation mode (D-058): every
     incident carries its agent pipeline — who DISCOVERED it and from which
     signal, what the INVESTIGATION found, and the TRIAGE outcome:
       low-risk  → remediation prepared by the agent, one human Apply
       complex   → remediation hypotheses + deep-investigation escalation
                   into an agentic harness (Claude Code). */
  incidents: [
    { id: 'INC-204', sev: 'SEV3', status: 'monitoring', plane: 'workflow', opened: '2026-08-10', resolved: null,
      title: 'Feature freshness degrading — cache eviction pressure',
      impacted: ['C5'],
      impact: 'Freshness climbed 2.1 s → 4.2 s in three hours (target < 5 s). No decision impact yet; the burn rate would breach SLO-6 by tonight.',
      discovery: { by: 'Operator', at: '2026-08-10 07:40', signal: 'SLO-6 trend: freshness burn accelerating (2.1 → 4.2 s over 3 h); cache hit rate falling in the same window.' },
      investigation: { by: 'Operator', findings: [
        'feature-cache hit rate fell 97% → 88%; eviction storm confirmed on the cache dashboard.',
        'Evictions correlate with the merchant-category backfill job started 06:10 (38M rows).',
        'No schema drift; quality checks passing — capacity pressure, not corruption.',
      ]},
      triage: 'low-risk',
      remediation: { status: 'applied', appliedBy: "You — console", at: "2026-08-16 00:27", runbook: 'RB-7',
        action: 'Throttle the backfill job to 25% and raise feature-cache memory one notch; resume the backfill off-peak (22:00).',
        why: 'Reversible in one step, no data loss, matches RB-7; the agent prepared it — one human approval applies it.' },
      timeline: [
        '2026-08-10 07:40  Operator: SLO-6 burn signal fires; incident opened',
        '2026-08-10 07:42  Operator: investigation — cache hit rate, job schedule and quality checks correlated',
        '2026-08-10 07:44  Operator: matched RB-7; remediation prepared and routed for human apply',
        "2026-08-16 00:27  remediation applied (human-approved via console) — Throttle the backfill job to 25% and raise feature-cache memory one notch; resume the backfill off-peak (22:00).",
      ],
      runbook: 'RB-7' },
    { id: 'INC-203', sev: 'SEV3', status: 'monitoring', plane: 'agent', opened: '2026-08-04', resolved: null,
      title: 'Draft-disposition eval regression (−3.9 pp over two runs)',
      impacted: ['AGT-CASE'],
      impact: 'No customer impact — the skill is Suggest-tier, so every draft is reviewed by an analyst. Agreement fell 91.0% → 84.2% across two runs.',
      discovery: { by: 'Operator', at: '2026-08-04 09:12', signal: 'Eval run disposition-golden verdict: regressing (second consecutive drop).' },
      investigation: { by: 'Operator · Case Agent assembled the case evidence', findings: [
        'Failure causes classified from the 79 failing transcripts: 41 missed a later signal in the case timeline, 23 over-weighted the customer response, 15 genuinely ambiguous.',
        'Doctrine checks holding — the regression is skill quality, not grounding or tool conformance.',
        'Promotion frozen immediately (no demotion available — already the lowest tier).',
      ]},
      triage: 'complex',
      hypotheses: [
        { h: 'Domain shift — fraud patterns moved; the golden dataset is stale', likelihood: 'most consistent with the 41 later-signal misses', fix: 'Refresh disposition-golden with Q3 cases and re-run', risk: 'low' },
        { h: 'Prompt regression — the timeline scan stops at the first customer response', likelihood: 'plausible; a fix is drafted', fix: 'Ship the timeline-scan prompt fix, re-run on the same dataset', risk: 'low' },
        { h: 'Knowledge-pack gap — step-up outcomes under-weighted in the case model', likelihood: 'possible, matches the 23 over-weightings', fix: 'Extend the pack — needs a Design-side review', risk: 'medium' },
      ],
      escalation: { requested: true,
        note: 'The hypotheses disagree on root cause. Recommended: run the full deep investigation in an agentic harness (Claude Code) with the incident context — the 79 failing transcripts, the case timelines, the knowledge pack and prompts. Deliverable: a root-cause note and one chosen remediation, recorded back onto this incident.' },
      timeline: [
        '2026-08-04 09:10  eval run disposition-golden completes: 84.2% (−3.9 pp) — verdict regressing',
        '2026-08-04 09:12  Operator raises the drift incident; recommends promotion freeze (RB-5)',
        '2026-08-04 10:05  Case squad + Case Agent triage the failure causes: 41 · 23 · 15',
        '2026-08-06 16:00  Three remediation hypotheses drafted; awaiting human direction',
        "2026-08-16 00:27  deep-investigation session launched in the agentic harness (Claude Code) with the incident context",
      ],
      runbook: 'RB-5', followUp: 'If the next run regresses again, pause the skill (RB-6) — the off-switch invariant makes this safe.' },
    { id: 'INC-202', sev: 'SEV3', status: 'resolved', plane: 'workflow', opened: '2026-07-24', resolved: '2026-07-24',
      title: 'Notification vendor sandbox outage — customer alerts delayed',
      impacted: ['C4', 'INT-notify'],
      impact: '22 minutes of delayed customer notifications in the staging mirror; the AT-3 acceptance run that day flaked on the same outage. No production impact.',
      discovery: { by: 'Operator', at: '2026-07-24 11:02', signal: 'Notify success rate < 90% over 5 minutes (RB-4 trigger).' },
      investigation: { by: 'Operator', findings: [
        'Vendor status page confirmed a sandbox outage; our queue durable, retries backing off.',
        'No customer double-notification risk — dedupe on authId verified.',
      ]},
      triage: 'low-risk',
      remediation: { status: 'applied', runbook: 'RB-4', appliedBy: 'Case & Response squad', at: '2026-07-24 11:06',
        action: 'Queue buffering confirmed; fallback channel order armed (SMS-first); drain verified on vendor restore.' },
      timeline: [
        '2026-07-24 11:02  Operator: success-rate signal fires; RB-4 matched',
        '2026-07-24 11:06  remediation applied (human-approved); queue buffering confirmed',
        '2026-07-24 11:24  vendor restored; queue drained to zero, no loss',
      ],
      runbook: 'RB-4', followUp: 'Added the vendor-status webhook to the ops channel.' },
    { id: 'INC-201', sev: 'SEV2', status: 'resolved', plane: 'workflow', opened: '2026-07-12', resolved: '2026-07-12',
      title: 'Scoring latency breach at attack peak — fail-open engaged',
      impacted: ['C1'],
      impact: 'p95 exceeded 300 ms for 9 minutes during a card-testing attack burst; the ADR-03 fail-open policy approved 0.4% of decisions in the window (all queued for mandatory review).',
      discovery: { by: 'Operator', at: '2026-07-12 21:41', signal: 'SLO-1 breach: p95 over budget 3 minutes sustained, TPS 3.4× baseline (RB-1 trigger).' },
      investigation: { by: 'Operator', findings: [
        'Attack burst confirmed (card-testing pattern across the merchant fleet).',
        'Node group saturated; fail-open engaging per ADR-03 — policy-bound, review queue accumulating.',
      ]},
      triage: 'low-risk',
      remediation: { status: 'applied', runbook: 'RB-1', appliedBy: 'Priya Nair — Platform', at: '2026-07-12 21:46',
        action: 'Scale scoring pods on the dedicated node group (ADR-07); verify fail-open disengages inside budget.' },
      timeline: [
        '2026-07-12 21:41  Operator: SLO-1 breach signal; RB-1 matched, remediation prepared',
        '2026-07-12 21:46  remediation applied (human-approved): pods scaled on the dedicated node group',
        '2026-07-12 21:50  p95 back inside budget; fail-open disengages',
        '2026-07-13 10:00  mandatory review of 412 fail-open approvals completed — 3 confirmed fraud (RB-2)',
      ],
      runbook: 'RB-1', followUp: 'Burned ~30% of the quarterly availability error budget (SLO-2). Capacity headroom raised for attack bursts.' },
  ],

  /* Approvals queue (Block 3) — pending first; approvals are temporal,
     cited records (D-009). */
  approvals: [
    {"id":"APR-101@2026-08-16","status":"pending","kind":"threshold change","date":"2026-08-06","title":"Medium-band cutoff 0.62 → 0.65","requestedBy":"Decisioning Agent · skill “Propose a threshold change” (Suggest)","approver":"Elena Cho — Fraud Ops Manager","evidence":"False declines in the medium band +0.4 pp WoW; step-up pass rate steady at 96%. Estimated −0.3 pp false declines, +0.1 pp missed fraud. Targets the SLO-4 gap.","links":{"evals":true},"note":"The Suggest-tier loop closing: the agent proposes, Elena decides and applies.","archived":true,"validTo":"2026-08-16","supersededBy":"APR-101"},
    {"id":"APR-105","status":"pending","kind":"envelope change","date":"2026-08-16","title":"Envelope change for Decisioning Agent","requestedBy":"You — console","approver":"Regina Foss — Model Risk","evidence":"Requested from the fleet view; scope and limits to be specified in review.","links":{},"note":"Envelope changes are governance acts (D-056) — routed for approval, never applied directly."},
    { id: 'APR-101', status: 'approved', kind: 'threshold change', date: '2026-08-06',
      decision: "Approved 2026-08-16 — Approved on the eval evidence; step-up pass rate steady — apply and watch SLO-4 for two weeks. Recorded by Elena Cho; at Suggest, execution is human-run.",
      title: 'Medium-band cutoff 0.62 → 0.65',
      requestedBy: 'Decisioning Agent · skill “Propose a threshold change” (Suggest)',
      approver: 'Elena Cho — Fraud Ops Manager',
      evidence: 'False declines in the medium band +0.4 pp WoW; step-up pass rate steady at 96%. Estimated −0.3 pp false declines, +0.1 pp missed fraud. Targets the SLO-4 gap.',
      links: { evals: true }, note: 'The Suggest-tier loop closing: the agent proposes, Elena decides and applies.' },
    { id: 'APR-102', status: 'approved', kind: 'model promotion', date: '2026-08-05',
      decision: "Approved 2026-08-15 — Shadow report reviewed; promote behind the ADR-02 gate with week-one drift watch. Recorded by Regina Foss; at Suggest, execution is human-run.",
      title: 'Model v2.5.0: shadow → live',
      requestedBy: 'Data/ML squad',
      approver: 'Regina Foss — Model Risk (ADR-02 gate)',
      evidence: '14-day shadow evaluation over mirrored traffic: AUC +0.011, false-decline −0.2 pp at equal loss, no drift flags. Shadow report attached to the registry entry.',
      links: {}, note: 'No model reaches prod without a recorded shadow evaluation (ADR-02 confirmation).' },
    { id: 'APR-103', status: 'deferred', kind: 'tier promotion', date: '2026-08-05',
      title: 'Release a soft-hold: Supervised → Autonomous',
      requestedBy: 'Operator (recommendation from eval evidence)',
      approver: 'Regina Foss — Model Risk',
      evidence: 'reversal-golden 99.4% (gate: ≥ 99.5% over two quarters, zero wrong releases). One wrong release in the replay — the confirmation matched the wrong authorization.',
      decision: 'Deferred: the gate is not met and the wrong-release transcript must be root-caused. Next review 2026-09-30.',
      links: { evals: true } },
    { id: 'APR-104', status: 'approved', kind: 'tier promotion', date: '2026-06-12',
      title: 'Release a soft-hold: Suggest → Supervised',
      requestedBy: 'Decisioning squad',
      approver: 'Regina Foss — Model Risk',
      evidence: 'Six supervised weeks at Suggest with zero reversal errors; doctrine checks holding since first run.',
      decision: 'Approved with conditions: every release logged with its reason; weekly sample review by the analyst team.',
      links: { evals: true }, note: 'The promotion history record — temporal, never overwritten (D-009).' },
  ],

  /* Governance tier ceiling (D-021): evidence promotes only up to the ceiling. */
  ceiling: 'Governance caps “Draft a disposition” at Supervised (maxTier) — an analyst signs every disposition, per the model-risk posture (SR 11-7). The Operator never promotes above the ceiling, however strong the evidence.',
  /* Reserved governance acts (D-056): approval is signature-class work. */
  reserved: 'Governance acts — approve, reject, promote, change an envelope, kill-switch — are reserved to humans at every tier. Agents may raise requests and assemble the evidence; they never decide. When approvals become routine, they graduate through codified auto-approval policies (deterministic, auditable) — never through an agent holding the button.',

  /* Runbook executors (D-059) — every runbook is an agent skill, and this
     registry says WHO runs it: our deployed agents, registered off-the-shelf
     platform agents (with their source + scope, even without the full
     implementation), or an agentic harness driven by the human support agent. */
  opsAgents: [
    { id: 'EXE-OPR', kind: 'deployed', name: 'Operator — runbook skills', provider: 'Cynergis (this product)',
      note: 'The runbook bodies below are skills of the Operator (D-017) — same anatomy as every agent: trigger + procedure + toolset. Where a step is a governance act (the kill-switch itself), the agent verifies and the human actuates (D-056).',
      runbooks: ['RB-2', 'RB-3', 'RB-5', 'RB-6'] },
    { id: 'EXE-KAGENT', kind: 'off-the-shelf', name: 'kagent — Kubernetes agent', provider: 'CNCF sandbox · kagent.dev',
      registered: '2026-06-20 · by Platform', version: 'v0.4.x',
      source: [{ label: 'GitHub', href: 'https://github.com/kagent-dev/kagent' }, { label: 'Site / marketplace', href: 'https://kagent.dev' }],
      scope: 'eks-fraud-prod / eks-fraud-stg · namespace fraud — read, scale and rollout verbs only; no delete.',
      auth: 'IRSA role ops-kagent (scoped)', guardrails: 'Change budget 2 actions/hour; every action lands in the Recorded-actions log; rollback verb always available.',
      runbooks: ['RB-1', 'RB-7'] },
    { id: 'EXE-AWSQ', kind: 'off-the-shelf', name: 'AWS operations agent (Amazon Q)', provider: 'AWS',
      registered: '2026-07-02 · by Platform', version: 'managed (cloud-side)',
      source: [{ label: 'Product page', href: 'https://aws.amazon.com/q/developer/' }, { label: 'Docs', href: 'https://docs.aws.amazon.com/amazonq/' }],
      scope: 'Account fraud-prod — CloudWatch, SQS and service-health read; runbook automation via approved SSM documents only.',
      auth: 'IAM role ops-awsq (read + approved automations)', guardrails: 'No mutating action outside the approved SSM document list.',
      runbooks: ['RB-4'] },
    { id: 'EXE-AZURE', kind: 'evaluated', name: 'Azure SRE Agent', provider: 'Microsoft',
      source: [{ label: 'Product page', href: 'https://azure.microsoft.com/products/sre-agent' }],
      note: 'Evaluated, not registered — this product has no Azure footprint. Kept here so the registry shows its decision trail.',
      runbooks: [] },
  ],

  /* Runbooks — each one an agent skill: trigger + body + toolset/MCPs + executor.
     RB-6 operationalizes the D-051 off-switch invariant. */
  runbooks: [
    { id: 'RB-1', title: 'Scoring latency breach', trigger: 'p95 > 300 ms sustained 3 min (SLO-1)', owner: 'Decisioning squad', lastExercised: '2026-07-12 (INC-201)',
      executor: 'EXE-KAGENT',
      tools: [
        { mcp: 'k8s MCP (cluster API)', what: 'Read deployment/HPA state; scale the scoring deployment on the dedicated node group.' },
        { mcp: 'observability MCP', what: 'Confirm p95 recovery on the Latency & TPS board before closing.' },
      ],
      links: ['C1', 'ADR-07', 'NFR1'],
      steps: [
        'Confirm the breach on the Latency & TPS board (not a probe artifact).',
        'Scale the scoring deployment on the dedicated node group (ADR-07) — never onto shared nodes.',
        'If p95 stays over budget, verify fail-open engagement per ADR-03 and watch the review queue.',
        'After recovery, annotate the incident and check error-budget burn (SLO-2).',
      ] },
    { id: 'RB-2', title: 'Fail-open engagement & mandatory review', trigger: 'Hard timeout → fail-open approvals accumulating', owner: 'Fraud Ops (Elena)', lastExercised: '2026-07-12 (INC-201)',
      executor: 'EXE-OPR',
      tools: [
        { mcp: 'decision_log (read)', what: 'Enumerate every fail-open approval in the window; build the review queue.' },
        { mcp: 'case API (BC-CASE)', what: 'Open review tasks — the Case Agent assembles evidence for each (assist).' },
      ],
      links: ['ADR-03', 'G4'],
      steps: [
        'Confirm fail-open is policy-bound (ADR-03) — do not disable it under pressure.',
        'Monitor the review queue; staff analysts for the backlog.',
        'Complete the mandatory review of every fail-open approval within 24 h; label outcomes.',
        'Report the window and outcomes to Governance (G4 evidence).',
      ] },
    { id: 'RB-3', title: 'Model rollback & shadow re-evaluation', trigger: 'Post-promotion drift or quality regression', owner: 'Data/ML + Model Risk', lastExercised: '2026-05-19 (drill)',
      executor: 'EXE-OPR',
      tools: [
        { mcp: 'model-registry MCP (MLflow)', what: 'Pin the previous version; move the regressed candidate to shadow.' },
        { mcp: 'eval harness', what: 'Schedule the shadow re-evaluation; attach the report to the registry entry.' },
      ],
      links: ['ADR-02', 'INT-registry'],
      steps: [
        'Pin the registry back to the previous model version (one-step rollback).',
        'Verify scoring health on the previous version; confirm drift clears.',
        'Move the regressed candidate to shadow; open a shadow re-evaluation.',
        'Promotion again only through the ADR-02 gate.',
      ] },
    { id: 'RB-4', title: 'Notification vendor outage', trigger: 'Notify success rate < 90% over 5 min', owner: 'Case & Response squad', lastExercised: '2026-07-24 (INC-202)',
      executor: 'EXE-AWSQ',
      tools: [
        { mcp: 'AWS MCP (CloudWatch · SQS)', what: 'Queue depth and DLQ check; vendor service-health correlation.' },
        { mcp: 'notify config', what: 'Arm the fallback channel order (SMS-first) via the approved SSM document.' },
      ],
      links: ['C4', 'INT-notify'],
      steps: [
        'Confirm the outage is the vendor (status page / webhook), not our queue.',
        'Verify queue buffering — notifications are durable, retries back off.',
        'If prolonged, switch to the fallback channel order (SMS-first).',
        'On restore, confirm the queue drains to zero and no customer was double-notified.',
      ] },
    { id: 'RB-5', title: 'Agent drift response', trigger: 'Eval regression ≥ 2 pp, or a doctrine check failing', owner: 'Owning squad + Operator', lastExercised: '2026-08-04 (INC-203)',
      executor: 'EXE-OPR',
      tools: [
        { mcp: 'evals (runs + transcripts)', what: 'Classify the failing transcripts by cause; produce the hypothesis set.' },
        { mcp: 'agents registry', what: 'Freeze promotion for the affected skill (the freeze itself is recorded).' },
      ],
      links: ['AGT-DEC', 'AGT-CASE'],
      steps: [
        'Freeze promotions for the affected skill; classify the failure causes from the eval transcripts.',
        'If a doctrine check fails (groundedness / tool conformance) → pause the skill immediately (RB-6).',
        'Refresh the golden dataset if the domain shifted; fix prompts/knowledge; re-run the eval.',
        'Two consecutive regressions → kill-switch and root-cause before re-enabling.',
      ] },
    { id: 'RB-7', title: 'Data SLA pressure — cache / backfill', trigger: 'Feature freshness burn or cache hit-rate drop (SLO-6)', owner: 'Data/ML', lastExercised: '2026-08-10 (INC-204)',
      executor: 'EXE-KAGENT',
      tools: [
        { mcp: 'k8s MCP (cluster API)', what: 'Scale the backfill CronJob; bump feature-cache memory via Helm values.' },
        { mcp: 'data-quality checks', what: 'Confirm freshness recovers inside the SLA before resuming the backfill.' },
      ],
      links: ['C5'],
      steps: [
        'Confirm the pressure source: backfill or organic load (job schedule vs traffic).',
        'Throttle the offending job; raise cache memory one notch if hit rate < 90%.',
        'Verify freshness recovers inside the SLA; schedule the backfill off-peak.',
        'If freshness still burns, pause the job entirely and page Data/ML.',
      ] },
    { id: 'RB-6', title: 'Agent kill-switch', trigger: 'Doctrine breach, runaway cost, or sustained regression', owner: 'Operator (human-executed at Suggest)', lastExercised: '2026-06-02 (drill)',
      executor: 'EXE-OPR', humanActuated: 'The disable itself is a governance act (D-056) — the human throws the switch; the agent runs the verifications around it.',
      tools: [
        { mcp: 'MCP gateway', what: 'Disable / re-enable the agent\u2019s server — its only access path (human-actuated).' },
        { mcp: 'evals (tool conformance)', what: 'Verify zero calls after the switch; attach the check to the record.' },
      ],
      links: ['AGT-DEC', 'AGT-CASE'],
      steps: [
        'Disable the agent’s MCP server — its only access path (D-051: it holds no internal access).',
        'Verify the product is unaffected: the deterministic workflow appears in every event contract; the agent appears in none.',
        'Confirm via the tool-conformance eval that no calls occurred after the switch.',
        'Re-enable only with the owning squad + the Operator’s recorded sign-off.',
      ] },
  ],
};
