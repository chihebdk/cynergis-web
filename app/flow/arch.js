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

export function deriveArch(node) {
  if (typeof window === "undefined" || !window.__ARCH__) return null;
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
