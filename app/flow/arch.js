"use client";

// ── Architecture lens helpers (D-034) ──
// deriveArch: the derive-first join — when a node has no authored `arch` block,
// propose one mechanically from the __ARCH__ component whose mapsTo intersects the
// node's grounds. Output is marked `derived: true` so the UI can badge it.
// archLabel: display name for any __ARCH__ id (component/resource/api/integration/
// schema/secret), for chip tooltips.

const TRIGGER_TYPE_MAP = { Event: "messageTrigger", User: "userTrigger", API: "apiTrigger", Schedule: "scheduleTrigger" };

function allComponents(ARCH) {
  return (ARCH?.domains || []).flatMap((dm) => dm.components || []);
}

// Full __ARCH__ component record by id (C1, C2, …) — the deployable component that a
// context-map node points at via `componentId`. Used by the context-map property panel.
export function componentById(id) {
  if (typeof window === "undefined" || !window.__ARCH__ || !id) return null;
  return allComponents(window.__ARCH__).find((c) => c.id === id) || null;
}

// All deployable components of a bounded context (comp.bc is authored — the arch
// domain `case` spans two BCs, so domain membership alone is ambiguous).
export function componentsForBC(bc) {
  if (typeof window === "undefined" || !window.__ARCH__ || !bc) return [];
  return allComponents(window.__ARCH__).filter((c) => c.bc === bc);
}

// Resolve a context-map node to its component: by componentId when present, else by
// exact name match on the node's summary (belt-and-braces vs a stale canvas store
// seeded before componentId links existed).
export function componentForNode(node) {
  if (!node || node.kind !== "component") return null;
  return componentById(node.componentId)
    || ((typeof window !== "undefined" && window.__ARCH__)
      ? allComponents(window.__ARCH__).find((c) => c.name === node.summary) || null
      : null);
}

/* ── component archetypes (derive-first, like deriveArch) ──
   The property-tab taxonomy is FlowAI's event-storming model — it describes an
   event-triggered serverless function doing CQRS/DDD against bound resources.
   Not every deployable component is that shape (the Rules Engine is invoked
   inline; the Feature Store is a data store), so derive an archetype from the
   component's data shape and let it drive the panel: `tabs` lists the CORE tabs
   that always render (their empty states stay prescriptive); non-core tabs
   render only when populated. 'aggregate' is core-only — the domain aggregate
   is domain-level data, and showing it on a store/module would misattribute it. */
const ALL_TABS = ["details", "trigger", "rules", "commands", "read", "policies", "aggregate", "contracts", "write", "resources", "deps", "code", "hotspots"];
export const ARCHETYPES = {
  service:   { key: "service",   label: "Event-driven service",  tabs: ALL_TABS },
  api:       { key: "api",       label: "API service",           tabs: ALL_TABS },
  job:       { key: "job",       label: "Scheduled job",         tabs: ALL_TABS },
  workspace: { key: "workspace", label: "Interactive workspace", tabs: ALL_TABS },
  inline:    { key: "inline",    label: "Inline module",         tabs: ["details", "rules", "commands", "deps", "code", "hotspots"] },
  store:     { key: "store",     label: "Data store",            tabs: ["details", "read", "write", "resources", "code", "hotspots"] },
  generic:   { key: "generic",   label: "Component",             tabs: ["details", "code"] },
};

export function componentArchetype(comp) {
  const trig = comp?.trigger || [];
  const has = (k) => (comp?.[k] || []).length > 0;
  if (trig.some((t) => t.type === "User"))     return ARCHETYPES.workspace; // a human acts on it — before Event: C3 has both
  if (trig.some((t) => t.type === "Event"))    return ARCHETYPES.service;
  if (trig.some((t) => t.type === "API"))      return ARCHETYPES.api;
  if (trig.some((t) => t.type === "Schedule")) return ARCHETYPES.job;
  if (has("command") || has("businessRules"))  return ARCHETYPES.inline;    // behaviour but no entry point → invoked in-process
  if (has("readModel") || has("writeModel") || has("resource")) return ARCHETYPES.store;
  return ARCHETYPES.generic;
}

export function deriveArch(node) {
  if (typeof window === "undefined" || !window.__ARCH__) return null;
  // __ARCH__ is the v3 (fraud) as-built registry. A v4 product (PRD4-registered)
  // has no as-built arch yet — never borrow fraud's components on colliding FR ids.
  const prod = window.__cynNav && window.__cynNav.prod;
  if (prod && window.__PRD4__ && window.__PRD4__[prod]) return null;
  const ARCH = window.__ARCH__;
  const grounds = new Set(node.grounds || []);
  const comp = allComponents(ARCH).find((c) => (c.mapsTo || []).some((fr) => grounds.has(fr)));
  if (!comp) return null;
  const t = (comp.trigger || [])[0];
  return {
    derived: true,
    component: comp.id,
    entry: t ? {
      type: TRIGGER_TYPE_MAP[t.type] || "sequentialFlowTrigger",
      topic: t.name, label: t.source ? `from ${t.source}` : (t.actor || t.action || ""),
    } : undefined,
    reads: (comp.readModel || []).map((r) => ({ label: r.table || r.api || r.desc })),
    writes: (comp.resource || []).map((r) => ({ resource: r })),
    codePath: comp.code?.path,
  };
}

export function archFor(node) {
  return node?.arch || deriveArch(node);
}

// Human-readable label for an __ARCH__ id (used in chip tooltips).
export function archLabel(id) {
  if (typeof window === "undefined" || !window.__ARCH__ || !id) return id;
  const A = window.__ARCH__;
  const comp = allComponents(A).find((c) => c.id === id);
  if (comp) return `Component · ${comp.name}`;
  const res = (A.resources || []).find((r) => r.id === id);
  if (res) return `${res.cat} · ${res.name} (${res.engine})`;
  const api = (A.apis || []).find((a) => a.id === id);
  if (api) return `API · ${api.method} ${api.path}`;
  const int = (A.integrations || []).find((i) => i.id === id);
  if (int) return `Integration · ${int.system}`;
  const sch = (A.schemas || []).find((s) => s.id === id);
  if (sch) return `Schema · ${sch.name} v${sch.version}`;
  const sec = (A.secrets || []).find((s) => s.id === id);
  if (sec) return `Secret · ${sec.name}`;
  return id;
}

// Entry-point taxonomy (adopted from FlowAI's trigger types).
export const ENTRY_META = {
  apiTrigger: { icon: "❲❳", label: "API call" },
  messageTrigger: { icon: "☴", label: "Message / topic" },
  dbTrigger: { icon: "🗃", label: "Database change" },
  scheduleTrigger: { icon: "◷", label: "Schedule" },
  userTrigger: { icon: "🧑", label: "Human / UI" },
  objectStorageTrigger: { icon: "▣", label: "Object storage" },
  sequentialFlowTrigger: { icon: "↳", label: "Upstream step" },
};
