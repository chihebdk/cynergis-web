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
    { id: "di-reported", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true, grounds: ["UC1", "FR1"],
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

    { id: "di-merged", type: "SimpleNode", parentId: "di-reported", kind: "event", branch: "another channel, same loss", grounds: ["FR1"],
      summary: "Report merged", aggregate: "AGG-LOSSREPORT",
      description: "A second channel touches the same loss; the report absorbs it.",
      commands: [{ label: "Match & merge the submissions", on: "AGG-LOSSREPORT", desc: "Match on parties, vehicle, date and place of loss." }],
      businessRules: [{ label: "Merge, never duplicate", desc: "Nothing reported is lost in the merge; provenance per field survives." }] },

    { id: "di-triaged", type: "SimpleNode", parentId: "di-reported", kind: "event", grounds: ["UC2", "FR2"],
      summary: "Severity triaged", aggregate: "AGG-LOSSREPORT",
      description: "The report gets a severity, a lane suggestion and a first reserve estimate.",
      triggers: [
        { kind: "internal module call", type: "Sequential",
          sources: ["Severity model (assists) — reacts as the report completes"],
          impl: {} },
      ],
      commands: [{ label: "Score severity & suggest the lane", on: "AGG-LOSSREPORT", desc: "Model-assisted; the number is a suggestion, not a decision." }],
      businessRules: [{ label: "The model assists, a licensed person decides", desc: "Intake judgment is never delegated to the score." }] },

    { id: "di-completed", type: "SimpleNode", parentId: "di-triaged", kind: "event", isPivotal: true, grounds: ["UC2", "FR1"],
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
    { id: "adj-opened", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true, grounds: ["UC3", "FR3"],
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

    { id: "adj-coverage", type: "SimpleNode", parentId: "adj-policy", kind: "event", isPivotal: true, grounds: ["UC4", "FR4"],
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

    { id: "adj-reserve", type: "SimpleNode", parentId: "adj-coverage", kind: "event", grounds: ["FR5"],
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

    { id: "adj-calculated", type: "SimpleNode", parentId: "adj-fault", kind: "event", isPivotal: true, grounds: ["UC6", "FR6"],
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

    { id: "adj-payauth", type: "SimpleNode", parentId: "adj-calculated", kind: "event", isPivotal: true, grounds: ["UC6", "FR6"],
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

/* ── Context 3: Repair & estimate coordination · SUPPORTING ──
   The claims-side authority over an externally executed repair.
   ONE aggregate: the REPAIR CASE. */
export const dsRepair = {
  id: "ds-repair",
  name: "Repair & estimate coordination — design-level storm",
  contextId: "CTX-REPAIR",
  summary: "From the appraisal request to a verified repair: assignment, pricing, approval, supplements — the shops execute, coordination approves.",
  nodes: [
    { id: "dr-requested", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true,
      summary: "Appraisal requested", aggregate: "AGG-REPAIRCASE",
      description: "Adjudication asks for the damage to be priced.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim adjudication — the appraisal-request seam"],
          impl: { topic: "claims.appraisal-requested.v1", schema: "AppraisalRequest v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-repair", delivery: "at-least-once · partition key: claim #",
            spec: "AsyncAPI · claims-appraisal-requested v1 (consumer)" } },
      ],
      commands: [
        { label: "Open the repair case", on: "AGG-REPAIRCASE" },
        { label: "Select the appraisal channel", on: "AGG-REPAIRCASE", desc: "Network shop, staff appraiser, or photo-based." },
      ],
      businessRules: [{ label: "Shop choice vs steering — provincially regulated" }] },

    { id: "dr-accepted", type: "SimpleNode", parentId: "dr-requested", kind: "event",
      summary: "Assignment accepted", aggregate: "AGG-REPAIRCASE",
      description: "A shop takes the job.",
      triggers: [
        { kind: "external system call", type: "API",
          sources: ["Repair shop — via the Repair Network Portal"],
          callers: [{ component: "C1", prod: "PROD-REPAIR-PORTAL" }],
          impl: { endpoint: "POST /repair-cases/{id}/accept", spec: "OpenAPI · repair-partner-api v1", schema: "AssignmentAccept v1", authn: "Partner account · shop credentials" } },
      ],
      commands: [{ label: "Record the acceptance & schedule", on: "AGG-REPAIRCASE" }],
      businessRules: [{ label: "Network SLAs start at acceptance" }] },

    { id: "dr-estimate", type: "SimpleNode", parentId: "dr-accepted", kind: "event",
      summary: "Estimate received", aggregate: "AGG-REPAIRCASE",
      description: "The shop prices the repair.",
      triggers: [
        { kind: "external system call", type: "API",
          sources: ["Repair shop — estimate upload via the portal"],
          callers: [{ component: "C1", prod: "PROD-REPAIR-PORTAL" }],
          impl: { endpoint: "POST /repair-cases/{id}/estimates", spec: "OpenAPI · repair-partner-api v1", schema: "RepairEstimate v1", authn: "Partner account · shop credentials" } },
      ],
      commands: [{ label: "Validate the estimate", on: "AGG-REPAIRCASE", desc: "Lines, hours, parts against the agreements." }],
      businessRules: [{ label: "Rate agreements; OEM vs aftermarket parts" }] },

    { id: "dr-breach", type: "SimpleNode", parentId: "dr-estimate", kind: "event", branch: "over the threshold", isEndNode: true,
      summary: "Threshold breach declared", aggregate: "AGG-REPAIRCASE",
      description: "The car is not worth fixing — the write-off path takes it.",
      businessRules: [{ label: "Threshold: estimate vs actual cash value" }],
      policies: [{ label: "When breached → hand over with the estimate of record", desc: "Customer–supplier seam to Total loss & salvage.", crosses: "Total loss & salvage" }] },

    { id: "dr-approved", type: "SimpleNode", parentId: "dr-estimate", kind: "event", isPivotal: true,
      summary: "Estimate approved", aggregate: "AGG-REPAIRCASE",
      description: "The price holds up.",
      commands: [{ label: "Audit & approve the estimate", on: "AGG-REPAIRCASE" }],
      businessRules: [{ label: "Approval authority bands" }] },

    { id: "dr-supplement", type: "SimpleNode", parentId: "dr-approved", kind: "event", branch: "hidden damage found",
      summary: "Supplement approved", aggregate: "AGG-REPAIRCASE",
      description: "The car is open, more damage shows; the extra work is priced and approved.",
      businessRules: [{ label: "Supplement authority — the straight-through boundary" }] },

    { id: "dr-completed", type: "SimpleNode", parentId: "dr-approved", kind: "event",
      summary: "Repair completed", aggregate: "AGG-REPAIRCASE",
      description: "The car is fixed and goes back to the claimant.",
      triggers: [
        { kind: "external system call", type: "API",
          sources: ["Repair shop — completion via the portal"],
          callers: [{ component: "C1", prod: "PROD-REPAIR-PORTAL" }],
          impl: { endpoint: "POST /repair-cases/{id}/complete", spec: "OpenAPI · repair-partner-api v1", schema: "RepairComplete v1", authn: "Partner account · shop credentials" } },
      ],
      commands: [{ label: "Record completion", on: "AGG-REPAIRCASE" }] },

    { id: "dr-verified", type: "SimpleNode", parentId: "dr-completed", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Repair verified", aggregate: "AGG-REPAIRCASE",
      description: "The work checks out — and adjudication can settle.",
      commands: [{ label: "Verify the work", on: "AGG-REPAIRCASE", desc: "Photos, QA sample, claimant sign-off." }],
      businessRules: [{ label: "QA sampling rules" }],
      policies: [{ label: "When verified → publish repair verified", desc: "The seam back to Claim adjudication, with the estimate of record and approved supplements.", crosses: "Claim adjudication" }] },
  ],
};

/* ── Context 4: Claim payments · SUPPORTING (the extracted context) ──
   The owed/settled ledger. ONE aggregate: the PAYMENT LEDGER. */
export const dsPayments = {
  id: "ds-payments",
  name: "Claim payments — design-level storm",
  contextId: "CTX-PAYMENTS",
  summary: "Instructed, dispatched, settled — and the money that comes back in. Adjudication decides; this ledger keeps the truth about the money.",
  nodes: [
    { id: "dp-received", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true, grounds: ["FR6"],
      summary: "Payment instruction received", aggregate: "AGG-PAYLEDGER",
      description: "Adjudication says pay; the ledger records it as owed.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim adjudication — the payment-instruction seam"],
          impl: { topic: "claims.payment-instruction.v1", schema: "PaymentInstruction v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-payments", delivery: "at-least-once · partition key: claim #",
            idempotency: "One instruction, one ledger entry — replays are no-ops", dlq: "claims.payment-instruction.dlq",
            spec: "AsyncAPI · claims-payment-instruction v1 (consumer)" } },
      ],
      params: { schema: "PaymentInstruction v1", registry: "schema registry · claims/payment-instruction",
        note: "THE new seam (D-152): the contract adjudication and payments agreed across two storms." },
      commands: [{ label: "Record instructed-not-yet-settled", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "Claims instructs; it never moves money" }] },

    { id: "dp-dispatched", type: "SimpleNode", parentId: "dp-received", kind: "event",
      summary: "Instruction dispatched", aggregate: "AGG-PAYLEDGER",
      description: "The instruction goes to the engine that moves money.",
      commands: [{ label: "Dispatch over the execution contract", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "Conformist behind the contract", desc: "Legacy execution today, modernized later — this ledger never notices." }] },

    { id: "dp-failed", type: "SimpleNode", parentId: "dp-dispatched", kind: "event", branch: "the payment bounces",
      summary: "Payment failed", aggregate: "AGG-PAYLEDGER",
      description: "The money did not land; the ledger says so, loudly.",
      commands: [{ label: "Void & reissue", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "A failed payment is never silent", desc: "Owed stays owed until settled — no orphaned instructions." }] },

    { id: "dp-settled", type: "SimpleNode", parentId: "dp-dispatched", kind: "event", isPivotal: true, isEndNode: true, grounds: ["FR6"],
      summary: "Settlement confirmed", aggregate: "AGG-PAYLEDGER",
      description: "Confirmation comes back; owed becomes settled.",
      triggers: [
        { kind: "external system call", type: "Message",
          sources: ["Legacy payment execution — settlement confirmations"],
          impl: { topic: "payments.settlement-confirmed.v1", schema: "SettlementConfirmation v1", broker: "Kafka · payments cluster",
            consumerGroup: "claims-payments", delivery: "at-least-once",
            spec: "AsyncAPI · payments-settlement v1 (consumer)" } },
      ],
      commands: [{ label: "Flip owed → settled", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "Reconciliation has one owner: this ledger" }],
      policies: [{ label: "When settled → publish payment settled", desc: "Adjudication closes on it; the portals report it.", crosses: "Claim adjudication" }] },

    { id: "dp-credit", type: "SimpleNode", parentId: "dp-received", kind: "event", branch: "money comes back in", isEndNode: true,
      summary: "Credit received", aggregate: "AGG-PAYLEDGER",
      description: "Salvage or recovery money arrives and is booked against the claim.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Total loss & salvage — proceeds", "Recovery & subrogation — recovered amounts"],
          impl: { topic: "claims.credits-in.v1", schema: "ClaimCreditIn v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-payments", delivery: "at-least-once",
            spec: "AsyncAPI · claims-credits-in v1 (consumer)" } },
      ],
      commands: [{ label: "Book the credit", on: "AGG-PAYLEDGER" }],
      policies: [{ label: "When booked → publish the credit", desc: "Adjudication applies it to the file — even after close.", crosses: "Claim adjudication" }] },
  ],
};

/* ── Context 5: Total loss & salvage · SUPPORTING ── ONE aggregate: the SALVAGE CASE. */
export const dsTotalLoss = {
  id: "ds-totalloss",
  name: "Total loss & salvage — design-level storm",
  contextId: "CTX-TOTALLOSS",
  summary: "One vehicle, one disposition: valuation, settlement, title, disposal — and the proceeds back to the ledger.",
  nodes: [
    { id: "dt-received", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true, grounds: ["UC7"],
      summary: "Threshold breach received", aggregate: "AGG-SALVAGECASE",
      description: "The car arrives with the estimate of record: not worth fixing.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Repair & estimate coordination — the threshold-breach seam"],
          impl: { topic: "claims.threshold-breach.v1", schema: "ThresholdBreach v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-totalloss", delivery: "at-least-once",
            spec: "AsyncAPI · claims-threshold-breach v1 (consumer)" } },
      ],
      commands: [{ label: "Open the salvage case", on: "AGG-SALVAGECASE" }] },

    { id: "dt-valued", type: "SimpleNode", parentId: "dt-received", kind: "event", grounds: ["FR9"],
      summary: "Vehicle valued", aggregate: "AGG-SALVAGECASE",
      description: "The market says what the car was worth the day of the loss.",
      triggers: [
        { kind: "external system call", type: "Message",
          sources: ["Valuation data vendors — behind the ACL"],
          impl: { topic: "vendors.valuations.v1", schema: "MarketValuation v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-totalloss", delivery: "at-least-once",
            spec: "AsyncAPI · vendor-valuations v1 (consumer)" } },
      ],
      commands: [{ label: "Determine the actual cash value", on: "AGG-SALVAGECASE" }],
      businessRules: [{ label: "Valuation as at date of loss", desc: "Vendor-conformist behind an ACL — vendors change, the model survives." }] },

    { id: "dt-settled", type: "SimpleNode", parentId: "dt-valued", kind: "event", isPivotal: true, grounds: ["UC7", "FR9"],
      summary: "Settlement offered & accepted", aggregate: "AGG-SALVAGECASE",
      description: "The owner takes the number; the car becomes ours.",
      commands: [{ label: "Offer ACV less deductible", on: "AGG-SALVAGECASE" }],
      businessRules: [{ label: "ACV doctrine — taxes, fees, comparable sales" }],
      policies: [{ label: "When accepted → hand the settlement to adjudication", desc: "The indemnity travels the normal settlement path.", crosses: "Claim adjudication" }] },

    { id: "dt-branded", type: "SimpleNode", parentId: "dt-settled", kind: "event",
      summary: "Title branded & transferred", aggregate: "AGG-SALVAGECASE",
      description: "The paperwork says what the car now is.",
      businessRules: [{ label: "Branding is regulation — salvage, rebuilt, irreparable" }] },

    { id: "dt-disposed", type: "SimpleNode", parentId: "dt-branded", kind: "event", isPivotal: true, isEndNode: true, grounds: ["FR9"],
      summary: "Salvage disposed", aggregate: "AGG-SALVAGECASE",
      description: "The auction sells the wreck; the money heads back to the ledger.",
      triggers: [
        { kind: "external system call", type: "Message",
          sources: ["Salvage auction network — disposal results"],
          impl: { topic: "vendors.salvage-disposals.v1", schema: "SalvageDisposal v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-totalloss", delivery: "at-least-once",
            spec: "AsyncAPI · vendor-salvage v1 (consumer)" } },
      ],
      commands: [{ label: "Record proceeds & close the case", on: "AGG-SALVAGECASE" }],
      policies: [{ label: "When disposed → publish the proceeds", desc: "A credit into Claim payments.", crosses: "Claim payments" }] },
  ],
};

/* ── Context 6: Recovery & subrogation · SUPPORTING ── ONE aggregate: the RECOVERY CASE. */
export const dsRecovery = {
  id: "ds-recovery",
  name: "Recovery & subrogation — design-level storm",
  contextId: "CTX-RECOVERY",
  summary: "Recovers what others owe, against a closed claim, on its own clock.",
  nodes: [
    { id: "dv-referred", type: "SimpleNode", parentId: "start", kind: "event", isPivotal: true,
      summary: "Recovery referred", aggregate: "AGG-RECOVERYCASE",
      description: "A closed file's facts say someone else should pay.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim adjudication — the recovery-referred seam (post-close)"],
          impl: { topic: "claims.recovery-referred.v1", schema: "RecoveryReferral v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-recovery", delivery: "at-least-once",
            spec: "AsyncAPI · claims-recovery-referred v1 (consumer)" } },
      ],
      commands: [{ label: "Open the recovery case from the closed-file facts", on: "AGG-RECOVERYCASE" }],
      businessRules: [{ label: "Operates on closed claims — it reads, it never reopens" }] },

    { id: "dv-demand", type: "SimpleNode", parentId: "dv-referred", kind: "event",
      summary: "Demand issued", aggregate: "AGG-RECOVERYCASE",
      description: "The other carrier is asked to pay their share.",
      commands: [{ label: "Issue the inter-company demand", on: "AGG-RECOVERYCASE" }],
      businessRules: [{ label: "Fault-split recoverability; inter-company arbitration process" }] },

    { id: "dv-received", type: "SimpleNode", parentId: "dv-demand", kind: "event", isPivotal: true,
      summary: "Recovery received", aggregate: "AGG-RECOVERYCASE",
      description: "Months later, the money arrives.",
      triggers: [
        { kind: "external system call", type: "Message",
          sources: ["Other carriers — inter-company settlements"],
          impl: { topic: "intercompany.settlements.v1", schema: "IntercompanySettlement v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-recovery", delivery: "at-least-once",
            spec: "AsyncAPI · intercompany-settlements v1 (consumer)" } },
      ],
      commands: [{ label: "Record the recovery", on: "AGG-RECOVERYCASE" }],
      policies: [{ label: "When received → publish the credit", desc: "Into Claim payments; the claimant's deductible share returns first.", crosses: "Claim payments" }] },

    { id: "dv-closed", type: "SimpleNode", parentId: "dv-received", kind: "event", isEndNode: true,
      summary: "Recovery closed", aggregate: "AGG-RECOVERYCASE",
      description: "Nothing left to chase; the case closes.",
      commands: [{ label: "Close the recovery case", on: "AGG-RECOVERYCASE" }] },
  ],
};

export const CLAIMS_DESIGN_STORMS = [dsIntake, dsAdjud, dsRepair, dsPayments, dsTotalLoss, dsRecovery];

/* ── D-163: PIVOTAL derived, never authored — inside a design storm every
   card shares one home, so the crossing definition reads: pivotal iff the
   card consumes a seam (a domain-call or external trigger) or publishes
   one (a policy that crosses). Hand flags stripped first. */
for (const m of CLAIMS_DESIGN_STORMS) for (const n of m.nodes) {
  if (n.kind !== "event") continue;
  delete n.isPivotal;
  const consumes = (n.triggers || []).some((t) => t.kind === "domain call" || t.kind === "external system call");
  const publishes = (n.policies || []).some((pp) => pp.crosses);
  if (consumes || publishes) n.isPivotal = true;
}
