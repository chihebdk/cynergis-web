"use client";

import { useNodeId } from "@xyflow/react";
import { useNodeCache, useDecoratorsStore } from "@flowai/canvas";
import { Icon } from "@iconify/react";
import { componentById, componentArchetype, deriveArch, archFor, ENTRY_META, TRIGGER_KIND_META, POLICY_VIA_META, KIND_TO_TYPE } from "./arch";

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
  const t = node.trigger;
  if (t && t.kind && (t.actor || t.mechanism)) {
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

// ── Handler chip (D-146) — the event's architectural home, typed ──
// The opinionated node↔component reconciliation: every event declares its
// handler (arch block, stamped from the graphs), and the chip names it WITH
// its architectural style, derived from in-flow cardinality:
//   1 event  → function   (the node IS the component — FaaS/EDA style)
//   N events → microservice (one component handles a run of events)
//   name says process manager / router / saga → process manager
// Inline engines (invoked in-process, never own an event) ride along as
// `+ <name> · engine`. Flow canvases only — bottom-centre, under the card.
export function Handler() {
  const id = useNodeId();
  const { getItem, getItems } = useNodeCache();
  const node = id ? getItem(id) : null;
  if (!node || node.kind !== "event") return null;
  const arch = node.arch || deriveArch(node);
  const comp = arch && arch.component ? componentById(arch.component, arch.prod) : null;
  if (!comp) return null;
  const events = (getItems ? getItems() : []).filter((n) => n && n.kind === "event");
  const same = events.filter((n) => {
    const a2 = n.arch || {};
    return a2.component === arch.component && (a2.prod || null) === (arch.prod || null);
  }).length || 1;
  const t = /process manager|router|saga/i.test(comp.name) ? "pm" : same === 1 ? "fn" : "svc";
  const TYPE_LABEL = { pm: "process manager", fn: "function", svc: `microservice · ${same} events` };
  /* inline engines (fraud registry only — v4 graphs don't model inline yet) */
  const engines = [];
  if (!arch.prod && typeof window !== "undefined" && window.__ARCH__) {
    /* grounds live on the node AND its clusters (a rules override grounds FR8
       on the businessRules cluster, not the node) — collect them all */
    const g2 = new Set([
      ...(node.grounds || []),
      ...[node.trigger ? [node.trigger] : [], node.commands || [], node.businessRules || [], node.readModels || [], node.policies || []]
        .flat().flatMap((c3) => c3.grounds || []),
    ]);
    for (const dm of (window.__ARCH__.domains || [])) for (const c2 of (dm.components || [])) {
      if (c2.id !== comp.id && componentArchetype(c2).key === "inline" && (c2.mapsTo || []).some((fr) => g2.has(fr)))
        engines.push(c2.name);
    }
  }
  const tip = `${comp.name} — ${TYPE_LABEL[t]}${comp.note || comp.overview ? ` · ${comp.note || comp.overview}` : ""}`;
  return (
    <div style={{ position: "absolute", bottom: 0, left: "50%", width: 0, height: 0, zIndex: 10 }}>
      <span style={{ position: "absolute", top: "24px", left: 0, transform: "translateX(-50%)", whiteSpace: "nowrap", display: "inline-flex", gap: "3px" }}>
        <span className={`cyn-handler cyn-hd-${t}`} title={tip}>{comp.name} · {TYPE_LABEL[t]}</span>
        {engines.map((e2) => <span className="cyn-handler cyn-hd-eng" key={e2} title={`${e2} — invoked in-process by ${comp.name}; owns no event`}>+ {e2} · engine</span>)}
      </span>
    </div>
  );
}
let hdRegistered = false;
export function registerHandlerDecorator() {
  if (hdRegistered) return;
  const store = useDecoratorsStore.getState();
  store.register("Handler", Handler);
  store.setDecorator("Handler", true);
  hdRegistered = true;
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
