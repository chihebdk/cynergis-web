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
      decorators: ["Grounding"],
      showEndMarker: true,
    },
    ReferenceNode: { toolbar: [], contextMenu: ["deleteNode"], decorators: [], showEndMarker: true },
    SubmapNode: {
      toolbar: [],
      contextMenu: ["submapExpand", "markEndNode"],
      decorators: ["Grounding"],
      showEndMarker: true,
    },
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
    // Single board view (header + all sections as columns); the tab nav is hidden.
    properties: [
      { tab: "NodeBoard", title: "Details", className: "cyn-ptab", selectedCls: "cyn-ptab cyn-ptab-on" },
    ],
  },
};
