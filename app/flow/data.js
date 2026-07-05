// Self-contained event-flow data for the embedded canvas (Direction B).
// Mirrors apps/ascent (event-centric grammar + D-031 grounding), as plain JS.

// ── grounding registry: every ref resolves to a captured node, or it's assumed ──
export const GROUNDING = {
  UC1: { id: "UC1", kind: "UseCase", title: "Score an incoming authorization", evidencedBy: ["S1", "S2"] },
  UC2: { id: "UC2", kind: "UseCase", title: "Apply the decision (approve / decline)", evidencedBy: ["S1"] },
  UC3: { id: "UC3", kind: "UseCase", title: "Triage & dispose a fraud case", evidencedBy: ["S3"] },
  UC4: { id: "UC4", kind: "UseCase", title: "Step-up challenge on medium risk" },
  FR1: { id: "FR1", kind: "FunctionalRequirement", title: "Score every authorization against the live model", evidencedBy: ["S1"] },
  FR2: { id: "FR2", kind: "FunctionalRequirement", title: "Return a risk band with a per-decision explanation", evidencedBy: ["S2"] },
  FR3: { id: "FR3", kind: "FunctionalRequirement", title: "Place a reversible soft-hold on high-risk transactions", evidencedBy: ["S1"] },
  FR4: { id: "FR4", kind: "FunctionalRequirement", title: "Notify the customer of a block within 60s", evidencedBy: ["S1"] },
  FR5: { id: "FR5", kind: "FunctionalRequirement", title: "Queue blocked / escalated transactions as cases", evidencedBy: ["S3"] },
  FR6: { id: "FR6", kind: "FunctionalRequirement", title: "Let analysts hold / release and record a disposition", evidencedBy: ["S3"] },
  FR7: { id: "FR7", kind: "FunctionalRequirement", title: "Issue a step-up challenge on medium-risk decisions", evidencedBy: ["S2"] },
  FR10: { id: "FR10", kind: "FunctionalRequirement", title: "Record every decision as a tamper-evident audit entry", evidencedBy: ["S1"] },
  "NFR1": { id: "NFR1", kind: "NonFunctionalRequirement", title: "p95 scoring latency under 300 ms at 3,000 TPS sustained", evidencedBy: ["S2"] },
  "POL1": { id: "POL1", kind: "Policy", title: "Notify on block", evidencedBy: ["S1"] },
};
export const resolveGround = (id) => GROUNDING[id];

// trigger.kind vocabulary — "what set this event off": an outside system, a person,
// an automatic policy/rule, or simply the previous step in this flow.
export const TRIGGER_KINDS = ["external", "human", "policy", "upstream"];

// ── the Decisioning (BC-DEC) flow, fully grounded ──
export const decisioningFlow = {
  id: "decisioning",
  name: "Decisioning — authorize & decide",
  contextId: "BC-DEC",
  summary: "Score every card authorization in real time and decide approve / block / step-up.",
  signals: [
    { from: "AGG-AUTH decided exactly once + single command→event", reveals: "strong consistency boundary", pattern: "Transactional aggregate, in-context" },
    { from: "p95 < 300 ms on the sync path (NFR)", reveals: "latency budget", pattern: "Co-located synchronous scoring — no chatty hops" },
    { from: "Block → case + notify reactions fire after commit, cross a seam", reveals: "fire-and-forget reactions", pattern: "Event-driven pub/sub across seams" },
    { from: "Step-up: issue → await passed / failed / timeout", reveals: "short-lived stateful wait", pattern: "Process manager / saga with a timeout policy" },
    { from: "Fallback when model / features unavailable (FR8)", reveals: "degradation path", pattern: "Circuit-breaker / graceful degradation" },
  ],
  nodes: [
    { id: "e-scored", type: "SimpleNode", parentId: "start", kind: "event", summary: "Authorization scored", isPivotal: true, aggregate: "AGG-AUTH", grounds: ["UC1"],
      description: "The model scored the authorization and attached a risk band plus an explanation — the fork the whole context turns on.",
      trigger: { kind: "external", actor: "Card network / acquirer", mechanism: "Inbound authorization request (sync path)",
        label: "An authorization request arrives from the card network and must be scored inside the network timeout — no human, no queue.", grounds: ["UC1", "NFR1"] },
      commands: [{ label: "Score authorization", on: "AGG-AUTH", desc: "Run the transaction through the live risk model to produce a band and an explanation.", grounds: ["UC1", "FR1"] }],
      businessRules: [{ label: "A score must carry a risk band and an explanation", desc: "A bare probability is not a valid decision — every score returns one of the defined bands together with a human-readable reason.", grounds: ["FR2"] }],
      hotspots: [{ label: "Decide within the network timeout (p95 < 300 ms)", desc: "The scoring path is synchronous and co-located; blow the latency budget and the network times the auth out.", grounds: ["NFR1"] }],
      arch: {
        component: "C1",
        entry: { type: "messageTrigger", ref: "INT-switch", topic: "auth.requested", schema: "SCH-auth-requested", auth: "mTLS" },
        emits: { via: "res-bus", topic: "decision-events", schema: "SCH-decision" },
        reads: [{ resource: "res-featcache" }, { ref: "INT-registry", label: "active model version" }],
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }],
        secrets: ["SCRT-switch-mtls", "SCRT-registry-token", "SCRT-pan-key"],
        slo: ["NFR1"],
      } },

    { id: "e-approved-low", type: "SimpleNode", parentId: "e-scored", branch: "risk = low", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR1"],
      description: "Low risk — the authorization is approved straight through, with no customer friction.",
      trigger: { kind: "policy", actor: "Decisioning (automatic)", mechanism: "risk band = low",
        label: "No human or external call — a low band auto-approves immediately as a reaction to the score.", grounds: ["FR1"] },
      commands: [{ label: "Apply decision (approve)", on: "AGG-AUTH", grounds: ["FR1"] }],
      arch: {
        component: "C1",
        entry: { type: "sequentialFlowTrigger", label: "continues from Authorization scored" },
        emits: { via: "res-bus", topic: "decision-events", schema: "SCH-decision" },
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }],
        slo: ["NFR1"],
      } },

    { id: "e-stepup", type: "SimpleNode", parentId: "e-scored", branch: "risk = medium", kind: "event", summary: "Step-up issued", aggregate: "AGG-STEPUP", grounds: ["FR7"],
      description: "Medium risk — the customer is challenged to prove it's them, and the authorization is held pending the outcome.",
      trigger: { kind: "policy", actor: "Decisioning (automatic)", mechanism: "risk band = medium",
        label: "A medium band never auto-approves; it routes to a step-up challenge automatically.", grounds: ["FR7"] },
      commands: [{ label: "Issue step-up challenge", on: "AGG-STEPUP", desc: "Challenge the customer (OTP or passkey) and hold the authorization pending the outcome.", grounds: ["FR7"] }],
      businessRules: [{ label: "A held authorization must resolve within the SLA window", desc: "A step-up cannot hold indefinitely; it either resolves or expires.", grounds: ["FR7"] }],
      readModels: [{ label: "Challenge status", desc: "Tracks pending / passed / failed for the held authorization.", grounds: ["FR7"] }],
      policies: [
        { label: "When step-up passed → resume decision", desc: "A passed challenge releases the hold and re-decides the authorization as low risk.", crosses: "BC-DEC", grounds: ["FR7"] },
        { label: "When step-up expired → block", desc: "An unanswered challenge falls through to a block at SLA expiry.", crosses: "BC-DEC", grounds: ["FR7"] },
      ],
      hotspots: [{ label: "Step-up UX + timeout policy", desc: "How long do we wait, and what happens on no response? A saga / timeout policy is implied.", grounds: [] }],
      arch: {
        component: "C1",
        entry: { type: "sequentialFlowTrigger", label: "continues from Authorization scored" },
        emits: { via: "res-bus", topic: "stepup.challenge", schema: null },   // contract not designed yet → assumed
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }],
        slo: ["NFR1"],
      } },

    { id: "e-stepup-pass", type: "SimpleNode", parentId: "e-stepup", branch: "passed", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"],
      description: "The customer cleared the step-up challenge, so the held authorization is approved.",
      trigger: { kind: "human", actor: "Cardholder", mechanism: "Completed challenge (OTP / app approval)",
        label: "A person actively responded and passed the challenge within the timeout.", grounds: ["FR7"] },
      commands: [{ label: "Apply decision (approve)", on: "AGG-AUTH", grounds: ["FR7"] }],
      arch: {
        component: "C1",
        entry: { type: "userTrigger", ref: "API-2", label: "cardholder confirm releases the hold" },
        emits: { via: "res-bus", topic: "decision-events", schema: "SCH-decision" },
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }],
      } },

    { id: "e-stepup-fail", type: "SimpleNode", parentId: "e-stepup", branch: "failed", kind: "event", summary: "Authorization blocked", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"],
      description: "The customer failed or abandoned the challenge, so the authorization is blocked — same as a high-risk block.",
      trigger: { kind: "human", actor: "Cardholder", mechanism: "Failed / abandoned challenge (or timeout)",
        label: "The challenge was not passed — a wrong code, an explicit decline, or no response before the timeout.", grounds: ["FR7"] },
      commands: [{ label: "Apply decision (block)", on: "AGG-AUTH", grounds: ["FR7"] }],
      arch: {
        component: "C1",
        entry: { type: "userTrigger", ref: "INT-notify", label: "challenge failed / declined / timed out" },
        emits: { via: "res-bus", topic: "transaction.blocked", schema: "SCH-blocked" },
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }],
      } },

    { id: "e-blocked", type: "SimpleNode", parentId: "e-scored", branch: "risk = high", kind: "event", summary: "Authorization blocked", isPivotal: true, aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR3"],
      description: "High risk — a reversible soft-hold is placed, and the block fans out: a case is opened and the customer is alerted.",
      trigger: { kind: "policy", actor: "Decisioning (automatic)", mechanism: "risk band = high",
        label: "A high band triggers an immediate reversible soft-hold — automatic, with no human in the loop.", grounds: ["FR3"] },
      commands: [{ label: "Apply decision (soft-hold)", on: "AGG-AUTH", desc: "Place a reversible hold rather than a hard decline, so a false positive can still be released.", grounds: ["FR3"] }],
      businessRules: [{ label: "An authorization cannot be both approved and blocked", desc: "AGG-AUTH is decided exactly once; approve and block are mutually exclusive terminal states.", grounds: ["FR3"] }],
      readModels: [{ label: "Decision + explanation (audit record)", desc: "The immutable decision, its band and reason are projected for audit and dispute handling.", grounds: ["FR10"] }],
      policies: [
        { label: "When blocked → open case", desc: "Every block is queued as an analyst case in Case Management so it can be worked to a disposition.", crosses: "BC-CASE", grounds: ["FR5"] },
        { label: "When blocked → notify customer", desc: "POL1: the customer is alerted of the block within 60s with a confirm / deny action.", crosses: "BC-NOTIFY", grounds: ["POL1", "FR4"] },
      ],
      arch: {
        component: "C1",
        entry: { type: "sequentialFlowTrigger", label: "continues from Authorization scored" },
        emits: { via: "res-bus", topic: "transaction.blocked", schema: "SCH-blocked" },
        writes: [{ resource: "res-decisiondb", schema: "SCH-decision-row" }, { resource: "res-audit" }],
        reactions: [
          { via: "res-bus", topic: "transaction.blocked", consumer: "C3" },
          { via: "res-notify", topic: "block.placed", consumer: "C4" },
        ],
        secrets: ["SCRT-pan-key"],
        slo: ["NFR3"],
      } },
  ],
};

// ── Case Management (BC-CASE) — supporting subdomain, compact flow ──
export const caseMgmtFlow = {
  id: "casemgmt",
  name: "Case Management — triage & dispose",
  contextId: "BC-CASE",
  summary: "Blocked / escalated authorizations become analyst cases, worked to a recorded disposition.",
  signals: [
    { from: "AGG-CASE lifecycle + disposition invariants", reveals: "own consistency boundary", pattern: "Transactional aggregate, in-context" },
    { from: "Reacts to 'Authorization blocked' from Decisioning", reveals: "inbound async reaction", pattern: "Event-driven subscriber (downstream of the seam)" },
    { from: "Assign → work → dispose is analyst-driven", reveals: "human-in-the-loop workflow", pattern: "Task / worklist service (not autonomous)" },
  ],
  nodes: [
    { id: "c-opened", type: "SimpleNode", parentId: "start", kind: "event", summary: "Case opened", isPivotal: true, aggregate: "AGG-CASE", grounds: ["UC3", "FR5"],
      description: "A block from Decisioning is queued as a fraud case for an analyst to work, linked to the triggering authorization.",
      trigger: { kind: "policy", actor: "Decisioning (another context)", mechanism: "'Authorization blocked' event",
        label: "An inbound domain event from another context — Decisioning's block is picked up here as a fire-and-forget reaction across the seam.", crosses: "BC-DEC", grounds: ["FR5"] },
      commands: [{ label: "Open case", on: "AGG-CASE", grounds: ["FR5"] }],
      businessRules: [{ label: "A case must reference the triggering authorization", desc: "No orphan cases — every case links back to the exact authorization that was blocked, for traceability.", grounds: ["FR5"] }] },

    { id: "c-assigned", type: "SimpleNode", parentId: "c-opened", kind: "event", summary: "Case assigned", aggregate: "AGG-CASE", grounds: ["FR6"],
      description: "An analyst has picked up the case and now owns it; work can begin.",
      trigger: { kind: "human", actor: "Fraud analyst / triage", mechanism: "Claim or assignment from the queue",
        label: "A person takes ownership from the worklist — assignment is analyst-driven, not automatic.", grounds: ["FR6"] },
      commands: [{ label: "Assign analyst", on: "AGG-CASE", grounds: ["FR6"] }] },

    { id: "c-disposed", type: "SimpleNode", parentId: "c-assigned", kind: "event", summary: "Case disposed", isPivotal: true, aggregate: "AGG-CASE", isEndNode: true, grounds: ["FR6"],
      description: "The analyst recorded a verdict with a rationale, closing the case; the disposition is kept for audit.",
      trigger: { kind: "human", actor: "Assigned analyst", mechanism: "Records a disposition",
        label: "The owning analyst decides the outcome and records why — a deliberate human judgement, not a system reaction.", grounds: ["FR6"] },
      commands: [{ label: "Record disposition", on: "AGG-CASE", grounds: ["FR6"] }],
      businessRules: [
        { label: "A disposition requires a recorded rationale", desc: "You cannot close a case with a bare outcome — the reason is mandatory for audit and learning.", grounds: ["FR6"] },
        { label: "Only the assigned analyst can dispose a case", desc: "Ownership matters — disposition is restricted to whoever the case is assigned to.", grounds: ["FR6"] },
      ],
      readModels: [{ label: "Case + disposition (audit)", desc: "The full case history and its final disposition are projected for audit and QA.", grounds: ["FR10"] }] },
  ],
};

// ── Customer Notification (BC-NOTIFY) — generic subdomain, off-the-shelf ──
export const notifyFlow = {
  id: "notify",
  name: "Customer Notification — alert on block",
  contextId: "BC-NOTIFY",
  summary: "A pure reaction: notify the customer on a block, with a confirm / deny action. Generic — buy, don't build.",
  signals: [
    { from: "No domain state of its own — a pure reaction", reveals: "generic subdomain", pattern: "Buy an off-the-shelf notification service (SaaS)" },
    { from: "Reacts to 'Authorization blocked' from Decisioning", reveals: "inbound async reaction", pattern: "Event-driven subscriber via a published-language contract" },
  ],
  nodes: [
    { id: "n-sent", type: "SimpleNode", parentId: "start", kind: "event", summary: "Customer notified", isPivotal: true, isEndNode: true, grounds: ["FR4"],
      description: "A pure reaction: on a block, the customer is alerted with a confirm / deny action. This context owns no domain state of its own.",
      trigger: { kind: "policy", actor: "Decisioning (another context)", mechanism: "'Authorization blocked' event (POL1)",
        label: "An inbound domain event from Decisioning — the block is consumed here via a published-language contract.", crosses: "BC-DEC", grounds: ["POL1", "FR4"] },
      commands: [{ label: "Send notification (confirm / deny)", desc: "Push an alert the customer can act on, closing the loop on the block.", grounds: ["FR4"] }],
      hotspots: [{ label: "Channel choice + 60s delivery SLA", desc: "Which channel, and can we guarantee delivery within 60s? Points to an off-the-shelf provider.", grounds: ["FR4"] }] },
  ],
};

export const seedFlows = [decisioningFlow, caseMgmtFlow, notifyFlow];

// subdomain-level: the architecture-pattern signals a context's flow reveals
export const signalsFor = (contextId) => (seedFlows.find((f) => f.contextId === contextId)?.signals) || [];

// Entity registry in the mapper's shape (map / submap / mapNode). Our event-flow
// fields ride along as extra mapNode fields (declared so the state layer keeps them).
export const entities = {
  map: { collection: "map", fields: ["id", "name", "contextId", "summary", "signals", "createdAt", "updatedAt"] },
  submap: { collection: "submap", fields: ["id", "name", "summary", "startNodeId", "endNodeId", "collapsed", "extraParentNodeIds", "colorIndex", "mapIds", "ungroupedInMapIds"] },
};
export const embeddedEntities = {
  mapNode: {
    rootCollection: "map", arrayField: "nodes",
    fields: [
      "id", "name", "summary", "parentId", "type", "isEndNode", "submapId", "refNodeId", "domainId", "submapInstanceParentId",
      // event-flow extras (D-031 grounding + event-centric grammar)
      "kind", "isPivotal", "aggregate", "branch", "grounds", "description", "trigger", "commands", "businessRules", "readModels", "policies", "hotspots", "arch", "bc",
    ],
  },
};
