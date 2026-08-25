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
      { id: "RM-ADJUD-coverage-snapshot", eventIds: ["adj-opened", "adj-policy"], readerIds: ["SEC-ADJUD-handler"], name: "Coverage snapshot view", serves: "policy verification & coverage confirmation", readers: "claims handlers", desc: "The stored mainframe extract as at date of loss — read here, never fetched live." },
      { id: "RM-ADJUD-lines-limits", eventIds: ["adj-coverage"], readerIds: ["SEC-ADJUD-handler"], name: "Coverage lines & limits view", serves: "coverage confirmation", readers: "claims handlers", desc: "What the policy responds to for this loss, line by line, endorsements applied." },
      { id: "RM-ADJUD-reserve-adequacy", eventIds: ["adj-reserve"], readerIds: ["SEC-ADJUD-handler", "SEC-ADJUD-actuarial"], name: "Reserve adequacy view", serves: "reserve moves", readers: "claims handlers · actuarial", desc: "Current reserves against estimates and payments to date, per coverage line." },
      { id: "RM-ADJUD-fault-rules", eventIds: ["adj-fault"], readerIds: ["SEC-ADJUD-handler"], name: "Fault determination rules", serves: "fault determination", readers: "claims handlers", desc: "The applicable fault table for the jurisdiction and the reported circumstances." },
      { id: "RM-ADJUD-estimate-payables", eventIds: ["adj-calculated"], readerIds: ["SEC-ADJUD-handler"], name: "Estimate of record & payables", serves: "settlement calculation", readers: "claims handlers", desc: "The verified repair figures, deductible and limits — the settlement is calculated from this view." },
      { id: "RM-ADJUD-holds-authority", eventIds: ["adj-payauth"], readerIds: ["SEC-ADJUD-handler", "SEC-ADJUD-senior-authority"], name: "Holds & authority view", serves: "payment authorization", readers: "claims handlers · senior authority", desc: "Open holds and the handler's authority limit — authorization reads both before it signs." },
      { id: "RM-ADJUD-closure-checklist", eventIds: ["adj-closed"], readerIds: ["SEC-ADJUD-handler"], name: "Closure checklist view", serves: "closing the file", readers: "claims handlers", desc: "Settlements, holds, tasks and documents in one status view — every line green before close." },
    ],

    /* contracts moved to claims-contracts.js (D-196) — a contract binds two
       parties and is authored ONCE in the registry; this box's Contracts page
       is a view of it. */
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

  "CTX-INTAKE": {
    scenarios: [
      { id: "CAT-INTAKE-open", name: "A first notice opens a report, whatever the door", transition: "TRN-INTAKE-report", uc: "UC1", at: "AT1",
        given: "No report matches the parties, vehicle, and date and place of loss", when: "a first notice arrives on any channel", then: "A loss report opens in Reported, with the submission and its provenance on record.", kind: "move", grounds: ["UC1", "FR1"] },
      { id: "CAT-INTAKE-merge", name: "A matching submission merges — never duplicates", transition: "TRN-INTAKE-merge", uc: "UC1", at: "AT1",
        given: "A report matches on parties, vehicle, and date and place of loss", when: "another channel submits the same loss", then: "The submission merges into the existing report; provenance per field survives; no second report exists.", kind: "move", grounds: ["FR1"] },
      { id: "CAT-INTAKE-triage", name: "Severity scored, lane suggested, drivers shown", transition: "TRN-INTAKE-triage", uc: "UC2", at: "AT2",
        given: "A report with enough facts to score", when: "the severity model runs", then: "A lane is suggested with its drivers visible; the suggestion refreshes as facts land; no lane is binding.", kind: "move", grounds: ["UC2", "FR2"] },
      { id: "CAT-INTAKE-complete", name: "Licensed completion, per-channel mandatory fields", transition: "TRN-INTAKE-complete", uc: "UC2",
        given: "Mandatory fields for the channel are present", when: "the licensed intake role completes the report", then: "The report moves to Completed, signed by the licence that closed it.", kind: "move", grounds: ["UC2", "FR1"] },
      { id: "CAT-INTAKE-register", name: "Registration stamps the number and tells adjudication", transition: "TRN-INTAKE-register", uc: "UC1", at: "AT1",
        given: "A completed report and no existing claim on this loss", when: "the claim is registered", then: "A claim number and statutory notice date are assigned; claim-opened publishes to adjudication.", kind: "move", grounds: ["UC1", "FR1"] },
      { id: "CAT-INTAKE-refuse-unlicensed", name: "An unlicensed completion is refused", rule: "TRL-INTAKE-licensed-completion",
        given: "The completer lacks the licensed intake role", when: "completion is attempted", then: "REFUSED — completion is a regulated judgment; the attempt is recorded.", kind: "refusal", grounds: [] },
      { id: "CAT-INTAKE-refuse-duplicate-claim", name: "A second claim on the same loss is refused", rule: "TRL-INTAKE-one-loss-one-claim",
        given: "A claim already exists for this loss", when: "registration is attempted", then: "REFUSED — the report merges into the existing claim's story instead.", kind: "refusal", grounds: ["FR1"] },
    ],
    readModels: [
      { id: "RM-INTAKE-match-candidates", eventIds: ["di-reported", "di-merged"], readerIds: ["SEC-INTAKE-agent"], name: "Open reports — match view", serves: "open & merge decisions", readers: "intake agents", desc: "Existing reports on matching parties, vehicle, and date and place of loss — one loss, one report stands on it." },
      { id: "RM-INTAKE-severity-factors", eventIds: ["di-triaged"], readerIds: ["SEC-INTAKE-agent"], name: "Severity factors view", serves: "triage", readers: "intake agents", desc: "Damage, injury indicators and vehicle data as the model scores them — the lane stays explainable." },
      { id: "RM-INTAKE-completeness", eventIds: ["di-completed"], readerIds: ["SEC-INTAKE-licensed"], name: "Completeness checklist", serves: "licensed completion", readers: "licensed intake", desc: "What the report still lacks, per channel — a police feed carries less than a guided conversation." },
      { id: "RM-INTAKE-registered-index", eventIds: ["di-registered"], readerIds: ["SEC-INTAKE-agent"], name: "Registered claims index", serves: "registration dedup", readers: "intake agents", desc: "Claims by loss and policy — read before any number is assigned." },
    ],
    serviceLevels: [
      { id: "SL-INTAKE-fnol-availability", obligation: "Digital FNOL availability", level: "≥ 99.9% — the front door stays open", why: "A claimant who cannot report a loss is the worst first impression an insurer can make.", grounds: ["NFR1"] },
      { id: "SL-INTAKE-snapshot-request", obligation: "Coverage snapshot request", level: "issued at intake, keyed to date of loss", why: "Adjudication never calls live policy systems — the request must leave before the handoff.", grounds: ["NFR2"] },
      { id: "SL-INTAKE-triage-latency", obligation: "Severity triage", level: "scored within minutes of facts landing", why: "The lane decides who works the file — a stale lane is a misrouted claim.", grounds: [] },
      { id: "SL-INTAKE-acknowledgment", obligation: "Registration acknowledgment", level: "within the statutory period", why: "The claim number in the claimant's hands is the moment the story becomes navigable for them.", grounds: [] },
    ],
    security: [
      { id: "SEC-INTAKE-agent", who: "Intake agent", may: "open, merge and work reports; every action attributed", grounds: [] },
      { id: "SEC-INTAKE-licensed", who: "Licensed intake role", may: "complete reports — the only role that can; the licence is recorded with the completion", grounds: [] },
      { id: "SEC-INTAKE-police-feed", who: "Police feed", may: "open or enrich reports through the ACL only — never register a claim", grounds: ["FR1"] },
      { id: "SEC-INTAKE-portals", who: "Portals", may: "submit their own claimant's reports and read their own claimant's status — nothing else", grounds: ["FR10"] },
      { id: "SEC-INTAKE-data-class", who: "The data itself", may: "PII from the first word — access logged; provenance retained with the report", grounds: [] },
    ],
    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-INTAKE-packaging", aspect: "Packaging", choice: "One deployable service owning the loss report", why: "The doors differ; the record is one. Internal modules per door: portal API, desk, police ACL, plus triage." },
        { id: "HB-INTAKE-store", aspect: "Store", choice: "Document-shaped store, private — submissions append-only", why: "A report is a growing dossier, not a ledger; provenance rows never rewrite." },
        { id: "HB-INTAKE-doors", aspect: "Doors", choice: "Public API gateway (portal), internal API (desk), Kafka consumer (police feed)", why: "The trigger records already say so, contract by contract." },
        { id: "HB-INTAKE-runtime", aspect: "Runtime", choice: "The claims cluster, beside adjudication", why: "Its one outbound seam is claim-opened; its latency duty is the front door." },
      ],
    },
    ownership: [
      { role: "Owning team", who: "Intake & FNOL desk (Claims operations)", note: "The team that answers the first call owns the record the call creates." },
      { role: "Decider", who: "ClaimsCore product owner", note: "Signs the claim-opened contract on the publisher side; owns the intake gaps list." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "Front-door availability is this team's pager." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],
    measures: [
      { id: "MEA-INTAKE-channel-mix", measure: "Channel mix", def: "Share of reports by door — portal, desk, broker, police", target: "portal share rising; the desk stays for judgment, not typing", grounds: [] },
      { id: "MEA-INTAKE-merge-rate", measure: "Merge rate", def: "Submissions merged into existing reports vs new reports", target: "duplicates caught at the door, not downstream", grounds: ["FR1"] },
      { id: "MEA-INTAKE-time-to-register", measure: "Time to register", def: "Median hours from first notice to claim number", target: "falling — the claimant's first wait is the one they remember", grounds: [] },
      { id: "MEA-INTAKE-completeness", measure: "Completeness at handoff", def: "Registered claims returned by adjudication for missing facts", target: "near zero — completeness at handoff is the measure that matters", grounds: [] },
    ],
    knownGaps: [
      { id: "GAP-INTAKE-chase-card", text: "The incomplete-report CHASE has no card on the wall — the clock policy reacts to a moment the flow never states.", where: "Event flow" },
      { id: "GAP-INTAKE-abandoned", text: "Abandoned reports (never completed, never chased to conclusion) have no terminal stage — the story assumes every report registers.", where: "Lifecycle" },
      { id: "GAP-INTAKE-how-built", text: "How it's built is PROPOSED — the architect has not confirmed.", where: "How it's built" },
    ],
  }
};
