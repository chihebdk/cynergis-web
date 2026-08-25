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
