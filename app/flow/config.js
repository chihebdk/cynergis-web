// CanvasConfig for the event-flow map. htree default = show ALL nodes (expand-on-load);
// the org↔htree toggle stays available. Our custom "Grounding" decorator + "GroundedTab"
// property tab carry the D-031 grounding.
export const flowConfig = {
  layout: { available: ["htree", "org"], default: "htree" },
  nodeTypes: {
    SimpleNode: {
      toolbar: ["addNode", "addReference", "addSubflow"],
      contextMenu: ["copyNode", "cutNode", "deleteNode", "pasteNode", "submapStart", "submapEnd", "markEndNode"],
      decorators: ["Grounding"],
      showEndMarker: true,
    },
    ReferenceNode: { toolbar: [], contextMenu: ["deleteNode"], decorators: [], showEndMarker: true },
    SubmapNode: {
      toolbar: ["addNode", "addReference", "addSubflow"],
      contextMenu: ["submapExpand", "markEndNode"],
      decorators: ["Grounding"],
      showEndMarker: true,
    },
  },
  edgeTypes: {
    WorkflowEdge: {
      stroke: "#9ca3af", strokeWidth: 2, opacity: 0.6, markerEnd: true,
      focusedStyle: "solid", unfocusedStyle: "dashed",
      toolbar: ["addNode", "addReference", "addSubflow"],
    },
  },
  lanes: { show: false },
  map: {
    properties: [{ tab: "GroundedTab", title: "Grounded detail", icon: "mdi:anchor" }],
  },
};
