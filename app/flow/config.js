// CanvasConfig for the event-flow map. htree default = show ALL nodes (expand-on-load);
// the org↔htree toggle stays available. Our custom "Grounding" decorator + "GroundedTab"
// property tab carry the D-031 grounding.
export const flowConfig = {
  fitView: true,                       // fit all nodes into view on load
  layout: { available: ["org", "htree"], default: "htree" },
  // View-focused: no hover add-toolbar (it reserves vertical space taller than the
  // card and would shift the node's handle off-center → misaligned edges). Editing
  // stays available via the right-click context menu.
  nodeTypes: {
    SimpleNode: {
      toolbar: [],
      contextMenu: ["copyNode", "cutNode", "deleteNode", "pasteNode", "submapStart", "submapEnd", "markEndNode"],
      decorators: ["Grounding", "TriggerBadge"],
      showEndMarker: true,
    },
    ReferenceNode: { toolbar: [], contextMenu: ["deleteNode"], decorators: [], showEndMarker: true },
    SubmapNode: {
      toolbar: [],
      contextMenu: ["submapExpand", "markEndNode"],
      decorators: ["Grounding"],
      showEndMarker: true,
    },
    // view-only: no hover add-toolbar on the expanded submap's End marker (it reserves
    // vertical space and would render the marker lower than the member nodes)
    SubmapEndNode: { toolbar: [], contextMenu: [], decorators: [], showEndMarker: false },
  },
  edgeTypes: {
    WorkflowEdge: {
      stroke: "#9ca3af", strokeWidth: 2, opacity: 0.9, markerEnd: false,
      borderRadius: 14,                // rounded corners on the orthogonal path
      focusedStyle: "solid", unfocusedStyle: "dashed",
      toolbar: [],
    },
  },
  lanes: { show: false },
  map: {
    // One property system everywhere (D-036): the event-card panel.
    properties: [
      { tab: "EventCards", title: "Details", className: "cyn-ptab", selectedCls: "cyn-ptab cyn-ptab-on" },
    ],
  },
};

// CanvasConfig for the CONTEXT MAP (bounded contexts as expandable submaps).
// Same visual language as the event flow; nodes are components/seams/externals, so
// the panel is a simple detail card instead of the event board.
export const contextMapConfig = {
  fitView: true,
  layout: { available: ["org", "htree"], default: "htree" },
  nodeTypes: {
    // ContextKind decorator renders the node's classifying label (component / seam /
    // external) under the box — the context map has no property panel.
    SimpleNode: { toolbar: [], contextMenu: [], decorators: ["ContextKind", "TriggerBadge"], showEndMarker: true },
    SubmapNode: { toolbar: [], contextMenu: ["submapExpand"], decorators: [], showEndMarker: true },
    SubmapEndNode: { toolbar: [], contextMenu: [], decorators: [], showEndMarker: false },
    ReferenceNode: { toolbar: [], contextMenu: [], decorators: [], showEndMarker: true },
  },
  edgeTypes: {
    WorkflowEdge: {
      stroke: "#9ca3af", strokeWidth: 2, opacity: 0.9, markerEnd: false,
      borderRadius: 14,
      focusedStyle: "solid", unfocusedStyle: "dashed",
      toolbar: [],
    },
  },
  lanes: { show: false },
  map: {
    // Same panel as the event flows — EventCards branches internally:
    // event nodes → card tabs; seams/externals → simple detail card.
    properties: [
      { tab: "EventCards", title: "Details", className: "cyn-ptab", selectedCls: "cyn-ptab cyn-ptab-on" },
    ],
  },
};
