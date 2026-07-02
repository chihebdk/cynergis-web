"use client";

import { useNodeCache } from "@flowai/canvas";
import { resolveGround } from "./data";

/* ── shared chips ── */
const KIND_STYLE = {
  UseCase: "bg-blue-50 text-blue-700 border-blue-200",
  FunctionalRequirement: "bg-indigo-50 text-indigo-700 border-indigo-200",
  NonFunctionalRequirement: "bg-amber-50 text-amber-700 border-amber-200",
  Policy: "bg-purple-50 text-purple-700 border-purple-200",
};
function GroundChip({ id }) {
  const node = resolveGround(id);
  const style = node ? KIND_STYLE[node.kind] : "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span title={node ? `${node.kind}: ${node.title}` : id}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${style}`}>
      {id}
    </span>
  );
}
const AssumedChip = () => (
  <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-red-700">⚠ assumed</span>
);
const CrossesBadge = ({ to }) => <span className="cyn-crosses" title={`Crosses into ${to}`}>→ {to}</span>;
const AggChip = ({ on }) => <span className="cyn-agg-chip">{on}</span>;

// "What set this event off" — actor kind → label + one-line blurb.
const TRIGGER_META = {
  external: { label: "External system", blurb: "Comes from outside our boundary — we don't control when it happens." },
  human: { label: "Human actor", blurb: "A person deliberately acts; the flow waits on them." },
  policy: { label: "Automatic policy", blurb: "A rule reacts to the score — no human in the loop." },
  upstream: { label: "Upstream event", blurb: "Follows directly from the previous step in this flow." },
};

// EVENT | <risk> | pivotal — risk band derived from the node's branch ("risk = medium").
function riskBadge(node) {
  const m = /risk\s*=\s*(\w+)/i.exec(node.branch || "");
  if (!m) return null;
  const level = m[1].toLowerCase();
  const tone = level === "low" ? "low" : level === "high" ? "high" : "med";
  return { label: m[1].toUpperCase(), tone };
}

/* ── board pieces ── */
function BoardItem({ title, desc, foot }) {
  return (
    <div className="cyn-bi">
      <div className="cyn-bi-title">{title}</div>
      {desc && <div className="cyn-bi-desc">{desc}</div>}
      {foot && foot.length > 0 && <div className="cyn-bi-foot">{foot}</div>}
    </div>
  );
}

function Column({ dot, title, children }) {
  return (
    <section className="cyn-col">
      <header className="cyn-col-head">
        <span className={`cyn-col-dot cyn-dot-${dot}`} />
        <span className="cyn-col-title">{title}</span>
      </header>
      <div className="cyn-col-body">{children}</div>
    </section>
  );
}

// grounds/crosses/aggregate footer for a cluster item
function itemFoot(item) {
  const parts = [];
  if (item.crosses) parts.push(<CrossesBadge key="x" to={item.crosses} />);
  if (item.on && !String(item.on).startsWith("POL")) parts.push(<AggChip key="agg" on={item.on} />);
  const grounds = item.grounds || [];
  if (grounds.length) grounds.forEach((g) => parts.push(<GroundChip key={g} id={g} />));
  else parts.push(<AssumedChip key="assumed" />);
  return parts;
}

/* ── the board ── */
export function NodeBoard() {
  const { selected: node } = useNodeCache();
  if (!node) return null;

  const risk = riskBadge(node);
  const t = node.trigger;
  const tm = t ? TRIGGER_META[t.kind] || TRIGGER_META.upstream : null;

  // columns, in board order — only those with content are shown
  const clusters = [
    { key: "commands", title: "Commands", dot: "blue" },
    { key: "businessRules", title: "Rules", dot: "slate" },
    { key: "readModels", title: "Reads", dot: "green" },
    { key: "policies", title: "Reactions", dot: "purple" },
    { key: "hotspots", title: "Hotspots", dot: "red" },
  ];

  return (
    <div className="cyn-board">
      {/* header — title + short description on the left, all labels top-right */}
      <div className="cyn-board-head">
        <div className="cyn-board-headrow">
          <h2 className="cyn-board-title">{node.summary}</h2>
          <div className="cyn-board-labels">
            {risk && <span className={`cyn-risk cyn-risk-${risk.tone}`}>{risk.label}</span>}
            {node.isPivotal && <span className="cyn-pivotal">pivotal</span>}
            {node.aggregate && <AggChip on={node.aggregate} />}
            {(node.grounds || []).map((g) => <GroundChip key={g} id={g} />)}
          </div>
        </div>
        {node.description && <p className="cyn-board-desc">{node.description}</p>}
      </div>

      {/* columns */}
      <div className="cyn-board-cols">
        {tm && (
          <Column dot="amber" title="Trigger">
            <BoardItem title={tm.label} desc={tm.blurb}
              foot={t.crosses ? [<CrossesBadge key="x" to={t.crosses} />, ...(t.grounds || []).map((g) => <GroundChip key={g} id={g} />)]
                              : (t.grounds || []).map((g) => <GroundChip key={g} id={g} />)} />
            {t.actor && <BoardItem title="Actor" desc={t.actor} />}
            {t.mechanism && <BoardItem title="How" desc={t.mechanism} />}
          </Column>
        )}
        {clusters.map(({ key, title, dot }) => {
          const items = node[key] || [];
          if (!items.length) return null;
          return (
            <Column key={key} dot={dot} title={title}>
              {items.map((it, i) => <BoardItem key={i} title={it.label} desc={it.desc} foot={itemFoot(it)} />)}
            </Column>
          );
        })}
      </div>
    </div>
  );
}

// Single board view replaces the per-section tabs.
export const panelTabComponents = { NodeBoard };
