'use client';
/* ============================================================
   D-139 — OrgTreeFlow: a STATIC tree diagram on ReactFlow.
   Non-draggable, non-selectable, fit-to-view — used by the domain
   Overview for the org-structure diagram and the KPI tree. Takes a
   nested tree spec { id, label, sub, tone, children } and lays it
   out top-down (subtree-width layout, no external layouter).
   D-139 polish: an expand button opens the diagram full-view in a
   modal (portal to body), where pan/zoom are enabled.
   ============================================================ */
import React from 'react';
import { createPortal } from 'react-dom';
import { ReactFlow } from '@xyflow/react';

const W = 200, GX = 18, GY = 118;

function subtreeWidth(n) {
  if (!n.children || !n.children.length) return W;
  return Math.max(n.children.reduce((s, c) => s + subtreeWidth(c), 0) + GX * (n.children.length - 1), W);
}

function build(tree, clickable) {
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
      style: { width: W, padding: 0, border: 'none', background: 'transparent', boxShadow: 'none', cursor: (clickable && n.meta) ? 'pointer' : 'default' },
      meta: n.meta,
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

function Tree({ nodes, edges, interactive, onMeta }) {
  /* D-142 polish: re-center every time the tree re-windows (fitView alone
     only applies on mount, so drilling left the new layout off-center). */
  const [inst, setInst] = React.useState(null);
  React.useEffect(() => { if (inst) inst.fitView({ padding: 0.12, duration: 180 }); }, [inst, nodes]);
  return (
    <ReactFlow
      onInit={setInst}
      nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.12 }}
      nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
      panOnDrag={!!interactive} zoomOnScroll={!!interactive} zoomOnPinch={!!interactive}
      zoomOnDoubleClick={false} preventScrolling={!!interactive} proOptions={{ hideAttribution: true }}
      onNodeClick={onMeta ? ((e, node) => { if (node.meta) onMeta(node.meta); }) : undefined}
    />
  );
}

export default function OrgTreeFlow({ tree, height = 340, title, onMeta }) {
  const { nodes, edges } = React.useMemo(() => build(tree, !!onMeta), [tree, onMeta]);
  const [expanded, setExpanded] = React.useState(false);
  React.useEffect(() => {
    if (!expanded) return;
    const h = e => { if (e.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [expanded]);
  return (
    <div style={{ height, border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--panel)', overflow: 'hidden', position: 'relative' }}>
      <button type="button" className="otf-expand" title="Full view" aria-label="Expand diagram" onClick={() => setExpanded(true)}>⤢</button>
      <Tree nodes={nodes} edges={edges} onMeta={onMeta} />
      {expanded && createPortal(
        <div className="otf-ovl" onClick={() => setExpanded(false)}>
          <div className="otf-modal" onClick={e => e.stopPropagation()}>
            <div className="otf-mh">
              <b>{title || 'Diagram'}</b>
              <span className="otf-hint">drag to pan · scroll to zoom · Esc to close</span>
              <button type="button" className="otf-x" aria-label="Close" onClick={() => setExpanded(false)}>×</button>
            </div>
            <div className="otf-mb"><Tree nodes={nodes} edges={edges} interactive onMeta={onMeta} /></div>
          </div>
        </div>, document.body)}
    </div>
  );
}
