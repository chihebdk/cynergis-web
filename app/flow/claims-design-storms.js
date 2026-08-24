"use client";

/* ============================================================
   D-154 — DESIGN-LEVEL STORMS for the accepted cut (step 4 of
   the arc), one context at a time. Events are authored HERE,
   once, at full property depth — D-147 trigger records, commands,
   business rules, reactions, the aggregate — and every other view
   projects from these cards. Descriptions follow the story rule.
   Clusters carry no grounds yet: every ⚠ is an unmined industry
   assertion — the legacy-mining backlog, on purpose.
   ============================================================ */

/* ── Context 1: Intake & registration · CORE ──
   The doors, and the moment a request becomes a numbered claim.
   One aggregate: the LOSS REPORT (registration facts included). */
export const dsIntake = {
  id: "ds-intake",
  name: "Intake & registration — design-level storm",
  contextId: "CTX-INTAKE",
  summary: "From the first word of a loss to a numbered claim, on one aggregate. Every door triggers the same action; the exit event is the seam to adjudication.",
  nodes: [
    { id: "di-reported", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true,
      summary: "Loss reported", aggregate: "AGG-LOSSREPORT",
      description: "Someone tells us about a loss for the first time.",
      triggers: [
        { kind: "internal module call", type: "API",
          sources: ["Claimant (policyholder) — via Customer Portal · digital FNOL pane"],
          callers: [{ component: "C5", prod: "PROD-CUSTOMER-PORTAL" }],
          impl: { endpoint: "POST /claims/loss-reports", spec: "OpenAPI · claims-intake-api v1", schema: "LossReportIntake v1", gateway: "Public API gateway", authn: "Customer session (OIDC)" } },
        { kind: "internal module call", type: "API",
          sources: ["Intake agent — claimant or third party by phone", "Broker, on behalf of the insured — via the desk"],
          impl: { endpoint: "POST /intake/loss-reports (internal)", spec: "OpenAPI · claims-intake-internal v1", schema: "LossReportIntake v1", authn: "Staff SSO · licensed intake role — the Claims Workbench surface (product not yet recorded)" } },
        { kind: "external system call", type: "Message",
          sources: ["Provincial police-report feed"],
          impl: { topic: "claims.loss-reports.police.v1", schema: "PoliceReportNotice v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-intake", delivery: "at-least-once · partition key: police report #",
            idempotency: "Merges into the existing loss report — never a duplicate", dlq: "claims.loss-reports.police.dlq",
            spec: "AsyncAPI · claims-loss-reports v1 (consumer)" } },
      ],
      params: { schema: "LossReportIntake v1", registry: "schema registry · claims/loss-report-intake",
        note: "One parameter schema for every door — same action, same payload; embedded in the OpenAPI and AsyncAPI contracts." },
      commands: [
        { label: "Open the loss report", on: "AGG-LOSSREPORT", desc: "Circumstances, parties, vehicles, damage as reported — not yet a claim." },
        { label: "Request the coverage snapshot", on: "AGG-LOSSREPORT", desc: "Keyed to date of loss, over the mainframe ACL — so adjudication never calls live systems." },
      ],
      businessRules: [
        { label: "One loss, one report", desc: "However many channels touch it." },
        { label: "Mandatory fields per channel", desc: "A police feed carries less than a guided conversation — the report knows what it still lacks." },
      ] },

    { id: "di-merged", type: "SimpleNode", parentId: "di-reported", kind: "event", branch: "another channel, same loss",
      summary: "Report merged", aggregate: "AGG-LOSSREPORT",
      description: "A second channel touches the same loss; the report absorbs it.",
      commands: [{ label: "Match & merge the submissions", on: "AGG-LOSSREPORT", desc: "Match on parties, vehicle, date and place of loss." }],
      businessRules: [{ label: "Merge, never duplicate", desc: "Nothing reported is lost in the merge; provenance per field survives." }] },

    { id: "di-triaged", type: "SimpleNode", parentId: "di-reported", kind: "event",
      summary: "Severity triaged", aggregate: "AGG-LOSSREPORT",
      description: "The report gets a severity, a lane suggestion and a first reserve estimate.",
      triggers: [
        { kind: "internal module call", type: "Sequential",
          sources: ["Severity model (assists) — reacts as the report completes"],
          impl: {} },
      ],
      commands: [{ label: "Score severity & suggest the lane", on: "AGG-LOSSREPORT", desc: "Model-assisted; the number is a suggestion, not a decision." }],
      businessRules: [{ label: "The model assists, a licensed person decides", desc: "Intake judgment is never delegated to the score." }] },

    { id: "di-completed", type: "SimpleNode", parentId: "di-triaged", kind: "event", isPivotal: true,
      summary: "Report completed", aggregate: "AGG-LOSSREPORT",
      description: "A licensed person closes the intake conversation; the report is whole.",
      commands: [{ label: "Complete the report", on: "AGG-LOSSREPORT", desc: "Completeness at handoff is the measure that matters." }],
      businessRules: [{ label: "Licensed completion", desc: "Only the licensed intake role closes a report." }] },

    { id: "di-registered", type: "SimpleNode", parentId: "di-completed", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Claim registered", aggregate: "AGG-LOSSREPORT",
      description: "The report becomes a numbered claim, and adjudication takes it from here.",
      commands: [
        { label: "Check for an existing claim on this loss", on: "AGG-LOSSREPORT", desc: "The registration-side dedup — distinct from the report merge." },
        { label: "Assign the claim number & notice date", on: "AGG-LOSSREPORT" },
      ],
      businessRules: [
        { label: "One loss, one claim" },
        { label: "Statutory notice-date rules", desc: "The official notice date has legal weight; it is recorded, not inferred." },
      ],
      policies: [
        { label: "When registered → publish claim opened", desc: "The seam to Claim adjudication: the registered claim with the triage payload. Customer–supplier — adjudication negotiates what the payload carries.", crosses: "Claim adjudication" },
      ] },
  ],
};

/* ── Context 2: Claim adjudication · CORE ──
   Does the policy respond, for how much, on whose authority. ONE aggregate:
   the CLAIM. The sketch-facts land here as first-class lifecycle events:
   holds gate authorization, reopen keeps history, closed accepts credits. */
export const dsAdjud = {
  id: "ds-adjud",
  name: "Claim adjudication — design-level storm",
  contextId: "CTX-ADJUD",
  summary: "From the claim-opened seam to a closed file that still listens: verification, reserves, fault, settlement, authorization — and the lifecycle rails the sketches forced.",
  nodes: [
    { id: "adj-opened", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true,
      summary: "Claim opened", aggregate: "AGG-CLAIM",
      description: "The registered report crosses the seam and becomes a claim file.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Intake & registration — the claim-opened seam"],
          impl: { topic: "claims.claim-opened.v1", schema: "ClaimOpen v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once · partition key: claim #",
            idempotency: "One claim file per claim # — replays are no-ops",
            spec: "AsyncAPI · claims-claim-opened v1 (consumer)" } },
      ],
      params: { schema: "ClaimOpen v1", registry: "schema registry · claims/claim-open",
        note: "The seam payload: the registered report + triage. Adjudication negotiates what it carries — customer–supplier." },
      commands: [
        { label: "Create the claim file", on: "AGG-CLAIM", desc: "From the registered report and the triage payload." },
        { label: "Attach the coverage snapshot", on: "AGG-CLAIM", desc: "As at date of loss, already requested at intake over the ACL." },
      ],
      businessRules: [
        { label: "Snapshot-only adjudication", desc: "No live policy calls, ever — later policy changes never alter an open claim." },
      ] },

    { id: "adj-hold", type: "SimpleNode", parentId: "adj-opened", kind: "event", branch: "someone says stop",
      summary: "Hold applied", aggregate: "AGG-CLAIM",
      description: "A hold lands on the file — and nothing pays while it stands.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Fraud & SIU — investigation holds", "Disputes — litigation holds"],
          impl: { topic: "claims.holds.v1", schema: "ClaimHold v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-holds v1 (consumer)" } },
      ],
      commands: [{ label: "Apply the hold to the file", on: "AGG-CLAIM", desc: "Typed by origin; released only by its owner." }],
      businessRules: [
        { label: "A standing hold gates payment authorization", desc: "The gate is checked in-flow, not audited after." },
        { label: "Findings return as facts", desc: "SIU never edits the claim model." },
      ] },

    { id: "adj-policy", type: "SimpleNode", parentId: "adj-opened", kind: "event",
      summary: "Policy verified", aggregate: "AGG-CLAIM",
      description: "The snapshot says the policy was alive, and this car and driver are on it.",
      commands: [
        { label: "Verify in-force at date of loss", on: "AGG-CLAIM" },
        { label: "Confirm vehicle & driver on the policy", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "In-force rules — cancellation and grace periods", desc: "Transcribed from the legacy rules, not reinvented." }] },

    { id: "adj-denied-force", type: "SimpleNode", parentId: "adj-policy", kind: "event", branch: "policy not in force", isEndNode: true,
      summary: "Claim denied — policy not in force", aggregate: "AGG-CLAIM",
      description: "The policy was not alive at the loss; the claimant is told why.",
      commands: [{ label: "Record the denial with reasons", on: "AGG-CLAIM" }],
      policies: [{ label: "When denied → communicate the decision", desc: "The decision-communicated event opens the dispute door (BJ-5).", crosses: "Portals / disputes" }] },

    { id: "adj-coverage", type: "SimpleNode", parentId: "adj-policy", kind: "event", isPivotal: true,
      summary: "Coverage confirmed", aggregate: "AGG-CLAIM",
      description: "The loss matches a coverage; the deductible is known.",
      commands: [
        { label: "Map loss cause to coverages & endorsements", on: "AGG-CLAIM" },
        { label: "Identify the deductible", on: "AGG-CLAIM" },
      ],
      businessRules: [
        { label: "Coverage matching per the policy wording" },
        { label: "Exclusion doctrine", desc: "Commercial use, impairment, racing — the reasons a matching coverage still says no." },
      ] },

    { id: "adj-denied-cover", type: "SimpleNode", parentId: "adj-coverage", kind: "event", branch: "coverage declined",
      summary: "Claim denied — no coverage", aggregate: "AGG-CLAIM",
      description: "The loss is not covered; the file closes with the reasons on record.",
      commands: [{ label: "Record the denial with reasons", on: "AGG-CLAIM" }],
      policies: [{ label: "When denied → communicate the decision", crosses: "Portals / disputes" }] },

    { id: "adj-reopened", type: "SimpleNode", parentId: "adj-denied-cover", kind: "event", branch: "the decision is challenged", isEndNode: true,
      summary: "Claim reopened", aggregate: "AGG-CLAIM",
      description: "The file opens again — with every prior decision intact.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Disputes & appeals — review, appraisal process, ombudsman"],
          impl: { topic: "claims.disputes.v1", schema: "DisputeRaised v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-disputes v1 (consumer)" } },
      ],
      commands: [{ label: "Reopen with a new decision version", on: "AGG-CLAIM", desc: "The old decision is never edited — a new version supersedes it." }],
      businessRules: [{ label: "Decision history is immutable", desc: "Reopen means append, never rewrite — the audit trail is the point." }] },

    { id: "adj-reserve", type: "SimpleNode", parentId: "adj-coverage", kind: "event",
      summary: "Reserve established", aggregate: "AGG-CLAIM",
      description: "Money is set aside for what this will likely cost.",
      commands: [{ label: "Set the initial reserve per coverage line", on: "AGG-CLAIM" }],
      businessRules: [
        { label: "Reserving guidelines & authority limits" },
        { label: "Every reserve move is evented", desc: "Actuarial consumes the stream; silence is not an option." },
      ] },

    { id: "adj-fault", type: "SimpleNode", parentId: "adj-reserve", kind: "event",
      summary: "Fault determined", aggregate: "AGG-CLAIM",
      description: "Who caused it is decided — or noted as not applicable.",
      commands: [
        { label: "Apply the fault determination rules", on: "AGG-CLAIM" },
        { label: "Record the fault split", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "The fault chart is regulation, not judgment" }],
      policies: [{ label: "When repairable → request the appraisal", desc: "The customer–supplier seam to Repair & estimate coordination; the estimate of record returns.", crosses: "Repair & estimate coordination" }] },

    { id: "adj-calculated", type: "SimpleNode", parentId: "adj-fault", kind: "event", isPivotal: true,
      summary: "Settlement calculated", aggregate: "AGG-CLAIM",
      description: "The repair is verified elsewhere; now what we owe, and to whom, is computed.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Repair & estimate coordination — the repair-verified seam"],
          impl: { topic: "claims.repair-verified.v1", schema: "RepairVerified v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-repair-verified v1 (consumer)" } },
      ],
      commands: [
        { label: "Compute the payable", on: "AGG-CLAIM", desc: "Approved + supplements − deductible − betterment, plus taxes." },
        { label: "Determine the payees", on: "AGG-CLAIM", desc: "Direct-pay to the shop vs reimburse the claimant." },
      ],
      businessRules: [
        { label: "Deductible application & waivers" },
        { label: "Betterment schedule; direct-pay agreements" },
      ] },

    { id: "adj-payauth", type: "SimpleNode", parentId: "adj-calculated", kind: "event", isPivotal: true,
      summary: "Payment authorized", aggregate: "AGG-CLAIM",
      description: "The payment clears its checks — authority, holds, the payee.",
      commands: [
        { label: "Check the authority band", on: "AGG-CLAIM" },
        { label: "Check standing holds", on: "AGG-CLAIM" },
        { label: "Screen the payee", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "A standing hold stops everything here", desc: "The BJ-6 gate, enforced in-flow." }],
      policies: [{ label: "When authorized → publish the payment instruction", desc: "THE new seam (D-152): adjudication instructs, Claim payments executes the ledger. Customer–supplier.", crosses: "Claim payments" }] },

    { id: "adj-closed", type: "SimpleNode", parentId: "adj-payauth", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Claim closed", aggregate: "AGG-CLAIM",
      description: "Everything settled, nothing standing — the file closes, but it still listens.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim payments — the payment-settled confirmation"],
          impl: { topic: "claims.payment-settled.v1", schema: "PaymentSettled v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-payment-settled v1 (consumer)" } },
      ],
      commands: [{ label: "Run the closure checklist", on: "AGG-CLAIM", desc: "All settled, no holds, no open tasks, documents complete." }],
      businessRules: [
        { label: "Closed still accepts post-close credits and reopening", desc: "Closed is a lifecycle state, not a tombstone (BJ-4 · BJ-5)." },
      ],
      policies: [{ label: "When something is recoverable → refer the recovery", desc: "Customer–supplier, post-close: the closed file's facts open the recovery case.", crosses: "Recovery & subrogation" }] },

    { id: "adj-credit", type: "SimpleNode", parentId: "adj-closed", kind: "event", branch: "money comes back", isEndNode: true,
      summary: "Credit accepted after close", aggregate: "AGG-CLAIM",
      description: "Salvage or recovery money lands on the closed file — without reopening the decisions.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim payments — salvage & recovery credits"],
          impl: { topic: "claims.credits.v1", schema: "ClaimCredit v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-credits v1 (consumer)" } },
      ],
      commands: [{ label: "Apply the credit to the closed file", on: "AGG-CLAIM" }],
      businessRules: [{ label: "Credits never re-adjudicate", desc: "The BJ-4 fact: money in changes the ledger, not the decisions." }] },
  ],
};

export const CLAIMS_DESIGN_STORMS = [dsIntake, dsAdjud];
