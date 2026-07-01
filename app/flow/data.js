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
    { id: "e-scored", type: "EventNode", parentId: "start", kind: "event", summary: "Authorization scored", isPivotal: true, aggregate: "AGG-AUTH", grounds: ["UC1"],
      trigger: { label: "Card network", grounds: ["UC1"] },
      commands: [{ label: "Score authorization", on: "AGG-AUTH", grounds: ["UC1", "FR1"] }],
      businessRules: [{ label: "carries a risk band + explanation", grounds: ["FR2"] }],
      hotspots: [{ label: "decide within network timeout (p95 < 300 ms)", grounds: ["NFR-LAT"] }] },
    { id: "e-approved-low", type: "EventNode", parentId: "e-scored", branch: "risk = low", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR1"],
      commands: [{ label: "Apply decision (approve)", on: "AGG-AUTH", grounds: ["FR1"] }] },
    { id: "e-stepup", type: "EventNode", parentId: "e-scored", branch: "risk = medium", kind: "event", summary: "Step-up issued", aggregate: "AGG-STEPUP", grounds: ["FR7"],
      policies: [{ label: "when scored = medium → issue step-up", on: "POL-1", grounds: ["POL-1", "FR7"] }],
      commands: [{ label: "Issue step-up challenge", on: "AGG-STEPUP", grounds: ["FR7"] }],
      hotspots: [{ label: "step-up UX + timeout", grounds: [] }] },
    { id: "e-stepup-pass", type: "EventNode", parentId: "e-stepup", branch: "passed", kind: "event", summary: "Authorization approved", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"] },
    { id: "e-stepup-fail", type: "EventNode", parentId: "e-stepup", branch: "failed", kind: "event", summary: "Authorization blocked", aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR7"] },
    { id: "e-blocked", type: "EventNode", parentId: "e-scored", branch: "risk = high", kind: "event", summary: "Authorization blocked", isPivotal: true, aggregate: "AGG-AUTH", isEndNode: true, grounds: ["FR3"],
      commands: [{ label: "Apply decision (soft-hold)", on: "AGG-AUTH", grounds: ["FR3"] }],
      businessRules: [{ label: "cannot be both approved and blocked", grounds: ["FR3"] }],
      readModels: [{ label: "Decision + explanation (audit)", grounds: ["FR10"] }],
      policies: [
        { label: "when blocked → open case", crosses: "BC-CASE", grounds: ["POL-2", "FR5"] },
        { label: "when blocked → notify customer", crosses: "BC-NOTIFY", grounds: ["POL-3", "FR4"] },
      ] },
  ],
};

export const seedFlows = [decisioningFlow];

export const entities = {
  flowMap: { collection: "flowMap", fields: ["id", "name", "contextId", "summary", "signals", "createdAt", "updatedAt"] },
};
export const embeddedEntities = {
  flowNode: {
    rootCollection: "flowMap", arrayField: "nodes",
    fields: ["id", "type", "parentId", "isEndNode", "submapId", "refNodeId", "domainId", "summary", "kind", "isPivotal", "aggregate", "branch", "grounds", "trigger", "commands", "businessRules", "readModels", "policies", "hotspots"],
  },
};
