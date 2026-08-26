"use client";

import { CLAIMS_DESIGN_STORMS } from "./claims-design-storms";

/* ============================================================
   D-177 — THE LIFE STORY of each box's record, as data.
   The design storm tells the story in time order; this file tells
   it in STAGES: what the record can be, what moves it, what may
   never happen. Every move names an event card on the wall — one
   set of facts, two views — and lifecycleCheck() keeps the two
   honest against each other.
   Plain-language field names on purpose (sponsor, 2026-08-25):
   stages · flags · moves · never.
   ============================================================ */

export const CLAIMS_LIFECYCLES = {
  "CTX-ADJUD": {
    record: "The claim file",
    aggregate: "AGG-CLAIM",
    stormId: "ds-adjud",
    summary:
      "Six stages from opened to closed, a denied lane beside them — and the three side paths that make it a real story: holds pause it, denials and closures can reopen, and money still arrives after close.",
    stages: [
      { id: "opened",     name: "Opened",           def: "A claim file exists, built from the registered report and its triage payload." },
      { id: "verified",   name: "Policy verified",  def: "The policy responds as at the date of loss — the file may proceed to coverage." },
      { id: "covered",    name: "Covered",          def: "Coverage is confirmed line by line; reserves and fault are worked at this stage." },
      { id: "settling",   name: "Amount set",       def: "The settlement is calculated from the estimate of record." },
      { id: "authorized", name: "Payment approved", def: "The payment instruction is issued; the money is now Claim payments' story." },
      { id: "closed",     name: "Closed",           def: "All settled, documented and hold-free — the file still listens for money and disputes.", terminal: true },
      { id: "denied",     name: "Denied",           def: "The claim does not proceed — with reasons on record; a challenge can reopen it.", side: true, terminal: true },
    ],
    flags: [
      { id: "hold", name: "Hold",
        def: "A pause flag on the file, typed by who set it (fraud & SIU, disputes). It stops payment approval and closing; only its owner releases it. Not a stage — the file keeps its stage while held." },
    ],
    moves: [
      { id: "TRN-ADJUD-open", from: null, eventId: "adj-opened", to: "opened",
        onlyIf: "The claim-opened message arrives from Intake & registration — one file per claim number, replays change nothing." },
      { id: "TRN-ADJUD-verify-policy", from: "opened", eventId: "adj-policy", to: "verified",
        onlyIf: "The stored coverage snapshot shows the policy in force at the date of loss." },
      { id: "TRN-ADJUD-deny-not-in-force", from: "opened", eventId: "adj-denied-force", to: "denied",
        onlyIf: "The snapshot shows no policy in force — the reasons go on record with the denial." },
      { id: "TRN-ADJUD-confirm-coverage", from: "verified", eventId: "adj-coverage", to: "covered",
        onlyIf: "The loss falls under a covered line, within its limits and deductible." },
      { id: "TRN-ADJUD-deny-no-coverage", from: "verified", eventId: "adj-denied-cover", to: "denied",
        onlyIf: "No covered line responds — the reasons go on record with the denial." },
      { id: "TRN-ADJUD-establish-reserve", from: "covered", eventId: "adj-reserve", to: "covered",
        onlyIf: "An initial reserve is set per coverage line — recorded on the file; the stage does not change." },
      { id: "TRN-ADJUD-determine-fault", from: "covered", eventId: "adj-fault", to: "covered",
        onlyIf: "Fault is determined under the applicable rules — recorded; the stage does not change." },
      { id: "TRN-ADJUD-calculate-settlement", from: "covered", eventId: "adj-calculated", to: "settling",
        onlyIf: "The repair-verified message brought the estimate of record (or the total-loss settlement stands in for it)." },
      { id: "TRN-ADJUD-authorize-payment", from: "settling", eventId: "adj-payauth", to: "authorized",
        onlyIf: "NO open holds, and the amount is within the handler's authority.",
        tells: "payment instruction → Claim payments" },
      { id: "TRN-ADJUD-close", from: "authorized", eventId: "adj-closed", to: "closed",
        onlyIf: "The payment-settled message is back and the closure checklist is green: all settled, no holds, no open tasks, documents complete.",
        tells: "recovery referral → Recovery & subrogation, when someone else should pay" },
      { id: "TRN-ADJUD-accept-credit", from: "closed", eventId: "adj-credit", to: "closed",
        onlyIf: "Money comes back (salvage proceeds, a recovery) — recorded as a new entry; nothing existing changes." },
      { id: "TRN-ADJUD-reopen-from-denied", from: "denied", eventId: "adj-reopened", to: "covered",
        onlyIf: "The decision is challenged — a NEW decision version opens; the old one is never edited." },
      { id: "TRN-ADJUD-reopen-from-closed", from: "closed", eventId: "adj-reopened", to: "covered",
        onlyIf: "A dispute reopens the closed file the same way — new version, full history." },
      { id: "TRN-ADJUD-apply-hold", from: null, eventId: "adj-hold", to: null, flag: "hold",
        onlyIf: "Someone with standing says stop — at any stage before Closed; the hold is typed by its origin." },
    ],
    never: [
      { id: "TRL-ADJUD-holds-gate-money", inv: "INV-ADJUD-holds-gate",
        rule: "No payment is approved while any hold is open.",
        why: "Holds exist to stop money — an approval that ignores one is the bug the business cannot forgive." },
      { id: "TRL-ADJUD-closed-never-edited", inv: "INV-ADJUD-closed-append-only",
        rule: "A closed file is never edited.",
        why: "Late money lands as new credit entries; what was decided stays exactly as decided." },
      { id: "TRL-ADJUD-denial-carries-reasons",
        rule: "A denial never leaves without its reasons.",
        why: "The reasons are what the claimant can challenge — and what the regulator reads." },
      { id: "TRL-ADJUD-reopen-versions-decisions", inv: "INV-ADJUD-decisions-append-only",
        rule: "Reopening never overwrites a decision.",
        why: "A new decision version is added; every prior decision stays on record." },
      { id: "TRL-ADJUD-authority-limit", inv: "INV-ADJUD-reserve-evented-authority", grounds: ["FR5"],
        rule: "No approval beyond the handler's authority.",
        why: "Bigger amounts need a bigger authority — the limit is checked in code, not trusted." },
      { id: "TRL-ADJUD-status-every-move", grounds: ["FR10"],
        rule: "Every stage change publishes to the status stream.",
        why: "The claimant's picture of the claim is only as true as the stream — a silent move is a lie by omission." },
    ],
  },

  "CTX-INTAKE": {
    record: "The loss report",
    aggregate: "AGG-LOSSREPORT",
    stormId: "ds-intake",
    summary: "Four stages from the first word of a loss to a numbered claim. Merges land within Reported — however many channels touch the loss, one report carries it.",
    stages: [
      { id: "reported",   name: "Reported",   def: "A loss report exists — the incident's earliest record, whatever the channel." },
      { id: "triaged",    name: "Triaged",    def: "Severity is assessed; a handling lane and an initial reserve estimate are suggested." },
      { id: "completed",  name: "Completed",  def: "Intake concludes under licensed review; the report is confirmed complete for handoff." },
      { id: "registered", name: "Registered", def: "The report is a claim — numbered, notice-dated, and published to adjudication.", terminal: true },
    ],
    flags: [],
    moves: [
      { id: "TRN-INTAKE-report", from: null, eventId: "di-reported", to: "reported",
        onlyIf: "A first notice arrives on any door — portal, desk, or the police feed through the ACL." },
      { id: "TRN-INTAKE-merge", from: "reported", eventId: "di-merged", to: "reported",
        onlyIf: "A later submission matches on parties, vehicle, and date and place of loss — consolidated, never duplicated." },
      { id: "TRN-INTAKE-triage", from: "reported", eventId: "di-triaged", to: "triaged",
        onlyIf: "The severity model scores the report as facts land; the number is a suggestion, not a decision." },
      { id: "TRN-INTAKE-complete", from: "triaged", eventId: "di-completed", to: "completed",
        onlyIf: "Mandatory fields for the channel are present, and the licensed intake role signs the completion." },
      { id: "TRN-INTAKE-register", from: "completed", eventId: "di-registered", to: "registered",
        onlyIf: "No claim exists on this loss; the number and statutory notice date are assigned.",
        tells: "claim opened → Claim adjudication" },
    ],
    never: [
      { id: "TRL-INTAKE-one-loss-one-report", inv: "INV-INTAKE-one-loss-one-report", grounds: ["FR1"],
        rule: "One loss never has two reports.",
        why: "Every channel merges into the same record — a duplicate report becomes a duplicate claim downstream." },
      { id: "TRL-INTAKE-provenance-survives", 
        rule: "A merge never loses what was reported.",
        why: "Provenance per field survives — who said what, through which door, stays on record." },
      { id: "TRL-INTAKE-licensed-completion", inv: "INV-INTAKE-licensed-completion",
        rule: "Only the licensed intake role completes a report.",
        why: "Completion is a regulated judgment, not a checkbox — the licence is the authority." },
      { id: "TRL-INTAKE-one-loss-one-claim", inv: "INV-INTAKE-one-loss-one-claim", grounds: ["FR1"],
        rule: "Registration never issues a second claim number for the same loss.",
        why: "The registration-side dedup — distinct from the report merge, and just as absolute." },
    ],
  },

  "CTX-REPAIR": {
    record: "The repair case",
    aggregate: "AGG-REPAIRCASE",
    stormId: "ds-repair",
    summary: "From the appraisal request to a verified repair — with the one exit that is not a repair at all: an estimate over the total-loss line hands the vehicle over.",
    stages: [
      { id: "requested",  name: "Requested",   def: "An appraisal request from adjudication opens the case." },
      { id: "assigned",   name: "Assigned",    def: "A network shop has accepted the assignment." },
      { id: "estimated",  name: "Estimated",   def: "The damage is priced — the estimate of record exists." },
      { id: "approved",   name: "Approved",    def: "The estimate (and any supplements) is approved; work may proceed." },
      { id: "completed",  name: "Completed",   def: "The shop reports the work done." },
      { id: "verified",   name: "Verified",    def: "Coordination signs the completed work; the estimate of record returns to adjudication.", terminal: true },
      { id: "handedover", name: "Handed over", def: "The estimate breached the total-loss line — the vehicle is Total loss & salvage's story now.", side: true, terminal: true },
    ],
    flags: [],
    moves: [
      { id: "TRN-REPAIR-request", from: null, eventId: "dr-requested", to: "requested",
        onlyIf: "The appraisal-request message arrives from adjudication — one open request per claim." },
      { id: "TRN-REPAIR-assign", from: "requested", eventId: "dr-accepted", to: "assigned",
        onlyIf: "A network shop accepts, within capacity and programme terms." },
      { id: "TRN-REPAIR-estimate", from: "assigned", eventId: "dr-estimate", to: "estimated",
        onlyIf: "The shop prices the damage against guide times and rates." },
      { id: "TRN-REPAIR-declare-breach", from: "estimated", eventId: "dr-breach", to: "handedover",
        onlyIf: "The estimate crosses the total-loss line — repair activity stops on declaration.",
        tells: "threshold breach → Total loss & salvage" },
      { id: "TRN-REPAIR-approve", from: "estimated", eventId: "dr-approved", to: "approved",
        onlyIf: "Coordination approves the estimate under the coverage ceiling." },
      { id: "TRN-REPAIR-supplement", from: "approved", eventId: "dr-supplement", to: "approved",
        onlyIf: "Hidden damage is found — the supplement appends to the estimate of record; the stage does not change." },
      { id: "TRN-REPAIR-complete", from: "approved", eventId: "dr-completed", to: "completed",
        onlyIf: "The shop reports completion with its evidence." },
      { id: "TRN-REPAIR-verify", from: "completed", eventId: "dr-verified", to: "verified",
        onlyIf: "The work matches the approved estimate and supplements — verification signs on the evidence.",
        tells: "repair verified → Claim adjudication" },
    ],
    never: [
      { id: "TRL-REPAIR-one-estimate", inv: "INV-REPAIR-one-estimate-of-record",
        rule: "One estimate of record per case.",
        why: "Supplements append to it — a second estimate is a second version of the truth." },
      { id: "TRL-REPAIR-no-work-before-approval",
        rule: "No repair work is authorized before the estimate is approved.",
        why: "Unapproved work is unpriced liability — the shop's risk becomes the claimant's dispute." },
      { id: "TRL-REPAIR-never-settle-total-loss", inv: "INV-REPAIR-threshold-hands-over", grounds: ["FR9"],
        rule: "Coordination never settles a total loss.",
        why: "Over the line, the vehicle is a disposition problem, not a repair — one file, one owner, and it is not this one." },
    ],
  },

  "CTX-PAYMENTS": {
    record: "The payment ledger",
    aggregate: "AGG-PAYLEDGER",
    stormId: "ds-payments",
    summary: "An instruction's life: received, dispatched, settled — or failed, never silently. Credits are their own lane: money in, booked and published, even against a closed claim.",
    stages: [
      { id: "instructed", name: "Instructed", def: "A payment instruction is on the ledger — instructed-not-yet-settled." },
      { id: "dispatched", name: "Dispatched", def: "The payment left for execution — the outcome is owed." },
      { id: "settled",    name: "Settled",    def: "The money moved; the outcome event has returned to adjudication.", terminal: true },
      { id: "failed",     name: "Failed",     def: "The payment bounced — recorded, tasked, never silent.", side: true, terminal: true },
      { id: "credited",   name: "Credited",   def: "Money came back in — salvage or recovery — booked and published.", side: true, terminal: true },
    ],
    flags: [],
    moves: [
      { id: "TRN-PAYMENTS-receive", from: null, eventId: "dp-received", to: "instructed",
        onlyIf: "The payment-instruction message arrives — one instruction_id, one ledger entry, replays are no-ops." },
      { id: "TRN-PAYMENTS-dispatch", from: "instructed", eventId: "dp-dispatched", to: "dispatched",
        onlyIf: "The payee and method verify against the payee view — never free text." },
      { id: "TRN-PAYMENTS-settle", from: "dispatched", eventId: "dp-settled", to: "settled",
        onlyIf: "Execution confirms the money moved.",
        tells: "payment settled → Claim adjudication" },
      { id: "TRN-PAYMENTS-fail", from: "dispatched", eventId: "dp-failed", to: "failed",
        onlyIf: "Execution reports a bounce — the failure is recorded with its reason and tasked." },
      { id: "TRN-PAYMENTS-book-credit", from: null, eventId: "dp-credit", to: "credited",
        onlyIf: "Salvage proceeds or a recovery receipt arrives — booked on the ledger, then published.",
        tells: "credit received → Claim adjudication" },
    ],
    never: [
      { id: "TRL-PAYMENTS-exactly-once", grounds: ["FR6"],
        rule: "One instruction_id is executed exactly once.",
        why: "A replay that pays twice is the one failure no apology fixes." },
      { id: "TRL-PAYMENTS-append-only", inv: "INV-PAYMENTS-append-only",
        rule: "Ledger entries append; none is ever edited or deleted.",
        why: "The ledger is the audit — corrections are new entries with their reason." },
      { id: "TRL-PAYMENTS-single-truth", inv: "INV-PAYMENTS-ledger-single-truth", grounds: ["FR6"],
        rule: "No money fact exists outside the ledger.",
        why: "Two sources of truth about money always disagree eventually — and both get believed." },
      { id: "TRL-PAYMENTS-no-silent-failure",
        rule: "A failure is never silent.",
        why: "A bounced indemnity payment is a claimant not paid — the clock is still theirs." },
    ],
  },

  "CTX-TOTALLOSS": {
    record: "The salvage case",
    aggregate: "AGG-SALVAGECASE",
    stormId: "ds-totalloss",
    summary: "One vehicle, one disposition: valued, settled, titled, disposed — and the proceeds go home through the ledger.",
    stages: [
      { id: "received", name: "Received",          def: "The threshold breach arrived — the vehicle is this box's story now." },
      { id: "valued",   name: "Valued",            def: "Actual cash value stands on comparables, on record." },
      { id: "settled",  name: "Settled",           def: "The owner accepted the offer — liens read before any funds move." },
      { id: "titled",   name: "Title transferred", def: "The brand is filed; the title has moved." },
      { id: "disposed", name: "Disposed",          def: "The salvage is sold; the proceeds published to the ledger.", terminal: true },
    ],
    flags: [],
    moves: [
      { id: "TRN-TOTALLOSS-receive", from: null, eventId: "dt-received", to: "received",
        onlyIf: "The threshold-breach message arrives with the estimate of record — one case per vehicle.", },
      { id: "TRN-TOTALLOSS-value", from: "received", eventId: "dt-valued", to: "valued",
        onlyIf: "Comparables for this vehicle and market are assembled — the offer will stand on them." },
      { id: "TRN-TOTALLOSS-settle", from: "valued", eventId: "dt-settled", to: "settled",
        onlyIf: "The owner accepts; lien and title status are read before funds move." },
      { id: "TRN-TOTALLOSS-title", from: "settled", eventId: "dt-branded", to: "titled",
        onlyIf: "The brand is filed with the registry and the transfer recorded." },
      { id: "TRN-TOTALLOSS-dispose", from: "titled", eventId: "dt-disposed", to: "disposed",
        onlyIf: "The salvage network completes the sale.",
        tells: "salvage proceeds → Claim payments" },
    ],
    never: [
      { id: "TRL-TOTALLOSS-one-disposition", inv: "INV-TOTALLOSS-one-vehicle-one-disposition", grounds: ["FR9"],
        rule: "One vehicle, one disposition.",
        why: "Settlement to the owner and recovery from the asset are the same file — two files is how vehicles get paid twice." },
      { id: "TRL-TOTALLOSS-lien-before-funds", inv: "INV-TOTALLOSS-lien-before-funds",
        rule: "No funds move before lien and title status are read.",
        why: "Paying the owner past a lienholder is paying twice, with interest and a lawyer." },
      { id: "TRL-TOTALLOSS-valuation-on-record",
        rule: "No offer without comparables on record.",
        why: "The offer that cannot show its comparables loses the dispute it causes." },
    ],
  },

  "CTX-RECOVERY": {
    record: "The recovery case",
    aggregate: "AGG-RECOVERYCASE",
    stormId: "ds-recovery",
    summary: "Recovers what others owe, against a closed claim, on its own clock: referred, demanded, received, closed.",
    stages: [
      { id: "referred", name: "Referred", def: "The closed file's facts opened the case — fault, quantum paid, evidence." },
      { id: "demanded", name: "Demanded", def: "The demand is issued to the responsible party or their carrier." },
      { id: "received", name: "Received", def: "Money came back — credited through Claim payments, never directly." },
      { id: "closed",   name: "Closed",   def: "The case concluded with its outcome on record — recovered, compromised, or exhausted.", terminal: true },
    ],
    flags: [],
    moves: [
      { id: "TRN-RECOVERY-open", from: null, eventId: "dv-referred", to: "referred",
        onlyIf: "The recovery-referred message arrives — only after the claim closes; the file's facts arrive frozen." },
      { id: "TRN-RECOVERY-demand", from: "referred", eventId: "dv-demand", to: "demanded",
        onlyIf: "The demand is built from the file's fault position and quantum paid — never beyond it." },
      { id: "TRN-RECOVERY-receive", from: "demanded", eventId: "dv-received", to: "received",
        onlyIf: "The responsible party pays — the receipt credits the claim through Claim payments." },
      { id: "TRN-RECOVERY-close", from: "received", eventId: "dv-closed", to: "closed",
        onlyIf: "Nothing more is recoverable — the outcome and its reasons go on record." },
    ],
    never: [
      { id: "TRL-RECOVERY-closed-claim-basis", inv: "INV-RECOVERY-closed-claim-basis",
        rule: "A recovery case exists only against a closed claim.",
        why: "Recovery argues from settled facts — an open file's facts are still moving." },
      { id: "TRL-RECOVERY-never-edits-the-claim",
        rule: "Recovery never edits the claim file.",
        why: "Its facts arrived frozen; what recovery learns goes back as referrals and credits, not edits." },
      { id: "TRL-RECOVERY-credits-via-payments", inv: "INV-RECOVERY-credits-via-payments",
        rule: "Every receipt credits the claim through Claim payments.",
        why: "Money that bypasses the ledger is money the audit cannot see." },
      { id: "TRL-RECOVERY-demand-ceiling",
        rule: "No demand exceeds the quantum actually paid.",
        why: "The ceiling is what the file spent — demanding more is a position that collapses in arbitration." },
    ],
  }
};

/* Each move's "grounded in" refs come from its event card on the wall —
   derived, never re-authored, JOINED BY CARD ID (D-187: never by title).
   An event with no refs is an unmined assertion. */
export function lifecycleGrounds(ctxId) {
  const lc = CLAIMS_LIFECYCLES[ctxId];
  if (!lc) return {};
  const storm = CLAIMS_DESIGN_STORMS.find((m) => m.contextId === ctxId);
  return Object.fromEntries(
    (storm ? storm.nodes : []).filter((n) => n.kind === "event").map((n) => [n.id, n.grounds || []])
  );
}

/* Display names derive from the wall — the card id is the reference, the
   title is presentation. Rename a card and every page follows. */
export function lifecycleEventNames(ctxId) {
  const storm = CLAIMS_DESIGN_STORMS.find((m) => m.contextId === ctxId);
  return Object.fromEntries(
    (storm ? storm.nodes : []).filter((n) => n.kind === "event").map((n) => [n.id, n.summary])
  );
}

/* The automatic check: the story vs the wall. A card with no row, a row
   with no card, or a stage nothing can reach — each is a finding. Silent
   when healthy (the tripwire pattern, D-166/D-170). */
export function lifecycleCheck(ctxId) {
  const lc = CLAIMS_LIFECYCLES[ctxId];
  if (!lc) return null;
  const storm = CLAIMS_DESIGN_STORMS.find((m) => m.contextId === ctxId);
  const wall = storm ? storm.nodes.filter((n) => n.kind === "event") : [];
  const wallIds = new Set(wall.map((n) => n.id));
  const nameOf = Object.fromEntries(wall.map((n) => [n.id, n.summary]));
  const storyIds = new Set(lc.moves.map((m) => m.eventId));
  const cardsWithoutRow = [...wallIds].filter((e) => !storyIds.has(e)).map((e) => nameOf[e]);
  const rowsWithoutCard = [...storyIds].filter((e) => !wallIds.has(e));
  const reach = new Set();
  const grow = (id) => {
    if (!id || reach.has(id)) return;
    reach.add(id);
    lc.moves.filter((m) => m.from === id && m.to && m.to !== id).forEach((m) => grow(m.to));
  };
  lc.moves.filter((m) => m.from === null && m.to).forEach((m) => grow(m.to));
  const unreachable = lc.stages.filter((s) => !reach.has(s.id)).map((s) => s.name);
  return {
    cardsWithoutRow, rowsWithoutCard, unreachable,
    healthy: !cardsWithoutRow.length && !rowsWithoutCard.length && !unreachable.length,
  };
}
