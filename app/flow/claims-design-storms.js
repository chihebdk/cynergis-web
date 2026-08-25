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
      readModels: [{ label: "Open loss reports — match view", desc: "Existing reports on matching parties, vehicle, and date and place of loss; the merge decision reads it." },],
      description: "The first notice of loss is received — the incident's earliest record, whatever the channel.",
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
      description: "A subsequent submission is matched to an existing loss and consolidated into its report.",
      commands: [{ label: "Match & merge the submissions", on: "AGG-LOSSREPORT", desc: "Match on parties, vehicle, date and place of loss." }],
      businessRules: [{ label: "Merge, never duplicate", desc: "Nothing reported is lost in the merge; provenance per field survives." }] },

    { id: "di-triaged", type: "SimpleNode", parentId: "di-reported", kind: "event", grounds: ["UC2", "FR2"],
      summary: "Severity triaged", aggregate: "AGG-LOSSREPORT",
      readModels: [{ label: "Severity factors view", desc: "Damage, injury indicators and vehicle data as the model scores them — the suggested lane stays explainable against it." },],
      description: "The report is assessed for severity, yielding a recommended handling lane and an initial reserve estimate.",
      triggers: [
        { kind: "internal module call", type: "Sequential",
          sources: ["Severity model (assists) — reacts as the report completes"],
          impl: {} },
      ],
      commands: [{ label: "Score severity & suggest the lane", on: "AGG-LOSSREPORT", desc: "Model-assisted; the number is a suggestion, not a decision." }],
      businessRules: [{ label: "The model assists, a licensed person decides", desc: "Intake judgment is never delegated to the score." }] },

    { id: "di-completed", type: "SimpleNode", parentId: "di-triaged", kind: "event", isPivotal: true, grounds: ["UC2", "FR1"],
      summary: "Report completed", aggregate: "AGG-LOSSREPORT",
      description: "Intake concludes under licensed review; the report is confirmed complete for handoff.",
      commands: [{ label: "Complete the report", on: "AGG-LOSSREPORT", desc: "Completeness at handoff is the measure that matters." }],
      businessRules: [{ label: "Licensed completion", desc: "Only the licensed intake role closes a report." }] },

    { id: "di-registered", type: "SimpleNode", parentId: "di-completed", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Claim registered", aggregate: "AGG-LOSSREPORT",
      readModels: [{ label: "Registered claims index", desc: "Claims by loss and policy — the registration-side dedup reads it before a number is assigned." },],
      description: "The completed report is registered as a claim — numbered, dated, and passed to adjudication.",
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
      readModels: [{ label: "Coverage snapshot as at date of loss", desc: "The stored mainframe extract — adjudication reads the snapshot, never the live policy system." },],
      description: "A claim file is opened from the registered report and its triage payload.",
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
      description: "A hold is applied to the file; settlement cannot proceed while it stands.",
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
      description: "The policy is verified in force at the date of loss, with the vehicle and driver confirmed on it.",
      commands: [
        { label: "Verify in-force at date of loss", on: "AGG-CLAIM" },
        { label: "Confirm vehicle & driver on the policy", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "In-force rules — cancellation and grace periods", desc: "Transcribed from the legacy rules, not reinvented." }] },

    { id: "adj-denied-force", type: "SimpleNode", parentId: "adj-policy", kind: "event", branch: "policy not in force", isEndNode: true,
      summary: "Claim denied — policy not in force", aggregate: "AGG-CLAIM",
      description: "The claim is denied — the policy was not in force at the date of loss — and the decision is communicated with reasons.",
      commands: [{ label: "Record the denial with reasons", on: "AGG-CLAIM" }],
      policies: [{ label: "When denied → communicate the decision", desc: "The decision-communicated event opens the dispute door (BP-5).", crosses: "Portals / disputes" }] },

    { id: "adj-coverage", type: "SimpleNode", parentId: "adj-policy", kind: "event", isPivotal: true, grounds: ["UC4", "FR4"],
      summary: "Coverage confirmed", aggregate: "AGG-CLAIM",
      readModels: [{ label: "Coverage lines & limits view", desc: "What the policy responds to for this loss, line by line — the confirmation decision reads it." },],
      description: "Coverage is confirmed for the loss, with the applicable deductible identified.",
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
      description: "The claim is denied — no coverage responds to the loss — with the reasons on record.",
      commands: [{ label: "Record the denial with reasons", on: "AGG-CLAIM" }],
      policies: [{ label: "When denied → communicate the decision", crosses: "Portals / disputes" }] },

    { id: "adj-reopened", type: "SimpleNode", parentId: "adj-denied-cover", kind: "event", branch: "the decision is challenged", isEndNode: true,
      summary: "Claim reopened", aggregate: "AGG-CLAIM",
      description: "The claim is reopened under dispute; every prior decision remains on record.",
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
      readModels: [{ label: "Reserve adequacy view", desc: "Current reserves against estimates and payments to date, per coverage line." },],
      description: "An initial reserve is established for the claim's expected ultimate cost.",
      commands: [{ label: "Set the initial reserve per coverage line", on: "AGG-CLAIM" }],
      businessRules: [
        { label: "Reserving guidelines & authority limits" },
        { label: "Every reserve move is evented", desc: "Actuarial consumes the stream; silence is not an option." },
      ] },

    { id: "adj-fault", type: "SimpleNode", parentId: "adj-reserve", kind: "event",
      summary: "Fault determined", aggregate: "AGG-CLAIM",
      readModels: [{ label: "Fault determination rules", desc: "The applicable fault table for the jurisdiction and the reported circumstances." },],
      description: "Fault is determined under the applicable rules — or recorded as not applicable to the cause of loss.",
      commands: [
        { label: "Apply the fault determination rules", on: "AGG-CLAIM" },
        { label: "Record the fault split", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "The fault chart is regulation, not judgment" }],
      policies: [{ label: "When repairable → request the appraisal", desc: "The customer–supplier seam to Repair & estimate coordination; the estimate of record returns.", crosses: "Repair & estimate coordination" }] },

    { id: "adj-calculated", type: "SimpleNode", parentId: "adj-fault", kind: "event", isPivotal: true, grounds: ["UC6", "FR6"],
      summary: "Settlement calculated", aggregate: "AGG-CLAIM",
      readModels: [{ label: "Estimate of record & payables", desc: "The verified repair figures, deductible and limits — the settlement is calculated from this view." },],
      description: "The settlement is calculated from the verified repair — the payable amount and its payees.",
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
      readModels: [{ label: "Holds & authority view", desc: "Open holds and the handler\u2019s authority limit — authorization reads both before it signs." },],
      description: "The payment is authorized after authority, hold, and payee checks clear.",
      commands: [
        { label: "Check the authority band", on: "AGG-CLAIM" },
        { label: "Check standing holds", on: "AGG-CLAIM" },
        { label: "Screen the payee", on: "AGG-CLAIM" },
      ],
      businessRules: [{ label: "A standing hold stops everything here", desc: "The BP-6 gate, enforced in-flow." }],
      policies: [{ label: "When authorized → publish the payment instruction", desc: "THE new seam (D-152): adjudication instructs, Claim payments executes the ledger. Customer–supplier.", crosses: "Claim payments" }] },

    { id: "adj-closed", type: "SimpleNode", parentId: "adj-payauth", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Claim closed", aggregate: "AGG-CLAIM",
      readModels: [{ label: "Closure checklist view", desc: "Settlements, holds, tasks and documents in one status view — every line green before the file closes." },],
      description: "The claim is closed with all obligations settled — remaining open to post-close credits and reopening.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim payments — the payment-settled confirmation"],
          impl: { topic: "claims.payment-settled.v1", schema: "PaymentSettled v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-payment-settled v1 (consumer)" } },
      ],
      commands: [{ label: "Run the closure checklist", on: "AGG-CLAIM", desc: "All settled, no holds, no open tasks, documents complete." }],
      businessRules: [
        { label: "Closed still accepts post-close credits and reopening", desc: "Closed is a lifecycle state, not a tombstone (BP-4 · BP-5)." },
      ],
      policies: [{ label: "When something is recoverable → refer the recovery", desc: "Customer–supplier, post-close: the closed file's facts open the recovery case.", crosses: "Recovery & subrogation" }] },

    { id: "adj-credit", type: "SimpleNode", parentId: "adj-closed", kind: "event", branch: "money comes back", isEndNode: true,
      summary: "Credit accepted after close", aggregate: "AGG-CLAIM",
      description: "A recovery or salvage credit is applied to the closed claim without re-adjudication.",
      triggers: [
        { kind: "domain call", type: "Message",
          sources: ["Claim payments — salvage & recovery credits"],
          impl: { topic: "claims.credits.v1", schema: "ClaimCredit v1", broker: "Kafka · claims cluster",
            consumerGroup: "claims-adjudication", delivery: "at-least-once",
            spec: "AsyncAPI · claims-credits v1 (consumer)" } },
      ],
      commands: [{ label: "Apply the credit to the closed file", on: "AGG-CLAIM" }],
      businessRules: [{ label: "Credits never re-adjudicate", desc: "The BP-4 fact: money in changes the ledger, not the decisions." }] },
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
      readModels: [{ label: "Network shop capacity & programme terms", desc: "Who can take the vehicle, at what agreed rates — the assignment decision reads it." },],
      description: "An appraisal is requested; pricing of the damage begins.",
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
      description: "A network shop accepts the assignment.",
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
      readModels: [{ label: "Estimate of record", desc: "The priced damage lines against guide times and rates; review works this view." },],
      description: "The repair estimate is submitted for review.",
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
      description: "The estimate breaches the total-loss threshold; the vehicle exits to the write-off path.",
      businessRules: [{ label: "Threshold: estimate vs actual cash value" }],
      policies: [{ label: "When breached → hand over with the estimate of record", desc: "Customer–supplier seam to Total loss & salvage.", crosses: "Total loss & salvage" }] },

    { id: "dr-approved", type: "SimpleNode", parentId: "dr-estimate", kind: "event", isPivotal: true,
      summary: "Estimate approved", aggregate: "AGG-REPAIRCASE",
      description: "The estimate is approved as the estimate of record.",
      commands: [{ label: "Audit & approve the estimate", on: "AGG-REPAIRCASE" }],
      businessRules: [{ label: "Approval authority bands" }] },

    { id: "dr-supplement", type: "SimpleNode", parentId: "dr-approved", kind: "event", branch: "hidden damage found",
      summary: "Supplement approved", aggregate: "AGG-REPAIRCASE",
      description: "A supplement is approved for damage found in repair, extending the estimate of record.",
      businessRules: [{ label: "Supplement authority — the straight-through boundary" }] },

    { id: "dr-completed", type: "SimpleNode", parentId: "dr-approved", kind: "event",
      summary: "Repair completed", aggregate: "AGG-REPAIRCASE",
      description: "The repair is completed and the vehicle returned to the claimant.",
      triggers: [
        { kind: "external system call", type: "API",
          sources: ["Repair shop — completion via the portal"],
          callers: [{ component: "C1", prod: "PROD-REPAIR-PORTAL" }],
          impl: { endpoint: "POST /repair-cases/{id}/complete", spec: "OpenAPI · repair-partner-api v1", schema: "RepairComplete v1", authn: "Partner account · shop credentials" } },
      ],
      commands: [{ label: "Record completion", on: "AGG-REPAIRCASE" }] },

    { id: "dr-verified", type: "SimpleNode", parentId: "dr-completed", kind: "event", isPivotal: true, isEndNode: true,
      summary: "Repair verified", aggregate: "AGG-REPAIRCASE",
      readModels: [{ label: "Repair file — photos, invoices, supplements", desc: "The completed work against the approved estimate; verification signs on this view." },],
      description: "The repair is verified, releasing the claim for settlement.",
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
      readModels: [{ label: "Payee & banking details view", desc: "Verified payee identity and payment instructions — dispatch reads it, never free text." },],
      description: "A payment instruction is received and recorded as owed — instructed, not yet settled.",
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
      description: "The instruction is dispatched to payment execution under the standing contract.",
      commands: [{ label: "Dispatch over the execution contract", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "Conformist behind the contract", desc: "Legacy execution today, modernized later — this ledger never notices." }] },

    { id: "dp-failed", type: "SimpleNode", parentId: "dp-dispatched", kind: "event", branch: "the payment bounces",
      summary: "Payment failed", aggregate: "AGG-PAYLEDGER",
      description: "A payment fails to settle; the amount remains owed until reissued.",
      commands: [{ label: "Void & reissue", on: "AGG-PAYLEDGER" }],
      businessRules: [{ label: "A failed payment is never silent", desc: "Owed stays owed until settled — no orphaned instructions." }] },

    { id: "dp-settled", type: "SimpleNode", parentId: "dp-dispatched", kind: "event", isPivotal: true, isEndNode: true, grounds: ["FR6"],
      summary: "Settlement confirmed", aggregate: "AGG-PAYLEDGER",
      readModels: [{ label: "Claim ledger balance", desc: "Instructed, dispatched, settled and credited per claim — the single truth about the money." },],
      description: "Settlement is confirmed; the ledger state moves from owed to settled.",
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
      description: "An inbound credit — salvage proceeds or recovery — is booked against the claim.",
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
      description: "The threshold breach is received with the estimate of record; the write-off case opens.",
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
      readModels: [{ label: "Valuation comparables", desc: "Actual-cash-value evidence for this vehicle and market — the offer stands on it." },],
      description: "The vehicle is valued at its actual cash value as at the date of loss.",
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
      readModels: [{ label: "Lien & title status view", desc: "Registered interests and the payout order — settlement reads it before funds move." },],
      description: "The total-loss settlement is offered and accepted; ownership of the vehicle transfers to the insurer.",
      commands: [{ label: "Offer ACV less deductible", on: "AGG-SALVAGECASE" }],
      businessRules: [{ label: "ACV doctrine — taxes, fees, comparable sales" }],
      policies: [{ label: "When accepted → hand the settlement to adjudication", desc: "The indemnity travels the normal settlement path.", crosses: "Claim adjudication" }] },

    { id: "dt-branded", type: "SimpleNode", parentId: "dt-settled", kind: "event",
      summary: "Title branded & transferred", aggregate: "AGG-SALVAGECASE",
      description: "The title is branded and transferred as regulation requires.",
      businessRules: [{ label: "Branding is regulation — salvage, rebuilt, irreparable" }] },

    { id: "dt-disposed", type: "SimpleNode", parentId: "dt-branded", kind: "event", isPivotal: true, isEndNode: true, grounds: ["FR9"],
      summary: "Salvage disposed", aggregate: "AGG-SALVAGECASE",
      description: "The salvage is disposed at auction; the proceeds return as a credit to the claim.",
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
      readModels: [{ label: "Recovery position file", desc: "Fault, quantum paid and evidence from the closed claim — the demand is built from this view." },],
      description: "A recovery case is opened from the closed claim's facts.",
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
      description: "A demand is issued to the responsible carrier for its share of the loss.",
      commands: [{ label: "Issue the inter-company demand", on: "AGG-RECOVERYCASE" }],
      businessRules: [{ label: "Fault-split recoverability; inter-company arbitration process" }] },

    { id: "dv-received", type: "SimpleNode", parentId: "dv-demand", kind: "event", isPivotal: true,
      summary: "Recovery received", aggregate: "AGG-RECOVERYCASE",
      readModels: [{ label: "Recovery ledger view", desc: "Demanded against received, per party — the close decision reads the balance." },],
      description: "The recovery is received — often months after the claim closed.",
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
      description: "The recovery case is closed with no further amounts to pursue.",
      commands: [{ label: "Close the recovery case", on: "AGG-RECOVERYCASE" }] },
  ],
};

export const CLAIMS_DESIGN_STORMS = [dsIntake, dsAdjud, dsRepair, dsPayments, dsTotalLoss, dsRecovery];

/* ── D-163/D-164: NO pivotal inside a design-level storm — a one-context
   diagram cannot show a context change (the sponsor's definition), so the
   pill would always sit "inside" the wall. The crossings are carried by
   the seams themselves: domain-call/external triggers in, `crosses`
   policies out. Hand flags stripped; none derived. */
for (const m of CLAIMS_DESIGN_STORMS) for (const n of m.nodes) {
  if (n.kind === "event") delete n.isPivotal;
}
