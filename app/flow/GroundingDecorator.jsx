"use client";

import { useNodeId } from "@xyflow/react";
import { useNodeCache, useDecoratorsStore } from "@flowai/canvas";

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
  return (
    <div className="absolute -bottom-6 left-1 z-10 flex items-center gap-1 flex-nowrap">
      {node.isPivotal && <span className="text-[9px] leading-none px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
      {node.aggregate && <span className="text-[9px] font-mono uppercase tracking-wide text-gray-600 bg-gray-100 border border-gray-200 rounded px-1">{node.aggregate}</span>}
      {refs > 0 && <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">⚓ {refs}</span>}
      {assumed > 0 && <span className="text-[9px] text-red-700 bg-red-50 border border-red-200 rounded px-1">⚠ {assumed}</span>}
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
