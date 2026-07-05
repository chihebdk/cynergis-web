"use client";

// ── Context map on the mapper canvas (replaces the mermaid diagram) ──
// Bounded contexts are SUBMAPS (collapsed boxes, expandable to their components);
// the published events crossing a seam are ordinary nodes between the boxes, so
// every edge label of the classic context map becomes a clickable contract node.

export const contextMap = {
  id: "contextmap",
  name: "Context map — bounded contexts & seams",
  contextId: null,
  summary: "How the bounded contexts relate. Expand a context to see its components; the nodes between contexts are the published events crossing each seam.",
  nodes: [
    { id: "x-switch", type: "SimpleNode", parentId: "start", kind: "external", summary: "Card Authorization Switch",
      description: "External — the card network edge. Publishes every authorization onto the bus and receives the decision callback inside the 300 ms budget." },

    // ── Decisioning (core) — submap members ──
    { id: "dec-scoring", type: "SimpleNode", parentId: "x-switch", submapId: "sub-dec", bc: "BC-DEC", kind: "component", summary: "Scoring Service",
      description: "Consumes authorizations, fetches features, scores with the live model and returns an explainable decision within budget." },
    { id: "dec-rules", type: "SimpleNode", parentId: "dec-scoring", submapId: "sub-dec", bc: "BC-DEC", kind: "component", summary: "Rules Engine",
      description: "Deterministic guardrails and policy layered over the model score — velocity checks, blocklists, and the rules-only fallback." },
    { id: "dec-features", type: "SimpleNode", parentId: "dec-rules", submapId: "sub-dec", bc: "BC-DEC", kind: "component", summary: "Feature Store",
      description: "Computes and serves low-latency features with lineage for the scoring model." },

    // ── seams out of Decisioning: the published events crossing each boundary ──
    { id: "seam-case", type: "SimpleNode", parentId: "dec-features", kind: "seam", summary: "flagged cases",
      description: "Published event: transaction.blocked — every block crosses the seam as a case for an analyst. Decisioning is upstream supplier; Case Management negotiates what each case carries." },
    { id: "seam-alert", type: "SimpleNode", parentId: "dec-features", kind: "seam", summary: "customer alert",
      description: "Published event: block.placed — the customer is alerted within 60 s with a confirm / deny action, via a published-language contract." },

    // ── Case Management (supporting) ──
    { id: "cm-casemgr", type: "SimpleNode", parentId: "seam-case", submapId: "sub-case", bc: "BC-CASE", kind: "component", summary: "Case Manager", isEndNode: true,
      description: "Analyst workspace and API: queues blocked cases with their explanation, supports multi-card holds, and records dispositions that label outcomes." },

    // ── Customer Notification (generic) ──
    { id: "nt-notify", type: "SimpleNode", parentId: "seam-alert", submapId: "sub-notify", bc: "BC-NOTIFY", kind: "component", summary: "Notification Service", isEndNode: true,
      description: "Sends the real-time customer alert on a block and relays the confirm / deny response." },

    // ── external, reached through an ACL ──
    { id: "x-authvendor", type: "SimpleNode", parentId: "dec-features", kind: "external", summary: "Step-up Auth Vendor", isEndNode: true,
      description: "External — called through an anti-corruption layer to run step-up challenges (OTP / passkey). Generic capability: buy, don't build." },
  ],
};

// Bounded contexts as submaps: collapsed boxes on the map, expandable in place.
export const contextSubmaps = [
  { id: "sub-dec", name: "Decisioning · core", startNodeId: "dec-scoring", endNodeId: "dec-features", colorIndex: 0, mapIds: ["contextmap"] },
  { id: "sub-case", name: "Case Management · supporting", startNodeId: "cm-casemgr", endNodeId: "cm-casemgr", colorIndex: 1, mapIds: ["contextmap"] },
  { id: "sub-notify", name: "Customer Notification · generic", startNodeId: "nt-notify", endNodeId: "nt-notify", colorIndex: 2, mapIds: ["contextmap"] },
];
