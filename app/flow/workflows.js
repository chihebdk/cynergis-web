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

/* ── Pass 1: the workflow inventory, per domain ──
   One entry per authored workflow; journeys without an authored workflow
   surface as candidates on the Workflows page (honest empty state). */
export const WORKFLOW_INVENTORY = [
  {
    id: "wf-claims",
    domain: "DOM-CLAIMS",
    product: "PROD-CLAIMSCORE",   /* owner: the product whose use cases form the spine (UC1–UC8); other products contribute surfaces */
    journey: "JR-CLAIM",
    name: "A loss is reported → the claim is settled",
    walls: ["CTX-FNOL", "CTX-COVERAGE", "CTX-AB", "CTX-TOTAL-LOSS"],
    status: "authored",
    /* Pass 3 — the boundary check: every workflow edge that crosses a submap
       boundary, verified against the RECORDED seams (member-graph contracts) */
    boundaryCheck: [
      { crossing: "Notice of loss → Coverage & reserves", contract: "'completed loss report' event — internal Customer–supplier seam", ok: true },
      { crossing: "Coverage & reserves → Billing", contract: "Payment instruction events (instructed-not-yet-settled)", ok: true },
      { crossing: "Underwriting & Policy → Coverage & reserves", contract: "Immutable coverage snapshot as at date of loss, consumed as an event", ok: true },
      { crossing: "HCAI → Accident benefits", contract: "OCF forms + invoices through the ACL (external, Conformist)", ok: true },
      { crossing: "Estimating & repair → Total loss & salvage", contract: "'threshold breach' event with the estimate of record", ok: true },
      { crossing: "Loss initiators → Notice of loss", contract: "Four doors, one report: portal pane + intake workspace (own surfaces) · police feed (external message)", ok: true,
        note: "Settles D-147: the pane and workspace sit INSIDE the FNOL submap — internal module calls; only the police feed crosses in from outside." },
    ],
  },
];

export const WORKFLOW_MAPS = { "wf-claims": claimsWorkflow };

/* ── UC ↔ workflow mapping, computed from the grounds the events already
   carry (never hand-asserted). Each use case = a segment of the workflow:
   main scenario = its unbranched events; extended scenarios = its branch
   events (the storming alternates). UCs with NO events are returned as
   gaps — the honest rows. */
export function workflowUcCoverage(wfId, productPid) {
  const map = WORKFLOW_MAPS[wfId];
  if (!map) return { rows: [], gaps: [] };
  const byUc = {};
  for (const n of map.nodes) {
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

if (typeof window !== "undefined") window.__CYN_WORKFLOWS__ = WORKFLOW_INVENTORY;
