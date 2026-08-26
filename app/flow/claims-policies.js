"use client";

/* ============================================================
   D-183 — AUTHORED POLICIES per bounded context.
   A policy carries ONLY what no other artifact does: the reaction's
   DECISION (whenever this → then that, under what condition) and its
   OBLIGATIONS (executed by automation or a person · how fast · what
   happens when it can't). The door's mechanics stay on the trigger
   record, the state change on the command, the legality on the
   lifecycle, the gates on the business rules — no duplication.
   `mode`: automated | manual — per event storming, a policy is the
   business's reflex however executed; automation is an attribute.
   `eventId` joins the wall card the reaction produces BY ID (D-187 —
   never by title); a policy with no card is itself a wall gap, said
   out loud. `fromCtx`/`contract` are id joins to the source box and
   the border agreement the reaction rides.
   ============================================================ */

export const CONTEXT_POLICIES = {
  "CTX-ADJUD": [
    { id: "POL-ADJUD-open-on-claim-opened", when: "claim opened arrives", from: "Intake & registration", fromCtx: "CTX-INTAKE", contract: "CT-claim-opened", then: "Create the claim file", eventId: "adj-opened",
      mode: "automated", sla: "immediate",
      cant: "Replays of the same claim number are no-ops — one file, ever.", grounds: ["UC3", "FR3"] },
    { id: "POL-ADJUD-calculate-on-repair-verified", when: "repair verified arrives", from: "Repair & estimate coordination", fromCtx: "CTX-REPAIR", contract: "CT-repair-verified", then: "Calculate the settlement", eventId: "adj-calculated",
      mode: "automated", sla: "same day",
      cant: "If the file has left Covered (denied, reopened under review) — a handler task instead of a silent calculation.", grounds: ["UC6", "FR6"] },
    { id: "POL-ADJUD-close-on-payment-settled", when: "payment settled arrives", from: "Claim payments", fromCtx: "CTX-PAYMENTS", contract: "CT-payment-settled", then: "Run the closure checklist; close when green", eventId: "adj-closed",
      mode: "automated", sla: "same day",
      cant: "Checklist not green (open task, hold, missing document) — a handler task with the failing lines.", grounds: [] },
    { id: "POL-ADJUD-apply-credit", when: "a credit arrives — salvage or recovery", from: "Claim payments", fromCtx: "CTX-PAYMENTS", then: "Apply the credit to the file, open or closed", eventId: "adj-credit",
      mode: "automated", sla: "same day",
      cant: "A credit that matches no claim number goes to a suspense queue — never dropped.", grounds: [] },
    { id: "POL-ADJUD-suspend-on-hold", when: "a hold is applied", from: "own event", then: "Suspend authorization & closure; notify the handler", eventId: "adj-hold",
      mode: "automated", sla: "immediate",
      cant: "—", grounds: [] },
    { id: "POL-ADJUD-rerun-gates-on-hold-release", when: "a hold is released by its owner", from: "own event — no card on the wall yet (a gap)", then: "Re-run the gates; resume where the file stood", eventId: null,
      mode: "automated", sla: "immediate",
      cant: "—", grounds: [] },
    { id: "POL-ADJUD-reopen-on-challenge", when: "the decision is challenged", from: "Disputes & appeals", then: "Open a new decision version and reassess", eventId: "adj-reopened",
      mode: "manual", sla: "per the dispute process clock",
      cant: "The challenge is logged even when reassessment is refused — the refusal is itself a decision version.", grounds: [] },
    { id: "POL-ADJUD-communicate-denial", when: "a claim is denied", from: "own event", then: "Communicate the decision with its reasons", eventId: "adj-denied-cover",
      mode: "automated", sla: "statutory notice period",
      cant: "An undeliverable notice becomes a handler task — the clock does not stop.", grounds: ["FR10"] },
    { id: "POL-ADJUD-reserve-review-clock", when: "a reserve goes untouched for 30 days on an active file", from: "the clock", then: "Prompt a reserve review", eventId: "adj-reserve",
      mode: "manual", sla: "review within 5 business days",
      cant: "—", grounds: [] },
    { id: "POL-ADJUD-hold-escalation-clock", when: "a hold stays open past its review period", from: "the clock", then: "Escalate to the hold's owner", eventId: "adj-hold",
      mode: "automated", sla: "at the period boundary, then weekly",
      cant: "—", grounds: [] },  ],

  "CTX-INTAKE": [
    { id: "POL-INTAKE-merge-on-police-notice", when: "a police report notice arrives", from: "Provincial police feed", contract: "CT-police-notice", then: "Open or merge the loss report", eventId: "di-reported",
      mode: "automated", sla: "immediate",
      cant: "A notice the ACL cannot translate goes to the dead-letter queue — never silently dropped.", grounds: ["FR1"] },
    { id: "POL-INTAKE-rescore-on-facts", when: "new facts land on a report", from: "own event", then: "Re-score severity & refresh the lane", eventId: "di-triaged",
      mode: "automated", sla: "immediate",
      cant: "—", grounds: ["FR2"] },
    { id: "POL-INTAKE-chase-incomplete", when: "a report stays incomplete past its channel deadline", from: "the clock", then: "Chase the reporter; escalate to the desk lead", eventId: null,
      mode: "manual", sla: "chase at deadline, escalate 3 days after",
      cant: "An unreachable reporter is escalated, not abandoned — the report never just sits.", grounds: [] },
    { id: "POL-INTAKE-acknowledge-registration", when: "a claim is registered", from: "own event", then: "Acknowledge to the claimant with the claim number", eventId: "di-registered",
      mode: "automated", sla: "statutory acknowledgment period",
      cant: "An undeliverable acknowledgment becomes a desk task — the clock does not stop.", grounds: [] },  ],

  "CTX-REPAIR": [
    { id: "POL-REPAIR-open-on-request", when: "an appraisal request arrives", from: "Claim adjudication", fromCtx: "CTX-ADJUD", contract: "CT-appraisal-request", then: "Open the case & assign a network shop", eventId: "dr-requested",
      mode: "automated", sla: "assignment within 1 business day",
      cant: "No shop in capacity — escalate to the network desk; the request never queues silently.", grounds: [] },
    { id: "POL-REPAIR-breach-on-threshold", when: "an estimate crosses the total-loss line", from: "own event", contract: "CT-threshold-breach", then: "Declare the breach & stop repair activity", eventId: "dr-breach",
      mode: "automated", sla: "immediate",
      cant: "—", grounds: ["FR9"] },
    { id: "POL-REPAIR-review-supplement", when: "a shop requests a supplement", from: "Repair shops & glass network", then: "Review & approve or decline the supplement", eventId: "dr-supplement",
      mode: "manual", sla: "decision within 2 business days",
      cant: "Work on the supplemented lines waits — an undecided supplement never becomes silent approval.", grounds: [] },
    { id: "POL-REPAIR-chase-idle", when: "an assigned case goes idle past its SLA", from: "the clock", then: "Chase the shop; reassign after the second chase", eventId: null,
      mode: "automated", sla: "chase at SLA, reassign at 2×",
      cant: "—", grounds: [] },
    { id: "POL-REPAIR-verify-completion", when: "the shop reports completion", from: "Repair shops & glass network", then: "Verify against the approved estimate & publish repair-verified", eventId: "dr-verified",
      mode: "manual", sla: "verification within 2 business days",
      cant: "Evidence short of the approved estimate — back to the shop with the failing lines, never a partial sign-off.", grounds: [] },
  ],

  "CTX-PAYMENTS": [
    { id: "POL-PAYMENTS-dispatch-on-instruction", when: "a payment instruction arrives", from: "Claim adjudication", fromCtx: "CTX-ADJUD", contract: "CT-payment-instruction", then: "Validate the payee & dispatch", eventId: "dp-received",
      mode: "automated", sla: "same day",
      cant: "A payee that fails verification stops the dispatch — a task, never a guess.", grounds: ["FR6"] },
    { id: "POL-PAYMENTS-relay-outcome", when: "execution reports an outcome", from: "Legacy payment execution", then: "Confirm settled or record the failure; publish the outcome", eventId: "dp-settled",
      mode: "automated", sla: "same day", cant: "—", grounds: ["FR6"] },
    { id: "POL-PAYMENTS-task-failure", when: "a payment fails", from: "own event", then: "Task ops & notify adjudication with the reason", eventId: "dp-failed",
      mode: "automated", sla: "immediate",
      cant: "—", grounds: [] },
    { id: "POL-PAYMENTS-book-salvage", when: "salvage proceeds arrive", from: "Total loss & salvage", fromCtx: "CTX-TOTALLOSS", contract: "CT-salvage-proceeds", then: "Book the credit & publish credit-received", eventId: "dp-credit",
      mode: "automated", sla: "same day",
      cant: "A credit matching no claim number goes to the suspense queue — never dropped.", grounds: [] },
    { id: "POL-PAYMENTS-book-recovery", when: "a recovery receipt arrives", from: "Recovery & subrogation", fromCtx: "CTX-RECOVERY", then: "Book the credit & publish credit-received", eventId: "dp-credit",
      mode: "automated", sla: "same day",
      cant: "Same suspense rule — unmatched money waits visibly, never vanishes.", grounds: [] },
    { id: "POL-PAYMENTS-age-suspense", when: "a suspense entry ages past 5 days", from: "the clock", then: "Escalate to ops with the candidates", eventId: null,
      mode: "manual", sla: "review within 2 business days",
      cant: "—", grounds: [] },
  ],

  "CTX-TOTALLOSS": [
    { id: "POL-TOTALLOSS-open-on-breach", when: "a threshold breach arrives", from: "Repair & estimate coordination", fromCtx: "CTX-REPAIR", contract: "CT-threshold-breach", then: "Open the salvage case & start the valuation", eventId: "dt-received",
      mode: "automated", sla: "valuation started same day",
      cant: "—", grounds: ["FR9"] },
    { id: "POL-TOTALLOSS-offer-on-valuation", when: "the valuation completes", from: "own event", then: "Present the offer to the owner, comparables shown", eventId: "dt-valued",
      mode: "manual", sla: "offer within 1 business day of valuation",
      cant: "An owner who disputes gets the comparables and the appraisal-clause route — never a silence.", grounds: ["FR9"] },
    { id: "POL-TOTALLOSS-settle-on-acceptance", when: "the owner accepts", from: "Claimant & channels", then: "Read liens & title, then settle through adjudication's path", eventId: "dt-settled",
      mode: "manual", sla: "funds move only after liens clear",
      cant: "An uncleared lien holds the settlement — the owner is told why, with the holder named.", grounds: [] },
    { id: "POL-TOTALLOSS-dispose-on-title", when: "the title transfers", from: "own event", then: "Assign the salvage network & sell", eventId: "dt-disposed",
      mode: "automated", sla: "listed within 3 business days",
      cant: "—", grounds: [] },
    { id: "POL-TOTALLOSS-publish-proceeds", when: "the sale completes", from: "Salvage network", contract: "CT-salvage-proceeds", then: "Publish the proceeds to the ledger", eventId: "dt-disposed",
      mode: "automated", sla: "same day", cant: "—", grounds: ["FR9"] },
  ],

  "CTX-RECOVERY": [
    { id: "POL-RECOVERY-open-on-referral", when: "a recovery referral arrives", from: "Claim adjudication", fromCtx: "CTX-ADJUD", contract: "CT-recovery-referred", then: "Open the case & take the frozen position", eventId: "dv-referred",
      mode: "automated", sla: "same day",
      cant: "A referral on a claim that is not closed is refused back — the basis must be frozen.", grounds: [] },
    { id: "POL-RECOVERY-issue-demand", when: "the position is complete", from: "own event", then: "Build & issue the demand, capped at quantum paid", eventId: "dv-demand",
      mode: "manual", sla: "within 10 business days of referral",
      cant: "—", grounds: [] },
    { id: "POL-RECOVERY-escalate-overdue", when: "a demand's response is overdue", from: "the clock", then: "Escalate — inter-company arbitration or counsel", eventId: null,
      mode: "manual", sla: "at the response deadline",
      cant: "—", grounds: [] },
    { id: "POL-RECOVERY-credit-receipt", when: "the responsible party pays", from: "Other carriers", then: "Route the receipt through Claim payments", eventId: "dv-received",
      mode: "automated", sla: "same day",
      cant: "A direct payment offer is redirected to the ledger path — money never bypasses it.", grounds: [] },
    { id: "POL-RECOVERY-close-exhausted", when: "nothing more is recoverable", from: "own event", then: "Close with the outcome & reasons on record", eventId: "dv-closed",
      mode: "manual", sla: "—",
      cant: "—", grounds: [] },
  ],
};
