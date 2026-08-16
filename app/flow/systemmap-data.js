"use client";

// ── System map on the mapper canvas (D-044) ──
// The C4 "system context" level, in the same visual language as the event flows
// and the context map: THE PRODUCT is a submap (collapsed box, expandable to its
// bounded contexts), surrounded by the external systems it integrates with and
// the humans who act on it. One zoom level up from the context map — the
// fractal reads: System map → product → bounded contexts → (context map) →
// event flows → event cards.

export const systemMap = {
  id: "systemmap",
  name: "System map — the product in its world",
  contextId: null,
  summary: "The product in context: who acts on it, which external systems feed and consume it, and what crosses each boundary. Expand the product box to see its bounded contexts.",
  nodes: [
    { id: "sm-cardholder", type: "SimpleNode", parentId: "start", kind: "actor", personaId: "P1", summary: "Cardholder",
      description: "The person swiping the card. Every authorization starts here — and later, on a block, the same person receives the alert and confirms or denies it." },

    { id: "sm-switch", type: "SimpleNode", parentId: "sm-cardholder", kind: "external", intId: "INT-switch", summary: "Card Authorization Switch",
      description: "External — the card network edge (INT-switch, Kafka + sync callback, mTLS). Publishes every authorization onto the bus and receives the hold / approve decision inside the 300 ms budget." },

    // ── the product — a submap whose members are its bounded contexts ──
    { id: "sm-ctx-dec", type: "SimpleNode", parentId: "sm-switch", submapId: "sub-product", bc: "BC-DEC", kind: "context", summary: "Decisioning",
      description: "Core — decides every authorization in real time: scores the risk, then approves, blocks, or issues a step-up within the network timeout, with an explanation for every decision." },
    { id: "sm-ctx-case", type: "SimpleNode", parentId: "sm-ctx-dec", submapId: "sub-product", bc: "BC-CASE", kind: "context", summary: "Case Management",
      description: "Supporting — runs the analyst workflow over flagged authorizations; dispositions feed labelled outcomes back to the model." },
    { id: "sm-ctx-notify", type: "SimpleNode", parentId: "sm-ctx-case", submapId: "sub-product", bc: "BC-NOTIFY", kind: "context", summary: "Customer Notification",
      description: "Generic — turns a block into a customer-facing alert and relays the confirm / deny response. Off-the-shelf behind a thin adapter." },

    // ── the world around the product (children hang off the submap's endNodeId member) ──
    { id: "sm-registry", type: "SimpleNode", parentId: "sm-ctx-notify", kind: "external", intId: "INT-registry", summary: "Model Registry",
      description: "External, inbound — MLflow (INT-registry, gRPC · mTLS) feeds the active, versioned scoring model; shadow candidates are validated here before promotion (ADR-02)." },
    { id: "sm-vendor", type: "SimpleNode", parentId: "sm-ctx-notify", kind: "external", intId: "INT-stepup", summary: "Step-up Auth Vendor",
      description: "External, bidirectional — runs the OTP / passkey challenges (INT-stepup, REST · OAuth2). Behind an Anti-Corruption Layer: the vendor's model never enters the core." },
    { id: "sm-ledger", type: "SimpleNode", parentId: "sm-ctx-notify", kind: "external", intId: "INT-ledger", summary: "Core Ledger", isEndNode: true,
      description: "External, outbound — consumes the decision stream (INT-ledger, events · mTLS): holds, reversals, and confirmed-fraud write-offs, reconciled daily." },
    { id: "sm-analyst", type: "SimpleNode", parentId: "sm-ctx-notify", kind: "actor", personaId: "P2", summary: "Fraud Analyst", isEndNode: true,
      description: "Human — works the case queue: triages each flagged authorization with its explanation and records the disposition that labels the outcome." },
    { id: "sm-alerted", type: "SimpleNode", parentId: "sm-ctx-notify", kind: "actor", personaId: "P1", summary: "Cardholder (alerted)", isEndNode: true,
      description: "Human — receives the block alert within 60 s with a confirm / deny action; an “it was me” releases the soft-hold automatically (FR9)." },
  ],
};

// The product as an expandable box on the map.
export const systemSubmaps = [
  { id: "sub-product", name: "Fraud Decisioning · the product", startNodeId: "sm-ctx-dec", endNodeId: "sm-ctx-notify", colorIndex: 0, mapIds: ["systemmap"] },
];
