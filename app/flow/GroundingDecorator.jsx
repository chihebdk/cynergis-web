"use client";

import { useNodeId } from "@xyflow/react";
import { useNodeCache, useDecoratorsStore } from "@flowai/canvas";
import { componentById, deriveArch, archFor, ENTRY_META, TRIGGER_KIND_META } from "./arch";

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

// ── Professional stroke icons for trigger kinds & entry points (D-143) ──
// One drawing per concept, shared by the node badges, the canvas legend and
// the trigger tab — no emoji.
const TRIG_PATHS = {
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  swap: <><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></>,
  corner: <><polyline points="15 10 20 15 15 20" /><path d="M4 4v7a4 4 0 0 0 4 4h12" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  radio: <><circle cx="12" cy="12" r="2" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  db: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
  box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
};
const TRIG_ICON_KEY = {
  human: 'user', policy: 'bolt', external: 'swap', upstream: 'corner',
  userTrigger: 'user', apiTrigger: 'code', messageTrigger: 'radio', dbTrigger: 'db',
  scheduleTrigger: 'clock', objectStorageTrigger: 'box', sequentialFlowTrigger: 'corner',
};
export function TrigIcon({ k, size = 12 }) {
  const paths = TRIG_PATHS[TRIG_ICON_KEY[k] || k];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-1.5px' }}>{paths}</svg>
  );
}

// ── Trigger-kind badge, floated above the card's top-left corner ──
// Spec-side trigger (who/why — human/policy/external) wins; wire-side entry
// point (API/message/schedule/db, from the arch registry) is the fallback.
// HONESTY GATE: renders only when a trigger is genuinely recorded — a kind
// with an empty actor AND mechanism (the old derived-flow default) shows
// nothing rather than claiming a trigger nobody recorded.
export function TriggerBadge() {
  const id = useNodeId();
  const { getItem } = useNodeCache();
  const node = id ? getItem(id) : null;
  if (!node) return null;
  let key = null, tip = null, extra = 0;
  const t = node.trigger;
  if (t && t.kind && (t.actor || t.mechanism)) {
    key = TRIGGER_KIND_META[t.kind] ? t.kind : "upstream";
    const m = TRIGGER_KIND_META[key];
    tip = `${m.label}${t.actor ? " — " + t.actor : ""}${t.mechanism ? " · " + t.mechanism : ""}`;
  }
  if (!key && node.kind === "event") {
    const arch = archFor(node);
    const em = arch?.entry ? ENTRY_META[arch.entry.type] : null;
    if (em) {
      key = ENTRY_META[arch.entry.type] ? arch.entry.type : "sequentialFlowTrigger";
      tip = `${em.label}${arch.entry.topic ? " — " + arch.entry.topic : ""}${arch.entry.label ? " · " + arch.entry.label : ""}`;
      const comp = componentById(arch.component);
      extra = Math.max(0, (comp?.trigger || []).length - 1);
    }
  }
  if (!key) return null;
  // zero-footprint anchor (same pattern as Grounding) — never shifts the handle.
  return (
    <div style={{ position: "absolute", top: 0, left: 4, width: 0, height: 0, zIndex: 10 }}>
      <span className="cyn-trigbadge" title={tip} style={{ position: "absolute", bottom: "5px", left: 0, whiteSpace: "nowrap" }}>
        <TrigIcon k={key} />{extra > 0 ? <i>+{extra}</i> : null}
      </span>
    </div>
  );
}
let tbRegistered = false;
export function registerTriggerBadgeDecorator() {
  if (tbRegistered) return;
  const store = useDecoratorsStore.getState();
  store.register("TriggerBadge", TriggerBadge);
  store.setDecorator("TriggerBadge", true);
  tbRegistered = true;
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
