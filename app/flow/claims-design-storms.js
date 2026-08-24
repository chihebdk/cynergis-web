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

export const CLAIMS_DESIGN_STORMS = [dsIntake];
