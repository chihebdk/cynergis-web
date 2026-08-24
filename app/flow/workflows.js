"use client";

/* ============================================================
   D-148 — end-to-end WORKFLOWS (the FlowAI method, restored).
   Big-picture first: one storming flow per business workflow, from
   the initiating actor to the last settled fact, with the bounded
   contexts appearing as REUSABLE SUBMAPS grouping their events.
   The wall flows in claims-flows.js stay the single source of truth
   for event content — the workflow CLONES their event nodes (same
   summaries, triggers, grounds, arch) and re-chains them across the
   seams, so a card edited on the wall is the same card here.
   Collapsed submaps = the context-map reading; expanded = storming.
   Trigger kinds are read OFF THIS DRAWING (D-148): inside a submap →
   internal; crossing a submap boundary → domain call; from an
   external square → external system call.
   ============================================================ */

import { fnolFlow, coverageFlow, abFlow, totalLossFlow } from "./claims-flows";
import { CLAIMS_DESIGN_STORMS } from "./claims-design-storms";

/* D-160 · Phase B.2: the design-level storms are the projection source now */
export const DESIGN_STORMS_BY_PRODUCT = { "PROD-CLAIMSCORE": CLAIMS_DESIGN_STORMS };

/* clone a wall flow's event nodes into the workflow: wf- ids, submap
   membership, parent re-chained where the wall's own chain starts */
function takeEvents(flow, submapId, entryParent) {
  return flow.nodes
    .filter((n) => n.kind === "event")
    .map((n) => {
      const m = {
        ...structuredClone(n),
        id: `wf-${n.id}`,
        parentId: n.parentId === "start" ? entryParent : `wf-${n.parentId}`,
        submapId,
        bc: flow.contextId,
      };
      delete m.isEndNode;   // box exits route through the End marker (ccMembersOf's rule)
      return m;
    });
}

const fnol = takeEvents(fnolFlow, "sub-wf-fnol", "wf-initiators");
const cov = takeEvents(coverageFlow, "sub-wf-cov", "wf-seam-lossreport");
const ab = takeEvents(abFlow, "sub-wf-ab", "wf-hcai");
const tl = takeEvents(totalLossFlow, "sub-wf-tl", "wf-estimating");

/* Layout constraints learned from the working context maps: members carry no
   isEndNode (exits route through the End marker), and top-level nodes hang
   only off a collapsed submap's END member — AB and Total-loss fan out from
   Coverage's end alongside Billing. */

export const claimsWorkflow = {
  id: "wf-claims",
  name: "Claims workflow — a loss is reported → the claim is settled",
  contextId: null,
  summary:
    "The end-to-end business workflow, drawn BEFORE decomposition (D-148): initiators and external systems outside, each bounded context a submap around its events. Collapse the submaps to read the context map; expand them to read the storming detail.",
  nodes: [
    /* ── the doors into the workflow (outside every submap) ── */
    { id: "wf-initiators", type: "SimpleNode", parentId: "start", kind: "actor",
      summary: "Loss initiators",
      description: "Whoever first tells us about the loss: the claimant in the portal's digital FNOL pane, the claimant or a third party by phone (a licensed intake adjuster drives the conversation), a broker via the desk, or the provincial police-report feed arriving as messages. Four doors, one loss report — a later channel merges, never duplicates." },

    /* ── Notice of loss ── */
    ...fnol,

    /* the snapshot seam, consumed at claim open (recorded: Customer–supplier
       with Underwriting & Policy — adjudication never calls live systems) */
    { id: "wf-uw", type: "SimpleNode", parentId: "wf-f-completed", kind: "context", isEndNode: true,
      summary: "Underwriting & Policy",
      description: "Cross-domain seam — the immutable coverage snapshot as at date of loss is consumed as an event when the claim opens. Customer–supplier: no live policy calls at adjudication time." },

    /* the seam between the boxes — a submap's entry member must hang off a
       TOP-LEVEL node (cc-contextmap's junction rule), and the seam node IS
       the storming truth: only the published event crosses */
    { id: "wf-seam-lossreport", type: "SimpleNode", parentId: "wf-f-completed", kind: "seam",
      summary: "completed loss report",
      description: "Published event — the completed report + triage payload opens the claim. Customer–supplier: Notice of loss owns the event; Coverage & reserves negotiates the payload. Only the event crosses the boundary." },

    /* ── Coverage & reserves ── */
    ...cov,

    /* payment instruction crosses to Billing (recorded contract) */
    { id: "wf-billing", type: "SimpleNode", parentId: "wf-cv-paid", kind: "context", isEndNode: true,
      summary: "Billing & Money Movement",
      description: "Cross-domain seam — payment instruction events with the instructed-not-yet-settled ledger state. Billing executes and reconciles; Claims never moves money itself." },

    /* ── Accident benefits (entered via HCAI, the industry gateway) ── */
    { id: "wf-hcai", type: "SimpleNode", parentId: "wf-cv-paid", kind: "external",
      summary: "HCAI (industry gateway)",
      description: "External — OCF forms and invoices arrive through the ACL; adjudication outcomes return the same way. Conformist behind the ACL: the industry schema never enters the model." },
    ...ab,

    /* ── Total loss & salvage (entered on the threshold-breach seam) ── */
    { id: "wf-estimating", type: "SimpleNode", parentId: "wf-cv-paid", kind: "context",
      summary: "Estimating & repair",
      description: "Same-domain seam — the threshold-breach event with the estimate of record hands the vehicle over to salvage disposition. A Claims subdomain outside this product's walls." },
    ...tl,
  ],
};

export const claimsWorkflowSubmaps = [
  { id: "sub-wf-fnol", name: "Notice of loss", startNodeId: "wf-f-reported", endNodeId: "wf-f-completed", colorIndex: 0, mapIds: ["wf-claims"] },
  { id: "sub-wf-cov", name: "Coverage & reserves", startNodeId: "wf-cv-opened", endNodeId: "wf-cv-paid", colorIndex: 1, mapIds: ["wf-claims"] },
  { id: "sub-wf-ab", name: "Accident benefits", startNodeId: "wf-ab-received", endNodeId: "wf-ab-decided-esc", colorIndex: 2, mapIds: ["wf-claims"] },
  { id: "sub-wf-tl", name: "Total loss & salvage", startNodeId: "wf-tl-breach", endNodeId: "wf-tl-disposed", colorIndex: 3, mapIds: ["wf-claims"] },
];

/* ── D-160 · the stitched end-to-end projection v2 — the SIX NEW WALLS as
   submaps, chained on the accepted cut's seams. A projection of the design
   storms (cloned members, isEndNode stripped; junction rules per D-148):
   the truth lives in the context storms. Repair/payments/recovery fan out
   from adjudication's end member — a tree approximation, same class as v1. */
function takeStorm(storm, submapId, entryParent, prefix) {
  const ids = new Set(storm.nodes.filter((n) => n.kind === "event").map((n) => n.id));
  return storm.nodes.filter((n) => n.kind === "event").map((n) => {
    const m = structuredClone(n);
    m.id = `${prefix}${n.id}`;
    m.parentId = ids.has(n.parentId) ? `${prefix}${n.parentId}` : entryParent;
    m.submapId = submapId;
    m.bc = storm.contextId;
    delete m.isEndNode;
    return m;
  });
}
const _ds = Object.fromEntries(CLAIMS_DESIGN_STORMS.map((m) => [m.contextId, m]));
const _seam = (id, parentId, summary, description, extra = {}) =>
  ({ id, type: "SimpleNode", parentId, kind: "seam", summary, description, ...extra });
const _v2Intake = takeStorm(_ds["CTX-INTAKE"], "sub-wf2-intake", "wf2-initiators", "u2-");
const _v2Adjud = takeStorm(_ds["CTX-ADJUD"], "sub-wf2-adjud", "wf2-s-opened", "u2-");
const _v2Repair = takeStorm(_ds["CTX-REPAIR"], "sub-wf2-repair", "wf2-s-appraisal", "u2-");
const _v2Pay = takeStorm(_ds["CTX-PAYMENTS"], "sub-wf2-pay", "wf2-s-payinstr", "u2-");
const _v2TL = takeStorm(_ds["CTX-TOTALLOSS"], "sub-wf2-tl", "wf2-s-threshold", "u2-");
const _v2Rec = takeStorm(_ds["CTX-RECOVERY"], "sub-wf2-rec", "wf2-s-recovery", "u2-");

export const claimsWorkflowV2 = {
  id: "wf-claims-v2",
  name: "Claims workflow — the accepted cut, end to end",
  contextId: null,
  summary: "The stitched projection of the six design-level storms (D-154–D-156), chained on the typed seams of cm-claims-v2. Collapse the boxes to read the context map; expand them for the storming detail. The authored truth lives in each context's storm.",
  nodes: [
    { id: "wf2-initiators", type: "SimpleNode", parentId: "start", kind: "actor",
      summary: "Loss initiators",
      description: "Claimant in the portal pane, claimant or third party by phone, broker via the desk, police feed as messages — four doors, one loss report." },
    ...(_v2Intake),
    _seam("wf2-s-opened", "u2-di-registered", "claim opened",
      "Customer–supplier: the registered claim with the triage payload crosses to adjudication."),
    ...(_v2Adjud),
    _seam("wf2-s-appraisal", "u2-adj-closed", "appraisal request",
      "Customer–supplier: adjudication asks for the damage to be priced; the estimate of record returns."),
    ...(_v2Repair),
    _seam("wf2-s-threshold", "u2-dr-verified", "threshold breach",
      "Customer–supplier: over the total-loss line, the vehicle hands over with the estimate of record."),
    ...(_v2TL),
    _seam("wf2-s-payinstr", "u2-adj-closed", "payment instruction",
      "THE new seam: adjudication instructs, Claim payments executes the ledger."),
    ...(_v2Pay),
    _seam("wf2-s-settled", "u2-dp-settled", "payment settled", "Confirmation back to adjudication; the portals report it.", { isEndNode: true }),
    _seam("wf2-s-recovery", "u2-adj-closed", "recovery referred",
      "Customer–supplier, post-close: the closed file's facts open the recovery case."),
    ...(_v2Rec),
    { id: "wf2-x-mainframe", type: "SimpleNode", parentId: "u2-adj-closed", kind: "external", isEndNode: true,
      summary: "Mainframe policy system",
      description: "ACL — the coverage snapshot as at date of loss; the strangler seam." },
    { id: "wf2-x-siu", type: "SimpleNode", parentId: "u2-adj-closed", kind: "external", isEndNode: true,
      summary: "Fraud & SIU",
      description: "Published events — holds gate settlement; findings return as facts." },
  ],
};
export const claimsWorkflowV2Submaps = [
  { id: "sub-wf2-intake", name: "Intake & registration", startNodeId: "u2-di-reported", endNodeId: "u2-di-registered", colorIndex: 0, mapIds: ["wf-claims-v2"] },
  { id: "sub-wf2-adjud", name: "Claim adjudication", startNodeId: "u2-adj-opened", endNodeId: "u2-adj-closed", colorIndex: 1, mapIds: ["wf-claims-v2"] },
  { id: "sub-wf2-repair", name: "Repair & estimate coordination", startNodeId: "u2-dr-requested", endNodeId: "u2-dr-verified", colorIndex: 2, mapIds: ["wf-claims-v2"] },
  { id: "sub-wf2-pay", name: "Claim payments", startNodeId: "u2-dp-received", endNodeId: "u2-dp-settled", colorIndex: 3, mapIds: ["wf-claims-v2"] },
  { id: "sub-wf2-tl", name: "Total loss & salvage", startNodeId: "u2-dt-received", endNodeId: "u2-dt-disposed", colorIndex: 4, mapIds: ["wf-claims-v2"] },
  { id: "sub-wf2-rec", name: "Recovery & subrogation", startNodeId: "u2-dv-referred", endNodeId: "u2-dv-closed", colorIndex: 5, mapIds: ["wf-claims-v2"] },
];

/* ── Pass 1: the workflow inventory, per domain ──
   One entry per authored workflow; journeys without an authored workflow
   surface as candidates on the Workflows page (honest empty state). */
export const WORKFLOW_INVENTORY = [
  {
    id: "wf-claims-v2",   /* D-160: the stitched projection of the accepted cut (wf-claims v1 stays registered) */
    domain: "DOM-CLAIMS",
    product: "PROD-CLAIMSCORE",   /* owner: the product whose use cases form the spine (UC1–UC8); other products contribute surfaces */
    journey: "JR-CLAIM",
    name: "A loss is reported → the claim is settled",
    walls: ["CTX-INTAKE", "CTX-ADJUD", "CTX-REPAIR", "CTX-PAYMENTS", "CTX-TOTALLOSS", "CTX-RECOVERY"],
    status: "authored",
    /* Pass 3 — the boundary check: every workflow edge that crosses a submap
       boundary, verified against the RECORDED seams (member-graph contracts) */
    boundaryCheck: [
      { crossing: "Intake & registration → Claim adjudication", contract: "claim opened — customer–supplier (ClaimOpen v1)", ok: true },
      { crossing: "Claim adjudication → Repair & estimate coordination", contract: "appraisal request — customer–supplier; repair-verified returns", ok: true },
      { crossing: "Repair coordination → Total loss & salvage", contract: "threshold breach with the estimate of record — customer–supplier", ok: true },
      { crossing: "Claim adjudication → Claim payments", contract: "payment instruction — THE new seam (PaymentInstruction v1); payment-settled returns", ok: true },
      { crossing: "Claim adjudication → Recovery & subrogation", contract: "recovery referred — customer–supplier, post-close; credits return via payments", ok: true },
      { crossing: "Mainframe policy → Claim adjudication", contract: "coverage snapshot ACL — the strangler seam", ok: true },
      { crossing: "Fraud & SIU → Claim adjudication", contract: "typed holds in; findings back as facts", ok: true },
    ],
  },
];

export const WORKFLOW_MAPS = { "wf-claims": claimsWorkflow, "wf-claims-v2": claimsWorkflowV2 };

/* ── UC ↔ workflow mapping, computed from the grounds the events already
   carry (never hand-asserted). Each use case = a segment of the workflow:
   main scenario = its unbranched events; extended scenarios = its branch
   events (the storming alternates). UCs with NO events are returned as
   gaps — the honest rows. */
export function workflowUcCoverage(wfId, productPid) {
  /* D-160: project from the design-level storms when the product has them
     (the one-home cards); fall back to the stitched map otherwise */
  const storms = DESIGN_STORMS_BY_PRODUCT[productPid];
  const map = WORKFLOW_MAPS[wfId];
  const evSource = storms
    ? storms.flatMap((m) => m.nodes.map((n) => ({ ...n, _ctx: m.contextId })))
    : (map ? map.nodes : []);
  if (!evSource.length) return { rows: [], gaps: [] };
  const byUc = {};
  for (const n of evSource) {
    if (n.kind !== "event") continue;
    for (const g of (n.grounds || [])) {
      if (!/^UC\d+$/.test(g)) continue;
      (byUc[g] = byUc[g] || []).push(n);
    }
  }
  /* labels + the full UC set from the owning product's lifecycle graph
     (build the pid index if nothing else has yet — same as arch.js) */
  let idx = typeof window !== "undefined" && window.__kg4ProdByPid;
  if (!idx && typeof window !== "undefined" && window.__KG4__ && window.__KG4__.products) {
    idx = window.__kg4ProdByPid = {};
    for (const g of Object.values(window.__KG4__.products)) {
      const pn = g.nodes.find((n) => n.type === "Product");
      if (pn && pn.props.orgRef) idx[pn.props.orgRef.split(":").pop()] = g;
    }
  }
  const g4 = idx && idx[productPid];
  const allUcs = g4 ? g4.nodes.filter((n) => n.type === "UseCase") : [];
  const label = (uc) => { const n = allUcs.find((x) => x.localId === uc); return n ? n.label : uc; };
  const rows = Object.entries(byUc).map(([uc, evs]) => ({
    uc, label: label(uc),
    main: evs.filter((e) => !e.branch).map((e) => e.summary),
    extended: evs.filter((e) => e.branch).map((e) => `${e.summary} (${e.branch})`),
  })).sort((x, y) => Number(x.uc.slice(2)) - Number(y.uc.slice(2)));
  const covered = new Set(Object.keys(byUc));
  const gaps = allUcs.filter((n) => !covered.has(n.localId)).map((n) => ({ uc: n.localId, label: n.label }));
  return { rows, gaps };
}

/* ── D-149: one event flow PER USE CASE, generated from the grounds the
   events carry. The flow is the use case: step by step until it completes
   (success ends) or exits on a branch (the extensions / error paths). No
   bounded-context framing at this altitude — decomposition comes later. */
export const UC_FLOWS = (() => {
  const maps = [];
  for (const w of WORKFLOW_INVENTORY) {
    /* D-160: the UC flow walks the design-storm cards (one home each),
       in storm order — intake first, then adjudication, and so on */
    const storms = DESIGN_STORMS_BY_PRODUCT[w.product];
    const map = WORKFLOW_MAPS[w.id];
    const evs = storms
      ? storms.flatMap((m) => m.nodes.filter((n) => n.kind === "event"))
      : (map ? map.nodes.filter((n) => n.kind === "event") : []);
    if (!evs.length) continue;
    const ucs = [...new Set(evs.flatMap((n) => (n.grounds || []).filter((g) => /^UC\d+$/.test(g))))];
    for (const uc of ucs) {
      const mine = evs.filter((n) => (n.grounds || []).includes(uc));
      const ids = new Set(mine.map((n) => n.id));
      let prev = "start";
      const nodes = mine.map((n) => {
        const m = structuredClone(n);
        delete m.submapId;
        m.id = `u-${n.id}`;
        m.parentId = ids.has(n.parentId) ? `u-${n.parentId}` : prev;
        prev = m.id;
        return m;
      });
      const parents = new Set(nodes.map((n) => n.parentId));
      for (const n of nodes) if (!parents.has(n.id)) n.isEndNode = true;   // every leaf is a terminal
      maps.push({ id: `ucf-${w.product.toLowerCase()}-${uc.toLowerCase()}`, name: `${uc} — event flow`,
        contextId: null, product: w.product, uc, summary: "", nodes });
    }
  }
  return maps;
})();

if (typeof window !== "undefined") window.__CYN_WORKFLOWS__ = WORKFLOW_INVENTORY;
