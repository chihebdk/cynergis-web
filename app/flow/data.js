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
  "NFR-LAT": { id: "NFR-LAT", kind: "NonFunctionalRequirement", title: "Decide within the network timeout (p95 < 300 ms)", evidencedBy: ["S2"] },
  "POL-1": { id: "POL-1", kind: "Policy", title: "Medium risk → issue step-up", evidencedBy: ["S2"] },
  "POL-2": { id: "POL-2", kind: "Policy", title: "Blocked → open case", evidencedBy: ["S3"] },
  "POL-3": { id: "POL-3", kind: "Policy", title: "Blocked → notify customer", evidencedBy: ["S1"] },
};
export const resolveGround = (id) => GROUNDING[id];

// ── the Decisioning (BC-DEC) flow, fully grounded ──
export const decisioningFlow = {
  id: "decisioning",
  name: "Decisioning — authorize & decide",
  contextId: "BC-DEC",
  summary: "Score every card authorization in real time and decide approve / block / step-up.",
  signals: [
    { from: "AGG-AUTH decided exactly once + single command→event", reveals: "strong consistency boundary", pattern: "Transactional aggregate, in-context" },
    { from: "p95 < 300 ms on the sync path (NFR)", reveals: "latency budget", pattern: "Co-located synchronous scoring — no chatty hops" },
    { from: "POL-2 / POL-3 fire after commit, cross a seam", reveals: "fire-and-forget reactions", pattern: "Event-driven pub/sub across seams" },
    { from: "Step-up: issue → await passed / failed / timeout", reveals: "short-lived stateful wait", pattern: "Process manager / saga with a timeout policy" },
    { from: "Fallback when model / features unavailable (FR8)", reveals: "degradation path", pattern: "Circuit-breaker / graceful degradation" },
  ],
  nodes: [
    { id: "e-scored", type: "SimpleNode", parentId: "start", kind: "event", summary: "Authorization scored", isPivotal: true, aggregate: "AGG-AUTH", grounds: ["UC1"],
      trigger: { label: "Card network", grounds: ["UC1"] },
      commands: [{ label: "Score authorization", on: "AGG-AUTH", grounds: ["UC1", "FR1"] }],
      businessRules: [{ label: "carries a risk band + explanation", grounds: ["FR2"] }],
      hotspots: [{ label: "decide within network timeout (p95 < 300 ms)", grounds: ["NFR-LAT"] }] },
    { id: "e-approved-low", type: "SimpleNode", parentId: "e-scored", branch: "risk = low", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR1"],
      commands: [{ label: "Apply decision (approve)", on: "AGG-AUTH", grounds: ["FR1"] }] },
    { id: "e-stepup", type: "SimpleNode", parentId: "e-scored", branch: "risk = medium", kind: "event", summary: "Step-up issued", aggregate: "AGG-STEPUP", grounds: ["FR7"],
      policies: [{ label: "when scored = medium → issue step-up", on: "POL-1", grounds: ["POL-1", "FR7"] }],
      commands: [{ label: "Issue step-up challenge", on: "AGG-STEPUP", grounds: ["FR7"] }],
      hotspots: [{ label: "step-up UX + timeout", grounds: [] }] },
    { id: "e-stepup-pass", type: "SimpleNode", parentId: "e-stepup", branch: "passed", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"] },
    { id: "e-stepup-fail", type: "SimpleNode", parentId: "e-stepup", branch: "failed", kind: "event", summary: "Authorization blocked", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"] },
    { id: "e-blocked", type: "SimpleNode", parentId: "e-scored", branch: "risk = high", kind: "event", summary: "Authorization blocked", isPivotal: true, aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR3"],
      commands: [{ label: "Apply decision (soft-hold)", on: "AGG-AUTH", grounds: ["FR3"] }],
      businessRules: [{ label: "cannot be both approved and blocked", grounds: ["FR3"] }],
      readModels: [{ label: "Decision + explanation (audit)", grounds: ["FR10"] }],
      policies: [
        { label: "when blocked → open case", crosses: "BC-CASE", grounds: ["POL-2", "FR5"] },
        { label: "when blocked → notify customer", crosses: "BC-NOTIFY", grounds: ["POL-3", "FR4"] },
      ] },
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
      trigger: { label: "Authorization blocked (from Decisioning)", crosses: "BC-DEC", grounds: ["POL-2", "FR5"] },
      commands: [{ label: "Open case", on: "AGG-CASE", grounds: ["FR5"] }],
      businessRules: [{ label: "must reference the triggering authorization", grounds: ["FR5"] }] },
    { id: "c-assigned", type: "SimpleNode", parentId: "c-opened", kind: "event", summary: "Case assigned", aggregate: "AGG-CASE", grounds: ["FR6"],
      commands: [{ label: "Assign analyst", on: "AGG-CASE", grounds: ["FR6"] }] },
    { id: "c-disposed", type: "SimpleNode", parentId: "c-assigned", kind: "event", summary: "Case disposed", isPivotal: true, aggregate: "AGG-CASE", isEndNode: true, grounds: ["FR6"],
      commands: [{ label: "Record disposition", on: "AGG-CASE", grounds: ["FR6"] }],
      businessRules: [
        { label: "a disposition requires a recorded rationale", grounds: ["FR6"] },
        { label: "only the assigned analyst can dispose a case", grounds: ["FR6"] },
      ],
      readModels: [{ label: "Case + disposition (audit)", grounds: ["FR10"] }] },
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
      trigger: { label: "Authorization blocked (from Decisioning)", crosses: "BC-DEC", grounds: ["POL-3", "FR4"] },
      commands: [{ label: "Send notification (confirm / deny)", grounds: ["FR4"] }],
      hotspots: [{ label: "channel + delivery SLA (60s)", grounds: ["FR4"] }] },
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
      "kind", "isPivotal", "aggregate", "branch", "grounds", "trigger", "commands", "businessRules", "readModels", "policies", "hotspots",
    ],
  },
};
