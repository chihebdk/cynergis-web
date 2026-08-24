"use client";

import { useNodeId } from "@xyflow/react";
import { useNodeCache, useDecoratorsStore } from "@flowai/canvas";
import { Icon } from "@iconify/react";
import { componentById, deriveArch, archFor, ENTRY_META, TRIGGER_KIND_META, POLICY_VIA_META, KIND_TO_TYPE, TRIGGER_TYPES } from "./arch";
import { HOME_NAMES, HOME_COLORS } from "./journeys";

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
  const { getItem, getItems } = useNodeCache();
  const node = id ? getItem(id) : null;
  if (!node) return null;
  const { refs, assumed } = grounding(node);
  /* D-145: the aggregate chip only earns its place when the flow actually
     crosses aggregates (fraud: AUTH → STEPUP → CASE). When every node in the
     map shares one aggregate it's flow-wide context, not per-node signal —
     hide it (it stays on the card's Aggregate tab). */
  const aggs = new Set((getItems ? getItems() : []).map((n) => n && n.aggregate).filter(Boolean));
  const showAgg = !!node.aggregate && aggs.size > 1;
  // zero-footprint overlay: a 0×0 anchor at the card's bottom-left so the badges
  // never contribute to the node's measured height (which would shift the handle).
  return (
    <div style={{ position: "absolute", bottom: 0, left: 4, width: 0, height: 0, zIndex: 10 }}>
      <div className="flex items-center gap-1" style={{ position: "absolute", top: "6px", left: 0, whiteSpace: "nowrap" }}>
        {node.isPivotal && <span className="text-[9px] leading-none px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
        {showAgg && <span className="text-[9px] font-mono uppercase tracking-wide text-gray-600 bg-gray-100 border border-gray-200 rounded px-1">{node.aggregate}</span>}
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

// ── Trigger icons (D-143/D-144) — FlowAI's canonical set ──
// One icon per FlowAI trigger type, rendered via Iconify (same library the
// panel tab strip already uses). `k` accepts a FlowAI type (apiTrigger…),
// a spec-side kind (human/policy/external/upstream) or a via iconKey.
export function TrigIcon({ k, size = 13 }) {
  const type = ENTRY_META[k] ? k : KIND_TO_TYPE[k];
  const em = ENTRY_META[type];
  if (!em) return null;
  return <Icon icon={em.icon} width={size} height={size} aria-hidden style={{ display: "inline-block", verticalAlign: "-2px" }} />;
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
  /* D-147: an enumerated trigger list wins — primary door's icon + "+n".
     The state proxy only exposes FlowAI-schema fields; custom fields like
     `triggers` live on the underlying .record. */
  const list = ((node.record || node).triggers) || [];
  if (list.length && TRIGGER_TYPES[list[0].type]) {
    const pr = list[0];
    key = TRIGGER_TYPES[pr.type].entry;
    extra = list.length - 1;
    const who = (pr.sources || [])[0] || pr.kind || "";
    const ident = pr.impl?.endpoint || pr.impl?.topic || pr.impl?.surface || pr.impl?.schedule || "";
    tip = `${pr.type}${who ? " — " + who : ""}${ident ? " · " + ident : ""}` + (extra ? ` (+${extra} more door${extra > 1 ? "s" : ""})` : "");
  }
  const t = node.trigger;
  if (!key && t && t.kind && (t.actor || t.mechanism)) {
    const kind = TRIGGER_KIND_META[t.kind] ? t.kind : "upstream";
    const via = t.via && POLICY_VIA_META[t.via];
    key = via ? via.iconKey : KIND_TO_TYPE[kind];   /* one FlowAI type per node */
    tip = `${TRIGGER_KIND_META[kind].label}${t.actor ? " — " + t.actor : ""}${t.mechanism ? " · " + t.mechanism : ""}`;
    if (via) tip += ` · runs as: ${via.label}`;
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
    <div style={{ position: "absolute", top: 0, left: 4, width: 0, height: 0, zIndex: 100 }}>
      <span className="cyn-trigbadge" title={tip} style={{ position: "absolute", bottom: "-5px", left: 0, whiteSpace: "nowrap", zIndex: 100 }}>
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

// ── Home-context chip (D-162): the decomposition, worn by the storm ──
// After the cut, each big-picture storm event carries its home context
// (EVENT_HOMES); the chip under the card names it and clicks through to the
// wall. Pre-decomposition storms have no homes — no chip: the chip's
// presence IS the decomposed status, card by card.
export function HomeContext() {
  const id = useNodeId();
  const { getItem } = useNodeCache();
  const node = id ? getItem(id) : null;
  const home = node && ((node.record || node).home);
  if (!home) return null;
  const name = HOME_NAMES[home] || home;
  const isCtx = home.startsWith("CTX-");
  const go = (e) => {
    e.stopPropagation();
    if (!isCtx || typeof window === "undefined") return;
    const nav = window.__cynNav || {};
    const t = { v: "prod", pf: nav.pf, prod: nav.prod, sub: "dashboard", phase: "Design", entry: "contexts", ctx: home, tab: "flow" };
    window.cynPushUrl?.(t);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const c = HOME_COLORS[home] || {};
  /* ON TOP of the card (D-163) — centred above it, clear of the trigger
     badge at the top-left corner and of the pivotal/anchor row below */
  return (
    <div style={{ position: "absolute", top: 0, left: "50%", width: 0, height: 0, zIndex: 10 }}>
      <span className={"cyn-ctxkind cyn-ck-home" + (isCtx ? " clickable" : "")}
        style={{ position: "absolute", bottom: "6px", left: 0, transform: "translateX(-50%)", whiteSpace: "nowrap",
          color: c.ink, background: c.bg, borderColor: c.line, cursor: isCtx ? "pointer" : "default" }}
        title={isCtx ? "Home context — click to open the wall" : "Owned outside the accepted cut"}
        onClick={go}>
        {name}
      </span>
    </div>
  );
}
let hcRegistered = false;
export function registerHomeContextDecorator() {
  if (hcRegistered) return;
  const store = useDecoratorsStore.getState();
  store.register("HomeContext", HomeContext);
  store.setDecorator("HomeContext", true);
  hcRegistered = true;
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
