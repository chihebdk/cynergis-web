"use client";

import { useState } from "react";
import { useNodeCache, useEventMapCache } from "@flowai/canvas";
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
function ClusterRow({ item, onPick }) {
  const grounds = item.grounds || [];
  return (
    <li className="flex flex-col gap-1 py-1.5">
      <div className="flex items-start gap-1.5">
        <span className="text-[13px] text-gray-700 leading-snug">{item.label}</span>
        {item.crosses && <span className="text-[9px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 whitespace-nowrap">→ {item.crosses}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {grounds.length ? grounds.map((g) => <GroundChip key={g} id={g} onPick={onPick} />) : <AssumedChip />}
      </div>
    </li>
  );
}
const Empty = ({ children }) => <div className="text-[13px] text-gray-400 italic">{children}</div>;

// a cluster-array tab: local grounding picker + the section's rows (or an empty note)
function ClusterTab({ clusterKey, empty }) {
  const { selected: node } = useNodeCache();
  const [picked, setPicked] = useState(null);
  if (!node) return null;
  const items = node[clusterKey] || [];
  return (
    <div className="flex flex-col gap-3">
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
  return (
    <div className="flex flex-col gap-3">
      <PickedGround picked={picked} onClose={() => setPicked(null)} />
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">event</span>
          {node.isPivotal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900 mt-1">{node.summary}</h2>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {node.aggregate && <span className="text-[10px] font-mono text-gray-500 bg-gray-100 rounded px-1">{node.aggregate}</span>}
          {(node.grounds || []).map((g) => <GroundChip key={g} id={g} onPick={setPicked} />)}
        </div>
      </div>
      {node.trigger && (
        <div>
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Trigger</div>
          <ul><ClusterRow item={node.trigger} onPick={setPicked} /></ul>
        </div>
      )}
    </div>
  );
}

export function CommandsTab() { return <ClusterTab clusterKey="commands" empty="No commands for this event." />; }
export function RulesTab() { return <ClusterTab clusterKey="businessRules" empty="No business rules for this event." />; }
export function ReadModelsTab() { return <ClusterTab clusterKey="readModels" empty="No read models for this event." />; }
export function ReactionsTab() { return <ClusterTab clusterKey="policies" empty="No reactions for this event." />; }
export function HotspotsTab() { return <ClusterTab clusterKey="hotspots" empty="No hotspots for this event." />; }

export function DecidesTab() {
  const { selected: flow } = useEventMapCache();
  const signals = flow?.signals || [];
  if (!signals.length) return <Empty>No architecture signals.</Empty>;
  return (
    <ul className="flex flex-col gap-2">
      {signals.map((s, i) => (
        <li key={i} className="rounded-md border border-gray-200 bg-gray-50 p-2">
          <div className="text-[11px] text-gray-500">{s.from}</div>
          <div className="text-[13px] font-medium text-indigo-600 mt-0.5">{s.pattern}</div>
          <div className="text-[10px] text-gray-400">{s.reveals}</div>
        </li>
      ))}
    </ul>
  );
}

export const panelTabComponents = {
  OverviewTab, CommandsTab, RulesTab, ReadModelsTab, ReactionsTab, HotspotsTab, DecidesTab,
};
