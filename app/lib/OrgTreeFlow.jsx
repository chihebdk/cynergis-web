'use client';
/* ============================================================
   D-139 — OrgTreeFlow: a STATIC tree diagram on ReactFlow.
   Non-draggable, non-selectable, fit-to-view — used by the domain
   Overview for the org-structure diagram and the KPI tree. Takes a
   nested tree spec { id, label, sub, tone, children } and lays it
   out top-down (subtree-width layout, no external layouter).
   ============================================================ */
import React from 'react';
import { ReactFlow } from '@xyflow/react';

const W = 200, GX = 18, GY = 118;

function subtreeWidth(n) {
  if (!n.children || !n.children.length) return W;
  return Math.max(n.children.reduce((s, c) => s + subtreeWidth(c), 0) + GX * (n.children.length - 1), W);
}

function build(tree) {
  const nodes = [], edges = [];
  const place = (n, x, depth, parent) => {
    const w = subtreeWidth(n);
    nodes.push({
      id: n.id,
      position: { x: x + w / 2 - W / 2, y: depth * GY },
      data: {
        label: (
          <div className={'otf-node' + (n.tone ? ' ' + n.tone : '')}>
            <b>{n.label}</b>
            {n.sub ? <span>{n.sub}</span> : null}
          </div>
        ),
      },
      style: { width: W, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none' },
      draggable: false, connectable: false, selectable: false,
      sourcePosition: 'bottom', targetPosition: 'top',
    });
    if (parent) edges.push({ id: `${parent}->${n.id}`, source: parent, target: n.id, type: 'smoothstep', style: { stroke: 'var(--line-strong)' } });
    let cx = x;
    for (const c of (n.children || [])) { place(c, cx, depth + 1, n.id); cx += subtreeWidth(c) + GX; }
  };
  place(tree, 0, 0, null);
  return { nodes, edges };
}

export default function OrgTreeFlow({ tree, height = 340 }) {
  const { nodes, edges } = React.useMemo(() => build(tree), [tree]);
  return (
    <div style={{ height, border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--panel)', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.12 }}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        panOnDrag={false} zoomOnScroll={false} zoomOnPinch={false} zoomOnDoubleClick={false}
        preventScrolling={false} proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
