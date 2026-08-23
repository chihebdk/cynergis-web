"use client";

// ── ClaimsCore on the flow canvas (R2, D-108) ──
// The four packaged walls as event flows in the same storming grammar as fraud's
// (D-036 cards, D-031 grounding), plus the product's context map (contexts as
// expandable submaps, the six typed seams as nodes) and its C4 system map.
// Everything grounds in the ClaimsCore PRD ids (__PRD4__) — the trace chips open
// the SAME definitions the Discover/Design pages show. No arch blocks: the
// as-built registry for this product isn't authored yet, and the canvas says so
// by showing plain "Domain event" chips instead of borrowing fraud's components.

import { registerGrounding } from "./data";

// ── grounding registry: ClaimsCore's own ids (they collide with fraud's by name,
// so resolveGround switches registry on the OPEN product — see data.js) ──
export const CC_GROUNDING = {
  UC1: { id: "UC1", kind: "UseCase", title: "Report a loss digitally", evidencedBy: ["S3"] },
  UC2: { id: "UC2", kind: "UseCase", title: "Take first notice by phone with model-assisted triage", evidencedBy: ["S3"] },
  UC3: { id: "UC3", kind: "UseCase", title: "Open the claim against the coverage snapshot", evidencedBy: ["S3"] },
  UC4: { id: "UC4", kind: "UseCase", title: "Decide coverage and set reserves", evidencedBy: ["S3"] },
  UC5: { id: "UC5", kind: "UseCase", title: "Adjudicate a treatment plan inside the SABS clock", evidencedBy: ["S3"] },
  UC6: { id: "UC6", kind: "UseCase", title: "Issue an indemnity payment", evidencedBy: ["S3"] },
  UC7: { id: "UC7", kind: "UseCase", title: "Settle a total loss and dispose of the salvage", evidencedBy: ["S3"] },
  UC8: { id: "UC8", kind: "UseCase", title: "Track my claim’s status", evidencedBy: ["S3"] },
  FR1: { id: "FR1", kind: "FunctionalRequirement", title: "Multi-channel loss capture into a single report — one loss event, one report", evidencedBy: ["S3"] },
  FR2: { id: "FR2", kind: "FunctionalRequirement", title: "Severity scoring and lane assignment, recalculated as facts land", evidencedBy: ["S3"] },
  FR3: { id: "FR3", kind: "FunctionalRequirement", title: "Snapshot consumption and local storage keyed to date of loss — no live policy calls", evidencedBy: ["S3"] },
  FR4: { id: "FR4", kind: "FunctionalRequirement", title: "Coverage determination with endorsement effects (OPCF 47R elections) from the snapshot alone", evidencedBy: ["S3"] },
  FR5: { id: "FR5", kind: "FunctionalRequirement", title: "Reserve and authority management — every move evented for actuarial consumption", evidencedBy: ["S3"] },
  FR6: { id: "FR6", kind: "FunctionalRequirement", title: "Payment instruction events to Billing with the instructed-not-yet-settled ledger state", evidencedBy: ["S3"] },
  FR7: { id: "FR7", kind: "FunctionalRequirement", title: "SABS-versioned benefit adjudication with HCAI intake behind the ACL", evidencedBy: ["S3"] },
  FR8: { id: "FR8", kind: "FunctionalRequirement", title: "Adjournment-clock guard: no silent deemed approvals — escalation at 80%", evidencedBy: ["S3"] },
  FR9: { id: "FR9", kind: "FunctionalRequirement", title: "ACV settlement and salvage disposition on one file", evidencedBy: ["S3"] },
  FR10: { id: "FR10", kind: "FunctionalRequirement", title: "Claim status event stream for the portals", evidencedBy: ["S3"] },
  NFR1: { id: "NFR1", kind: "NonFunctionalRequirement", title: "Digital FNOL intake availability ≥ 99.9%", evidencedBy: ["S3"] },
  NFR2: { id: "NFR2", kind: "NonFunctionalRequirement", title: "Snapshot event consumption lag < 5 minutes", evidencedBy: ["S3"] },
  NFR3: { id: "NFR3", kind: "NonFunctionalRequirement", title: "HCAI round-trip success ≥ 99.5%", evidencedBy: ["S3"] },
  POL1: { id: "POL1", kind: "Policy", title: "Clock escalation cannot be muted", evidencedBy: ["S3"] },
  POL2: { id: "POL2", kind: "Policy", title: "Snapshot-only adjudication", evidencedBy: ["S3"] },
};
registerGrounding("PROD-CLAIMSCORE", CC_GROUNDING);

// ── Notice of loss (CTX-FNOL, core) — first notice & triage ──
export const fnolFlow = {
  id: "cc-fnol",
  name: "Notice of loss — first notice & triage",
  contextId: "CTX-FNOL",
  summary: "The front door of the domain: one loss event, one report, however many channels touch it — and the triage that sets severity, lane and initial reserve.",
  nodes: [
    { id: "f-reported", type: "SimpleNode", parentId: "start", kind: "event", summary: "Loss reported", isPivotal: true, aggregate: "AGG-LOSSREPORT", grounds: ["UC1", "FR1"],
      arch: { component: "C1", prod: "PROD-CLAIMSCORE" },
      description: "Someone tells us about a loss for the first time — a customer in the app or on the phone, a broker, or a police feed. The Loss report module opens a single loss report and records what was reported: the circumstances, the people and vehicles involved, and any alleged injuries. If the same loss comes in again through another channel, the module adds the new information to the existing report instead of creating a duplicate. At this point it is a report of what happened — not yet a claim.",
      trigger: { kind: "external", actor: "Claimant / broker / police feed", mechanism: "Any intake channel (digital FNOL, phone, broker, feed)",
        label: "The loss event arrives from outside — channels are ways INTO the same model, never separate models.", grounds: ["UC1", "FR1"] },
      /* D-147 (final shape): every door triggers the SAME action with the SAME
         parameter schema (see params below). Entries = call types; kind names
         the boundary; humans/systems live in sources. Spec artifacts: OpenAPI
         for API doors, AsyncAPI (consumer) for Message doors — both embed the
         shared parameter schema from the registry. */
      triggers: [
        { kind: "domain call", type: "API",
          sources: ["Claimant (policyholder) — via Customer Portal · digital FNOL pane"],
          callers: [{ component: "C5", prod: "PROD-CUSTOMER-PORTAL" }],
          impl: { endpoint: "POST /claims/loss-reports", spec: "OpenAPI · claims-intake-api v1", gateway: "Public API gateway", authn: "Customer session (OIDC)" } },
        { kind: "internal module call", type: "API",
          sources: ["Intake adjuster — guided intake workspace", "Broker, on behalf of the insured — via the desk"],
          callers: [{ component: "C1", prod: "PROD-CLAIMSCORE" }],
          impl: { endpoint: "POST /intake/loss-reports (internal)", spec: "OpenAPI · claims-intake-internal v1", authn: "Staff SSO · licensed intake role" } },
        { kind: "external system call", type: "Message",
          sources: ["Provincial police-report feed"],
          impl: { topic: "claims.loss-reports.police.v1", schema: "PoliceReportNotice v1", broker: "Kafka · claims cluster",
            consumerGroup: "claimscore-fnol-intake", delivery: "at-least-once · partition key: police report #",
            idempotency: "Merges into the existing loss report — never a duplicate (FR1)", dlq: "claims.loss-reports.police.dlq",
            spec: "AsyncAPI · claims-loss-reports v1 (consumer)" } },
      ],
      params: { schema: "LossReportIntake v1", registry: "schema registry · claims/loss-report-intake",
        note: "One parameter schema for every door — same action, same payload. The OpenAPI and AsyncAPI contracts embed this schema from the registry; a parameter change is one change, everywhere." },
      commands: [
        { label: "Open loss report", on: "AGG-LOSSREPORT", desc: "Record circumstances, parties, vehicles and alleged injuries as reported — not yet a claim.", grounds: ["UC1", "FR1"] },
      ],
      businessRules: [
        { label: "One loss event, one report", desc: "Channel-merge dedupe: a police feed referencing an app-reported collision lands on the same report; no duplicate file exists (AT1).", grounds: ["FR1"] },
      ],
      policies: [
        { label: "When reported → request the coverage snapshot", desc: "The snapshot keyed to date of loss is requested at intake over the customer–supplier seam, so adjudication never calls live policy systems.", crosses: "Underwriting & Policy", grounds: ["FR3", "POL2"] },
      ],
      hotspots: [
        { label: "First notice is licensed judgment, not scripting", desc: "The intake conversation shapes the entire claim — which is why the severity model only assists it.", grounds: ["UC2"] },
      ] },

    { id: "f-triaged", type: "SimpleNode", parentId: "f-reported", kind: "event", summary: "Severity triaged", aggregate: "AGG-LOSSREPORT", grounds: ["UC2", "FR2"],
      arch: { component: "C1", prod: "PROD-CLAIMSCORE" },
      description: "Model-assisted triage attaches a severity score, a lane and an initial reserve suggestion. The operator runs at Operate tier (promoted by APR-2) — adjusters audit a 10% sample.",
      trigger: { kind: "policy", actor: "Notice-of-loss Operator (model-assisted)", mechanism: "First-notice conversation completes", via: "message",
        label: "The severity model scores automatically as intake completes — promoted Assist → Operate by APR-2, with the audit condition in its guardrails.", grounds: ["UC2", "FR2"] },
      commands: [
        { label: "Score severity & suggest initial reserve", on: "AGG-LOSSREPORT", desc: "Model-assisted estimate driving assignment and the first reserve suggestion.", grounds: ["FR2"] },
        { label: "Assign lane", on: "AGG-LOSSREPORT", desc: "Desk, field, AB or fast-track — routed by severity and coverage shape.", grounds: ["FR2"] },
      ],
      businessRules: [
        { label: "Severity is recalculated as facts land — never frozen at intake", desc: "The triage estimate is a living value; every new fact can rescore it.", grounds: ["FR2"] },
        { label: "Overrides audited at a 10% sample", desc: "The APR-2 promotion condition: the intake adjuster overrides with reason, and a tenth of overrides are audited.", grounds: ["UC2"] },
      ],
      readModels: [
        { label: "Severity score with drivers", desc: "The estimate and what drove it, visible to the intake adjuster in the workbench.", grounds: ["FR2"] },
      ] },

    { id: "f-completed", type: "SimpleNode", parentId: "f-triaged", kind: "event", summary: "Report completed & routed", isPivotal: true, aggregate: "AGG-LOSSREPORT", isEndNode: true, grounds: ["UC2", "FR1"],
      arch: { component: "C1", prod: "PROD-CLAIMSCORE" },
      description: "The intake adjuster completes the guided conversation and the report publishes — the event that opens the claim downstream and routes injury files to the AB lane.",
      trigger: { kind: "human", actor: "Intake adjuster", mechanism: "Completes the guided conversation",
        label: "A licensed person closes the intake — report completeness at handoff is the measure that matters.", grounds: ["UC2"] },
      commands: [
        { label: "Publish the completed loss report", on: "AGG-LOSSREPORT", desc: "The completed report with triage payload crosses the seam as an event.", grounds: ["FR1"] },
      ],
      policies: [
        { label: "When completed → open the claim", desc: "The loss report event opens the claim against the stored snapshot; severity and reserve suggestions ride along.", crosses: "CTX-COVERAGE", grounds: ["FR3"] },
        { label: "When injury indicators → AB lane", desc: "Injury files route to accident benefits with the elections from the snapshot.", crosses: "CTX-AB", grounds: ["FR7"] },
        { label: "On any state change → status event to the portal", desc: "The status stream keeps the claimant honestly informed at every milestone.", grounds: ["UC8", "FR10"] },
      ],
      readModels: [
        { label: "Claim status stream (portal pane)", desc: "A projection over published events — every module's state change reaches the portal within its freshness SLO.", grounds: ["UC8", "FR10"] },
      ] },
  ],
};

// ── Coverage & adjudication (CTX-COVERAGE, core) — snapshot, reserves, payment ──
export const coverageFlow = {
  id: "cc-coverage",
  name: "Coverage & adjudication — snapshot, reserves, payment",
  contextId: "CTX-COVERAGE",
  summary: "The centre of gravity: the claim opens against the immutable coverage snapshot, the desk adjuster decides, every reserve move is evented, and payment instructions publish to Billing.",
  nodes: [
    { id: "cv-opened", type: "SimpleNode", parentId: "start", kind: "event", summary: "Claim opened against the snapshot", isPivotal: true, aggregate: "AGG-CLAIM", grounds: ["UC3", "FR3"],
      arch: { component: "C2", prod: "PROD-CLAIMSCORE" },
      description: "The completed loss report opens the claim against the coverage picture as at DATE OF LOSS — the canonical design-time seam. Later policy changes never alter an open claim.",
      trigger: { kind: "policy", actor: "Notice of loss (another context)", mechanism: "'completed loss report' event", via: "message",
        label: "An inbound domain event across the internal customer–supplier seam — the claim opens as a reaction, with the triage payload attached.", crosses: "CTX-FNOL", grounds: ["UC3", "FR3"] },
      commands: [
        { label: "Open claim", on: "AGG-CLAIM", desc: "The adjudication file: coverages engaged, reserves, liability position, payments, status.", grounds: ["UC3"] },
        { label: "Engage coverages from the snapshot", on: "AGG-CLAIM", desc: "Limits, deductibles and endorsement effects read from the stored snapshot — never a live call.", grounds: ["FR4"] },
      ],
      businessRules: [
        { label: "A claim exists only against a snapshot fixed as at date of loss", desc: "Snapshot-only adjudication: no module may call live policy systems at adjudication time.", grounds: ["FR3", "POL2"] },
        { label: "A post-loss endorsement has no effect on coverage basis", desc: "Temporal correctness (AT3): a policy endorsed after the date of loss changes nothing on the open claim.", grounds: ["FR3"] },
      ] },

    { id: "cv-decided", type: "SimpleNode", parentId: "cv-opened", kind: "event", summary: "Coverage decided & reserves set", isPivotal: true, aggregate: "AGG-CLAIM", grounds: ["UC4", "FR4", "FR5"],
      arch: { component: "C2", prod: "PROD-CLAIMSCORE" },
      description: "The desk adjuster decides whether the policy responds and for how much — irreducible human judgment with money and conduct on the line. The agent assists; the decision is hers.",
      trigger: { kind: "human", actor: "Desk adjuster", mechanism: "Records the coverage decision",
        label: "Facts landed on the open claim and a person makes the call — coverage response is never the agent's.", grounds: ["UC4"] },
      commands: [
        { label: "Record coverage decision", on: "AGG-CLAIM", desc: "The determination that a coverage responds, with limits, deductible and election effects applied.", grounds: ["FR4"] },
        { label: "Move reserve", on: "AGG-CLAIM", desc: "Best estimate of ultimate cost, by coverage — appended, never mutated.", grounds: ["FR5"] },
      ],
      businessRules: [
        { label: "Election effects (OPCF 47R) apply from the snapshot alone", desc: "AT8: a snapshot carrying an election and a deductible drives the outcome — nothing else does.", grounds: ["FR4"] },
        { label: "Every reserve move is evented for actuarial consumption", desc: "Append-only reserve events — the actuarial feed is a consumer, not an afterthought.", grounds: ["FR5"] },
        { label: "Authority breaches are prevented in-flow, not audited after", desc: "The band an adjuster may settle within is enforced at decision time.", grounds: ["FR5"] },
        { label: "Settlement gated by investigation holds on flagged files", desc: "Fraud & SIU holds gate settlement; findings flow back as facts — SIU never edits the claim model.", grounds: ["UC4"] },
      ],
      readModels: [
        { label: "Reserve suggestion with drivers shown", desc: "The Coverage Operator at Assist tier: suggests with evidence attached — the adjuster decides.", grounds: ["UC4"] },
      ] },

    { id: "cv-paid", type: "SimpleNode", parentId: "cv-decided", kind: "event", summary: "Payment instructed", aggregate: "AGG-CLAIM", isEndNode: true, grounds: ["UC6", "FR6"],
      arch: { component: "C2", prod: "PROD-CLAIMSCORE" },
      description: "An approved indemnity payment publishes as PaymentInstruction v2 across the domain seam to Billing — the claim ledger holds instructed-not-yet-settled until the outcome event returns.",
      trigger: { kind: "human", actor: "Desk adjuster (within her authority band)", mechanism: "Approves an indemnity payment",
        label: "The payment decision stays inside the band; the instruction itself is deterministic, contract-tested code.", grounds: ["UC6"] },
      commands: [
        { label: "Publish PaymentInstruction v2", on: "AGG-CLAIM", desc: "The published-language event across the seam; void / reissue flows back as events.", grounds: ["FR6"] },
      ],
      businessRules: [
        { label: "The ledger reflects instructed-not-yet-settled until the outcome returns", desc: "AT5: Billing acknowledges the event and the state machine holds the intermediate state.", grounds: ["FR6"] },
      ],
      policies: [
        { label: "When instructed → Billing & Money Movement", desc: "Approved instructions publish to Billing over the published-events seam.", crosses: "Billing & Money Movement", grounds: ["FR6"] },
      ] },
  ],
};

// ── Accident benefits (CTX-AB, core) — SABS clocks & HCAI ──
export const abFlow = {
  id: "cc-ab",
  name: "Accident benefits — SABS clocks & HCAI",
  contextId: "CTX-AB",
  summary: "The statutory heart: OCF forms arrive through the HCAI ACL, decisions are human, clocks are code — and the clock guard runs at Operate because missing one IS the loss event.",
  nodes: [
    { id: "ab-received", type: "SimpleNode", parentId: "start", kind: "event", summary: "OCF-18 received", isPivotal: true, aggregate: "AGG-TREATPLAN", grounds: ["UC5", "FR7"],
      arch: { component: "C3", prod: "PROD-CLAIMSCORE" },
      description: "A treatment plan arrives via HCAI — their schema, our translation layer. Intake is classified and the adjournment clock starts the moment the form lands.",
      trigger: { kind: "external", actor: "HCAI (industry gateway)", mechanism: "OCF forms + invoices through the ACL",
        label: "Conformist behind an ACL: HCAI's schema comes in, verified facts in our model come out — conformance drift converts to deemed-approval risk.", grounds: ["UC5", "FR7", "NFR3"] },
      commands: [
        { label: "Classify OCF intake", on: "AGG-TREATPLAN", desc: "OCF-18 treatment plans and OCF-21 invoices sorted into the adjudication queue.", grounds: ["FR7"] },
        { label: "Start the adjournment clock", on: "AGG-TREATPLAN", desc: "SABS response timelines attach at receipt — the clock ledger is the statutory record.", grounds: ["FR8"] },
      ],
      businessRules: [
        { label: "Benefits adjudicate against the SABS in force at date of loss, plus elections", desc: "Statute as versioned data — never current wording. The 47R election facts ride in the snapshot.", grounds: ["FR7"] },
        { label: "Conformance drift is watched by SLO3", desc: "HCAI round-trip success ≥ 99.5% — the ACL is instrumented because its failure mode is a deemed approval.", grounds: ["NFR3"] },
      ] },

    { id: "ab-decided", type: "SimpleNode", parentId: "ab-received", branch: "decided inside the clock", kind: "event", summary: "Treatment plan decided", isPivotal: true, aggregate: "AGG-TREATPLAN", isEndNode: true, grounds: ["UC5", "FR7"],
      arch: { component: "C3", prod: "PROD-CLAIMSCORE" },
      description: "The AB adjuster decides the plan inside the statutory window — SABS adjudication is never delegated to the agent. Payment authorizes only on an approved plan.",
      trigger: { kind: "human", actor: "AB adjuster", mechanism: "Records the plan decision",
        label: "A licensed human decides — the statute sets the shape, and delegation is off the table at any tier.", grounds: ["UC5"] },
      commands: [
        { label: "Record plan decision", on: "AGG-TREATPLAN", desc: "Timestamped against the SABS clocks — the decision and its clock position are one record.", grounds: ["FR8"] },
        { label: "Authorize payment on the approved plan", on: "AGG-TREATPLAN", desc: "The authorization gate: approved plan or statutory exception, nothing else pays.", grounds: ["FR7"] },
      ],
      businessRules: [
        { label: "No payment without an approved plan or a statutory exception", desc: "The authorization gate is code; the decision behind it is human.", grounds: ["FR7"] },
      ] },

    { id: "ab-clock", type: "SimpleNode", parentId: "ab-received", branch: "80% of the clock, no decision", kind: "event", summary: "Clock escalated at 80%", aggregate: "AGG-TREATPLAN", grounds: ["FR8", "POL1"],
      arch: { component: "C3", prod: "PROD-CLAIMSCORE" },
      description: "The clock guard fires before the statute does: at 80% with no decision, the file escalates to the queue head and the first-line risk seat is notified — before any deemed approval can occur.",
      trigger: { kind: "policy", actor: "AB Clock Operator (Operate tier)", mechanism: "Adjournment clock reaches 80% with no decision", via: "timer",
        label: "The guard runs at Operate because missing a clock IS the loss event — and the escalation cannot be muted.", grounds: ["FR8", "POL1"] },
      commands: [
        { label: "Escalate to the queue head", on: "AGG-TREATPLAN", desc: "The file jumps the queue — AT4: escalation precedes every clock expiry.", grounds: ["FR8"] },
        { label: "Notify the first-line risk seat", on: "AGG-TREATPLAN", desc: "The embedded control seat sees the escalation as it happens, in-flow.", grounds: ["FR8"] },
      ],
      businessRules: [
        { label: "No silent deemed approvals", desc: "Deemed approvals went 11 → 0 per quarter once the guard hardened — the three misses were all pre-clockwatch files.", grounds: ["FR8"] },
        { label: "The escalation cannot be muted, at any tier", desc: "POL1: adjournment-clock escalations reach the queue head and the risk seat, always.", grounds: ["POL1"] },
      ] },

    { id: "ab-decided-esc", type: "SimpleNode", parentId: "ab-clock", kind: "event", summary: "Plan decided at the queue head", aggregate: "AGG-TREATPLAN", isEndNode: true, grounds: ["UC5", "FR8"],
      arch: { component: "C3", prod: "PROD-CLAIMSCORE" },
      description: "The escalated file is decided ahead of the clock — the guard bought the time, the human made the call.",
      trigger: { kind: "human", actor: "AB adjuster (queue head)", mechanism: "Decides the escalated plan",
        label: "Same human decision, escalated priority — the statutory clock still governs the timestamp.", grounds: ["UC5"] },
      commands: [
        { label: "Record plan decision", on: "AGG-TREATPLAN", desc: "Timestamped against the clock — inside the window because the guard fired at 80%.", grounds: ["FR8"] },
      ] },
  ],
};

// ── Total loss & salvage (CTX-TOTAL-LOSS, supporting) — one vehicle, one disposition ──
export const totalLossFlow = {
  id: "cc-totalloss",
  name: "Total loss & salvage — one vehicle, one disposition",
  contextId: "CTX-TOTAL-LOSS",
  summary: "The write-off path: ACV from bought data behind an ACL, a human settlement, deterministic disposal — settlement to the owner and recovery from the asset on the same file, never two.",
  nodes: [
    { id: "tl-breach", type: "SimpleNode", parentId: "start", kind: "event", summary: "Threshold breached", isPivotal: true, aggregate: "AGG-SALVAGE", grounds: ["UC7", "FR9"],
      arch: { component: "C4", prod: "PROD-CLAIMSCORE" },
      description: "Repair cost tipped past ACV — the repair file hands the vehicle to salvage disposition with the estimate of record attached, and the repair job closes.",
      trigger: { kind: "policy", actor: "Estimating & repair (another context)", mechanism: "'threshold breach' event with the estimate of record", via: "message",
        label: "An inbound event over the internal customer–supplier seam — the handoff carries the teardown facts (AT6).", grounds: ["UC7"] },
      commands: [
        { label: "Open salvage disposition", on: "AGG-SALVAGE", desc: "One disposition file for settlement AND recovery — opened at the moment of handoff.", grounds: ["FR9"] },
      ],
      businessRules: [
        { label: "The handoff carries the estimate of record", desc: "AT6: the vehicle moves with the estimate and teardown facts attached; the repair job closes behind it.", grounds: ["UC7"] },
      ] },

    { id: "tl-valued", type: "SimpleNode", parentId: "tl-breach", kind: "event", summary: "ACV determined", aggregate: "AGG-SALVAGE", grounds: ["FR9"],
      arch: { component: "C4", prod: "PROD-CLAIMSCORE" },
      description: "Market valuation of the vehicle at date of loss — the settlement anchor and the argument to get right. Bought data, consumed through an ACL the model survives vendor switches behind.",
      trigger: { kind: "policy", actor: "Valuation data vendors (behind the ACL)", mechanism: "Market valuation feed at date of loss", via: "message",
        label: "Conformist behind an ACL — two vendor switches in a decade is the norm, and the model must survive both.", grounds: ["FR9"] },
      readModels: [
        { label: "Comparables with evidence attached", desc: "The Total-loss Operator at Suggest tier: acv.compare lays valuations against comparables — humans settle.", grounds: ["UC7"] },
      ],
      businessRules: [
        { label: "The ACL absorbs a vendor change at the boundary", desc: "The vendor's model never enters the disposition model — a switch is an adapter change, not a remodel.", grounds: ["FR9"] },
      ] },

    { id: "tl-settled", type: "SimpleNode", parentId: "tl-valued", kind: "event", summary: "Settlement offered & accepted", isPivotal: true, aggregate: "AGG-SALVAGE", grounds: ["UC7", "FR9"],
      arch: { component: "C4", prod: "PROD-CLAIMSCORE" },
      description: "The owner settles on a defensible ACV — offers are prepared with comparables attached, and the settlement is the specialist's call within band.",
      trigger: { kind: "human", actor: "Total-loss specialist", mechanism: "Makes the settlement offer",
        label: "Settlement offers are human — the agent prepares, the person settles.", grounds: ["UC7"] },
      commands: [
        { label: "Record settlement on the disposition file", on: "AGG-SALVAGE", desc: "Owner settlement and lienholder payoffs on the same file as the coming recovery.", grounds: ["FR9"] },
      ],
      businessRules: [
        { label: "One vehicle, one disposition", desc: "Settlement and recovery are the same file, never two — the single-disposition aggregate does the governing.", grounds: ["FR9"] },
      ] },

    { id: "tl-disposed", type: "SimpleNode", parentId: "tl-settled", kind: "event", summary: "Salvage disposed & recovery credited", aggregate: "AGG-SALVAGE", isEndNode: true, grounds: ["FR9"],
      arch: { component: "C4", prod: "PROD-CLAIMSCORE" },
      description: "Title branded, vehicle auctioned, net proceeds credited against indemnity — the recovery closes the same file the settlement opened.",
      trigger: { kind: "policy", actor: "Salvage auction network", mechanism: "Disposal completes", via: "message",
        label: "Deterministic disposal on the auction network — brand filing and proceeds are code, not judgment.", grounds: ["FR9"] },
      commands: [
        { label: "File the title brand", on: "AGG-SALVAGE", desc: "Irreparable / salvage / rebuilt follows the VIN — the provincial record is the output.", grounds: ["FR9"] },
        { label: "Credit the salvage return against indemnity", on: "AGG-SALVAGE", desc: "Net auction proceeds land as a recovery on the disposition file.", grounds: ["FR9"] },
      ] },
  ],
};

export const claimsFlows = [fnolFlow, coverageFlow, abFlow, totalLossFlow];

// ── the ClaimsCore context map: contexts as submaps, the six typed seams as nodes ──
// Same construction as fraud's (contextmap-data.js): a context's members are its
// event flow between the pivotal cuts; the nodes between boxes are the published
// events crossing each seam; externals sit behind ACLs.
function ccMembersOf(flowId, submapId, entryParent) {
  const flow = claimsFlows.find((f) => f.id === flowId);
  return flow.nodes.map((n) => {
    const m = {
      ...structuredClone(n),
      submapId,
      bc: flow.contextId,
      parentId: n.parentId === "start" ? entryParent : n.parentId,
    };
    delete m.isEndNode; // box exits route through the End marker + seam nodes (see contextmap-data.js)
    return m;
  });
}

export const ccContextMap = {
  id: "cc-contextmap",
  name: "Context map — ClaimsCore's walls & seams",
  contextId: null,
  summary: "How ClaimsCore's bounded contexts relate. Expand a context to see its event flow; the nodes between boxes are the published events crossing each seam — every treaty of the map is a clickable contract.",
  nodes: [
    { id: "cx-claimant", type: "SimpleNode", parentId: "start", kind: "actor", summary: "Claimant & channels",
      description: "The person with the loss — app, web, phone, broker or police feed. Every claim starts here, and the status stream reports back to the same person at every milestone." },

    // ── Notice of loss (core): its event flow, between the claimant and the seams ──
    ...ccMembersOf("cc-fnol", "sub-cc-fnol", "cx-claimant"),

    // ── seams and externals out of Notice of loss ──
    { id: "cseam-lossreport", type: "SimpleNode", parentId: "f-completed", kind: "seam", summary: "completed loss report",
      description: "Published event: the completed loss report + triage payload opens the claim. Customer–Supplier (internal): Notice of loss is the upstream supplier — it owns the report and the event; Coverage & adjudication is the downstream customer and negotiates what the payload must carry (severity, reserve suggestion). Only the event crosses the boundary." },
    { id: "cx-uw", type: "SimpleNode", parentId: "f-completed", kind: "external", summary: "Underwriting & Policy", isEndNode: true,
      description: "Another domain — the coverage source of truth. Customer–Supplier: CoverageSnapshot v3 (evented, immutable) is recorded at intake keyed to date of loss and adjudicated against locally. Design-time coupling only: no live policy calls at adjudication time — the reference doc's canonical design-time-versus-run-time seam." },
    { id: "cx-hcai", type: "SimpleNode", parentId: "f-completed", kind: "external", summary: "HCAI (industry gateway)",
      description: "External — the statutory forms gateway. Conformist behind an ACL: their schema in, our verified-fact model out. OCF-18 treatment plans and OCF-21 invoices wake the Accident benefits context; conformance drift converts to deemed-approval risk, so the ACL is watched by SLO3." },

    // ── Coverage & adjudication (core): woken by the loss-report seam ──
    ...ccMembersOf("cc-coverage", "sub-cc-cov", "cseam-lossreport"),

    // ── seams and externals out of Coverage & adjudication ──
    { id: "cseam-payment", type: "SimpleNode", parentId: "cv-paid", kind: "seam", summary: "PaymentInstruction v2",
      description: "Published event: approved payment instructions cross the domain seam to Billing & Money Movement; void / reissue flows back as events. Published language: the contract is versioned and contract-tested — the claim ledger holds instructed-not-yet-settled until the outcome event returns." },
    { id: "cx-billing", type: "SimpleNode", parentId: "cseam-payment", kind: "external", summary: "Billing & Money Movement", isEndNode: true,
      description: "Another domain — executes the money movement. Consumes PaymentInstruction v2, acknowledges, and publishes the settlement outcome back across the same seam." },
    { id: "cx-siu", type: "SimpleNode", parentId: "cv-paid", kind: "external", summary: "Fraud & SIU", isEndNode: true,
      description: "Another domain — investigation holds and findings. Customer–Supplier (internal): holds gate settlement on flagged files; findings flow back as facts adjudication acts on. SIU never edits the claim model — only events cross." },

    // ── Accident benefits (core): woken by HCAI through the ACL ──
    ...ccMembersOf("cc-ab", "sub-cc-ab", "cx-hcai"),

    // ── Total loss & salvage (supporting): woken by the threshold-breach seam ──
    { id: "cx-estimating", type: "SimpleNode", parentId: "cv-paid", kind: "external", summary: "Estimating & repair",
      description: "Another Claims context, outside this product's walls. Customer–Supplier (internal): the threshold-breach event with the estimate of record hands the vehicle to salvage disposition when repair cost tips past ACV." },
    ...ccMembersOf("cc-totalloss", "sub-cc-tl", "cx-estimating"),
  ],
};

export const ccContextSubmaps = [
  { id: "sub-cc-fnol", name: "Notice of loss · core", startNodeId: "f-reported", endNodeId: "f-completed", colorIndex: 0, mapIds: ["cc-contextmap"] },
  { id: "sub-cc-cov", name: "Coverage & adjudication · core", startNodeId: "cv-opened", endNodeId: "cv-paid", colorIndex: 1, mapIds: ["cc-contextmap"] },
  { id: "sub-cc-ab", name: "Accident benefits · core", startNodeId: "ab-received", endNodeId: "ab-decided", colorIndex: 2, mapIds: ["cc-contextmap"] },
  { id: "sub-cc-tl", name: "Total loss & salvage · supporting", startNodeId: "tl-breach", endNodeId: "tl-disposed", colorIndex: 3, mapIds: ["cc-contextmap"] },
];

// ── the ClaimsCore system map (C4 system context, D-044/D-046 grammar) ──
export const ccSystemMap = {
  id: "cc-systemmap",
  name: "System map — ClaimsCore in its world",
  contextId: null,
  summary: "The product in context: who acts on it, which external systems feed and consume it, and what crosses each boundary. Expand the product box to see its bounded contexts.",
  nodes: [
    { id: "cc-sm-claimant", type: "SimpleNode", parentId: "start", kind: "actor", personaId: "P1", summary: "Claimant",
      description: "The person with the loss — reports once through any channel, then receives honest status at every milestone and confirms or disputes via the portal. She may not even be the insured." },
    { id: "cc-sm-intake", type: "SimpleNode", parentId: "cc-sm-claimant", kind: "actor", personaId: "P2", summary: "Intake adjuster",
      description: "Licensed intake on rotation — the first conversation shapes the whole claim. Captures a complete report and routes it to the right lane, with model-assisted severity he can override (audited at 10%)." },

    // ── the product — a submap whose members are its bounded contexts ──
    { id: "cc-sm-ctx-fnol", type: "SimpleNode", parentId: "cc-sm-intake", submapId: "sub-cc-product", bc: "CTX-FNOL", kind: "context", summary: "Notice of loss",
      description: "Core — owns the moment a loss enters the company, through any channel, and the triage that sets severity, reserves and assignment." },
    { id: "cc-sm-ctx-cov", type: "SimpleNode", parentId: "cc-sm-ctx-fnol", submapId: "sub-cc-product", bc: "CTX-COVERAGE", kind: "context", summary: "Coverage & adjudication",
      description: "Core — decides whether the policy responds and for how much, against the immutable snapshot. The centre of gravity of the domain." },
    { id: "cc-sm-ctx-ab", type: "SimpleNode", parentId: "cc-sm-ctx-cov", submapId: "sub-cc-product", bc: "CTX-AB", kind: "context", summary: "Accident benefits",
      description: "Core — statutory benefits under the SABS in force at date of loss; the most regulated subdomain in the company, with the risk seat in the team." },
    { id: "cc-sm-ctx-tl", type: "SimpleNode", parentId: "cc-sm-ctx-ab", submapId: "sub-cc-product", bc: "CTX-TOTAL-LOSS", kind: "context", summary: "Total loss & salvage",
      description: "Supporting — the write-off path: ACV determination, owner settlement, title branding, salvage disposal. One vehicle, one disposition." },

    // ── the world around the product (children hang off the submap's endNodeId member) ──
    { id: "cc-sm-uw", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "external", summary: "Underwriting & Policy",
      description: "Inbound — CoverageSnapshot v3 (evented, immutable), recorded at intake keyed to date of loss. Customer–supplier: design-time coupling only, no live calls at adjudication time." },
    { id: "cc-sm-hcai", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "external", summary: "HCAI (industry gateway)",
      description: "Bidirectional — OCF forms and invoices in, adjudication outcomes back. Conformist behind an ACL; round-trip success watched by SLO3 because drift converts to deemed-approval risk." },
    { id: "cc-sm-estimating", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "external", summary: "Estimating & repair",
      description: "Inbound — the threshold-breach event with the estimate of record hands vehicles to salvage disposition. A Claims context outside this product's walls." },
    { id: "cc-sm-siu", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "external", summary: "Fraud & SIU",
      description: "Inbound — investigation holds gate settlement on flagged files; findings return as facts. SIU never edits the claim model." },
    { id: "cc-sm-billing", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "external", summary: "Billing & Money Movement", isEndNode: true,
      description: "Outbound — consumes PaymentInstruction v2 and publishes settlement outcomes back; the claim ledger holds instructed-not-yet-settled in between." },
    { id: "cc-sm-desk", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "actor", personaId: "P3", summary: "Desk adjuster", isEndNode: true,
      description: "Human — decides coverage against the snapshot, moves reserves with the drivers shown, instructs payments inside her band. Authority breaches are prevented in-flow." },
    { id: "cc-sm-ab", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "actor", personaId: "P4", summary: "AB adjuster", isEndNode: true,
      description: "Human — decides treatment plans inside every statutory clock. SABS adjudication is never delegated; the clock guard escalates at 80% and cannot be muted." },
    { id: "cc-sm-tl", type: "SimpleNode", parentId: "cc-sm-ctx-tl", kind: "actor", personaId: "P5", summary: "Total-loss specialist", isEndNode: true,
      description: "Human — settles on a defensible ACV with comparables attached and recovers from the asset on the same file. Offers are prepared for him; the settlement is his call." },
  ],
};

export const ccSystemSubmaps = [
  { id: "sub-cc-product", name: "ClaimsCore · the product", startNodeId: "cc-sm-ctx-fnol", endNodeId: "cc-sm-ctx-tl", colorIndex: 0, mapIds: ["cc-systemmap"] },
];
