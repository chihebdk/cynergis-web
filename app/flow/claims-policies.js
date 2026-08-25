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
   `card` names the wall event the reaction produces (its anchor);
   a policy with no card is itself a wall gap, said out loud.
   ============================================================ */

export const CONTEXT_POLICIES = {
  "CTX-ADJUD": [
    { when: "claim opened arrives", from: "Intake & registration", then: "Create the claim file", card: "Claim opened",
      mode: "automated", sla: "immediate",
      cant: "Replays of the same claim number are no-ops — one file, ever.", grounds: ["UC3", "FR3"] },
    { when: "repair verified arrives", from: "Repair & estimate coordination", then: "Calculate the settlement", card: "Settlement calculated",
      mode: "automated", sla: "same day",
      cant: "If the file has left Covered (denied, reopened under review) — a handler task instead of a silent calculation.", grounds: ["UC6", "FR6"] },
    { when: "payment settled arrives", from: "Claim payments", then: "Run the closure checklist; close when green", card: "Claim closed",
      mode: "automated", sla: "same day",
      cant: "Checklist not green (open task, hold, missing document) — a handler task with the failing lines.", grounds: [] },
    { when: "a credit arrives — salvage or recovery", from: "Claim payments", then: "Apply the credit to the file, open or closed", card: "Credit accepted after close",
      mode: "automated", sla: "same day",
      cant: "A credit that matches no claim number goes to a suspense queue — never dropped.", grounds: [] },
    { when: "a hold is applied", from: "own event", then: "Suspend authorization & closure; notify the handler", card: "Hold applied",
      mode: "automated", sla: "immediate",
      cant: "—", grounds: [] },
    { when: "a hold is released by its owner", from: "own event — no card on the wall yet (a gap)", then: "Re-run the gates; resume where the file stood", card: null,
      mode: "automated", sla: "immediate",
      cant: "—", grounds: [] },
    { when: "the decision is challenged", from: "Disputes & appeals", then: "Open a new decision version and reassess", card: "Claim reopened",
      mode: "manual", sla: "per the dispute process clock",
      cant: "The challenge is logged even when reassessment is refused — the refusal is itself a decision version.", grounds: [] },
    { when: "a claim is denied", from: "own event", then: "Communicate the decision with its reasons", card: "Claim denied — no coverage",
      mode: "automated", sla: "statutory notice period",
      cant: "An undeliverable notice becomes a handler task — the clock does not stop.", grounds: ["FR10"] },
    { when: "a reserve goes untouched for 30 days on an active file", from: "the clock", then: "Prompt a reserve review", card: "Reserve established",
      mode: "manual", sla: "review within 5 business days",
      cant: "—", grounds: [] },
    { when: "a hold stays open past its review period", from: "the clock", then: "Escalate to the hold's owner", card: "Hold applied",
      mode: "automated", sla: "at the period boundary, then weekly",
      cant: "—", grounds: [] },
  ],
};
