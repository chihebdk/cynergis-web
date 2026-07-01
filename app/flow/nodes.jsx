"use client";

import { memo, useState } from "react";
import { BaseNode, Handles, baseNodeSize, useNodeCache, useEventMapCache, TerminalNode } from "@flowai/canvas";
import { BaseEdge, getSmoothStepPath, useReactFlow } from "@xyflow/react";
import { resolveGround } from "./data";

/* ── grounding chips ── */
const KIND_STYLE = {
  UseCase: "bg-blue-50 text-blue-700 border-blue-200",
  FunctionalRequirement: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NonFunctionalRequirement: "bg-amber-50 text-amber-700 border-amber-200",
  Policy: "bg-purple-50 text-purple-700 border-purple-200",
};
export function GroundChip({ id, onPick }) {
  const node = resolveGround(id);
  const style = node ? KIND_STYLE[node.kind] : "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <button type="button" onClick={() => onPick?.(id)} title={node ? `${node.kind}: ${node.title}` : id}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium hover:brightness-95 ${style}`}>
      {id}
    </button>
  );
}
function AssumedChip() {
  return <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-red-700">⚠ assumed</span>;
}

/* ── event node ── */
function grounding(node) {
  if (!node) return { refs: 0, assumed: 0 };
  const clusters = [node.trigger ? [node.trigger] : [], node.commands || [], node.businessRules || [], node.readModels || [], node.policies || [], node.hotspots || []].flat();
  let refs = node.grounds?.length || 0, assumed = 0;
  for (const c of clusters) { const n = c.grounds?.length || 0; refs += n; if (n === 0) assumed += 1; }
  return { refs, assumed };
}
const EventNodeComponent = ({ id, data }) => {
  const { getItem, selected: selectedNode } = useNodeCache();
  const node = getItem(id);
  const selected = node?.id === selectedNode?.id;
  const { refs, assumed } = grounding(node);
  return (
    <BaseNode id={id} inFocus={data?.properties?.hasFocus} isDragged={data?.properties?.dragging}>
      <div className={`relative rounded-lg border border-l-4 border-l-orange-400 bg-white px-3 py-2 flex flex-col shadow-sm ${selected ? "border-indigo-500 shadow-lg" : "border-gray-200 hover:shadow-md"}`}
        style={{ width: baseNodeSize.width + 60, height: baseNodeSize.height }}>
        {node?.isPivotal && <span className="absolute -top-2 -left-2 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
        <div className="text-[13px] font-medium text-gray-800 leading-tight line-clamp-2">{node?.summary ?? "event"}</div>
        <div className="mt-auto flex items-center gap-1.5 flex-wrap">
          {node?.aggregate && <span className="text-[9px] font-mono uppercase tracking-wide text-gray-500 bg-gray-100 rounded px-1">{node.aggregate}</span>}
          {refs > 0 && <span className="text-[9px] text-emerald-700 bg-emerald-50 rounded px-1">⚓ {refs}</span>}
          {assumed > 0 && <span className="text-[9px] text-red-700 bg-red-50 rounded px-1">⚠ {assumed}</span>}
        </div>
        <Handles />
      </div>
    </BaseNode>
  );
};
export const EventNode = memo(EventNodeComponent);

/* ── start marker (read-only) ── */
const StartNodeComponent = () => (
  <div className="flex items-center justify-center" style={{ height: baseNodeSize.height }}>
    <div className="flex gap-2 border-2 border-indigo-500 bg-indigo-50 rounded-2xl items-center justify-center px-4 py-2 shadow">
      <p className="text-sm text-indigo-700 font-medium">Trigger</p>
    </div>
    <Handles />
  </div>
);
export const StartNode = memo(StartNodeComponent);

/* ── edge ── */
const WorkflowEdgeComponent = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, data }) => {
  const { getNode, getEdge } = useReactFlow();
  const target = getEdge(id)?.target || "";
  const draggingTarget = getNode(target)?.dragging;
  const [edgePath] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 15 });
  const focused = data?.properties?.hasFocus === undefined || data?.properties?.hasFocus;
  return <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, opacity: draggingTarget ? 0.2 : 1, stroke: "#9ca3af", strokeWidth: 2, strokeDasharray: focused ? "" : "3 3" }} />;
};
export const WorkflowEdge = memo(WorkflowEdgeComponent);

export const nodeTypes = { EventNode, StartNode, SimpleNode: EventNode, TerminalNode };

/* ── detail panel ── */
const CLUSTERS = [
  { key: "commands", label: "Commands", dot: "bg-blue-500" },
  { key: "businessRules", label: "Business rules", dot: "bg-purple-400" },
  { key: "readModels", label: "Read models", dot: "bg-emerald-500" },
  { key: "policies", label: "Policy reactions", dot: "bg-purple-500" },
  { key: "hotspots", label: "Hotspots", dot: "bg-red-500" },
];
function ClusterRow({ item, onPick }) {
  const grounds = item.grounds || [];
  return (
    <li className="flex flex-col gap-1 py-1">
      <div className="flex items-start gap-1.5">
        <span className="text-[12px] text-gray-700 leading-snug">{item.label}</span>
        {item.crosses && <span className="text-[9px] font-mono text-orange-700 bg-orange-50 border border-orange-200 rounded px-1 whitespace-nowrap">→ {item.crosses}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {grounds.length ? grounds.map((g) => <GroundChip key={g} id={g} onPick={onPick} />) : <AssumedChip />}
      </div>
    </li>
  );
}
export function EventDetailPanel() {
  const { selected: node } = useNodeCache();
  const { selected: flow } = useEventMapCache();
  const [picked, setPicked] = useState(null);
  const pickedNode = picked ? resolveGround(picked) : undefined;
  const clustersOf = (n) => CLUSTERS.map((c) => ({ ...c, items: n[c.key] || [] })).filter((c) => c.items.length);
  return (
    <div className="nodrag nowheel absolute top-0 right-0 h-full w-[360px] bg-white/95 backdrop-blur border-l border-gray-200 overflow-y-auto shadow-xl z-10">
      <div className="p-4 flex flex-col gap-4">
        {pickedNode && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">{pickedNode.kind}</span>
              <button className="text-gray-400 hover:text-gray-700 text-xs" onClick={() => setPicked(null)}>✕</button>
            </div>
            <div className="text-[13px] font-medium text-gray-800 mt-1"><span className="font-mono text-indigo-600">{pickedNode.id}</span> — {pickedNode.title}</div>
            <div className="text-[11px] text-gray-500 mt-1.5">
              {pickedNode.evidencedBy?.length ? <>Evidenced by {pickedNode.evidencedBy.map((s) => <span key={s} className="font-mono">{s} </span>)}</> : <span className="text-red-600">No source captured — assumed.</span>}
            </div>
          </div>
        )}
        {node ? (
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <span className="text-[10px] font-mono uppercase tracking-wide text-gray-500">event</span>
                {node.isPivotal && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500 text-white">pivotal</span>}
              </div>
              <h2 className="text-[16px] font-semibold text-gray-900 mt-1">{node.summary}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {node.aggregate && <span className="text-[10px] font-mono text-gray-500 bg-gray-100 rounded px-1">{node.aggregate}</span>}
                {(node.grounds || []).map((g) => <GroundChip key={g} id={g} onPick={setPicked} />)}
              </div>
            </div>
            {node.trigger && (<div><div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Trigger</div><ul><ClusterRow item={node.trigger} onPick={setPicked} /></ul></div>)}
            {clustersOf(node).map((c) => (
              <div key={c.key}>
                <div className="flex items-center gap-1.5 mb-1"><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /><span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{c.label}</span></div>
                <ul className="divide-y divide-gray-100">{c.items.map((it, i) => <ClusterRow key={i} item={it} onPick={setPicked} />)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[13px] text-gray-500">
            <p className="font-medium text-gray-700">{flow?.name}</p>
            <p className="mt-1">{flow?.summary}</p>
            <p className="mt-3 text-[12px]">Select an event to see its commands, rules, read models, and reactions — each grounded in a captured node.</p>
          </div>
        )}
        {flow?.signals?.length ? (
          <div className="mt-2 border-t border-gray-200 pt-3">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">What this flow decides →</div>
            <ul className="flex flex-col gap-2">
              {flow.signals.map((s, i) => (
                <li key={i} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                  <div className="text-[11px] text-gray-500">{s.from}</div>
                  <div className="text-[12px] font-medium text-indigo-600 mt-0.5">{s.pattern}</div>
                  <div className="text-[10px] text-gray-400">{s.reveals}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
