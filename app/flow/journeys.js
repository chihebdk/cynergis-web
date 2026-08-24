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
    treatment: "storm", status: "decomposed", storm: "wf-claims", stormVariant: "contextmap",
    note: "Starts at the LOSS, not at claim-created — first notice is part of the journey; the portal is one door in, not the starting line. Stormed and decomposed: its events live in the context storms, and the stitched projection is the end-to-end workflow on the domain's Workflows page.",
  },
  {
    id: "BJ-2", product: "PROD-CLAIMSCORE", name: "Get the vehicle repaired",
    actor: "Repair shop / glass vendor", span: "Assignment received → repair completed → paid for the work",
    needs: "Assignments out, estimates and supplements in, approval decisions, vendor payment instruction.",
    treatment: "storm", status: "stormed", storm: "bj-storm-2",
    note: "The shop's own lens on the claim: same events, different actor, different measures — cycle time, supplement rate, payment latency. The repair portal's reason to exist.",
  },
  {
    id: "BJ-3", product: "PROD-CLAIMSCORE", name: "Pay and get paid",
    actor: "Finance · claimant · vendors", span: "First payable event → all money settled",
    needs: "Payment instructions out, settlement confirmations in, the instructed-not-yet-settled ledger state; money in — salvage proceeds, recoveries, deductibles.",
    treatment: "storm", status: "stormed", storm: "bj-storm-3",
    note: "Crosses claims and billing — which is exactly why the payment seam must not be frozen until this journey is on the wall.",
  },
  {
    id: "BJ-4", product: "PROD-CLAIMSCORE", name: "Recover what others owe",
    actor: "Recovery specialist", span: "Settlement paid → recovery closed (months later)",
    needs: "Reads the closed file; fault positions; credits recoveries back against it.",
    treatment: "sketch", status: "stormed", storm: "bj-sketch-4",
    note: "Sketch, not a full storm — it exists to extract one fact that bends the model: recovery credits land against a CLOSED claim.",
  },
  {
    id: "BJ-5", product: "PROD-CLAIMSCORE", name: "Challenge the decision",
    actor: "Claimant (disputing)", span: "Decision communicated → dispute resolved",
    needs: "Reopen semantics, holds, the decision history and audit trail — review, appraisal, ombudsman, litigation hold.",
    treatment: "sketch", status: "stormed", storm: "bj-sketch-5",
    note: "The forgotten journey with the sharpest design consequence: what does it mean to reopen a closed claim? The claim aggregate's lifecycle states depend on the answer.",
  },
  {
    id: "BJ-6", product: "PROD-CLAIMSCORE", name: "Investigate suspected fraud",
    actor: "SIU investigator", span: "Flag raised → findings returned",
    needs: "Settlement-gating holds; findings land as facts — SIU never edits the claim model.",
    treatment: "sketch", status: "stormed", storm: "bj-sketch-6",
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

/* ── D-151: the big-picture storms themselves — FLAT, pre-decomposition.
   Events + actors + externals + hotspots only; no submaps, no triggers, no
   aggregates — that resolution belongs to the design-level storms after
   the boundaries are cut. BJ-1's storm is wf-claims (already decomposed,
   so its "storm" is the stitched projection). Sketches are deliberately
   low-resolution: each exists to force ONE model-bending fact. */
const ev = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "event", summary, description, ...extra });
const actor = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "actor", summary, description, ...extra });
const ext = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "external", summary, description, ...extra });

export const BJ_STORMS = [
  {
    id: "bj-storm-2", name: "BJ-2 · Get the vehicle repaired — big-picture storm", contextId: null,
    summary: "The shop's journey from assignment to getting paid. Flat storm — boundaries come later.",
    nodes: [
      actor("b2-shop", "start", "Repair shop / glass vendor", "The partner doing the work — their measures: cycle time, supplement rate, payment latency."),
      ev("b2-assigned", "b2-shop", "Assignment received", "The engine offers the job to a network shop; the shop accepts. HOTSPOT: shop selection — claimant choice vs steering is provincially regulated, and the rule lives in nobody's head.", { isPivotal: true, hotspots: [{ label: "Steering rules by province", desc: "Claimant choice vs network steering — regulated, undocumented, mine the legacy." }] }),
      ev("b2-inspected", "b2-assigned", "Vehicle received & inspected", "The shop takes the vehicle in and confirms the damage against the loss description."),
      ev("b2-estimate", "b2-inspected", "Estimate submitted", "Photos, lines, parts, hours — into the engine for approval."),
      ev("b2-approved", "b2-estimate", "Estimate approved", "Approval against the threshold. HOTSPOT: a breach of the total-loss threshold exits this journey mid-life — route where?", { isPivotal: true, hotspots: [{ label: "Threshold breach exits the journey", desc: "Estimate over the total-loss line hands the vehicle to salvage — the mid-life exit every strangler gets wrong." }] }),
      ev("b2-started", "b2-approved", "Repair started", "Parts ordered, work begins."),
      ev("b2-supplement", "b2-started", "Supplement requested & approved", "Hidden damage found once the vehicle is open — the loop that drives cycle time. HOTSPOT: supplement approval authority bands.", { branch: "hidden damage found", hotspots: [{ label: "Supplement authority", desc: "Who approves what amount without an adjuster touch — the straight-through boundary." }] }),
      ev("b2-completed", "b2-supplement", "Repair completed", "Vehicle returned to the claimant; completion confirmed."),
      ev("b2-invoiced", "b2-completed", "Invoice submitted", "The shop bills the agreed estimate plus approved supplements."),
      ev("b2-paid", "b2-invoiced", "Vendor payment received", "The shop is paid — this event belongs to BJ-3's wall too; it is the overlap that makes the payment seam a union decision.", { isPivotal: true, isEndNode: true }),
    ],
  },
  {
    id: "bj-storm-3", name: "BJ-3 · Pay and get paid — big-picture storm", contextId: null,
    summary: "Every dollar out and in, from first payable event to money settled. Flat storm — the payment seam is frozen only after this wall.",
    nodes: [
      ev("b3-instructed", "start", "Payment instructed", "Claims instructs — indemnity to the claimant or invoice to a vendor — and records instructed-not-yet-settled. Claims never moves money.", { isPivotal: true }),
      ext("b3-legacy", "b3-instructed", "Legacy payment execution", "The mainframe-side disbursement engine, behind the payment-instruction contract — modernized later without this journey noticing."),
      ev("b3-executed", "b3-legacy", "Payment executed", "The money actually moves — EFT, cheque, vendor remittance."),
      ev("b3-confirmed", "b3-executed", "Settlement confirmed", "Confirmation returns and the ledger state closes to settled. HOTSPOT: reconciliation — who owns the instructed-vs-settled ledger, claims or finance?", { isPivotal: true, hotspots: [{ label: "Reconciliation ownership", desc: "The instructed-not-yet-settled ledger needs one owner; today it is a mainframe batch job three people understand." }] }),
      ev("b3-claimant", "b3-confirmed", "Claimant indemnity settled", "The claimant's money lands; the deductible was applied at instruction time. HOTSPOT: deductible edge rules (waivers, glass endorsements) live in COBOL.", { branch: "money out · claimant", isEndNode: true, hotspots: [{ label: "Deductible edge rules", desc: "Waiver and endorsement interactions — transcribe from legacy, do not reinvent." }] }),
      ev("b3-vendor", "b3-confirmed", "Vendor invoice settled", "The shop or glass network is paid — the same event BJ-2 ends on.", { branch: "money out · vendor", isEndNode: true }),
      ev("b3-salvage", "b3-confirmed", "Salvage proceeds received", "Money IN: the disposed vehicle's proceeds credit the claim file.", { branch: "money in" }),
      ev("b3-recovery", "b3-salvage", "Recovery credited", "Subrogation and salvage credits land against the claim — possibly after it closed. The fact BJ-4 exists to force.", { isPivotal: true, isEndNode: true, hotspots: [{ label: "Credits against a closed claim", desc: "The claim lifecycle must accept post-close credits — design the states for it now." }] }),
    ],
  },
  {
    id: "bj-sketch-4", name: "BJ-4 · Recover what others owe — sketch", contextId: null,
    summary: "Low-resolution on purpose: this sketch exists to force one fact — recovery credits land against a CLOSED claim.",
    nodes: [
      ev("b4-closed", "start", "Claim closed & paid", "The starting condition: the file is closed, the money is out."),
      ev("b4-fault", "b4-closed", "Fault position established", "Fault determination rules applied; the recoverable share identified."),
      ev("b4-demand", "b4-fault", "Demand issued", "To the other carrier — inter-company loss transfer or arbitration."),
      ev("b4-received", "b4-demand", "Recovery received", "Months later, the money arrives."),
      ev("b4-credited", "b4-received", "Recovery credited to the CLOSED claim", "The model-bending fact: the claim must accept credits after close without reopening adjudication.", { isPivotal: true, isEndNode: true, hotspots: [{ label: "Post-close credit semantics", desc: "Closed is not terminal for money — the lifecycle needs a state for this." }] }),
    ],
  },
  {
    id: "bj-sketch-5", name: "BJ-5 · Challenge the decision — sketch", contextId: null,
    summary: "Low-resolution on purpose: this sketch exists to force the reopen semantics the claim aggregate must carry.",
    nodes: [
      ev("b5-communicated", "start", "Decision communicated", "Denial or quantum — the claimant is told."),
      ev("b5-disputed", "b5-communicated", "Dispute raised", "Internal review, appraisal process, ombudsman, or litigation — different clocks, same file."),
      ev("b5-reopened", "b5-disputed", "Claim REOPENED", "The model-bending fact: what does reopen mean — same aggregate, new decision version, full audit trail of the old one?", { isPivotal: true, hotspots: [{ label: "Reopen semantics", desc: "Reopen must preserve the decision history immutably — design the lifecycle states now, not at the first ombudsman letter." }] }),
      ev("b5-upheld", "b5-reopened", "Decision upheld", "The original decision stands; the dispute record closes.", { branch: "upheld", isEndNode: true }),
      ev("b5-adjusted", "b5-reopened", "Settlement adjusted & re-closed", "The decision changes; a corrected payment instructs; the file re-closes with both decisions on record.", { branch: "overturned", isEndNode: true }),
    ],
  },
  {
    id: "bj-sketch-6", name: "BJ-6 · Investigate suspected fraud — sketch", contextId: null,
    summary: "Low-resolution on purpose: holds gate settlement; findings land as facts — SIU never edits the claim model.",
    nodes: [
      ev("b6-flagged", "start", "Fraud flag raised", "A signal — model score, tip, pattern — attaches to the file."),
      ev("b6-hold", "b6-flagged", "Settlement hold applied", "The gate: payment cannot instruct while the hold stands.", { isPivotal: true }),
      ev("b6-concluded", "b6-hold", "Investigation concluded", "SIU works the case on their own timeline."),
      ev("b6-facts", "b6-concluded", "Findings recorded as facts", "Findings return AS FACTS on the file — SIU never edits the claim model.", { hotspots: [{ label: "Facts, never edits", desc: "The SIU boundary: their output is evidence on the claim, not mutations of it." }] }),
      ev("b6-released", "b6-facts", "Hold released", "Settlement may proceed — or the file routes to denial with the facts attached.", { isEndNode: true }),
    ],
  },
];
