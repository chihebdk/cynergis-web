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
export function componentById(id, prodPid) {
  if (typeof window === "undefined" || !id) return null;
  /* D-131 fix: with a v4 product in scope, components resolve from ITS OWN
     lifecycle graph — never fraud's __ARCH__ (the D-108 leak class, caught
     on the Capabilities tab where C1/C2 rendered fraud's component names) */
  /* D-146: an arch block may carry its own `prod` scope (stamped by seeds or
     the derived-flow projector) — it outranks the nav scope. */
  const pid = prodPid || (window.__cynGroundScope && window.__cynGroundScope.prod) || (window.__cynNav && window.__cynNav.prod);
  const K4 = window.__KG4__;
  if (pid && K4 && K4.products) {
    if (!window.__kg4ProdByPid) {
      window.__kg4ProdByPid = {};
      for (const g of Object.values(K4.products)) {
        const p = g.nodes.find(n => n.type === 'Product');
        if (p && p.props.orgRef) window.__kg4ProdByPid[p.props.orgRef.split(':').pop()] = g;
      }
    }
    const g4 = window.__kg4ProdByPid[pid];
    if (g4) {
      const n = g4.nodes.find(x => x.type === 'Component' && x.localId === id);
      return n ? { id, name: n.label, note: n.props.note, code: n.props.code } : null;   // v4 scope never falls through to fraud
    }
  }
  if (!window.__ARCH__) return null;
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
  const prod = (window.__cynNav && window.__cynNav.prod) || (window.__cynGroundScope && window.__cynGroundScope.prod);
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

// Spec-side trigger kinds (who/why set an event off) — same icon language as
// ENTRY_META below so a human trigger looks identical on every canvas.
export const TRIGGER_KIND_META = {
  human:    { label: "Human trigger" },
  policy:   { label: "Automation — a rule reacts to an event or clock" },
  external: { label: "External party or feed" },
  upstream: { label: "Upstream step" },
};

// How a POLICY trigger physically fires in running code (D-144). `via` on a
// step's trigger names the mechanism; the badge shows it as a second icon and
// the trigger tab as a "Runs as" line. Only rendered when recorded.
export const POLICY_VIA_META = {
  message: { iconKey: "messageTrigger",  label: "Message subscription — a consumer reacts to a published event" },
  timer:   { iconKey: "scheduleTrigger", label: "Durable timer / schedule — fires at a set instant or interval" },
  cdc:     { iconKey: "dbTrigger",       label: "Change data capture — reacts to a data change (outbox / stream)" },
  inline:  { iconKey: "sequentialFlowTrigger", label: "In-process rule — same pipeline, no broker hop" },
};

// Entry-point taxonomy — FlowAI's canonical trigger types with FlowAI's own
// Iconify icons (reference/flowai …/triggers/SelectTriggerItems.tsx).
export const ENTRY_META = {
  apiTrigger: { icon: "eos-icons:api-outlined", label: "API" },
  messageTrigger: { icon: "tabler:timeline-event", label: "Message" },
  dbTrigger: { icon: "icon-park-outline:database-power", label: "DB Storage" },
  scheduleTrigger: { icon: "ri:timer-flash-line", label: "Scheduler" },
  userTrigger: { icon: "fluent-mdl2:user-event", label: "User" },
  objectStorageTrigger: { icon: "carbon:volume-object-storage", label: "Object Storage" },
  sequentialFlowTrigger: { icon: "fluent-mdl2:flow", label: "Sequential Flow" },
};

// Spec-side kind → FlowAI trigger type (for the node badge icon). A policy's
// `via` refines this further (see POLICY_VIA_META.iconKey).
export const KIND_TO_TYPE = {
  human: "userTrigger",
  external: "messageTrigger",
  policy: "messageTrigger",
  upstream: "sequentialFlowTrigger",
};
