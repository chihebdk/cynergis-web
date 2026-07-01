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

// Self-contained embed: mount anywhere with a flowId. Sets up state + canvas providers.
export default function FlowEmbed({ flowId = "decisioning" }) {
  return (
    <AppStateProvider>
      <div className="cyn-flow-embed" style={{ position: "relative", width: "100%", height: "100%" }}>
        <FlowSelector flowId={flowId} />
      </div>
    </AppStateProvider>
  );
}
