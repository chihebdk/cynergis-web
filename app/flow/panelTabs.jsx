"use client";

import { useState } from "react";
import { useNodeCache } from "@flowai/canvas";
import { resolveGround } from "./data";

/* ── shared bits ── */
const KIND_STYLE = {
  UseCase: "bg-blue-50 text-blue-700 border-blue-200",
  FunctionalRequirement: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NonFunctionalRequirement: "bg-amber-50 text-amber-700 border-amber-200",
  Policy: "bg-purple-50 text-purple-700 border-purple-200",
};
function GroundChip({ id, onPick }) {
  const node = resolveGround(id);
  const style = node ? KIND_STYLE[node.kind] : "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <button type="button" onClick={() => onPick?.(id)} title={node ? `${node.kind}: ${node.title}` : id}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium hover:brightness-95 ${style}`}>
      {id}
    </button>
  );
}
const AssumedChip = () => (
  <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-red-700">⚠ assumed</span>
);
const CrossesBadge = ({ to }) => (
  <span title={`Crosses into ${to}`} className="inline-flex items-center gap-0.5 rounded border border-orange-200 bg-orange-50 px-1 text-[9px] font-mono text-orange-700 whitespace-nowrap">→ {to}</span>
);
function PickedGround({ picked, onClose }) {
  const node = picked ? resolveGround(picked) : null;
  if (!node) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">{node.kind}</span>
        <button className="text-gray-400 hover:text-gray-700 text-xs" onClick={onClose}>✕</button>
      </div>
      <div className="text-[13px] font-medium text-gray-800 mt-1"><span className="font-mono text-indigo-600">{node.id}</span> — {node.title}</div>
      <div className="text-[11px] text-gray-500 mt-1.5">
        {node.evidencedBy?.length ? <>Evidenced by {node.evidencedBy.map((s) => <span key={s} className="font-mono">{s} </span>)}</> : <span className="text-red-600">No source captured — assumed.</span>}
      </div>
    </div>
  );
}
// One row in a cluster tab: a bold label, an explanatory sentence (desc), the
// aggregate it acts on, a cross-context badge, and its grounding chips.
function ClusterRow({ item, onPick }) {
  const grounds = item.grounds || [];
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-start gap-1.5">
        <span className="text-[13px] font-medium text-gray-800 leading-snug">{item.label}</span>
        {item.crosses && <CrossesBadge to={item.crosses} />}
      </div>
      {item.desc && <p className="text-[12px] text-gray-500 leading-snug">{item.desc}</p>}
      <div className="flex flex-wrap items-center gap-1">
        {item.on && !String(item.on).startsWith("POL") && (
          <span className="text-[10px] font-mono text-gray-500 bg-gray-100 rounded px-1">{item.on}</span>
        )}
        {grounds.length ? grounds.map((g) => <GroundChip key={g} id={g} onPick={onPick} />) : <AssumedChip />}
      </div>
    </li>
  );
}
const Empty = ({ children }) => <div className="text-[13px] text-gray-400 italic leading-snug">{children}</div>;

// a cluster-array tab: a one-line lead, a local grounding picker + the section's rows
function ClusterTab({ clusterKey, empty, lead }) {
  const { selected: node } = useNodeCache();
  const [picked, setPicked] = useState(null);
  if (!node) return null;
  const items = node[clusterKey] || [];
  return (
    <div className="flex flex-col gap-3">
      {lead && <p className="text-[11px] text-gray-400 leading-snug">{lead}</p>}
      <PickedGround picked={picked} onClose={() => setPicked(null)} />
      {items.length ? (
        <ul className="divide-y divide-gray-100">{items.map((it, i) => <ClusterRow key={i} item={it} onPick={setPicked} />)}</ul>
      ) : <Empty>{empty}</Empty>}
    </div>
  );
}

/* ── the tabs ── */
export function OverviewTab() {
  const { selected: node } = useNodeCache();
  const [picked, setPicked] = useState(null);
  if (!node) return null;
  const t = node.trigger;
  const tm = t ? TRIGGER_META[t.kind] : null;
  return (
    <div className="flex flex-col gap-3">
      <PickedGround picked={picked} onClose={() => setPicked(null)} />
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">event</span>
          {node.isPivotal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
          {node.branch && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">{node.branch}</span>}
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900 mt-1">{node.summary}</h2>
        {node.description && <p className="text-[13px] text-gray-600 leading-normal mt-1.5">{node.description}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {node.aggregate && <span className="text-[10px] font-mono text-gray-500 bg-gray-100 rounded px-1">{node.aggregate}</span>}
          {(node.grounds || []).map((g) => <GroundChip key={g} id={g} onPick={setPicked} />)}
        </div>
      </div>
      {tm && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5">
          <span className="text-sm">{tm.icon}</span>
          <div className="text-[11px] text-gray-600 leading-snug">
            <span className="text-gray-400">Triggered by </span>
            <span className="font-medium text-gray-700">{tm.label}</span>
            {t.actor && <span className="text-gray-500"> · {t.actor}</span>}
            <span className="text-gray-400"> — see the Trigger tab.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// "What set this event off" — an outside system, a person, an automatic policy,
// or the previous step. Names the actor and the mechanism, not just a label.
const TRIGGER_META = {
  external: { icon: "🌐", label: "External system", blurb: "Comes from outside our boundary — we don't control when it happens." },
  human: { icon: "🧑", label: "Human actor", blurb: "A person deliberately acts; the flow waits on them." },
  policy: { icon: "⚙️", label: "Automatic policy", blurb: "A rule reacts to an upstream event — no human in the loop." },
  upstream: { icon: "↳", label: "Upstream event", blurb: "Follows directly from the previous step in this flow." },
};
export function TriggerTab() {
  const { selected: node } = useNodeCache();
  const [picked, setPicked] = useState(null);
  if (!node) return null;
  const t = node.trigger;
  if (!t) return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-gray-400 leading-snug">What set this event off — an outside system, a person, an automatic policy, or the previous step.</p>
      <Empty>No explicit trigger captured — this event follows from the previous step in the flow.</Empty>
    </div>
  );
  const tm = TRIGGER_META[t.kind] || TRIGGER_META.upstream;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-gray-400 leading-snug">What set this event off — an outside system, a person, an automatic policy, or the previous step.</p>
      <PickedGround picked={picked} onClose={() => setPicked(null)} />
      <div className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white p-3">
        <span className="text-lg leading-none mt-0.5">{tm.icon}</span>
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-gray-800">{tm.label}</span>
            {t.crosses && <CrossesBadge to={t.crosses} />}
          </div>
          <p className="text-[11px] text-gray-400 leading-snug">{tm.blurb}</p>
          {t.actor && (
            <div className="text-[12px] text-gray-700"><span className="text-gray-400">Actor · </span>{t.actor}</div>
          )}
          {t.mechanism && (
            <div className="text-[12px] text-gray-700"><span className="text-gray-400">How · </span>{t.mechanism}</div>
          )}
          {t.label && <p className="text-[12px] text-gray-600 leading-snug mt-0.5">{t.label}</p>}
          <div className="flex flex-wrap gap-1 mt-1">
            {(t.grounds || []).length ? (t.grounds || []).map((g) => <GroundChip key={g} id={g} onPick={setPicked} />) : <AssumedChip />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommandsTab() { return <ClusterTab clusterKey="commands" lead="The intent(s) issued to act on this event — the imperative behind it." empty="No commands for this event." />; }
export function RulesTab() { return <ClusterTab clusterKey="businessRules" lead="Invariants that must hold true when this event happens." empty="No business rules for this event." />; }
export function ReadModelsTab() { return <ClusterTab clusterKey="readModels" lead="Projections read off this event — what downstream consumers see." empty="No read models for this event." />; }
export function ReactionsTab() { return <ClusterTab clusterKey="policies" lead="Policies that fire because of this event — the 'whenever … then …' reactions." empty="No reactions for this event." />; }
export function HotspotsTab() { return <ClusterTab clusterKey="hotspots" lead="Open questions, risks and undecided design points on this event." empty="No hotspots for this event." />; }

// Node-scoped tabs. Subdomain-level material lives in the Model & capabilities tab
// (screens-design-ddd), not in the per-event panel.
export const panelTabComponents = {
  OverviewTab, TriggerTab, CommandsTab, RulesTab, ReadModelsTab, ReactionsTab, HotspotsTab,
};
