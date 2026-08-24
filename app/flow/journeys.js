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
    treatment: "storm", status: "decomposed", storm: "bj-storm-1",
    note: "Starts at the LOSS, not at claim-created — first notice is part of the journey; the portal is one door in, not the starting line. Decomposed: its moments now live in the six design-level context storms (D-154–D-156); the big picture remains as the wall it was drawn on.",
  },
  {
    id: "BJ-2", product: "PROD-CLAIMSCORE", name: "Get the vehicle repaired",
    actor: "Repair shop / glass vendor", span: "Assignment received → repair completed → paid for the work",
    needs: "Assignments out, estimates and supplements in, approval decisions, vendor payment instruction.",
    treatment: "storm", status: "decomposed", storm: "bj-storm-2",
    note: "The shop's own lens on the claim: same events, different actor, different measures — cycle time, supplement rate, payment latency. The repair portal's reason to exist.",
  },
  {
    id: "BJ-3", product: "PROD-CLAIMSCORE", name: "Pay and get paid",
    actor: "Finance · claimant · vendors", span: "First payable event → all money settled",
    needs: "Payment instructions out, settlement confirmations in, the instructed-not-yet-settled ledger state; money in — salvage proceeds, recoveries, deductibles.",
    treatment: "storm", status: "decomposed", storm: "bj-storm-3",
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
    id: "bj-storm-1", name: "BJ-1 · Have my claim handled — big-picture storm (from scratch)", contextId: null,
    summary: "The claim from request to close, one moment per card, nothing combined. Actions and policies live in each card's properties; the cards read as the story. Clusters carry no grounds yet — every ⚠ is an unmined industry assertion, on purpose.",
    nodes: [
      ev("b1-registered", "start", "Claim registered", "The claim request is registered — numbered, dated, and checked against existing claims.", {
        isPivotal: true,
        commands: [{ label: "Validate the submission", on: "CLAIM" }, { label: "Check for an existing claim on this loss", on: "CLAIM" }, { label: "Assign the claim number & notice date", on: "CLAIM" }],
        businessRules: [{ label: "One loss, one claim — merge, never duplicate" }, { label: "Statutory notice-date rules" }] }),
      ev("b1-denied-force", "b1-registered", "Claim denied — policy not in force", "The claim is denied — the policy was not in force at the date of loss.", { branch: "policy not in force", isEndNode: true,
        businessRules: [{ label: "Cancellation & non-payment grace periods" }] }),
      ev("b1-policy", "b1-registered", "Policy verified", "The policy is verified in force as at the date of loss.", {
        commands: [{ label: "Retrieve the policy as at date of loss", on: "CLAIM" }, { label: "Confirm vehicle & driver on the policy", on: "CLAIM" }],
        businessRules: [{ label: "In-force rules; newly-acquired-vehicle rules" }],
        hotspots: [{ label: "Snapshot from the mainframe", desc: "The policy of record IS the mainframe until policy admin modernizes — the snapshot ACL is the strangler seam." }] }),
      ev("b1-denied-cover", "b1-policy", "Claim denied — no coverage", "The claim is denied — no coverage responds — with the reasons on record.", { branch: "coverage declined", isEndNode: true,
        businessRules: [{ label: "Exclusion doctrine (commercial use, impairment, racing)" }] }),
      ev("b1-coverage", "b1-policy", "Coverage confirmed", "Coverage is confirmed and the deductible identified.", { isPivotal: true,
        commands: [{ label: "Map loss cause to coverages & endorsements", on: "CLAIM" }, { label: "Identify the deductible", on: "CLAIM" }],
        businessRules: [{ label: "Coverage matching per the policy wording" }, { label: "Endorsement precedence" }],
        hotspots: [{ label: "Deductible & endorsement edge rules", desc: "Waivers and glass endorsements interact in COBOL — transcribe, do not reinvent." }] }),
      ev("b1-assigned", "b1-coverage", "Claim assigned", "The claim is assigned to a handling lane and an adjuster.", {
        commands: [{ label: "Assess severity & score fraud signals", on: "CLAIM" }, { label: "Route to a lane (glass fast-track / desk / field)", on: "CLAIM" }],
        businessRules: [{ label: "Segmentation & straight-through eligibility" }] }),
      ev("b1-fraud-hold", "b1-assigned", "Fraud hold applied", "A fraud hold is applied; settlement is gated while it stands.", { branch: "signals say look closer",
        businessRules: [{ label: "Holds gate settlement; findings return as facts (BJ-6)" }] }),
      ev("b1-reserve", "b1-assigned", "Reserve established", "An initial reserve is established for the expected cost.", {
        commands: [{ label: "Set the initial reserve per coverage line", on: "CLAIM" }],
        businessRules: [{ label: "Reserving guidelines & authority limits" }, { label: "Every reserve move is evented" }] }),
      ev("b1-fault", "b1-reserve", "Fault determined", "Fault is determined under the applicable rules — or recorded as not applicable.", {
        commands: [{ label: "Apply the fault determination rules", on: "CLAIM" }, { label: "Record the fault split", on: "CLAIM" }],
        businessRules: [{ label: "The fault chart is regulation, not judgment" }] }),
      ev("b1-appraisal", "b1-fault", "Appraisal requested", "An appraisal channel is selected and the assignment dispatched.", {
        commands: [{ label: "Select the appraisal channel (shop / staff / photo)", on: "CLAIM" }],
        businessRules: [{ label: "Shop choice vs steering — provincially regulated" }] }),
      ev("b1-estimate", "b1-appraisal", "Estimate submitted", "The repair estimate is submitted.", {
        commands: [{ label: "Inspect & prepare the estimate", on: "ESTIMATE" }],
        businessRules: [{ label: "Rate agreements; OEM vs aftermarket parts" }] }),
      ev("b1-totalloss", "b1-estimate", "Total loss declared", "The estimate breaches the total-loss threshold; the vehicle exits to the write-off path.", { branch: "over the threshold", isEndNode: true,
        businessRules: [{ label: "Threshold: estimate vs actual cash value" }] }),
      ev("b1-approved", "b1-estimate", "Estimate approved", "The estimate is approved.", { isPivotal: true,
        commands: [{ label: "Audit the estimate", on: "ESTIMATE" }, { label: "Check the total-loss threshold", on: "ESTIMATE" }] }),
      ev("b1-authorized", "b1-approved", "Repair authorized", "The repair is authorized against the reserve.", {
        commands: [{ label: "Authorize & commit the amount against the reserve", on: "CLAIM" }],
        businessRules: [{ label: "Authorization authority bands" }] }),
      ev("b1-supplement", "b1-authorized", "Supplement approved", "A supplement is approved for damage found mid-repair.", { branch: "hidden damage found",
        businessRules: [{ label: "Supplement authority — the straight-through boundary" }] }),
      ev("b1-completed", "b1-authorized", "Repair completed", "The repair is completed.", {}),
      ev("b1-verified", "b1-completed", "Repair verified", "The repair is verified and the vehicle returned.", {
        commands: [{ label: "Verify the work (photos, QA sample, claimant sign-off)", on: "CLAIM" }] }),
      ev("b1-calculated", "b1-verified", "Settlement calculated", "The settlement is calculated — the payable amount and its payees.", { isPivotal: true,
        commands: [{ label: "Compute payable: approved + supplements − deductible − betterment", on: "SETTLEMENT" }, { label: "Determine payees (direct-pay vs reimburse)", on: "SETTLEMENT" }],
        businessRules: [{ label: "Deductible application & waivers" }, { label: "Betterment schedule; direct-pay agreements" }] }),
      ev("b1-payauth", "b1-calculated", "Payment authorized", "The payment is authorized after authority, hold, and payee checks.", {
        commands: [{ label: "Check authority band, standing holds, payee screening", on: "SETTLEMENT" }],
        businessRules: [{ label: "A standing hold stops everything here" }] }),
      ev("b1-instructed", "b1-payauth", "Payment instructed", "The payment instruction is issued.", { isPivotal: true,
        businessRules: [{ label: "Claims instructs; it never moves money" }, { label: "Recorded as instructed-not-yet-settled" }] }),
      ev("b1-settled", "b1-instructed", "Payment settled", "The payment settles and confirmation is recorded.", {
        businessRules: [{ label: "Reconciliation; failed-payment void & reissue" }] }),
      ev("b1-recovery-ref", "b1-settled", "Recovery referred", "A recovery is referred; pursuit continues on its own timeline.", { branch: "something to recover", isEndNode: true }),
      ev("b1-recovery", "b1-settled", "Recovery assessed", "Recovery potential is assessed with none identified.", {
        commands: [{ label: "Assess subrogation, deductible recovery, salvage", on: "CLAIM" }] }),
      ev("b1-closed", "b1-recovery", "Claim closed", "The claim is closed with all obligations settled.", { isPivotal: true, isEndNode: true,
        businessRules: [{ label: "Closure checklist: all settled, no holds, no open tasks" }, { label: "Closed still accepts post-close credits and reopening (BJ-4 · BJ-5)" }] }),
    ],
  },
  {
    id: "bj-storm-2", name: "BJ-2 · Get the vehicle repaired — big-picture storm", contextId: null,
    summary: "The shop's journey from assignment to getting paid. Flat storm — boundaries come later.",
    nodes: [
      actor("b2-shop", "start", "Repair shop / glass vendor", "The repair partner performing the work."),
      ev("b2-assigned", "b2-shop", "Assignment received", "The assignment is offered and accepted by a network shop.", { isPivotal: true, hotspots: [{ label: "Steering rules by province", desc: "Claimant choice vs network steering — regulated, undocumented, mine the legacy." }] }),
      ev("b2-inspected", "b2-assigned", "Vehicle received & inspected", "The vehicle is received and the damage verified against the loss report."),
      ev("b2-estimate", "b2-inspected", "Estimate submitted", "The repair estimate is submitted."),
      ev("b2-approved", "b2-estimate", "Estimate approved", "The estimate is approved — or breaches the total-loss threshold and exits.", { isPivotal: true, hotspots: [{ label: "Threshold breach exits the journey", desc: "Estimate over the total-loss line hands the vehicle to salvage — the mid-life exit every strangler gets wrong." }] }),
      ev("b2-started", "b2-approved", "Repair started", "Parts are ordered and the repair begins."),
      ev("b2-supplement", "b2-started", "Supplement requested & approved", "A supplement is approved for damage found once the vehicle is open.", { branch: "hidden damage found", hotspots: [{ label: "Supplement authority", desc: "Who approves what amount without an adjuster touch — the straight-through boundary." }] }),
      ev("b2-completed", "b2-supplement", "Repair completed", "The repair is completed and the vehicle returned to the claimant."),
      ev("b2-invoiced", "b2-completed", "Invoice submitted", "The invoice is submitted for the agreed work."),
      ev("b2-paid", "b2-invoiced", "Vendor payment received", "The vendor payment is received — the point where this journey meets Pay and get paid.", { isPivotal: true, isEndNode: true }),
    ],
  },
  {
    id: "bj-storm-3", name: "BJ-3 · Pay and get paid — big-picture storm", contextId: null,
    summary: "Every dollar out and in, from first payable event to money settled. Flat storm — the payment seam is frozen only after this wall.",
    nodes: [
      ev("b3-instructed", "start", "Payment instructed", "A payment instruction is issued and recorded as owed.", { isPivotal: true }),
      ext("b3-legacy", "b3-instructed", "Legacy payment execution", "The disbursement engine, behind the contract."),
      ev("b3-executed", "b3-legacy", "Payment executed", "The payment is executed."),
      ev("b3-confirmed", "b3-executed", "Settlement confirmed", "Settlement is confirmed; owed becomes settled.", { isPivotal: true, hotspots: [{ label: "Reconciliation ownership", desc: "The instructed-not-yet-settled ledger needs one owner; today it is a mainframe batch job three people understand." }] }),
      ev("b3-claimant", "b3-confirmed", "Claimant indemnity settled", "The claimant's indemnity settles, net of deductible.", { branch: "money out · claimant", isEndNode: true, hotspots: [{ label: "Deductible edge rules", desc: "Waiver and endorsement interactions — transcribe from legacy, do not reinvent." }] }),
      ev("b3-vendor", "b3-confirmed", "Vendor invoice settled", "The vendor invoice settles — the repair journey's final event.", { branch: "money out · vendor", isEndNode: true }),
      ev("b3-salvage", "b3-confirmed", "Salvage proceeds received", "Salvage proceeds are received as an inbound credit.", { branch: "money in" }),
      ev("b3-recovery", "b3-salvage", "Recovery credited", "A recovery is credited to the claim — even after close.", { isPivotal: true, isEndNode: true, hotspots: [{ label: "Credits against a closed claim", desc: "The claim lifecycle must accept post-close credits — design the states for it now." }] }),
    ],
  },
  {
    id: "bj-sketch-4", name: "BJ-4 · Recover what others owe — sketch", contextId: null,
    summary: "Low-resolution on purpose: this sketch exists to force one fact — recovery credits land against a CLOSED claim.",
    nodes: [
      ev("b4-closed", "start", "Claim closed & paid", "The claim is closed and indemnity paid — the recovery baseline."),
      ev("b4-fault", "b4-closed", "Fault position established", "The recoverable share is established."),
      ev("b4-demand", "b4-fault", "Demand issued", "A demand is issued to the responsible carrier."),
      ev("b4-received", "b4-demand", "Recovery received", "The recovery is received, often months later."),
      ev("b4-credited", "b4-received", "Recovery credited to the CLOSED claim", "The recovery is credited to the already-closed claim.", { isPivotal: true, isEndNode: true, hotspots: [{ label: "Post-close credit semantics", desc: "Closed is not terminal for money — the lifecycle needs a state for this." }] }),
    ],
  },
  {
    id: "bj-sketch-5", name: "BJ-5 · Challenge the decision — sketch", contextId: null,
    summary: "Low-resolution on purpose: this sketch exists to force the reopen semantics the claim aggregate must carry.",
    nodes: [
      ev("b5-communicated", "start", "Decision communicated", "The decision is communicated to the claimant."),
      ev("b5-disputed", "b5-communicated", "Dispute raised", "The claimant disputes the decision."),
      ev("b5-reopened", "b5-disputed", "Claim REOPENED", "The claim is reopened with its decision history intact.", { isPivotal: true, hotspots: [{ label: "Reopen semantics", desc: "Reopen must preserve the decision history immutably — design the lifecycle states now, not at the first ombudsman letter." }] }),
      ev("b5-upheld", "b5-reopened", "Decision upheld", "The original decision is upheld.", { branch: "upheld", isEndNode: true }),
      ev("b5-adjusted", "b5-reopened", "Settlement adjusted & re-closed", "The decision is revised and the claim re-closed, both decisions on record.", { branch: "overturned", isEndNode: true }),
    ],
  },
  {
    id: "bj-sketch-6", name: "BJ-6 · Investigate suspected fraud — sketch", contextId: null,
    summary: "Low-resolution on purpose: holds gate settlement; findings land as facts — SIU never edits the claim model.",
    nodes: [
      ev("b6-flagged", "start", "Fraud flag raised", "A fraud indicator is raised against the file."),
      ev("b6-hold", "b6-flagged", "Settlement hold applied", "A settlement hold is applied while the investigation stands.", { isPivotal: true }),
      ev("b6-concluded", "b6-hold", "Investigation concluded", "The investigation concludes on SIU's timeline."),
      ev("b6-facts", "b6-concluded", "Findings recorded as facts", "The findings are recorded on the file as facts.", { hotspots: [{ label: "Facts, never edits", desc: "The SIU boundary: their output is evidence on the claim, not mutations of it." }] }),
      ev("b6-released", "b6-facts", "Hold released", "The hold is released — settlement resumes or the claim routes to denial.", { isEndNode: true }),
    ],
  },
];

/* ── D-153: the context map of the ACCEPTED CUT (step 3 of the arc) ──
   Six contexts + deferred AB, a relationship pattern on every seam. Flat
   tree; ContextKind chips classify the nodes. Supersedes cc-contextmap as
   ClaimsCore's map (the old map stays registered — rehome, never remove). */
const cx = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "context", summary, description, ...extra });
const seam = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "seam", summary, description, ...extra });

export const claimsCutMap = {
  id: "cm-claims-v2", name: "Context map — the accepted cut (D-152)", contextId: null,
  summary: "Six contexts and the deferred AB lane, cut against the union of BJ-1/2/3 and the sketch-facts. Every seam names its relationship pattern; the one bend from the old walls is Claim payments, extracted from adjudication.",
  nodes: [
    actor("cm2-claimant", "start", "Claimant & channels", "Everyone who can start or follow a claim — portal, phone, broker, police feed."),
    cx("cm2-intake", "cm2-claimant", "Intake & registration · CORE", "The doors, and the moment a request becomes a numbered claim."),
    seam("cm2-s-opened", "cm2-intake", "claim opened", "Customer–supplier: intake supplies the registered claim; adjudication negotiates what the payload must carry."),
    cx("cm2-adjud", "cm2-s-opened", "Claim adjudication · CORE", "Does the policy respond, for how much, on whose authority. Owns the claim lifecycle: holds, reopen with history intact, post-close credits."),
    ext("cm2-x-mainframe", "cm2-adjud", "Mainframe policy system", "ACL — the coverage snapshot as at date of loss, consumed as an event. The strangler seam: policy admin modernizes later without adjudication noticing.", { isEndNode: true }),
    ext("cm2-x-siu", "cm2-adjud", "Fraud & SIU", "Published events — holds gate settlement; findings return as facts, never edits.", { isEndNode: true }),
    ext("cm2-x-portals", "cm2-adjud", "Customer & broker portals", "Open host — the status stream reports every milestone; portals conform to the published language.", { isEndNode: true }),
    cx("cm2-ab", "cm2-adjud", "Accident benefits · CORE — deferred", "The injury lane: statutory clocks, HCAI. Deliberately last.", { branch: "injury lane", isEndNode: true }),
    seam("cm2-s-appraisal", "cm2-adjud", "appraisal request", "Customer–supplier: adjudication asks for the damage to be priced; the estimate of record returns."),
    cx("cm2-repair", "cm2-s-appraisal", "Repair & estimate coordination · SUPPORTING", "The claims-side authority over an externally executed repair: assignment, approval, supplements, verification."),
    ext("cm2-x-shops", "cm2-repair", "Repair shops & glass network", "Partner surface — the repair portal; the shops execute, coordination approves.", { isEndNode: true }),
    seam("cm2-s-threshold", "cm2-repair", "threshold breach", "Customer–supplier: an estimate over the total-loss line hands the vehicle over with the estimate of record."),
    cx("cm2-total", "cm2-s-threshold", "Total loss & salvage · SUPPORTING", "Valuation, owner settlement, title branding, disposal — one vehicle, one disposition."),
    seam("cm2-s-salvage", "cm2-total", "salvage proceeds", "Published events: disposal proceeds credit the claim through Claim payments.", { isEndNode: true }),
    seam("cm2-s-payinstr", "cm2-adjud", "payment instruction", "Customer–supplier — THE NEW SEAM: adjudication instructs, payments executes the ledger. Two storms drew it independently (BJ-2 ends on the event BJ-3 settles)."),
    cx("cm2-pay", "cm2-s-payinstr", "Claim payments · SUPPORTING", "The owed/settled ledger: instructed-not-yet-settled, reconciliation, void & reissue. Extracted from adjudication — its own language."),
    ext("cm2-x-disburse", "cm2-pay", "Legacy payment execution", "Conformist behind the payment-instruction contract — execution modernizes later without this map changing.", { isEndNode: true }),
    seam("cm2-s-credits", "cm2-pay", "money in — salvage & recovery credits", "Published events: credits land against the claim, even after it has closed.", { isEndNode: true }),
    seam("cm2-s-recovery", "cm2-adjud", "recovery referred", "Customer–supplier, post-close: the closed file's facts open the recovery case.", { branch: "after close" }),
    cx("cm2-recovery", "cm2-s-recovery", "Recovery & subrogation · SUPPORTING", "Recovers what others owe, against a closed claim, on its own clock."),
    ext("cm2-x-carriers", "cm2-recovery", "Other carriers", "Inter-company demands and arbitration — their process, our position.", { isEndNode: true }),
  ],
};

/* ── D-157: THE DECOMPOSITION, made explicit ──
   Every storm EVENT gets exactly one home context (one-home-per-card).
   Grouping is by language affinity, not by journey — which is why homes
   cross journey lines. Actors/externals have no home; SIU-owned moments
   sit outside the cut (EXT). The journey × context matrix and the
   per-journey map views compute from these tags. Judgment calls recorded:
   assignment/lane is adjudication work-management; the invoice belongs to
   the repair case, the vendor payment to the ledger; the total-loss
   DECLARATION is repair's exit, the write-off path starts at receipt. */
/* home id → chip colors (D-163: one color per bounded context) */
export const HOME_COLORS = {
  "CTX-INTAKE":    { ink: "#3730a3", bg: "#eef2ff", line: "#c7d2fe" },   /* indigo */
  "CTX-ADJUD":     { ink: "#1d4ed8", bg: "#eff6ff", line: "#bfdbfe" },   /* blue */
  "CTX-REPAIR":    { ink: "#0e7490", bg: "#ecfeff", line: "#a5f3fc" },   /* cyan */
  "CTX-PAYMENTS":  { ink: "#047857", bg: "#ecfdf5", line: "#a7f3d0" },   /* green */
  "CTX-TOTALLOSS": { ink: "#b45309", bg: "#fffbeb", line: "#fde68a" },   /* amber */
  "CTX-RECOVERY":  { ink: "#be185d", bg: "#fdf2f8", line: "#fbcfe8" },   /* pink */
  "EXT-SIU":       { ink: "#4b5563", bg: "#f9fafb", line: "#e5e7eb" },   /* gray — outside the cut */
};

/* home id → display name (the chip under each storm card, D-162) */
export const HOME_NAMES = {
  "CTX-INTAKE": "Intake & registration",
  "CTX-ADJUD": "Claim adjudication",
  "CTX-REPAIR": "Repair & estimate coordination",
  "CTX-PAYMENTS": "Claim payments",
  "CTX-TOTALLOSS": "Total loss & salvage",
  "CTX-RECOVERY": "Recovery & subrogation",
  "EXT-SIU": "Fraud & SIU · outside the cut",
};

export const EVENT_HOMES = {
  /* BJ-1 · have my claim handled */
  "wf-b1-registered": null, /* (unused guard) */
  "b1-registered": "CTX-INTAKE",
  "b1-denied-force": "CTX-ADJUD", "b1-policy": "CTX-ADJUD", "b1-denied-cover": "CTX-ADJUD",
  "b1-coverage": "CTX-ADJUD", "b1-assigned": "CTX-ADJUD", "b1-fraud-hold": "CTX-ADJUD",
  "b1-reserve": "CTX-ADJUD", "b1-fault": "CTX-ADJUD",
  "b1-appraisal": "CTX-REPAIR", "b1-estimate": "CTX-REPAIR", "b1-totalloss": "CTX-REPAIR",
  "b1-approved": "CTX-REPAIR", "b1-authorized": "CTX-REPAIR", "b1-supplement": "CTX-REPAIR",
  "b1-completed": "CTX-REPAIR", "b1-verified": "CTX-REPAIR",
  "b1-calculated": "CTX-ADJUD", "b1-payauth": "CTX-ADJUD",
  "b1-instructed": "CTX-PAYMENTS", "b1-settled": "CTX-PAYMENTS",
  "b1-recovery-ref": "CTX-RECOVERY", "b1-recovery": "CTX-ADJUD", "b1-closed": "CTX-ADJUD",
  /* BJ-2 · get the vehicle repaired */
  "b2-assigned": "CTX-REPAIR", "b2-inspected": "CTX-REPAIR", "b2-estimate": "CTX-REPAIR",
  "b2-approved": "CTX-REPAIR", "b2-started": "CTX-REPAIR", "b2-supplement": "CTX-REPAIR",
  "b2-completed": "CTX-REPAIR", "b2-invoiced": "CTX-REPAIR",
  "b2-paid": "CTX-PAYMENTS",
  /* BJ-3 · pay and get paid */
  "b3-instructed": "CTX-PAYMENTS", "b3-executed": "CTX-PAYMENTS", "b3-confirmed": "CTX-PAYMENTS",
  "b3-claimant": "CTX-PAYMENTS", "b3-vendor": "CTX-PAYMENTS",
  "b3-salvage": "CTX-PAYMENTS", "b3-recovery": "CTX-PAYMENTS",
  /* BJ-4 · recover what others owe */
  "b4-closed": "CTX-ADJUD", "b4-fault": "CTX-RECOVERY", "b4-demand": "CTX-RECOVERY",
  "b4-received": "CTX-RECOVERY", "b4-credited": "CTX-ADJUD",
  /* BJ-5 · challenge the decision */
  "b5-communicated": "CTX-ADJUD", "b5-disputed": "CTX-ADJUD", "b5-reopened": "CTX-ADJUD",
  "b5-upheld": "CTX-ADJUD", "b5-adjusted": "CTX-ADJUD",
  /* BJ-6 · investigate suspected fraud — SIU's own moments sit OUTSIDE the cut */
  "b6-flagged": "EXT-SIU", "b6-hold": "CTX-ADJUD", "b6-concluded": "EXT-SIU",
  "b6-facts": "CTX-ADJUD", "b6-released": "CTX-ADJUD",
};
for (const m of BJ_STORMS) for (const n of m.nodes) {
  if (n.kind === "event" && EVENT_HOMES[n.id]) n.home = EVENT_HOMES[n.id];
}

/* ── D-163: PIVOTAL, redefined and DERIVED — the sponsor's definition:
   "pivotal is the node where we are changing the context." A card is
   pivotal iff any of its child events lives in a DIFFERENT home. The old
   hand-flagged narrative pivots are stripped: pivotal is computed from the
   decomposition now, never authored. */
for (const m of BJ_STORMS) {
  const evs = m.nodes.filter((n) => n.kind === "event");
  for (const n of evs) delete n.isPivotal;
  for (const n of evs) {
    if (!n.home) continue;
    const kids = evs.filter((k) => k.parentId === n.id);
    if (kids.some((k) => k.home && k.home !== n.home)) n.isPivotal = true;
  }
}

/* ── D-165: THE RECONCILIATION — every journey card mapped to the design
   card(s) that realize it. Three honest values:
     [ids]           → realized by those design-storm cards
     "journey-only"  → an actor-lens moment no wall should model
     null            → A GAP: a moment no wall has designed yet (a finding)
   The reverse check (design cards no journey reaches) is computed. */
import { CLAIMS_DESIGN_STORMS as _DS } from "./claims-design-storms";

export const EVENT_REALIZES = {
  /* BJ-1 */
  "b1-registered": ["di-registered"], "b1-denied-force": ["adj-denied-force"], "b1-policy": ["adj-policy"],
  "b1-denied-cover": ["adj-denied-cover"], "b1-coverage": ["adj-coverage"],
  "b1-assigned": null,                       /* GAP: lane/handler assignment — work management, not yet designed */
  "b1-fraud-hold": ["adj-hold"], "b1-reserve": ["adj-reserve"], "b1-fault": ["adj-fault"],
  "b1-appraisal": ["dr-requested", "dr-accepted"], "b1-estimate": ["dr-estimate"], "b1-totalloss": ["dr-breach"],
  "b1-approved": ["dr-approved"], "b1-authorized": ["dr-approved"],   /* authorization folded into approval (authority bands live there) */
  "b1-supplement": ["dr-supplement"], "b1-completed": ["dr-completed"], "b1-verified": ["dr-verified"],
  "b1-calculated": ["adj-calculated"], "b1-payauth": ["adj-payauth"],
  "b1-instructed": ["dp-received"], "b1-settled": ["dp-settled"],
  "b1-recovery-ref": ["dv-referred"],
  "b1-recovery": null,                       /* GAP: the recovery ASSESSMENT at closure is not a designed moment */
  "b1-closed": ["adj-closed"],
  /* BJ-2 */
  "b2-assigned": ["dr-accepted"],
  "b2-inspected": "journey-only",            /* shop-internal */
  "b2-estimate": ["dr-estimate"], "b2-approved": ["dr-approved"],
  "b2-started": "journey-only",              /* shop-internal */
  "b2-supplement": ["dr-supplement"], "b2-completed": ["dr-completed"],
  "b2-invoiced": null,                       /* GAP: the vendor invoice moment is modeled nowhere */
  "b2-paid": ["dp-settled"],
  /* BJ-3 */
  "b3-instructed": ["dp-received"], "b3-executed": ["dp-dispatched"], "b3-confirmed": ["dp-settled"],
  "b3-claimant": ["dp-settled"], "b3-vendor": ["dp-settled"],
  "b3-salvage": ["dp-credit"], "b3-recovery": ["dp-credit"],
  /* BJ-4 */
  "b4-closed": ["adj-closed"],
  "b4-fault": null,                          /* GAP: recovery-side fault positioning is not designed */
  "b4-demand": ["dv-demand"], "b4-received": ["dv-received"], "b4-credited": ["adj-credit"],
  /* BJ-5 */
  "b5-communicated": null,                   /* GAP: decision communication is a policy, never an event — design question */
  "b5-disputed": "journey-only",             /* the claimant's act; our response is the reopen */
  "b5-reopened": ["adj-reopened"],
  "b5-upheld": null,                         /* GAP: the review outcome (upheld) is not designed */
  "b5-adjusted": null,                       /* GAP: the re-decision + re-close path is not designed */
  /* BJ-6 */
  "b6-flagged": "journey-only",              /* SIU's own moment, outside the cut */
  "b6-hold": ["adj-hold"],
  "b6-concluded": "journey-only",            /* SIU's own moment */
  "b6-facts": null,                          /* GAP: findings-recorded-as-facts has no design card */
  "b6-released": null,                       /* GAP: hold release has no design card */
};
for (const m of BJ_STORMS) for (const n of m.nodes) {
  if (n.kind === "event" && n.id in EVENT_REALIZES) n.realizes = EVENT_REALIZES[n.id];
}

/* ── D-166: the reverse-check TRIAGE — every unreached design card carries a
   recorded verdict, and the page section renders only UNTRIAGED cards (so
   it disappears when healthy and reappears the moment a new wall grows
   cards no journey demands — a tripwire, not a scoreboard). */
export const RECON_TRIAGE = {
  /* BJ-1's storm starts at registration; the journey itself starts at the
     loss — extending the storm back is an optional, parked action */
  "di-reported": "BJ-1 storm starts at registration (extension parked)",
  "di-merged": "BJ-1 storm starts at registration (extension parked)",
  "di-triaged": "BJ-1 storm starts at registration (extension parked)",
  "di-completed": "BJ-1 storm starts at registration (extension parked)",
  /* design-discovered moments below the journeys' resolution — accepted */
  "adj-opened": "design-discovered: the seam-entry moment BJ-1 compresses into registration",
  "dp-failed": "design-discovered: the failure path — journeys storm happy paths",
  "dv-closed": "design-discovered: case-close bookkeeping after BJ-4's last moment",
  /* the write-off path was designed but never told as a journey — the
     BJ-9 decision is parked with the sponsor */
  "dt-received": "write-off journey candidate (BJ-9 decision parked)",
  "dt-valued": "write-off journey candidate (BJ-9 decision parked)",
  "dt-settled": "write-off journey candidate (BJ-9 decision parked)",
  "dt-branded": "write-off journey candidate (BJ-9 decision parked)",
  "dt-disposed": "write-off journey candidate (BJ-9 decision parked)",
};

/* the two-way report: per-journey statuses + design cards no journey reaches */
export function reconReport() {
  const designById = {};
  for (const m of _DS) for (const n of m.nodes) if (n.kind === "event") designById[n.id] = { id: n.id, name: n.summary, ctx: m.contextId };
  const reached = new Set();
  const perJourney = {};
  for (const m of BJ_STORMS) {
    const r = { realized: 0, journeyOnly: [], gaps: [] };
    for (const n of m.nodes) {
      if (n.kind !== "event") continue;
      const v = EVENT_REALIZES[n.id];
      if (Array.isArray(v)) { r.realized += 1; v.forEach((d) => reached.add(d)); }
      else if (v === "journey-only") r.journeyOnly.push(n.summary);
      else r.gaps.push(n.summary);
    }
    perJourney[m.id] = r;
  }
  const unreached = Object.values(designById).filter((d) => !reached.has(d.id));
  const open = unreached.filter((d) => !RECON_TRIAGE[d.id]);   // only untriaged cards surface
  return { perJourney, unreached, open };
}
