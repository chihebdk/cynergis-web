"use client";

/* ============================================================
   D-184 — THE BUILD PACKET, completed for the exemplar box
   (Claim adjudication). Every section holds only what is whole
   at box scope (the smallest-whole test, D-183):
     scenarios      — COMPONENT acceptance tests (D-190): Gherkin
                      Given/When/Then per transition AND per refusal —
                      what "done" means for THIS box. Discover's
                      acceptance tests (AT ids, on the use cases) stay
                      the END-TO-END layer; `uc`/`at` link each component
                      test to the use case it serves and the Discover
                      test it supports — two levels, no duplication.
     readModels     — the prepared views the box maintains + who reads
     contracts      — the border agreements, field by field: parties &
                      pattern · payload · promises · change policy ·
                      obligations. Nothing either side can decide alone.
     serviceLevels  — the box's non-functional obligations, in its language
     security       — who may do what · data class · retention
     howBuilt       — the packaging decision record (PROPOSED until the
                      architect confirms — Build owns this)
     ownership      — the human side of Conway (role-based; names join
                      from the org page later)
     measures       — the business numbers this box owns
   Grounds: UC/FR/NFR chips where Discover backs a line; absence = ⚠,
   feeding the box's Open items roll-up.
   ============================================================ */

export const BC_PACKET = {
  "CTX-ADJUD": {

    scenarios: [
      { id: "CAT-ADJUD-open", name: "One file per claim number, however often the message replays", uc: "UC3", at: "AT3", transition: "TRN-ADJUD-open", given: "No file exists for the claim number", when: "the claim-opened message arrives", then: "A file is created in Opened; a replay of the same claim number changes nothing.", kind: "move", grounds: ["UC3", "FR3"] },
      { id: "CAT-ADJUD-verify-policy", name: "In force at the date of loss — from the snapshot alone", uc: "UC3", at: "AT3", transition: "TRN-ADJUD-verify-policy", given: "Opened, and the stored snapshot shows the policy in force", when: "policy verification concludes", then: "The file moves to Policy verified.", kind: "move", grounds: ["FR3"] },
      { id: "CAT-ADJUD-deny-not-in-force", name: "Not in force is denied, with reasons", uc: "UC3", transition: "TRN-ADJUD-deny-not-in-force", given: "Opened, and the snapshot shows no policy in force", when: "policy verification concludes", then: "The file moves to Denied; decision version 1 records the reasons.", kind: "move", grounds: [] },
      { id: "CAT-ADJUD-confirm-coverage", name: "A covered line responds, endorsements applied", uc: "UC4", at: "AT8", transition: "TRN-ADJUD-confirm-coverage", given: "Policy verified, and a covered line responds within limits", when: "coverage is confirmed", then: "The file moves to Covered.", kind: "move", grounds: ["UC4", "FR4"] },
      { id: "CAT-ADJUD-deny-no-coverage", name: "No line responds — denied, with reasons", uc: "UC4", transition: "TRN-ADJUD-deny-no-coverage", given: "Policy verified, and no covered line responds", when: "coverage is declined", then: "The file moves to Denied with its reasons on record.", kind: "move", grounds: [] },
      { id: "CAT-ADJUD-calculate", name: "The settlement stands on the estimate of record", uc: "UC6", transition: "TRN-ADJUD-calculate-settlement", given: "Covered, with the estimate of record on file", when: "the repair-verified message arrives", then: "The settlement is calculated; the file moves to Amount set.", kind: "move", grounds: ["UC6", "FR6"] },
      { id: "CAT-ADJUD-authorize", name: "Clean file, within authority — the money moves", uc: "UC6", at: "AT5", transition: "TRN-ADJUD-authorize-payment", given: "Amount set, NO open holds, amount within the handler's authority", when: "payment is authorized", then: "The file moves to Payment approved and the payment instruction is published.", kind: "move", grounds: ["UC6", "FR6"] },
      { id: "CAT-ADJUD-close", name: "A green checklist closes the file", uc: "UC6", at: "AT5", transition: "TRN-ADJUD-close", given: "Payment approved, the payment-settled message is back, the closure checklist is green", when: "closure runs", then: "The file moves to Closed; a recovery referral is published when someone else should pay.", kind: "move", grounds: [] },
      { id: "CAT-ADJUD-accept-credit", name: "Late money lands without reopening the past", transition: "TRN-ADJUD-accept-credit", given: "Closed", when: "a salvage or recovery credit arrives", then: "The credit is appended; the file stays Closed; nothing existing changes.", kind: "move", grounds: [] },
      { id: "CAT-ADJUD-reopen", name: "A challenge opens a new decision version", transition: "TRN-ADJUD-reopen-from-denied", given: "Denied or Closed, and the decision is challenged", when: "the file is reopened", then: "A NEW decision version opens; the file returns to Covered; every prior version stays intact.", kind: "move", grounds: [] },
      { id: "CAT-ADJUD-refuse-held-authorization", name: "A hold stops the money", rule: "TRL-ADJUD-holds-gate-money", given: "Amount set, and ANY hold is open", when: "authorization is attempted", then: "REFUSED — holds gate money. The attempt is recorded; the hold's owner is notified.", kind: "refusal", grounds: [] },
      { id: "CAT-ADJUD-refuse-beyond-authority", name: "Beyond authority is refused upward", uc: "UC4", rule: "TRL-ADJUD-authority-limit", given: "The amount exceeds the handler's authority", when: "authorization is attempted", then: "REFUSED — routed to the bigger authority; the limit is checked in code, not trusted.", kind: "refusal", grounds: ["FR5"] },
      { id: "CAT-ADJUD-refuse-closed-edit", name: "The closed file refuses edits", rule: "TRL-ADJUD-closed-never-edited", given: "Closed", when: "any edit of existing facts is attempted", then: "REFUSED — a closed file is never edited; late money lands as new credit entries.", kind: "refusal", grounds: [] },
      { id: "CAT-ADJUD-apply-hold", name: "A hold pauses the file without moving the stage", transition: "TRN-ADJUD-apply-hold", given: "Any stage before Closed", when: "a hold is applied", then: "The flag is set, typed by origin; the stage does not change.", kind: "move", grounds: [] },
    ],

    readModels: [
      { id: "RM-ADJUD-coverage-snapshot", eventIds: ["adj-opened", "adj-policy"], name: "Coverage snapshot view", serves: "policy verification & coverage confirmation", readers: "claims handlers", desc: "The stored mainframe extract as at date of loss — read here, never fetched live." },
      { id: "RM-ADJUD-lines-limits", eventIds: ["adj-coverage"], name: "Coverage lines & limits view", serves: "coverage confirmation", readers: "claims handlers", desc: "What the policy responds to for this loss, line by line, endorsements applied." },
      { id: "RM-ADJUD-reserve-adequacy", eventIds: ["adj-reserve"], name: "Reserve adequacy view", serves: "reserve moves", readers: "claims handlers · actuarial", desc: "Current reserves against estimates and payments to date, per coverage line." },
      { id: "RM-ADJUD-fault-rules", eventIds: ["adj-fault"], name: "Fault determination rules", serves: "fault determination", readers: "claims handlers", desc: "The applicable fault table for the jurisdiction and the reported circumstances." },
      { id: "RM-ADJUD-estimate-payables", eventIds: ["adj-calculated"], name: "Estimate of record & payables", serves: "settlement calculation", readers: "claims handlers", desc: "The verified repair figures, deductible and limits — the settlement is calculated from this view." },
      { id: "RM-ADJUD-holds-authority", eventIds: ["adj-payauth"], name: "Holds & authority view", serves: "payment authorization", readers: "claims handlers · senior authority", desc: "Open holds and the handler's authority limit — authorization reads both before it signs." },
      { id: "RM-ADJUD-closure-checklist", eventIds: ["adj-closed"], name: "Closure checklist view", serves: "closing the file", readers: "claims handlers", desc: "Settlements, holds, tasks and documents in one status view — every line green before close." },
    ],

    contracts: [
      { id: "CT-claim-opened", name: "claim-opened", version: "v1", dir: "in", withWhom: "Intake & registration", pattern: "customer–supplier · adjudication drives the payload",
        fields: [
          { name: "claim_number", type: "string", desc: "The identity — also the idempotency and ordering key." },
          { name: "notice_date · date_of_loss", type: "dates", desc: "The legal clock and the snapshot anchor." },
          { name: "parties", type: "list", desc: "Claimant, insured, third parties — as registered." },
          { name: "vehicle & circumstances", type: "structured text", desc: "What was reported, consolidated across channels." },
          { name: "severity_lane", type: "enum", desc: "The triage suggestion — a suggestion, not a decision." },
          { name: "snapshot_ref", type: "string", desc: "The stored coverage snapshot keyed to date of loss." },
        ],
        promises: "At-least-once · ordered per claim number · replayable 30 days · consumer replays are no-ops.",
        change: "Additive fields only; adjudication (the consumer) signs off every change; one deprecated version carried at a time.",
        obligations: "Dense PII — subscribers are allow-listed; delivery within minutes of registration." },
      { id: "CT-repair-verified", name: "repair-verified", version: "v1", dir: "in", withWhom: "Repair & estimate coordination", pattern: "customer–supplier · the estimate of record returns",
        fields: [
          { name: "claim_number", type: "string", desc: "The file this verification belongs to." },
          { name: "estimate_of_record", type: "money + lines", desc: "The approved estimate with approved supplements — the settlement's basis." },
          { name: "completion_evidence", type: "refs", desc: "Photos, invoices, certification — by reference, not by copy." },
        ],
        promises: "At-least-once · one verification per repair case · corrections arrive as a new version, never an edit.",
        change: "Additive only; adjudication signs off.", obligations: "Same-day delivery after verification." },
      { id: "CT-appraisal-request", name: "appraisal-request", version: "v1", dir: "out", withWhom: "Repair & estimate coordination", pattern: "customer–supplier · adjudication asks, the estimate returns",
        fields: [
          { name: "claim_number", type: "string", desc: "The requesting file." },
          { name: "vehicle & damage", type: "structured text", desc: "What needs pricing — the reported damage, not the whole file." },
          { name: "coverage_ceiling", type: "money", desc: "The limit the estimate works under — not the reserve, which stays private." },
        ],
        promises: "One open request per claim · cancellation is an explicit message, not silence.",
        change: "Additive only; coordination consumes as published.", obligations: "The claim's private facts (reserves, fault position) never cross." },
      { id: "CT-payment-instruction", name: "payment-instruction", version: "v1", dir: "out", withWhom: "Claim payments", pattern: "customer–supplier · THE new seam: adjudication instructs, payments executes",
        fields: [
          { name: "instruction_id", type: "string", desc: "The idempotency key — one instruction, one execution." },
          { name: "claim_number", type: "string", desc: "The file the money belongs to." },
          { name: "payee & method", type: "structured", desc: "Who gets paid, how — from the verified payee view." },
          { name: "amount & coverage_line", type: "money + enum", desc: "What is paid, against which line." },
          { name: "authority_ref", type: "string", desc: "Who authorized, under which limit — the audit thread." },
        ],
        promises: "Exactly-once execution per instruction_id · the outcome (settled or failed) always returns as an event.",
        change: "Additive only; payments (the executor) is consulted, adjudication decides.", obligations: "The ledger state stays instructed-not-yet-settled until the outcome returns.", grounds: ["FR6"] },
      { id: "CT-payment-settled", name: "payment-settled", version: "v1", dir: "in", withWhom: "Claim payments", pattern: "customer–supplier · the outcome leg of the instruction",
        fields: [
          { name: "instruction_id · claim_number", type: "strings", desc: "Which instruction concluded, on which file." },
          { name: "outcome", type: "enum", desc: "settled · failed — a failure reopens the money question, never silently." },
          { name: "settled_at · method", type: "date + enum", desc: "When and how the money actually moved." },
        ],
        promises: "Every instruction gets exactly one terminal outcome event.",
        change: "Additive only.", obligations: "Same-day delivery after settlement.", grounds: ["FR6"] },
      { id: "CT-recovery-referred", name: "recovery-referred", version: "v1", dir: "out", withWhom: "Recovery & subrogation", pattern: "customer–supplier · post-close: the closed file's facts open the case",
        fields: [
          { name: "claim_number", type: "string", desc: "The closed file behind the referral." },
          { name: "fault_position", type: "structured", desc: "The determined fault and its basis — recovery argues from it." },
          { name: "quantum_paid", type: "money", desc: "What was actually paid — the ceiling of any demand." },
          { name: "evidence_refs", type: "refs", desc: "The file's evidence, by reference — recovery reads, never edits." },
        ],
        promises: "Referral only after close · the file itself stays with adjudication.",
        change: "Additive only; recovery consumes as published.", obligations: "Credits return through Claim payments, never directly." },
    ],

    serviceLevels: [
      { id: "SL-ADJUD-snapshot-freshness", obligation: "Coverage snapshot freshness", level: "consumed within 5 minutes of mainframe publication", why: "Temporal correctness needs a fresh copy — verification reads yesterday's policy at its peril.", grounds: ["NFR2"] },
      { id: "SL-ADJUD-status-freshness", obligation: "Status events to the portals", level: "every milestone within its freshness SLO", why: "The claimant's picture of the claim is only as honest as the stream is fresh.", grounds: ["FR10"] },
      { id: "SL-ADJUD-same-day-calculation", obligation: "Settlement calculation", level: "same day as repair-verified arrives", why: "The estimate is verified; making the claimant wait on arithmetic is pure delay.", grounds: [] },
      { id: "SL-ADJUD-authorization-latency", obligation: "Authorization decision", level: "within one business day of calculation", why: "Money waiting on a signature is the delay claimants actually feel.", grounds: [] },
      { id: "SL-ADJUD-audit-completeness", obligation: "Audit completeness", level: "every decision, hold and reserve move evented — no silent changes", why: "The file must be reconstructible for the regulator and the actuary alike.", grounds: ["FR5"] },
    ],

    security: [
      { id: "SEC-ADJUD-handler", who: "Claims handler", may: "work files within their authority tier; every action attributed to a person", grounds: [] },
      { id: "SEC-ADJUD-senior-authority", who: "Senior authority", may: "approve above a handler's tier; delegation is recorded, never assumed", grounds: ["FR5"] },
      { id: "SEC-ADJUD-hold-owners", who: "Hold owners", may: "only fraud & SIU releases SIU holds; only disputes releases dispute holds", grounds: [] },
      { id: "SEC-ADJUD-actuarial", who: "Actuarial", may: "read the event stream only — never the file itself", grounds: ["FR5"] },
      { id: "SEC-ADJUD-portals", who: "Portals", may: "receive the status stream only — the file never leaves the box", grounds: ["FR10"] },
      { id: "SEC-ADJUD-data-class", who: "The data itself", may: "dense PII — access logged, retention per the regulatory schedule, erasure only where the schedule allows", grounds: [] },
    ],

    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-ADJUD-packaging", aspect: "Packaging", choice: "One deployable service owning the claim file", why: "The box changes as one unit; nothing inside it scales separately yet. Internal modules follow the lifecycle rails: verification · reserves & settlement · holds · closure & credits." },
        { id: "HB-ADJUD-store", aspect: "Store", choice: "Append-heavy relational model, private to the service", why: "Decision versions, holds and credits are append-only tables by design; full event sourcing only if audit replay ever demands it. No other box reads these tables — ever." },
        { id: "HB-ADJUD-doors", aspect: "Doors", choice: "Message doors on the claims cluster, per the trigger records", why: "The contracts are already message-shaped; the doors implement them one-to-one." },
        { id: "HB-ADJUD-runtime", aspect: "Runtime", choice: "The claims cluster, beside its seams", why: "The box talks to its neighbours constantly and to nothing else." },
      ],
    },

    ownership: [
      { role: "Owning team", who: "Adjudication & settlements (Claims operations)", note: "One team, one box — the language stays whole because the team does." },
      { role: "Decider", who: "ClaimsCore product owner", note: "Signs contract changes on the consumer side; owns the take-back-to-Discover list." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "The team that writes the policies answers when one misfires." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],

    measures: [
      { id: "MEA-ADJUD-cycle-time", measure: "Cycle time, opened → closed", def: "Median calendar days from Claim opened to Claim closed", target: "tracked from Build; target set after a baseline quarter", grounds: [] },
      { id: "MEA-ADJUD-reopen-rate", measure: "Reopen rate", def: "Reopened files as a share of closures, rolling 90 days", target: "falling — every reopen is a decision that didn't hold", grounds: [] },
      { id: "MEA-ADJUD-reserve-drift", measure: "Reserve adequacy drift", def: "Final settled amount vs the reserve at each move", target: "drift shrinking as facts land earlier", grounds: ["FR5"] },
      { id: "MEA-ADJUD-hold-dwell", measure: "Hold dwell time", def: "Days a hold stays open past its review period", target: "zero past-review holds without an escalation on record", grounds: [] },
      { id: "MEA-ADJUD-recovery-capture", measure: "Recovery capture", def: "Credits received vs referrals published", target: "rising — referred money is not recovered money", grounds: [] },
    ],

    /* authored open items that no derivation can compute — the known wall gaps */
    knownGaps: [
      { id: "GAP-ADJUD-hold-release-card", text: "Hold RELEASE has no card on the wall — the release policy reacts to a moment the flow never states.", where: "Event flow" },
      { id: "GAP-ADJUD-how-built-unconfirmed", text: "How it's built is PROPOSED — the architect has not confirmed packaging, store, doors or runtime.", where: "How it's built" },
    ],
  },
};
