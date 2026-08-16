"use client";

import { useNodeId } from "@xyflow/react";
import { useNodeCache, useDecoratorsStore } from "@flowai/canvas";
import { componentById, deriveArch } from "./arch";

function grounding(node) {
  if (!node) return { refs: 0, assumed: 0 };
  const clusters = [node.trigger ? [node.trigger] : [], node.commands || [], node.businessRules || [], node.readModels || [], node.policies || [], node.hotspots || []].flat();
  let refs = node.grounds?.length || 0, assumed = 0;
  for (const c of clusters) { const n = c.grounds?.length || 0; refs += n; if (n === 0) assumed += 1; }
  return { refs, assumed };
}

// Per-node badge row: aggregate · grounded-ref count · assumed count · pivotal.
// Reads its own node via React Flow's useNodeId() + the canvas node cache.
export function Grounding() {
  const id = useNodeId();
  const { getItem } = useNodeCache();
  const node = id ? getItem(id) : null;
  if (!node) return null;
  const { refs, assumed } = grounding(node);
  // zero-footprint overlay: a 0×0 anchor at the card's bottom-left so the badges
  // never contribute to the node's measured height (which would shift the handle).
  return (
    <div style={{ position: "absolute", bottom: 0, left: 4, width: 0, height: 0, zIndex: 10 }}>
      <div className="flex items-center gap-1" style={{ position: "absolute", top: "6px", left: 0, whiteSpace: "nowrap" }}>
        {node.isPivotal && <span className="text-[9px] leading-none px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
        {node.aggregate && <span className="text-[9px] font-mono uppercase tracking-wide text-gray-600 bg-gray-100 border border-gray-200 rounded px-1">{node.aggregate}</span>}
        {refs > 0 && <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">⚓ {refs}</span>}
        {assumed > 0 && <span className="text-[9px] text-red-700 bg-red-50 border border-red-200 rounded px-1">⚠ {assumed}</span>}
      </div>
    </div>
  );
}

// Register the decorator into the global canvas decorator store (once).
let registered = false;
export function registerGroundingDecorator() {
  if (registered) return;
  const store = useDecoratorsStore.getState();
  store.register("Grounding", Grounding);
  store.setDecorator("Grounding", true);
  registered = true;
}

// ── Context-map node kind, shown UNDER the box ──
// The at-a-glance classifying chip beneath each context-map node. Submap members
// are storming events (D-036): their chip names the EVENT FUNCTION the event
// triggers, so the structural reading survives without component nodes.
const CM_KIND_LABEL = {
  component: "Component",
  seam: "Published event (seam)",
  external: "External system",
  actor: "Actor",
  context: "Bounded context",
};
export function ContextKind() {
  const id = useNodeId();
  const { getItem } = useNodeCache();
  const node = id ? getItem(id) : null;
  if (!node) return null;
  let label = CM_KIND_LABEL[node.kind];
  if (!label && node.kind === "event") {
    const comp = componentById((node.arch || deriveArch(node) || {}).component);
    label = comp ? `Domain event · ${comp.name}` : "Domain event";
  }
  if (!label) return null;
  // zero-footprint anchor at the card's bottom-centre so the chip never adds to the
  // node's measured height (which would shift the handle / edge). Colour-coded by
  // kind (cyn-ck-*) so actors / externals / contexts read apart at a glance.
  return (
    <div style={{ position: "absolute", bottom: 0, left: "50%", width: 0, height: 0, zIndex: 10 }}>
      <span className={`cyn-ctxkind cyn-ck-${node.kind || "event"}`} style={{ position: "absolute", top: "6px", left: 0, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}
let ckRegistered = false;
export function registerContextKindDecorator() {
  if (ckRegistered) return;
  const store = useDecoratorsStore.getState();
  store.register("ContextKind", ContextKind);
  store.setDecorator("ContextKind", true);
  ckRegistered = true;
}
