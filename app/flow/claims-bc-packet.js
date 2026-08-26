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
  },

  "CTX-REPAIR": {
    scenarios: [
      { id: "CAT-REPAIR-open", name: "A request opens a case and finds a shop", transition: "TRN-REPAIR-assign", uc: "UC6",
        given: "An appraisal request from adjudication and a shop in capacity", when: "the case is assigned", then: "The shop holds the vehicle under programme terms; the case is Assigned.", kind: "move", grounds: [] },
      { id: "CAT-REPAIR-estimate-of-record", name: "One estimate of record; supplements append", rule: "TRL-REPAIR-one-estimate",
        given: "An approved estimate on the case", when: "hidden damage is found and approved", then: "The supplement APPENDS to the estimate of record — the record's total grows; no second estimate exists.", kind: "move", grounds: [] },
      { id: "CAT-REPAIR-breach-hands-over", name: "Over the line, the vehicle changes stories", transition: "TRN-REPAIR-declare-breach", uc: "UC7", at: "AT7",
        given: "An estimate over the total-loss line", when: "the breach is declared", then: "Repair activity stops; threshold-breach publishes WITH the estimate of record; the case ends Handed over.", kind: "move", grounds: ["FR9"] },
      { id: "CAT-REPAIR-verify", name: "Verification signs on evidence, then tells adjudication", transition: "TRN-REPAIR-verify", uc: "UC6",
        given: "Completed work matching the approved estimate and supplements", when: "coordination verifies", then: "repair-verified publishes with the estimate of record; the case is Verified.", kind: "move", grounds: [] },
      { id: "CAT-REPAIR-refuse-unapproved-work", name: "Work before approval is refused", rule: "TRL-REPAIR-no-work-before-approval",
        given: "An estimate not yet approved", when: "work authorization is attempted", then: "REFUSED — unpriced work is unpriced liability.", kind: "refusal", grounds: [] },
      { id: "CAT-REPAIR-refuse-settling", name: "Coordination never settles a total loss", rule: "TRL-REPAIR-never-settle-total-loss",
        given: "A breached estimate", when: "any settlement action is attempted here", then: "REFUSED — the vehicle is Total loss & salvage's story.", kind: "refusal", grounds: ["FR9"] },
    ],
    readModels: [
      { id: "RM-REPAIR-shop-capacity", eventIds: ["dr-requested", "dr-accepted"], readerIds: ["SEC-REPAIR-coordinator"], name: "Network capacity & programme terms", serves: "assignment", readers: "coordinators", desc: "Who can take the vehicle, at what agreed rates." },
      { id: "RM-REPAIR-estimate-vs-guide", eventIds: ["dr-estimate", "dr-approved"], readerIds: ["SEC-REPAIR-coordinator"], name: "Estimate vs guide view", serves: "estimate review & approval", readers: "coordinators", desc: "The priced lines against guide times and rates — review works this view." },
      { id: "RM-REPAIR-threshold-line", eventIds: ["dr-breach"], readerIds: ["SEC-REPAIR-coordinator"], name: "Total-loss threshold view", serves: "breach declaration", readers: "coordinators", desc: "The applicable line for this vehicle — the breach is computed, not eyeballed." },
      { id: "RM-REPAIR-repair-file", eventIds: ["dr-verified"], readerIds: ["SEC-REPAIR-coordinator"], name: "Repair file — evidence view", serves: "verification", readers: "coordinators", desc: "Photos, invoices, supplements against the approved estimate." },
    ],
    serviceLevels: [
      { id: "SL-REPAIR-assignment", obligation: "Assignment", level: "within 1 business day of the request", why: "A vehicle nobody has taken is a claimant without a car and a clock nobody owns.", grounds: [] },
      { id: "SL-REPAIR-approval", obligation: "Estimate approval", level: "same day as the estimate lands", why: "The shop cannot start, the claimant cannot plan, until the price is signed.", grounds: [] },
      { id: "SL-REPAIR-breach", obligation: "Breach declaration", level: "immediate on crossing the line", why: "Every repair hour past the line is money spent on a vehicle that will not be repaired.", grounds: ["FR9"] },
      { id: "SL-REPAIR-supplement", obligation: "Supplement decision", level: "within 2 business days", why: "An undecided supplement is a car on a lift and a shop not working.", grounds: [] },
    ],
    security: [
      { id: "SEC-REPAIR-coordinator", who: "Repair coordinator", may: "assign, approve, verify — every approval attributed", grounds: [] },
      { id: "SEC-REPAIR-shops", who: "Network shops", may: "see and work their own cases through the partner surface — never another shop's, never the claim", grounds: [] },
      { id: "SEC-REPAIR-adjud", who: "Claim adjudication", may: "request and receive through the contracts — the case itself stays here", grounds: [] },
      { id: "SEC-REPAIR-data-class", who: "The data itself", may: "claimant PII plus commercially sensitive network rates — the rates never reach the shops' competitors", grounds: [] },
    ],
    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-REPAIR-packaging", aspect: "Packaging", choice: "One deployable service owning the repair case", why: "Internal modules per rail: assignment, estimate & supplements, verification." },
        { id: "HB-REPAIR-store", aspect: "Store", choice: "Relational, private — estimate and supplement lines are naturally tabular", why: "Sums, rates and guide comparisons are queries, not documents." },
        { id: "HB-REPAIR-doors", aspect: "Doors", choice: "Message doors on the claims cluster + the partner API for shops", why: "Per the trigger records; the partner surface is the one public face." },
        { id: "HB-REPAIR-runtime", aspect: "Runtime", choice: "The claims cluster", why: "Its seams are adjudication and total loss; the shop API fronts through the gateway." },
      ],
    },
    ownership: [
      { role: "Owning team", who: "Repair network desk (Claims operations)", note: "The team that manages the shops owns the case the shops work." },
      { role: "Decider", who: "ClaimsCore product owner", note: "Signs the threshold-breach contract on the publisher side." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "A stuck assignment is a claimant without a car." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],
    measures: [
      { id: "MEA-REPAIR-cycle", measure: "Cycle time, request → verified", def: "Median calendar days", target: "baseline first; the claimant feels this number directly", grounds: [] },
      { id: "MEA-REPAIR-supplement-rate", measure: "Supplement rate", def: "Cases with ≥1 supplement / all cases", target: "falling — supplements are estimates that missed", grounds: [] },
      { id: "MEA-REPAIR-breach-rate", measure: "Breach rate", def: "Cases handed over / all cases", target: "watched — a rising line means estimates arrive too late", grounds: ["FR9"] },
      { id: "MEA-REPAIR-variance", measure: "Approved vs final variance", def: "Final (with supplements) against first approval", target: "shrinking — the first price should be the price", grounds: [] },
    ],
    knownGaps: [
      { id: "GAP-REPAIR-reassignment", text: "Shop no-show / reassignment has no card — the chase policy escalates into a moment the flow never states.", where: "Event flow" },
      { id: "GAP-REPAIR-supplement-dispute", text: "A declined supplement's dispute path is unmodelled — the shop's recourse today is a phone call.", where: "Lifecycle" },
      { id: "GAP-REPAIR-how-built", text: "How it's built is PROPOSED — the architect has not confirmed.", where: "How it's built" },
    ],
  },

  "CTX-PAYMENTS": {
    scenarios: [
      { id: "CAT-PAYMENTS-exactly-once", name: "A replayed instruction executes nothing", rule: "TRL-PAYMENTS-exactly-once", uc: "UC6", at: "AT5",
        given: "An instruction_id already on the ledger", when: "the same instruction arrives again", then: "REFUSED as a no-op — the existing entry answers; nothing dispatches twice.", kind: "refusal", grounds: ["FR6"] },
      { id: "CAT-PAYMENTS-dispatch", name: "A verified payee, then dispatch", transition: "TRN-PAYMENTS-dispatch", uc: "UC6", at: "AT5",
        given: "An instruction whose payee verifies", when: "dispatch runs", then: "The payment leaves for execution; the ledger reads dispatched.", kind: "move", grounds: ["FR6"] },
      { id: "CAT-PAYMENTS-settle", name: "The outcome always returns", transition: "TRN-PAYMENTS-settle", uc: "UC6", at: "AT5",
        given: "A dispatched payment", when: "execution confirms", then: "The ledger reads settled; payment-settled publishes to adjudication.", kind: "move", grounds: ["FR6"] },
      { id: "CAT-PAYMENTS-fail-loud", name: "A bounce is recorded and tasked, never silent", transition: "TRN-PAYMENTS-fail", 
        given: "A dispatched payment", when: "execution reports a bounce", then: "The failure lands with its reason; ops is tasked; adjudication is notified.", kind: "move", grounds: [] },
      { id: "CAT-PAYMENTS-credit", name: "Money in books first, then publishes", transition: "TRN-PAYMENTS-book-credit",
        given: "Salvage proceeds or a recovery receipt", when: "the credit books", then: "The ledger is already true when credit-received publishes — open or closed claim alike.", kind: "move", grounds: [] },
      { id: "CAT-PAYMENTS-refuse-edit", name: "Ledger entries never change", rule: "TRL-PAYMENTS-append-only",
        given: "Any existing ledger entry", when: "an edit or delete is attempted", then: "REFUSED — corrections are new entries with their reason.", kind: "refusal", grounds: [] },
    ],
    readModels: [
      { id: "RM-PAYMENTS-payee-verification", eventIds: ["dp-received", "dp-dispatched"], readerIds: ["SEC-PAYMENTS-ops"], name: "Payee & banking view", serves: "dispatch validation", readers: "payment ops", desc: "Verified payee identity and instructions — dispatch reads it, never free text." },
      { id: "RM-PAYMENTS-ledger-balance", eventIds: ["dp-settled", "dp-credit"], readerIds: ["SEC-PAYMENTS-ops", "SEC-PAYMENTS-actuarial"], name: "Ledger balance view", serves: "the money's single truth", readers: "ops · actuarial", desc: "Instructed, dispatched, settled, credited — per claim." },
      { id: "RM-PAYMENTS-failure-queue", eventIds: ["dp-failed"], readerIds: ["SEC-PAYMENTS-ops"], name: "Failure queue", serves: "bounce handling", readers: "payment ops", desc: "Every bounce with its reason and age — nothing leaves but by resolution." },
      { id: "RM-PAYMENTS-suspense", eventIds: ["dp-credit"], readerIds: ["SEC-PAYMENTS-ops"], name: "Suspense queue", serves: "unmatched credits", readers: "payment ops", desc: "Money that matched no claim — visible, aging, never dropped." },
    ],
    serviceLevels: [
      { id: "SL-PAYMENTS-dispatch", obligation: "Dispatch", level: "same day as the instruction", why: "An authorized payment sitting undispatched is the delay the claimant cannot see or forgive.", grounds: ["FR6"] },
      { id: "SL-PAYMENTS-outcome", obligation: "Outcome relay", level: "same day as execution reports", why: "Adjudication closes on it — a late outcome is a file that cannot close.", grounds: ["FR6"] },
      { id: "SL-PAYMENTS-credit", obligation: "Credit booking", level: "same day as receipt", why: "Unbooked money in is money invisible to the audit.", grounds: [] },
      { id: "SL-PAYMENTS-suspense", obligation: "Suspense aging", level: "escalated at 5 days", why: "Suspense is where money goes to be forgotten — unless someone is paged.", grounds: [] },
    ],
    security: [
      { id: "SEC-PAYMENTS-ops", who: "Payment ops", may: "work failures and suspense; never create an instruction — only adjudication instructs", grounds: ["FR6"] },
      { id: "SEC-PAYMENTS-adjud", who: "Claim adjudication", may: "instruct through the contract only — the ledger itself is never written from outside", grounds: ["FR6"] },
      { id: "SEC-PAYMENTS-execution", who: "Legacy payment execution", may: "receive dispatches and report outcomes — a conformist behind the contract", grounds: [] },
      { id: "SEC-PAYMENTS-actuarial", who: "Actuarial", may: "read the ledger stream — never write, never see payee banking detail", grounds: [] },
      { id: "SEC-PAYMENTS-data-class", who: "The data itself", may: "banking details — the highest class in the product; access logged, masked by default", grounds: [] },
    ],
    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-PAYMENTS-packaging", aspect: "Packaging", choice: "One deployable service owning the ledger", why: "Small, hot, and correctness-critical — the strongest candidate in the cut for its own service from day one." },
        { id: "HB-PAYMENTS-store", aspect: "Store", choice: "Append-only relational ledger, private", why: "The design IS a ledger; the store should refuse updates structurally." },
        { id: "HB-PAYMENTS-doors", aspect: "Doors", choice: "Message doors both sides; the execution adapter is the one conformist edge", why: "Instructions in, outcomes out, credits in — all contracts, all message-shaped." },
        { id: "HB-PAYMENTS-runtime", aspect: "Runtime", choice: "The claims cluster, hardened tier", why: "Banking-detail handling pulls the strictest controls in the product." },
      ],
    },
    ownership: [
      { role: "Owning team", who: "Claims finance ops", note: "The ledger is a finance artifact operated inside claims — the team reflects both." },
      { role: "Decider", who: "ClaimsCore product owner, with finance sign-off", note: "Contract changes on the money seams carry a second signature." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "A failed disbursement pages the people who can fix it." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],
    measures: [
      { id: "MEA-PAYMENTS-settle-rate", measure: "First-pass settle rate", def: "Settled without failure / all instructions", target: "rising — every bounce is rework and a waiting claimant", grounds: [] },
      { id: "MEA-PAYMENTS-latency", measure: "Instructed → settled", def: "Median hours", target: "same-day — the claimant's money should not sleep here", grounds: ["FR6"] },
      { id: "MEA-PAYMENTS-suspense-aging", measure: "Suspense aging", def: "Oldest unmatched credit, days", target: "under 5 — visible money, resolved fast", grounds: [] },
      { id: "MEA-PAYMENTS-credit-match", measure: "Credit match rate", def: "Credits auto-matched to a claim / all credits", target: "rising — suspense should be the exception", grounds: [] },
    ],
    knownGaps: [
      { id: "GAP-PAYMENTS-retry", text: "Retry-after-failure has no card — a failed payment's second attempt is a moment the flow never states.", where: "Event flow" },
      { id: "GAP-PAYMENTS-suspense-card", text: "The suspense queue has no card — unmatched credits are handled by a policy with no wall anchor.", where: "Event flow" },
      { id: "GAP-PAYMENTS-how-built", text: "How it's built is PROPOSED — the architect has not confirmed.", where: "How it's built" },
    ],
  },

  "CTX-TOTALLOSS": {
    scenarios: [
      { id: "CAT-TOTALLOSS-open", name: "A breach opens exactly one case", transition: "TRN-TOTALLOSS-receive", uc: "UC7", at: "AT7",
        given: "A threshold breach with the estimate of record", when: "the case opens", then: "One salvage case per vehicle; the valuation starts from the estimate that crossed the line.", kind: "move", grounds: ["UC7", "FR9"] },
      { id: "CAT-TOTALLOSS-valuation", name: "The offer stands on comparables", rule: "TRL-TOTALLOSS-valuation-on-record", uc: "UC7",
        given: "A case without comparables on record", when: "an offer is attempted", then: "REFUSED — the offer that cannot show its evidence loses the dispute it causes.", kind: "refusal", grounds: ["FR9"] },
      { id: "CAT-TOTALLOSS-lien-gate", name: "Liens are read before money moves", rule: "TRL-TOTALLOSS-lien-before-funds",
        given: "An accepted offer and an uncleared lien", when: "settlement is attempted", then: "REFUSED — the holder is named, the owner told why, the funds wait.", kind: "refusal", grounds: [] },
      { id: "CAT-TOTALLOSS-settle", name: "Acceptance settles through the claim's path", transition: "TRN-TOTALLOSS-settle", uc: "UC7",
        given: "An accepted offer, liens clear", when: "settlement runs", then: "The indemnity travels adjudication's settlement path; the case moves to Settled.", kind: "move", grounds: ["UC7", "FR9"] },
      { id: "CAT-TOTALLOSS-proceeds", name: "Disposal sends the proceeds home", transition: "TRN-TOTALLOSS-dispose", uc: "UC7",
        given: "A titled vehicle sold by the network", when: "the sale completes", then: "salvage-proceeds publishes; the ledger books the credit; one disposition, closed.", kind: "move", grounds: ["FR9"] },
    ],
    readModels: [
      { id: "RM-TOTALLOSS-comparables", eventIds: ["dt-valued"], readerIds: ["SEC-TOTALLOSS-specialist"], name: "Valuation comparables", serves: "the offer", readers: "total-loss specialists", desc: "Actual-cash-value evidence for this vehicle and market." },
      { id: "RM-TOTALLOSS-lien-title", eventIds: ["dt-settled", "dt-branded"], readerIds: ["SEC-TOTALLOSS-specialist"], name: "Lien & title status", serves: "settlement & transfer", readers: "total-loss specialists", desc: "Registered interests and the payout order — read before funds move." },
      { id: "RM-TOTALLOSS-market", eventIds: ["dt-disposed"], readerIds: ["SEC-TOTALLOSS-specialist"], name: "Salvage market view", serves: "disposal", readers: "total-loss specialists", desc: "What comparable salvage is fetching — the reserve price stands on it." },
    ],
    serviceLevels: [
      { id: "SL-TOTALLOSS-valuation", obligation: "Valuation", level: "within 3 business days of the breach", why: "The owner is waiting to hear whether they still have a car.", grounds: ["FR9"] },
      { id: "SL-TOTALLOSS-offer", obligation: "Offer", level: "within 1 business day of valuation", why: "A valued vehicle without an offer is a decision withheld.", grounds: [] },
      { id: "SL-TOTALLOSS-proceeds", obligation: "Proceeds publication", level: "same day as the sale", why: "The ledger's truth includes the money the vehicle became.", grounds: ["FR9"] },
    ],
    security: [
      { id: "SEC-TOTALLOSS-specialist", who: "Total-loss specialist", may: "value, offer, settle — every offer attributed with its comparables", grounds: [] },
      { id: "SEC-TOTALLOSS-network", who: "Salvage network", may: "receive titled vehicles and report sales through the partner surface — nothing of the claim", grounds: [] },
      { id: "SEC-TOTALLOSS-registry", who: "Title registry", may: "receive brand filings — an external authority, integrated at the edge", grounds: [] },
      { id: "SEC-TOTALLOSS-data-class", who: "The data itself", may: "owner PII and lien positions — financial interests logged on every read", grounds: [] },
    ],
    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-TOTALLOSS-packaging", aspect: "Packaging", choice: "A module beside adjudication initially; its own service only if volume demands", why: "Low volume, high judgment — the smallest deployable footprint that keeps the wall." },
        { id: "HB-TOTALLOSS-store", aspect: "Store", choice: "Relational, private", why: "Cases, liens and dispositions are rows with sums and dates." },
        { id: "HB-TOTALLOSS-doors", aspect: "Doors", choice: "Message doors + the registry and network adapters", why: "Per the trigger records; two external authorities integrate at the edge." },
        { id: "HB-TOTALLOSS-runtime", aspect: "Runtime", choice: "The claims cluster", why: "Its seams are repair, adjudication and payments." },
      ],
    },
    ownership: [
      { role: "Owning team", who: "Total loss & salvage desk (Claims operations)", note: "One desk, one vehicle story — valuation to proceeds." },
      { role: "Decider", who: "ClaimsCore product owner", note: "Signs the salvage-proceeds contract on the publisher side." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "A stalled title is an owner unpaid." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],
    measures: [
      { id: "MEA-TOTALLOSS-cycle", measure: "Breach → disposed", def: "Median calendar days", target: "baseline first — the whole vehicle story in one number", grounds: [] },
      { id: "MEA-TOTALLOSS-recovery-pct", measure: "Proceeds vs ACV", def: "What the salvage returned against what the vehicle was worth", target: "watched — the market's grade on our disposals", grounds: ["FR9"] },
      { id: "MEA-TOTALLOSS-acceptance", measure: "Offer acceptance rate", def: "First offers accepted / all offers", target: "rising — comparables shown is offers believed", grounds: [] },
      { id: "MEA-TOTALLOSS-lien-days", measure: "Lien clearance time", def: "Median days acceptance → liens clear", target: "falling — the gate should be fast, not just firm", grounds: [] },
    ],
    knownGaps: [
      { id: "GAP-TOTALLOSS-owner-retains", text: "The owner-retains-vehicle path (they keep the salvage, netted from the settlement) is unmodelled.", where: "Lifecycle" },
      { id: "GAP-TOTALLOSS-acv-dispute", text: "An ACV dispute (the appraisal clause) has no card — the disagreement path lives in a policy exception only.", where: "Event flow" },
      { id: "GAP-TOTALLOSS-how-built", text: "How it's built is PROPOSED — the architect has not confirmed.", where: "How it's built" },
    ],
  },

  "CTX-RECOVERY": {
    scenarios: [
      { id: "CAT-RECOVERY-open-post-close", name: "Only a closed claim opens a case", rule: "TRL-RECOVERY-closed-claim-basis",
        given: "A referral on a claim that is not closed", when: "the case is opened", then: "REFUSED back to adjudication — the basis must be frozen.", kind: "refusal", grounds: [] },
      { id: "CAT-RECOVERY-demand-ceiling", name: "No demand above the quantum paid", rule: "TRL-RECOVERY-demand-ceiling",
        given: "A position with quantum paid on record", when: "a demand above it is attempted", then: "REFUSED — the ceiling is what the file spent.", kind: "refusal", grounds: [] },
      { id: "CAT-RECOVERY-demand", name: "The demand argues the file's facts", transition: "TRN-RECOVERY-demand",
        given: "A complete frozen position", when: "the demand issues", then: "Fault basis, quantum, and evidence references — the responsible party can check every line.", kind: "move", grounds: [] },
      { id: "CAT-RECOVERY-credit-via-ledger", name: "Money returns through the ledger, always", rule: "TRL-RECOVERY-credits-via-payments",
        given: "A direct payment offer from a carrier", when: "acceptance is attempted outside the ledger", then: "REFUSED — routed through Claim payments; the audit sees every dollar.", kind: "refusal", grounds: [] },
      { id: "CAT-RECOVERY-close", name: "Closure records the outcome, whatever it is", transition: "TRN-RECOVERY-close",
        given: "Nothing more recoverable", when: "the case closes", then: "Recovered, compromised, or exhausted — with reasons; the claim file is untouched throughout.", kind: "move", grounds: [] },
    ],
    readModels: [
      { id: "RM-RECOVERY-position", eventIds: ["dv-referred", "dv-demand"], readerIds: ["SEC-RECOVERY-specialist"], name: "Position file", serves: "the demand", readers: "recovery specialists", desc: "Fault, quantum paid, and evidence from the closed claim — the demand is built from this view." },
      { id: "RM-RECOVERY-ledger", eventIds: ["dv-received", "dv-closed"], readerIds: ["SEC-RECOVERY-specialist"], name: "Recovery ledger view", serves: "collection & closure", readers: "recovery specialists", desc: "Demanded against received, per party — the close decision reads the balance." },
      { id: "RM-RECOVERY-clock", eventIds: ["dv-demand"], readerIds: ["SEC-RECOVERY-specialist"], name: "Response clock view", serves: "escalation", readers: "recovery specialists", desc: "Every open demand's deadline — the escalation policy watches this view." },
    ],
    serviceLevels: [
      { id: "SL-RECOVERY-demand", obligation: "Demand issue", level: "within 10 business days of referral", why: "Recovery value decays — late demands meet empty positions and faded memories.", grounds: [] },
      { id: "SL-RECOVERY-escalation", obligation: "Escalation", level: "at the response deadline, not after", why: "A deadline nobody enforces is a suggestion.", grounds: [] },
      { id: "SL-RECOVERY-credit-relay", obligation: "Receipt to ledger", level: "same day", why: "Recovered money is not recovered until the ledger says so.", grounds: [] },
    ],
    security: [
      { id: "SEC-RECOVERY-specialist", who: "Recovery specialist", may: "build positions, issue demands, close cases — the claim file itself is read-only to them", grounds: [] },
      { id: "SEC-RECOVERY-carriers", who: "Other carriers", may: "receive demands and pay — their process, our position; nothing of ours to edit", grounds: [] },
      { id: "SEC-RECOVERY-data-class", who: "The data itself", may: "the closed file's facts, frozen at referral — PII whose retention clock is already running", grounds: [] },
    ],
    howBuilt: {
      status: "proposed — for the architect to confirm in Build",
      decisions: [
        { id: "HB-RECOVERY-packaging", aspect: "Packaging", choice: "A module beside adjudication; the lightest box in the cut", why: "Lowest volume, longest clocks — a service of its own buys nothing yet." },
        { id: "HB-RECOVERY-store", aspect: "Store", choice: "Relational, private", why: "Cases, demands, receipts — small and tabular." },
        { id: "HB-RECOVERY-doors", aspect: "Doors", choice: "Message door in (referral); carrier correspondence at the edge", why: "One seam in, the ledger path out." },
        { id: "HB-RECOVERY-runtime", aspect: "Runtime", choice: "The claims cluster", why: "Beside the file it argues from and the ledger it feeds." },
      ],
    },
    ownership: [
      { role: "Owning team", who: "Recovery & subrogation desk (Claims operations)", note: "Its own clock, its own counterparties — a desk, deliberately." },
      { role: "Decider", who: "ClaimsCore product owner", note: "Owns the biggest open item: no use case names recovery at all." },
      { role: "On call", who: "the owning team's rotation (from Build)", note: "Clock-driven — the pager is mostly the calendar." },
      { role: "Knowledge steward", who: "the box's agent + its knowledge-graph slice", note: "Keeps the wall, the packet and the code pointing at the same facts." },
    ],
    measures: [
      { id: "MEA-RECOVERY-capture", measure: "Capture rate", def: "Received / referred, in dollars", target: "the box's reason to exist, in one number", grounds: [] },
      { id: "MEA-RECOVERY-time-to-demand", measure: "Referral → demand", def: "Median business days", target: "under 10 — recovery value decays", grounds: [] },
      { id: "MEA-RECOVERY-response-rate", measure: "Response rate", def: "Demands answered by the deadline / all demands", target: "watched — silence is a counterparty strategy", grounds: [] },
      { id: "MEA-RECOVERY-arbitration", measure: "Arbitration rate", def: "Cases escalated / all cases", target: "watched — arbitration is slower and costlier than agreement", grounds: [] },
    ],
    knownGaps: [
      { id: "GAP-RECOVERY-no-usecase", text: "NO use case names recovery — the whole box is design-discovered supply with no captured demand. The largest single Discover gap in the cut.", where: "Capabilities" },
      { id: "GAP-RECOVERY-partial", text: "Partial recoveries (instalments against one demand) are unmodelled — Received assumes one payment.", where: "Lifecycle" },
      { id: "GAP-RECOVERY-how-built", text: "How it's built is PROPOSED — the architect has not confirmed.", where: "How it's built" },
    ],
  },

};
