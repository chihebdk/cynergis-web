"use client";

// ── Context map on the mapper canvas ──
// Bounded contexts are SUBMAPS whose members are the context's EVENT FLOW —
// the storming cards between the pivotal cuts (D-036: an event node represents
// the event function it triggers; the card panel carries its properties).
// The published events crossing each seam stay ordinary nodes between the
// boxes, so every treaty of the classic context map is a clickable contract.
// Externals sit behind ACLs. Inline modules (C2 Rules Engine) are not nodes —
// they surface as Business Rules cards on the events of their host function.

import { seedFlows } from "./data";

// Copy a flow's storming nodes as members of a bounded-context submap.
// The flow's own "start" parent is rewired to the node that precedes the
// context on the map (an external or the seam event that wakes it).
function membersOf(flowId, submapId, entryParent) {
  const flow = seedFlows.find((f) => f.id === flowId);
  return flow.nodes.map((n) => {
    const m = {
      ...structuredClone(n),
      submapId,
      bc: flow.contextId,
      parentId: n.parentId === "start" ? entryParent : n.parentId,
    };
    // Flow-terminal flags are noise on the map: the box's End marker and the
    // seam nodes are the only exits that matter here, and an isEndNode on the
    // endNodeId member would drop a stray terminal in front of the seams that
    // continue from it. The flags stay intact on the per-context flow pages.
    delete m.isEndNode;
    return m;
  });
}

export const contextMap = {
  id: "contextmap",
  name: "Context map — bounded contexts & seams",
  contextId: null,
  summary: "How the bounded contexts relate. Expand a context to see its event flow — the storming cards between the pivotal events; the nodes between contexts are the published events crossing each seam.",
  nodes: [
    { id: "x-switch", type: "SimpleNode", parentId: "start", kind: "external", summary: "Card Authorization Switch",
      description: "External — the card network edge. Publishes every authorization onto the bus and receives the decision callback inside the 300 ms budget." },

    // ── Decisioning (core): its event flow, between the switch and the seams ──
    ...membersOf("decisioning", "sub-dec", "x-switch"),

    // ── seams out of Decisioning: the published events crossing each boundary ──
    { id: "seam-case", type: "SimpleNode", parentId: "e-blocked", kind: "seam", summary: "flagged cases",
      description: "Published event: transaction.blocked — every block crosses the seam as a case for an analyst. Customer–Supplier: Decisioning is the upstream supplier — it owns the decision and the case event; Case Management is the downstream customer and negotiates what each case must carry (score explanation, linked transactions). No model is shared — only the case event crosses the boundary." },
    { id: "seam-alert", type: "SimpleNode", parentId: "e-blocked", kind: "seam", summary: "customer alert",
      description: "Published event: block.placed — the customer is alerted within 60 s with a confirm / deny action. Open-Host Service: Decisioning exposes a stable, published alert contract and knows nothing about channels or templates — Notification translates the alert into push / SMS / in-app. The call is one-way and fire-and-forget." },

    // ── Case Management (supporting): its event flow, woken by the case seam ──
    ...membersOf("casemgmt", "sub-case", "seam-case"),

    // ── Customer Notification (generic): its event flow, woken by the alert seam ──
    ...membersOf("notify", "sub-notify", "seam-alert"),

    // ── external, reached through an ACL from the step-up saga ──
    // Parented to the submap's endNodeId member (like the seams): the canvas only
    // routes box-exiting edges through the End marker, so hanging it off a mid
    // member (e-stepup) would swallow the node and orphan its terminal marker.
    // The precise wiring (C6 ↔ INT-stepup) lives on the Step-up event's cards.
    { id: "x-authvendor", type: "SimpleNode", parentId: "e-blocked", kind: "external", summary: "Step-up Auth Vendor", isEndNode: true,
      description: "External — runs the step-up challenges (OTP / passkey), integrated as INT-stepup. Anti-Corruption Layer: the Step-up Process Manager is downstream but refuses to conform — the ACL translates the vendor's API and model into our step-up concept, so a vendor change is absorbed at the boundary and never leaks into the core model. Generic capability: buy, don't build." },
  ],
};

// Bounded contexts as submaps: collapsed boxes on the map, expandable in place
// to the context's event flow (start = first event after the cut, end = the
// pivotal event whose published contracts leave the box).
export const contextSubmaps = [
  { id: "sub-dec", name: "Decisioning · core", startNodeId: "e-scored", endNodeId: "e-blocked", colorIndex: 0, mapIds: ["contextmap"] },
  { id: "sub-case", name: "Case Management · supporting", startNodeId: "c-opened", endNodeId: "c-labelled", colorIndex: 1, mapIds: ["contextmap"] },
  { id: "sub-notify", name: "Customer Notification · generic", startNodeId: "n-sent", endNodeId: "n-responded", colorIndex: 2, mapIds: ["contextmap"] },
];
