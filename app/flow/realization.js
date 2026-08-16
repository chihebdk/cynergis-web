"use client";

// ── Realization lens helper (D-026) ──
// realizationsFor: join the per-capability realization decisions (form × composition
// × surface × agency + testStrategy + rationale + enforced invariants), authored in
// window.__DDD__.byProduct[prod].realizations, to the flow node that realizes them.
// The join is by ucId: a realization attaches to the node whose grounds (or a command's
// grounds) carries its ucId. Same self-contained convention as arch.js reading __ARCH__.

// realizations for the active product (resolved via __cynNav.prod, the byProduct key).
function activeRealizations() {
  if (typeof window === "undefined") return [];
  const prod = window.__cynNav?.prod;
  return window.__DDD__?.byProduct?.[prod]?.realizations || [];
}

// every ucId referenced by a node — at node level or on any of its commands.
function nodeUcs(node) {
  const ids = new Set();
  const add = (g) => (g || []).forEach((id) => { if (/^UC/i.test(id)) ids.add(id); });
  add(node?.grounds);
  (node?.commands || []).forEach((c) => add(c.grounds));
  return ids;
}

// the realizations that this node realizes (empty for generic/no-capability nodes).
export function realizationsFor(node) {
  if (!node) return [];
  const ucs = nodeUcs(node);
  if (!ucs.size) return [];
  return activeRealizations().filter((r) => ucs.has(r.ucId));
}

// ── display meta: label + tone (a Tailwind chip class) per axis value ──
export const FORM_META = {
  code: { label: "code", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  "llm-function": { label: "llm-function", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  agent: { label: "agent", cls: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  human: { label: "human", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};
export const AGENCY_META = {
  automated: { label: "automated", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "human-in-loop": { label: "human-in-loop", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};
// composition & surface are free-ish; render with a neutral chip.
export const NEUTRAL_CHIP = "bg-gray-50 text-gray-600 border-gray-200";
