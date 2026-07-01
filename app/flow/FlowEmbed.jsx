"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useGlobalCache } from "@flowai/state";
import {
  Canvas, CanvasWithProviders as CanvasShell, baseNodeSize, layoutConfig,
  useNodeCache, useEventMapCache, TerminalEdge,
} from "@flowai/canvas";
import { AppStateProvider, AppCanvasProvider } from "./providers.jsx";
import { WorkflowEdge, EventDetailPanel, nodeTypes } from "./nodes.jsx";

const edgeTypes = { WorkflowEdge, TerminalEdge };

function FlowCanvas() {
  const [initial, setInitial] = useState(null);
  const { selected: selectedFlow } = useEventMapCache();
  const { initialized, getItems } = useNodeCache();
  const done = useRef(false);

  const build = useCallback(() => {
    if (!selectedFlow || !initialized) return;
    const models = getItems();
    const nodes = models.map((n) => ({
      id: n.id, type: n.type || "EventNode", position: layoutConfig.startNodePosition,
      zIndex: 1, width: baseNodeSize.width, height: baseNodeSize.height,
      data: { model: n, properties: { layoutCategory: "hierarchy" } },
    }));
    const ids = new Set(nodes.map((n) => n.id)); ids.add("start");
    const edges = models.filter((n) => n.parentId && ids.has(n.parentId)).map((n) => ({
      id: `${n.parentId}=>${n.id}`, source: n.parentId, target: n.id, type: "WorkflowEdge",
      markerEnd: "EventNode", data: { properties: { isError: false } },
    }));
    models.filter((n) => n.isEndNode).forEach((n) => {
      const tid = `terminal-${n.id}`;
      nodes.push({ id: tid, type: "TerminalNode", parentId: n.id, position: { x: baseNodeSize.width + 80, y: 0 }, width: baseNodeSize.width, height: baseNodeSize.height, zIndex: -1, data: {} });
      edges.push({ id: `${n.id}->${tid}`, source: n.id, target: tid, type: "TerminalEdge", data: {} });
    });
    const start = { id: "start", type: "StartNode", draggable: false, position: layoutConfig.startNodePosition, zIndex: 1, height: baseNodeSize.height, data: { properties: { layoutCategory: "hierarchy" } } };
    setInitial({ nodes: [start, ...nodes], edges, viewport: { x: 0, y: 0, zoom: 1 } });
  }, [selectedFlow, initialized, getItems]);

  useEffect(() => {
    if (!selectedFlow || !initialized || done.current) return;
    done.current = true; build();
  }, [selectedFlow, initialized, build]);

  if (!initial) return null;
  return (
    <Canvas nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodes={initial.nodes} edges={initial.edges}
      viewport={initial.viewport} propertiesPanel={<EventDetailPanel />} />
  );
}

function FlowSelector({ flowId }) {
  const { initialized, setSelected, selected } = useGlobalCache("flowMap", { query: { id: flowId } });
  useEffect(() => { if (initialized) setSelected(flowId); }, [initialized, flowId, setSelected]);
  if (!selected) return null;
  return (
    <AppCanvasProvider>
      <CanvasShell><FlowCanvas /></CanvasShell>
    </AppCanvasProvider>
  );
}

const IconExpand = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);
const IconCollapse = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
  </svg>
);

// Self-contained embed: mount anywhere with a flowId. Sets up state + canvas providers.
// A top-right control expands the canvas to a full-page overlay and collapses it back.
export default function FlowEmbed({ flowId = "decisioning" }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const shell = expanded
    ? { position: "fixed", inset: 0, zIndex: 9998, width: "100vw", height: "100vh", background: "var(--panel, #fff)" }
    : { position: "relative", width: "100%", height: "100%" };

  const btn = {
    position: "absolute", top: "10px", right: "10px", zIndex: 9999,
    width: "30px", height: "30px", display: "grid", placeItems: "center",
    borderRadius: "8px", border: "1px solid var(--line, #e5e7eb)", background: "var(--panel, #fff)",
    color: "var(--ink-2, #4b5563)", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  return (
    <AppStateProvider>
      <div className="cyn-flow-embed" style={shell}>
        <button type="button" style={btn} onClick={() => setExpanded((e) => !e)}
          title={expanded ? "Collapse (Esc)" : "Expand to full page"} aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? <IconCollapse /> : <IconExpand />}
        </button>
        <FlowSelector flowId={flowId} />
      </div>
    </AppStateProvider>
  );
}
