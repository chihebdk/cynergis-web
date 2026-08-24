"use client";

/* ============================================================
   D-150 — BUSINESS JOURNEYS (the Design phase's first entry).
   The storming arc starts here: one big-picture storm per journey,
   ALL "storm fully" journeys on the wall BEFORE decomposition —
   the gate banner computes from these statuses. Industry-grounded
   inventory for the claims modernization (sponsor-approved,
   2026-08-23); the spine owner authors, other products contribute.
   status: not-stormed → stormed → decomposed (events rehomed into
   context storms; the big picture becomes the stitched projection).
   ============================================================ */

export const BUSINESS_JOURNEYS = [
  {
    id: "BJ-1", product: "PROD-CLAIMSCORE", name: "Have my claim handled",
    actor: "Claimant", span: "Loss occurs → claim closed",
    needs: "Everything — the spine: intake and triage, coverage and reserves, the status stream at every milestone.",
    treatment: "storm", status: "decomposed",
    note: "Starts at the LOSS, not at claim-created — first notice is part of the journey; the portal is one door in, not the starting line. Stormed and decomposed: its events live in the context storms, and the stitched projection is the end-to-end workflow on the domain's Workflows page.",
  },
  {
    id: "BJ-2", product: "PROD-CLAIMSCORE", name: "Get the vehicle repaired",
    actor: "Repair shop / glass vendor", span: "Assignment received → repair completed → paid for the work",
    needs: "Assignments out, estimates and supplements in, approval decisions, vendor payment instruction.",
    treatment: "storm", status: "not-stormed",
    note: "The shop's own lens on the claim: same events, different actor, different measures — cycle time, supplement rate, payment latency. The repair portal's reason to exist.",
  },
  {
    id: "BJ-3", product: "PROD-CLAIMSCORE", name: "Pay and get paid",
    actor: "Finance · claimant · vendors", span: "First payable event → all money settled",
    needs: "Payment instructions out, settlement confirmations in, the instructed-not-yet-settled ledger state; money in — salvage proceeds, recoveries, deductibles.",
    treatment: "storm", status: "not-stormed",
    note: "Crosses claims and billing — which is exactly why the payment seam must not be frozen until this journey is on the wall.",
  },
  {
    id: "BJ-4", product: "PROD-CLAIMSCORE", name: "Recover what others owe",
    actor: "Recovery specialist", span: "Settlement paid → recovery closed (months later)",
    needs: "Reads the closed file; fault positions; credits recoveries back against it.",
    treatment: "sketch", status: "not-stormed",
    note: "Sketch, not a full storm — it exists to extract one fact that bends the model: recovery credits land against a CLOSED claim.",
  },
  {
    id: "BJ-5", product: "PROD-CLAIMSCORE", name: "Challenge the decision",
    actor: "Claimant (disputing)", span: "Decision communicated → dispute resolved",
    needs: "Reopen semantics, holds, the decision history and audit trail — review, appraisal, ombudsman, litigation hold.",
    treatment: "sketch", status: "not-stormed",
    note: "The forgotten journey with the sharpest design consequence: what does it mean to reopen a closed claim? The claim aggregate's lifecycle states depend on the answer.",
  },
  {
    id: "BJ-6", product: "PROD-CLAIMSCORE", name: "Investigate suspected fraud",
    actor: "SIU investigator", span: "Flag raised → findings returned",
    needs: "Settlement-gating holds; findings land as facts — SIU never edits the claim model.",
    treatment: "sketch", status: "not-stormed",
    note: "Its hold semantics can ride with BJ-5's sketch; kept separate because the actor and the accountability are different.",
  },
  {
    id: "BJ-7", product: "PROD-CLAIMSCORE", name: "Get my injuries treated",
    actor: "Injured person", span: "Injury reported → treatment concluded",
    needs: "The whole AB module — statutory clocks, HCAI behind the ACL, treatment plans.",
    treatment: "deferred", status: "not-stormed",
    note: "Deliberately last: the most regulated lifecycle in the book waits for a battle-tested engine and team.",
  },
  {
    id: "BJ-8", product: "PROD-CLAIMSCORE", name: "Survive the storm (catastrophe surge)",
    actor: "Claims operations", span: "CAT event declared → surge worked off → reinsurance reported",
    needs: "Mass intake, CAT coding, surge triage — an operational overlay on BJ-1 more than a model change.",
    treatment: "deferred", status: "not-stormed",
    note: "Revisit before scaling beyond the pilot segment.",
  },
];
