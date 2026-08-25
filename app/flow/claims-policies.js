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
      cant: "An undeliverable acknowledgment becomes a desk task — the clock does not stop.", grounds: [] },
  ],
};
