"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { useNodeCache } from "@flowai/canvas";
import { useGlobalStore } from "@flowai/state";
import { resolveGround } from "./data";
import { TrigIcon } from "./GroundingDecorator.jsx";
import { archLabel, deriveArch, ENTRY_META, POLICY_VIA_META, TRIGGER_TYPES, componentById, componentForNode, componentArchetype } from "./arch";

/* ── reference → "where it's defined" navigation ──
   Chips resolve to a view in the host app and navigate via the global router
   (window.cynPushUrl). FR/UC/NFR/POL live in Discover; aggregates in the context's
   Domain model; bounded contexts are their own detail page. */
const KIND_TO_TARGET = {
  UseCase: { phase: "Discover", entry: "usecases" },
  FunctionalRequirement: { phase: "Discover", entry: "fr" },
  NonFunctionalRequirement: { phase: "Discover", entry: "nfr" },
  Policy: { phase: "Discover", entry: "policies" },
};
function navTargetFor(id) {
  const nav = (typeof window !== "undefined" && window.__cynNav) || {};
  const scope = (typeof window !== "undefined" && window.__cynGroundScope) || {};   // org-altitude mount (R3)
  const base = { v: "prod", pf: nav.pf || scope.pf, prod: nav.prod || scope.prod, sub: "dashboard" };
  if (/^AGG/i.test(id)) return { ...base, phase: "Design", entry: "contexts", ctx: nav.ctx, tab: "aggregates" };
  if (/^(BC|CTX)-/i.test(id)) return { ...base, phase: "Design", entry: "contexts", ctx: id, tab: "rels" };
  const g = resolveGround(id);
  const t = g && KIND_TO_TARGET[g.kind];
  return t ? { ...base, ...t } : null;
}
function navRef(id) {
  if (typeof window === "undefined") return;
  // Trace-indexed refs (FR/UC/NFR/POL): open the detail modal IN PLACE — stay on the
  // Event Flow. The modal's own "View in …" button is the explicit way to jump to the
  // defining page. (The modal is lifted above the fullscreen overlay via CSS.)
  // Product pages only: the trace index belongs to the MOUNTED product page — on the
  // org altitude (R3 element mount) it may be stale from another product, so navigate.
  if ((window.__cynNav || {}).v === "prod" && typeof window.cynTraceHas === "function" && window.cynTraceHas(id)) {
    window.cynTraceOpen?.(id);
    return;
  }
  // Non-indexed refs (aggregates, bounded contexts): navigate to the definition.
  // cynPushUrl writes the URL; __cynApplyProd switches the in-product view state.
  const t = navTargetFor(id);
  if (!t) return;
  window.cynPushUrl?.(t);
  window.__cynApplyProd?.(t);
}
// The bounded-context page for tab 'model' | 'rels' — used by the read-only cards.
function bcTarget(bc, tab) {
  const nav = (typeof window !== "undefined" && window.__cynNav) || {};
  const scope = (typeof window !== "undefined" && window.__cynGroundScope) || {};   // org-altitude mount (R3)
  return { v: "prod", pf: nav.pf || scope.pf, prod: nav.prod || scope.prod, sub: "dashboard", phase: "Design", entry: "contexts", ctx: bc || nav.ctx, tab };
}
function navTo(target) {
  if (typeof window === "undefined" || !target) return;
  window.cynPushUrl?.(target);
  window.__cynApplyProd?.(target);
}

/* ── shared chips ── */
const KIND_STYLE = {
  UseCase: "bg-blue-50 text-blue-700 border-blue-200",
  FunctionalRequirement: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NonFunctionalRequirement: "bg-amber-50 text-amber-700 border-amber-200",
  Policy: "bg-purple-50 text-purple-700 border-purple-200",
};
function GroundChip({ id }) {
  const node = resolveGround(id);
  const style = node ? KIND_STYLE[node.kind] : "bg-gray-50 text-gray-500 border-gray-200";
  const target = navTargetFor(id);
  return (
    <button type="button" disabled={!target}
      onClick={(e) => { e.stopPropagation(); navRef(id); }}
      title={node ? `${node.kind}: ${node.title}${target ? " — open its definition" : ""}` : id}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${style} ${target ? "cursor-pointer hover:brightness-95" : ""}`}>
      {id}
    </button>
  );
}
const AssumedChip = () => (
  <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-red-700">⚠ assumed</span>
);
const CrossesBadge = ({ to }) => (
  <button type="button" className="cyn-crosses cyn-clickable" title={`Open ${to}`}
    onClick={(e) => { e.stopPropagation(); navRef(to); }}>→ {to}</button>
);
const AggChip = ({ on }) => {
  const target = navTargetFor(on);
  return (
    <button type="button" disabled={!target}
      className={`cyn-agg-chip${target ? " cyn-clickable" : ""}`} title={target ? `${on} — open in Domain model` : on}
      onClick={(e) => { e.stopPropagation(); navRef(on); }}>{on}</button>
  );
};

/* __ARCH__ ids styled by kind; click opens the entity's trace modal in place. */
const ARCH_CHIP_STYLE = [
  [/^C\d/, "bg-indigo-50 text-indigo-700 border-indigo-200"],          // component
  [/^res-/, "bg-slate-100 text-slate-700 border-slate-200"],           // resource
  [/^SCH-/, "bg-teal-50 text-teal-700 border-teal-200"],               // schema
  [/^SCRT-/, "bg-amber-50 text-amber-700 border-amber-200"],           // secret
  [/^API-/, "bg-blue-50 text-blue-700 border-blue-200"],               // api
  [/^INT-/, "bg-purple-50 text-purple-700 border-purple-200"],         // integration
];
function ArchChip({ id }) {
  if (!id) return null;
  const style = (ARCH_CHIP_STYLE.find(([re]) => re.test(id)) || [null, "bg-gray-50 text-gray-500 border-gray-200"])[1];
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); navRef(id); }} title={archLabel(id)}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium cursor-pointer hover:brightness-95 ${style}`}>
      {id}
    </button>
  );
}
const TopicChip = ({ topic }) => (
  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">{topic}</span>
);
const DerivedBadge = () => (
  <span title="Proposed mechanically from the component join (context + grounds ∩ mapsTo) — not yet confirmed"
    className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[9.5px] font-medium text-sky-700">derived</span>
);

// "What set this event off" — actor kind → label + one-line blurb.
const TRIGGER_META = {
  external: { label: "External system", blurb: "Comes from outside our boundary — we don't control when it happens." },
  human: { label: "Human actor", blurb: "A person deliberately acts; the flow waits on them." },
  policy: { label: "Automatic policy", blurb: "A rule reacts to an upstream event — no human in the loop." },
  upstream: { label: "Upstream event", blurb: "Follows directly from the previous step in this flow." },
};

// EVENT | <risk> | pivotal — risk band derived from the node's branch ("risk = medium").
function riskBadge(node) {
  const m = /risk\s*=\s*(\w+)/i.exec(node.branch || "");
  if (!m) return null;
  const level = m[1].toLowerCase();
  const tone = level === "low" ? "low" : level === "high" ? "high" : "med";
  return { label: m[1].toUpperCase(), tone };
}

/* ── the unified card panel — FlowAI tab structure, Ascent skin ──
   ONE property system for every diagram (D-036): an event node represents the
   event function it triggers. Card scoping:
   · event-scoped   — Trigger / Rules / Command / Read Model / Reactions come from
                      the storming node (this step of the story);
   · component-shared — Write Model / Resource / Dependencies / Code come from the
                      __ARCH__ component (same for every event it handles);
   · BC-level, read-only — Aggregate / Contracts are the context's sovereignty;
                      edited on the bounded-context page, shown here for context. */
const CARD_TABS = [
  { key: "details",   title: "Details",        icon: "oui:analyze-event",                 hue: "#f97316" },
  { key: "trigger",   title: "Trigger",        icon: "grommet-icons:trigger",             hue: "#d946ef" },
  { key: "rules",     title: "Business Rules", icon: "ic:twotone-rule", iconSize: 17,     hue: "#8b5cf6" },
  { key: "commands",  title: "Command",        icon: "pixelarticons:command",             hue: "#3b82f6" },
  { key: "read",      title: "Read Model",     icon: "icon-park-outline:history-query",   hue: "#6366f1" },
  { key: "policies",  title: "Reactions",      icon: "carbon:flow",                       hue: "#9333ea" },
  { key: "aggregate", title: "Aggregate",      icon: "carbon:column-dependency",          hue: "#10b981", ro: true },
  { key: "contracts", title: "Contracts",      icon: "carbon:document",                   hue: "#14b8a6", ro: true },
  { key: "write",     title: "Write Model",    icon: "ix:hexagon-vertical-bars-database", hue: "#a855f7" },
  { key: "resources", title: "Resource",       icon: "grommet-icons:resources",           hue: "#ec4899" },
  { key: "deps",      title: "Dependencies",   icon: "mdi:dependency",                    hue: "#0ea5e9" },
  { key: "code",      title: "Code",           icon: "carbon:code",                       hue: "#f59e0b" },
  { key: "hotspots",  title: "Hotspot",        icon: "mdi:git-issue",                     hue: "#f43f5e" },
];

/* FlowAI PanelManyToOne layout: left = item list (click to select), right = detail. */
function CmpListDetail({ items, title, nameOf, renderDetail, emptyLabel, banner }) {
  const [sel, setSel] = useState(0);
  if (!items.length) return (
    <div className="flex h-full w-full flex-col min-h-0">
      {banner}
      <div className="cyn-cmp-empty flex-1">{emptyLabel}</div>
    </div>
  );
  const cur = items[Math.min(sel, items.length - 1)];
  return (
    <div className="flex h-full w-full flex-col min-h-0">
      {banner}
      <div className="flex flex-1 w-full gap-5 p-4 min-h-0">
        <div className="flex-none w-[320px] min-h-0 flex flex-col gap-2">
          {/* FlowAI PanelList header: pluralized title label */}
          <span className="cyn-cmp-k">{title || `${items.length} item${items.length > 1 ? "s" : ""}`}</span>
          <div className="cyn-cmp-list flex-1 min-h-0 overflow-y-auto">
            {items.map((it, i) => (
              <div key={i}
                className={`cyn-cmp-row${i === Math.min(sel, items.length - 1) ? " on" : ""}`}
                onClick={() => setSel(i)}>
                <div className="p-2">{nameOf(it)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <span className="cyn-cmp-k pb-2">Description</span>
          <div className="cyn-cmp-detail flex-1 min-h-0 overflow-y-auto p-4">{renderDetail(cur)}</div>
        </div>
      </div>
    </div>
  );
}
const CmpField = ({ k, children }) => (children == null || children === "" ? null : (
  <div className="mb-3">
    <div className="cyn-cmp-k mb-0.5">{k}</div>
    <div className="text-[13px]">{children}</div>
  </div>
));
// grounds / crosses footer used inside card details
const GroundRow = ({ grounds, crosses }) => {
  const gs = grounds || [];
  if (!gs.length && !crosses) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {crosses && <CrossesBadge to={crosses} />}
      {gs.length ? gs.map((g) => <GroundChip key={g} id={g} />) : <AssumedChip />}
    </span>
  );
};
// BC-level cards are read-only here; the bounded-context page is where they change.
const RoBanner = ({ bc, tab }) => (
  <div className="cyn-cmp-ro">
    <span>Defined at the bounded context — read-only on this event.</span>
    <button type="button" onClick={() => navTo(bcTarget(bc, tab))}>Edit in bounded context ↗</button>
  </div>
);
// Resource bindings are design-level; the physical half (environments, config
// knobs, accounts) is the as-built surface in Build (D-038).
const BuildRoBanner = () => {
  const nav = (typeof window !== "undefined" && window.__cynNav) || {};
  const target = { v: "prod", pf: nav.pf, prod: nav.prod, sub: "dashboard", phase: "Build", entry: "infra" };
  return (
    <div className="cyn-cmp-ro">
      <span>Design binds the resource class — the physical config lives in Build.</span>
      <button type="button" onClick={() => navTo(target)}>Provisioned in Build ↗</button>
    </div>
  );
};

// external link chip for code repo / dashboard / runbook
const CodeLink = ({ href, label }) => (
  <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
    className="cyn-cmp-link">{label} ↗</a>
);

// FlowAI CodeTab generation options (copied verbatim; generation wiring comes later)
const GEN_OPTIONS = [
  { label: "Code", value: "code", description: "Generate Function code" },
  { label: "Aggregate", value: "aggregate", description: "Generate Aggregate Entities code" },
  { label: "Acceptance Test Scripts", value: "ats", description: "Generate test scripts for validation" },
  { label: "IaC and Deployment Scripts", value: "iac", description: "Generate Infrastructure as Code templates" },
];

const CM_KIND = {
  component: { label: "Component", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  seam: { label: "Published event (seam)", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  external: { label: "External system", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  actor: { label: "Actor", cls: "bg-teal-50 text-teal-700 border-teal-200" },
  context: { label: "Bounded context", cls: "bg-blue-50 text-blue-700 border-blue-200" },
};

/* Seams and externals stay a simple detail card — they are contracts and
   quarantined systems, not event functions. */
function SimpleCard({ node }) {
  const k = CM_KIND[node.kind] || CM_KIND.component;
  return (
    <div className="cyn-board">
      <div className="cyn-board-head" style={{ borderBottom: 0 }}>
        <div className="cyn-board-headrow">
          <h2 className="cyn-board-title">{node.summary}</h2>
          <div className="cyn-board-labels">
            <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${k.cls}`}>{k.label}</span>
          </div>
        </div>
        <div className="cyn-board-subrow">
          {node.description ? <p className="cyn-board-desc" style={{ WebkitLineClamp: 4 }}>{node.description}</p> : <span />}
          {node.bc && (
            <button type="button" className="cyn-crosses cyn-clickable" title={`Open ${node.bc}`}
              onClick={(e) => { e.stopPropagation(); navRef(node.bc); }}>
              Open {node.bc} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── EventCards: the panel body for an event node (or a legacy component node) ── */
/* ── D-147 (final): the trigger view — a source list, Business-Rules style ──
   Left: every source (whoever can set this event off), one row each, like the
   Business Rules list. Right ("call implementation"): the selected source's
   door, reduced to the four facts that matter — Kind · Type · Specification ·
   Schema. The schema is the door's message schema where it has one, else the
   shared parameter schema (same action behind every door). */
const srcShort = (s2) => String(s2).split(" — ")[0];
const srcRest = (s2) => (String(s2).split(" — ")[1] || "");
/* the caller component's home page: its product's Design › System design */
function callerHome(pid) {
  const K4 = typeof window !== "undefined" && window.__KG4__;
  if (!K4 || !K4.org) return null;
  const g = K4.org;
  const pn = g.nodes.find((n) => n.type === "Product" && n.localId === pid);
  if (!pn) return null;
  const pkg = g.edges.find((e) => e.type === "packages" && e.from === pn.id);
  const ctx = pkg && g.nodes.find((n) => n.id === pkg.to);
  const dom = ctx && g.nodes.find((n) => n.type === "Domain" && g.edges.some((e) => e.type === "contains" && e.from === n.id && e.to === ctx.id));
  return { prod: pid, pf: dom ? dom.localId : null, label: pn.label };
}
/* the caller's wall, from its own product graph */
function callerWall(pid, cid) {
  const idx = typeof window !== "undefined" && window.__kg4ProdByPid;
  const g4 = idx && idx[pid];
  if (!g4) return null;
  const c = g4.nodes.find((n) => n.type === "Component" && n.localId === cid);
  const e = c && g4.edges.find((e2) => e2.type === "part_of" && e2.from === c.id);
  const w = e && g4.nodes.find((n) => n.id === e.to);
  return w ? w.localId : null;
}
function CallerModal({ caller, onClose }) {
  const comp = componentById(caller.component, caller.prod);
  const home = callerHome(caller.prod);
  const wall = callerWall(caller.prod, caller.component);
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  const go = () => {
    if (!home || typeof window === "undefined") return;
    const t = { v: "prod", pf: home.pf, prod: home.prod, sub: "dashboard", phase: "Design", entry: "arch" };
    /* cross-product jump: push the URL, then let the router's popstate
       handler do the FULL apply (product resolution included) —
       __cynApplyProd alone only switches state within the mounted product */
    window.cynPushUrl?.(t);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return createPortal(
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(15,18,30,.45)", display: "grid", placeItems: "center" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(460px, 92vw)", background: "var(--panel, #fff)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 20px 60px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-[14px]"><b>{comp ? comp.name : caller.component}</b> <span className="font-mono text-[11px] text-gray-500">{caller.component}</span></div>
          <button type="button" aria-label="Close" className="text-gray-400 hover:text-gray-700 text-[16px] leading-none" onClick={onClose}>×</button>
        </div>
        {!comp && <div className="text-[12px] text-gray-400">Component not resolved.</div>}
        {home && <div className="text-[12px] text-gray-600"><span className="text-gray-400 uppercase text-[9.5px] tracking-wide mr-2">Product</span>{home.label}</div>}
        {wall && <div className="text-[12px] text-gray-600"><span className="text-gray-400 uppercase text-[9.5px] tracking-wide mr-2">Wall</span>{wall}</div>}
        {comp && (comp.note || comp.overview) && <div className="text-[12px] text-gray-600">{comp.note || comp.overview}</div>}
        {comp && comp.code && <div className="text-[11px] font-mono text-gray-500">{typeof comp.code === "string" ? comp.code : comp.code.path}</div>}
        <button type="button" className="self-start text-[12px] font-medium text-indigo-700 hover:underline" onClick={go}>open component page →</button>
      </div>
    </div>,
    document.body
  );
}
function TriggerPanel({ node }) {
  const trigs = node.triggers || [];
  const params = node.params;
  const sources = trigs.flatMap((t) => (t.sources || []).map((s2) => ({ s2, t })));
  const conv = (node.commands || []).map((c) => c.label).join(" · ");
  const [compSel, setCompSel] = useState(null);   // { component, prod } — the opened caller pill
  return (<>
    {compSel && <CallerModal caller={compSel} onClose={() => setCompSel(null)} />}
    {
    <CmpListDetail
      items={sources}
      title={`${sources.length} source${sources.length > 1 ? "s" : ""}`}
      emptyLabel="No sources recorded for this trigger."
      banner={conv ? (
        <div className="px-4 pt-3 text-[11px] text-gray-600">
          Every source triggers the same action: <b>{conv}</b>{node.aggregate ? <> → <span className="font-mono text-[10px]">{node.aggregate}</span></> : null}
        </div>
      ) : null}
      nameOf={(it) => (
        <span className="flex items-center gap-2 min-w-0">
          <TrigIcon k={(TRIGGER_TYPES[it.t.type] || {}).entry || it.t.type} />
          <span className="min-w-0">
            <span className="block truncate text-[12px]">{srcShort(it.s2)}</span>
            {srcRest(it.s2) && <span className="block truncate text-[10px] text-gray-500">{srcRest(it.s2)}</span>}
          </span>
        </span>
      )}
      renderDetail={(it) => {
        const callers = it.t.callers || [];
        return (
          <div>
            <CmpField k="Kind">
              <span className="inline-flex items-center flex-wrap gap-1.5">
                {it.t.kind || "—"}
                {callers.map((c) => {
                  const comp = componentById(c.component, c.prod);
                  return (
                    <button key={`${c.prod}:${c.component}`} type="button" className="cyn-tpill tp-comp"
                      onClick={() => setCompSel(c)}>
                      {comp ? comp.name : c.component}
                    </button>
                  );
                })}
              </span>
            </CmpField>
            <CmpField k="Type"><TrigIcon k={(TRIGGER_TYPES[it.t.type] || {}).entry || it.t.type} /> {it.t.type}</CmpField>
            <CmpField k="Specification">{it.t.impl?.spec || "—"}</CmpField>
            <CmpField k="Schema">{it.t.impl?.schema || (params && params.schema) || "—"}</CmpField>
          </div>
        );
      }}
    />}
  </>);
}

function EventCardsBody({ node }) {
  const [tab, setTab] = useState("details");
  const [genSel, setGenSel] = useState([]);
  const A = (typeof window !== "undefined" && window.__ARCH__) || {};

  const isEvent = node.kind === "event";
  // event → its arch block (authored or derived) names the implementing component
  const arch = isEvent ? (node.arch || deriveArch(node)) : null;
  const comp = (arch && componentById(arch.component, arch.prod)) || componentForNode(node) || null;
  /* the implementation pattern (D-146 taxonomy): process manager by nature;
     otherwise in-flow cardinality — 1 event → function, N → microservice */
  const { getItems } = useNodeCache();
  const implPattern = (() => {
    if (!comp || !arch) return null;
    if (/process manager|router|saga/i.test(comp.name)) return "process manager";
    const evs = (getItems ? getItems() : []).filter((n) => n && n.kind === "event");
    const same = evs.filter((n) => {
      const a2 = n.arch || deriveArch(n) || {};
      return a2.component === arch.component && (a2.prod || null) === (arch.prod || null);
    }).length || 1;
    return same === 1 ? "function" : "microservice";
  })();
  /* fraud's __ARCH__ domains only apply to fraud components — a v4 arch block
     (arch.prod set) must not match them on colliding C-ids (D-146 fix) */
  const domain = (comp && !(arch && arch.prod)) ? (A.domains || []).find((dm) => (dm.components || []).some((c) => c.id === comp.id)) : null;
  const resourceRec = (id) => (A.resources || []).find((r) => r.id === id);
  const bc = node.bc || (typeof window !== "undefined" && window.__cynNav?.ctx) || null;
  const emKeyFor = (t) => (({ Event: "messageTrigger", User: "userTrigger", API: "apiTrigger", Schedule: "scheduleTrigger" })[t.type]) || "sequentialFlowTrigger";
  const emFor = (t) => ENTRY_META[emKeyFor(t)];
  const risk = riskBadge(node);

  /* ── event-scoped slices (fallback: component-wide data) ── */
  const rules = (node.businessRules || []).length
    ? node.businessRules.map((r) => ({ name: r.label, desc: r.desc, grounds: r.grounds }))
    : (comp?.businessRules || []).map((r) => ({ name: r.rule, grounds: r.ref ? [r.ref] : [] }));
  const commands = (node.commands || []).length
    ? node.commands.map((c) => ({ name: c.label, desc: c.desc, on: c.on, grounds: c.grounds }))
    : (comp?.command || []).map((c) => ({ name: c.command, grounds: c.ref ? [c.ref] : [] }));
  const reads = [
    ...(node.readModels || []).map((r) => ({ name: r.label, desc: r.desc, grounds: r.grounds })),
    ...((arch?.reads) || []).map((r) => ({
      name: r.resource ? `reads ${archLabel(r.resource)}` : `reads ${r.label || r.ref}`,
      desc: r.label, chips: [r.resource, r.ref, r.schema].filter(Boolean),
    })),
    ...(!isEvent ? (comp?.readModel || []).map((r) => ({ name: r.table || r.api || r.desc, desc: r.desc, scope: r.type })) : []),
  ];
  const reactions = [
    ...(node.policies || []).map((p) => ({ kind: "policy", name: p.label, desc: p.desc, crosses: p.crosses, grounds: p.grounds })),
    ...(arch?.emits ? [{ kind: "emit", name: `Publishes ${arch.emits.topic}`, topic: arch.emits.topic, via: arch.emits.via, schema: arch.emits.schema }] : []),
    ...((arch?.reactions) || []).map((r) => ({ kind: "reaction", name: `→ ${archLabel(r.consumer)}`, topic: r.topic, via: r.via, consumer: r.consumer })),
  ];
  const hotspots = (node.hotspots || []).length
    ? node.hotspots.map((h) => ({ name: h.label, desc: h.desc, grounds: h.grounds }))
    : (comp?.hotspot || []).map((h) => ({ name: h.level, desc: h.text }));
  // published language this event function participates in (owns / produces / consumes)
  const contracts = comp
    ? (A.schemas || []).filter((s) => s.ownedBy === comp.id || (s.producers || []).includes(comp.id) || (s.consumers || []).includes(comp.id))
    : [];
  const agg = comp?.aggregate || (domain && domain.aggregate);

  /* ── archetype drives visibility: core tabs always (prescriptive empty states),
     non-core only when populated; 'aggregate' is core-only. ── */
  const arche = comp ? componentArchetype(comp) : { label: "Event", tabs: ["details"] };
  const populated = {
    details: true,
    trigger: !!node.trigger || (comp?.trigger || []).length > 0,
    rules: rules.length > 0,
    commands: commands.length > 0,
    read: reads.length > 0,
    policies: reactions.length > 0,
    aggregate: false,
    contracts: contracts.length > 0,
    write: (comp?.writeModel || []).length > 0,
    resources: (comp?.resource || []).length > 0,
    deps: (comp?.dependency || []).length > 0,
    code: !!comp?.code,
    hotspots: hotspots.length > 0,
  };
  const visibleTabs = CARD_TABS.filter((t) =>
    (arche.tabs.includes(t.key) && (t.key !== "aggregate" || !!agg)) || populated[t.key]);
  // tab state survives node switches — fall back when the new node hides it
  const active = visibleTabs.some((v) => v.key === tab) ? tab : "details";

  const tm = node.trigger ? TRIGGER_META[node.trigger.kind] || TRIGGER_META.upstream : null;
  const em = arch?.entry ? ENTRY_META[arch.entry.type] || ENTRY_META.sequentialFlowTrigger : null;

  const body = {
    details: () => (
      <div className="flex h-full w-full gap-5 p-4 min-h-0">
        <div className="flex-none w-[320px] flex flex-col gap-3">
          {isEvent && <CmpField k="Domain event">{node.summary}</CmpField>}
          <CmpField k="Implemented by">{comp ? <>{comp.name} · <ArchChip id={comp.id} />{implPattern ? <> · {implPattern}</> : null}</> : "— not architected —"}</CmpField>
          <CmpField k="Domain">{domain ? domain.name : null}</CmpField>
          <CmpField k="Bounded context">{bc && <CrossesBadge to={bc} />}</CmpField>
          {isEvent && node.aggregate && <CmpField k="Aggregate"><AggChip on={node.aggregate} /></CmpField>}
          {isEvent
            ? (node.grounds || []).length > 0 && <CmpField k="Grounded by"><GroundRow grounds={node.grounds} /></CmpField>
            : <CmpField k="Fulfils"><span className="inline-flex flex-wrap gap-1">{(comp?.mapsTo || []).map((fr) => <GroundChip key={fr} id={fr} />)}</span></CmpField>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <span className="cyn-cmp-k pb-2">Description</span>
          <div className="cyn-cmp-detail flex-1 min-h-0 overflow-y-auto p-4">{node.description || comp?.overview || "—"}</div>
        </div>
      </div>
    ),
    // this event's trigger: the spec side (who/why) + the entry point (how, on the wire)
    trigger: () => (isEvent && (((node.record || node).triggers) || []).length ? (
      <TriggerPanel node={node.record || node} />
    ) : isEvent && node.trigger ? (
      <div className="flex h-full w-full gap-5 p-4 min-h-0">
        <div className="flex-none w-[320px] flex flex-col gap-3 min-h-0 overflow-y-auto">
          <CmpField k="Kind">{tm.label}</CmpField>
          <CmpField k="Actor">{node.trigger.actor}</CmpField>
          <CmpField k="How">{node.trigger.mechanism}</CmpField>
          {node.trigger.via && POLICY_VIA_META[node.trigger.via] && (
            <CmpField k="Runs as"><TrigIcon k={POLICY_VIA_META[node.trigger.via].iconKey} /> {POLICY_VIA_META[node.trigger.via].label}</CmpField>
          )}
          <CmpField k="Crosses / grounds"><GroundRow grounds={node.trigger.grounds} crosses={node.trigger.crosses} /></CmpField>
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <span className="cyn-cmp-k pb-2">Entry point</span>
          <div className="cyn-cmp-detail flex-1 min-h-0 overflow-y-auto p-4">
            <CmpField k="Why">{node.trigger.label}</CmpField>
            {em && <CmpField k="Wire"><TrigIcon k={arch.entry.type} /> {em.label}</CmpField>}
            {arch?.entry?.topic && <CmpField k="Topic"><TopicChip topic={arch.entry.topic} /></CmpField>}
            {arch?.entry && (
              <CmpField k="Contract">
                <span className="inline-flex flex-wrap gap-1">
                  {arch.entry.ref && <ArchChip id={arch.entry.ref} />}
                  {arch.entry.schema ? <ArchChip id={arch.entry.schema} /> : (arch.entry.type !== "sequentialFlowTrigger" && !arch.derived ? <AssumedChip /> : null)}
                </span>
              </CmpField>
            )}
            {arch?.entry?.auth && <CmpField k="Auth">{arch.entry.auth}</CmpField>}
          </div>
        </div>
      </div>
    ) : (
      <CmpListDetail items={comp?.trigger || []} title="Triggers" emptyLabel="No trigger — this component is invoked inline by another component."
        nameOf={(t) => t.name || t.actor || t.type}
        renderDetail={(t) => (<div>
          <CmpField k="Type"><TrigIcon k={emKeyFor(t)} /> {emFor(t).label}</CmpField>
          <CmpField k="Topic / name">{t.name}</CmpField>
          <CmpField k="Source">{t.source}</CmpField>
          <CmpField k="Actor">{t.actor}</CmpField>
          <CmpField k="Action">{t.action}</CmpField>
          <CmpField k="Schema">{t.schema && <code className="cyn-cmp-code">{t.schema}</code>}</CmpField>
          <CmpField k="Why">{t.why}</CmpField>
        </div>)} />
    )),
    rules: () => (
      <CmpListDetail items={rules} title="Business Rules" emptyLabel="No business rules enforced at this step."
        nameOf={(r) => r.name.length > 60 ? r.name.slice(0, 57) + "…" : r.name}
        renderDetail={(r) => (<div>
          <CmpField k="Rule">{r.name}</CmpField>
          <CmpField k="Why">{r.desc}</CmpField>
          <CmpField k="Mandated by"><GroundRow grounds={r.grounds} /></CmpField>
        </div>)} />
    ),
    commands: () => (
      <CmpListDetail items={commands} title="Commands" emptyLabel="No command executes at this step."
        nameOf={(c) => c.name}
        renderDetail={(c) => (<div>
          <CmpField k="Command">{c.name}</CmpField>
          <CmpField k="Description">{c.desc}</CmpField>
          <CmpField k="On aggregate">{c.on && <AggChip on={c.on} />}</CmpField>
          <CmpField k="Realizes"><GroundRow grounds={c.grounds} /></CmpField>
        </div>)} />
    ),
    read: () => (
      <CmpListDetail items={reads} title="Read Models" emptyLabel="Nothing is read at this step."
        nameOf={(r) => r.name}
        renderDetail={(r) => (<div>
          <CmpField k="Read model">{r.name}</CmpField>
          <CmpField k="Scope">{r.scope}</CmpField>
          <CmpField k="Description">{r.desc}</CmpField>
          {(r.chips || []).length > 0 && <CmpField k="Refs"><span className="inline-flex flex-wrap gap-1">{r.chips.map((c) => <ArchChip key={c} id={c} />)}</span></CmpField>}
          <CmpField k="Grounded by">{(r.grounds || []).length ? <GroundRow grounds={r.grounds} /> : null}</CmpField>
        </div>)} />
    ),
    // reactions: the policies this event fires ("whenever X → Y") + the wire view
    policies: () => (
      <CmpListDetail items={reactions} title="Reactions" emptyLabel="Nothing reacts to this event — a terminal step."
        nameOf={(r) => r.name}
        renderDetail={(r) => (<div>
          {r.kind === "policy" && <>
            <CmpField k="Policy">{r.name}</CmpField>
            <CmpField k="What happens">{r.desc}</CmpField>
            <CmpField k="Crosses / grounds"><GroundRow grounds={r.grounds} crosses={r.crosses} /></CmpField>
          </>}
          {r.kind === "emit" && <>
            <CmpField k="Publishes"><TopicChip topic={r.topic} /></CmpField>
            <CmpField k="Via">{r.via && <ArchChip id={r.via} />}</CmpField>
            <CmpField k="Contract">{r.schema ? <ArchChip id={r.schema} /> : <AssumedChip />}</CmpField>
          </>}
          {r.kind === "reaction" && <>
            <CmpField k="Consumer">{r.consumer && <ArchChip id={r.consumer} />}</CmpField>
            <CmpField k="Topic"><TopicChip topic={r.topic} /></CmpField>
            <CmpField k="Via">{r.via && <ArchChip id={r.via} />}</CmpField>
            <CmpField k="Coupling">Fire-and-forget across the seam — pub/sub, no synchronous call.</CmpField>
          </>}
        </div>)} />
    ),
    aggregate: () => {
      if (!agg) return <div className="cyn-cmp-empty">No aggregate — this event function holds no domain state of its own.</div>;
      return (
        <CmpListDetail items={agg.tables || []} title="Entities" emptyLabel="No entities captured."
          banner={<RoBanner bc={bc} tab="aggregates" />}
          nameOf={(t) => t.name}
          renderDetail={(t) => (<div>
            <CmpField k="Aggregate">{agg.name} <span className="cyn-cmp-sub">· {agg.store}</span></CmpField>
            <CmpField k="About">{agg.description}</CmpField>
            <CmpField k="Entity">{t.name} — {t.purpose}</CmpField>
            <table className="cyn-cmp-table"><tbody>
              {(t.columns || []).map((col) => (
                <tr key={col.name}>
                  <td className="mono">{col.name}</td>
                  <td className="muted">{col.type}</td>
                  <td>{col.desc}</td>
                </tr>
              ))}
            </tbody></table>
          </div>)} />
      );
    },
    // the published language this event function participates in
    contracts: () => (
      <CmpListDetail items={contracts} title="Contracts" emptyLabel="No published contracts touch this event function."
        banner={<RoBanner bc={bc} tab="contracts" />}
        nameOf={(s) => `${s.name} · v${s.version}`}
        renderDetail={(s) => (<div>
          <CmpField k="Contract">{s.name} <span className="cyn-cmp-sub">· {s.kind} · v{s.version}</span> <ArchChip id={s.id} /></CmpField>
          <CmpField k="Role here">{s.ownedBy === comp?.id ? "owns the contract" : (s.producers || []).includes(comp?.id) ? "produces" : "consumes"}</CmpField>
          <table className="cyn-cmp-table"><tbody>
            {(s.fields || []).map((f) => (
              <tr key={f.name}>
                <td className="mono">{f.name}</td>
                <td className="muted">{f.type}</td>
              </tr>
            ))}
          </tbody></table>
          <div className="mt-3" />
          <CmpField k="Producers"><span className="inline-flex flex-wrap gap-1">{(s.producers || []).map((p) => <ArchChip key={p} id={p} />)}</span></CmpField>
          <CmpField k="Consumers"><span className="inline-flex flex-wrap gap-1">{(s.consumers || []).map((c) => <ArchChip key={c} id={c} />)}</span></CmpField>
        </div>)} />
    ),
    write: () => (
      <CmpListDetail items={comp?.writeModel || []} title="Write Models" emptyLabel="This event function writes nothing."
        nameOf={(w) => w.table || w.queue || w.desc}
        renderDetail={(w) => (<div>
          <CmpField k="Scope">{w.type}</CmpField>
          <CmpField k="Target">{w.table || w.queue}</CmpField>
          <CmpField k="Description">{w.desc}</CmpField>
        </div>)} />
    ),
    resources: () => (
      <CmpListDetail items={(comp?.resource || []).map(resourceRec).filter(Boolean)} title="Resources" emptyLabel="No resource bindings — this event function needs no store, queue or cache."
        banner={<BuildRoBanner />}
        nameOf={(r) => `${r.name} · ${r.engine}`}
        renderDetail={(r) => (<div>
          <CmpField k="Resource">{r.name} <ArchChip id={r.id} /></CmpField>
          <CmpField k="Class">{r.cat} · {r.engine}</CmpField>
          <CmpField k="Role">{r.desc}</CmpField>
        </div>)} />
    ),
    deps: () => (
      <CmpListDetail items={comp?.dependency || []} title="Dependencies" emptyLabel="No dependencies — self-contained."
        nameOf={(d) => archLabel(d.ref)}
        renderDetail={(d) => (<div>
          <CmpField k="Kind">{d.type}</CmpField>
          <CmpField k="On">{archLabel(d.ref)} <ArchChip id={d.ref} /></CmpField>
          <CmpField k="Why">{d.note}</CmpField>
        </div>)} />
    ),
    code: () => (
      <div className="flex h-full w-full gap-5 p-4 min-h-0">
        <div className="flex-none w-[380px] flex flex-col gap-1 min-h-0 overflow-y-auto">
          {comp?.code ? (<div>
            <CmpField k="Path"><code className="cyn-cmp-code">{comp.code.path}</code></CmpField>
            <CmpField k="Tests">{comp.code.tests}</CmpField>
            <CmpField k="Coverage">{comp.code.coverage}</CmpField>
            <CmpField k="Owners">{comp.code.owners}</CmpField>
            <CmpField k="Links"><span className="inline-flex gap-1.5">
              {comp.code.repo && <CodeLink href={comp.code.repo} label="repo" />}
              {comp.code.dashboard && <CodeLink href={comp.code.dashboard} label="dashboard" />}
              {comp.code.runbook && <CodeLink href={comp.code.runbook} label="runbook" />}
            </span></CmpField>
          </div>) : <div className="cyn-cmp-note">Not built yet — no code recorded for this event function.</div>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <span className="cyn-cmp-k pb-2">Generate</span>
          <div className="cyn-cmp-detail flex-1 min-h-0 overflow-y-auto p-4">
            {GEN_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-start gap-2 mb-3 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={genSel.includes(o.value)}
                  onChange={(e) => setGenSel((p) => e.target.checked ? [...p, o.value] : p.filter((v) => v !== o.value))} />
                <span><span className="text-[13px] font-medium">{o.label}</span>
                  <span className="block cyn-cmp-sub">{o.description}</span></span>
              </label>
            ))}
            <button type="button" disabled={!genSel.length} className="cyn-cmp-btn mt-2"
              title="Generation is wired to the coding agent in Build — not yet connected here">
              Generate
            </button>
          </div>
        </div>
      </div>
    ),
    hotspots: () => (
      <CmpListDetail items={hotspots} title="Hotspots" emptyLabel="No hotspots — nothing flagged at this step."
        nameOf={(h) => h.name}
        renderDetail={(h) => (<div>
          <CmpField k="Hotspot">{h.name}</CmpField>
          <CmpField k="Concern">{h.desc}</CmpField>
          <CmpField k="Grounded by">{(h.grounds || []).length ? <GroundRow grounds={h.grounds} /> : null}</CmpField>
        </div>)} />
    ),
  };

  return (
    <div className="cyn-board cyn-cmp">
      <div className="cyn-board-head">
        <div className="cyn-board-headrow">
          <h2 className="cyn-board-title">{node.summary}</h2>
          <div className="cyn-board-labels">
            {risk && <span className={`cyn-risk cyn-risk-${risk.tone}`}>{risk.label}</span>}
            {node.isPivotal && <span className="cyn-pivotal">pivotal</span>}
            {arch?.derived && <DerivedBadge />}
            {comp && <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${CM_KIND.component.cls}`}>{arche.label} · {comp.id}</span>}
            {bc && <AggChip on={bc} />}
          </div>
        </div>
        {/* FlowAI PropertiesNav structure, native underline skin (.cyn-cmptab) */}
        <div className="cyn-cmptabs" role="tablist">
          {visibleTabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={active === t.key}
              className={`cyn-cmptab${active === t.key ? " on" : ""}`}
              onClick={() => setTab(t.key)}>
              <Icon icon={t.icon} width={t.iconSize || 14} style={{ color: t.hue }} aria-hidden />
              {t.title}
            </button>
          ))}
        </div>
      </div>
      {/* FlowAI PropertiesPanel: tab content sits in a rounded, bordered, light panel */}
      <div className="cyn-cmp-wrap flex-1 min-h-0 m-3 overflow-hidden">{(body[active] || body.details)()}</div>
    </div>
  );
}

/* ── the single panel entry point: events (and legacy component nodes) get the
   card system; seams and externals get the simple detail card. ── */
export function EventCards() {
  const { selected: node } = useNodeCache();
  if (!node) return null;
  if (node.kind === "seam" || node.kind === "external" || node.kind === "actor" || node.kind === "context") return <SimpleCard node={node} />;
  return <EventCardsBody node={node} key={node.id} />;
}

/* ── System-map node modal (D-046) ──
   The system map suppresses the bottom properties panel; clicking a node opens
   this centered modal instead — the node's story plus deep links to where it is
   defined: externals → the integration detail (trace) + Build › Integrations;
   actors → their persona; bounded contexts → their event flow + the Context map. */
function useSmNav() {
  const nav = (typeof window !== "undefined" && window.__cynNav) || {};
  const base = { v: "prod", pf: nav.pf, prod: nav.prod, sub: "dashboard" };
  return {
    persona: () => navTo({ ...base, phase: "Discover", entry: "personas" }),
    buildInteg: () => navTo({ ...base, phase: "Build", entry: "integ" }),
    contextMap: () => navTo({ ...base, phase: "Design", entry: "contextmap" }),
    eventFlow: (bc) => navTo({ ...base, phase: "Design", entry: "contexts", ctx: bc, tab: "flow" }),
  };
}
export function SystemMapModal({ mapId }) {
  // Rendered OUTSIDE the canvas (no CanvasServicesProvider), so read the same
  // zustand node store the canvas writes selection into: keyed mapNode-<mapId>.
  const store = useGlobalStore("mapNode", mapId)();
  const node = store.selected;
  const [openId, setOpenId] = useState(null);
  const nodeId = node?.id;
  useEffect(() => { if (nodeId) setOpenId(nodeId); }, [nodeId]);
  const go = useSmNav();
  if (!node || openId !== node.id) return null;
  const kind = node.kind;
  if (!["actor", "external", "context"].includes(kind)) return null;
  const close = () => { setOpenId(null); store.clearSelected?.(); };
  const after = (fn) => () => { close(); fn(); };
  const k = CM_KIND[kind];
  const A = (typeof window !== "undefined" && window.__ARCH__) || {};
  const int = kind === "external" ? (A.integrations || []).find((i) => i.id === node.intId) : null;
  // personas resolve from the OPEN product's PRD (v4 products carry their own in
  // __PRD4__) — never another product's registry.
  const prd = (typeof window !== "undefined"
    && ((window.__PRD4__ && window.__cynNav && window.__PRD4__[window.__cynNav.prod]) || window.__PRD__)) || {};
  const persona = kind === "actor" ? (prd.personas || []).find((p) => p.id === node.personaId) : null;

  return (
    <div className="cyn-smm-backdrop" onClick={close}>
      <div className="cyn-smm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="cyn-smm-head">
          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${k.cls}`}>{k.label}</span>
          <button type="button" className="cyn-smm-x" onClick={close} aria-label="Close">✕</button>
        </div>
        <h2 className="cyn-smm-title">{node.summary}</h2>
        <p className="cyn-smm-desc">{node.description}</p>
        {int && <p className="cyn-smm-meta">{int.direction} · {int.protocol} · auth {int.auth}</p>}
        {persona && <p className="cyn-smm-meta">Persona {persona.id} — {persona.name}, {persona.role}</p>}
        <div className="cyn-smm-actions">
          {kind === "external" && node.intId && (
            <button type="button" className="cyn-smm-primary" onClick={after(() => navRef(node.intId))}>Integration details →</button>
          )}
          {kind === "external" && (
            <button type="button" className="cyn-smm-link" onClick={after(go.buildInteg)}>As-built surfaces · Build ↗</button>
          )}
          {kind === "actor" && node.personaId && (
            <button type="button" className="cyn-smm-primary" onClick={after(() => navRef(node.personaId))}>Persona details →</button>
          )}
          {kind === "actor" && (
            <button type="button" className="cyn-smm-link" onClick={after(go.persona)}>All personas · Discover ↗</button>
          )}
          {kind === "context" && node.bc && (
            <button type="button" className="cyn-smm-primary" onClick={after(() => go.eventFlow(node.bc))}>Open event flow →</button>
          )}
          {kind === "context" && (
            <button type="button" className="cyn-smm-link" onClick={after(go.contextMap)}>View on Context map ↗</button>
          )}
        </div>
      </div>
    </div>
  );
}

export const panelTabComponents = { EventCards };
