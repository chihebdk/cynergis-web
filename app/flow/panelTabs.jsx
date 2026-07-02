"use client";

import { useNodeCache } from "@flowai/canvas";
import { resolveGround } from "./data";
import { useLens } from "./lens";
import { archFor, archLabel, ENTRY_META } from "./arch";

/* ── reference → "where it's defined" navigation ──
   Chips resolve to a view in the host app and navigate via the global router
   (window.cynPushUrl). FR/UC/NFR/POL live in Discover; aggregates in the context's
   Domain model; bounded contexts are their own detail page. */
const KIND_TO_TARGET = {
  UseCase: { phase: "Discover", entry: "usecases" },
  FunctionalRequirement: { phase: "Discover", entry: "fr" },
  NonFunctionalRequirement: { phase: "Discover", entry: "nfr" },
  Policy: { phase: "Discover", entry: "policies" },
};
function navTargetFor(id) {
  const nav = (typeof window !== "undefined" && window.__cynNav) || {};
  const base = { v: "prod", pf: nav.pf, prod: nav.prod, sub: "dashboard" };
  if (/^AGG/i.test(id)) return { ...base, phase: "Design", entry: "contexts", ctx: nav.ctx, tab: "model" };
  if (/^BC-/i.test(id)) return { ...base, phase: "Design", entry: "contexts", ctx: id, tab: "rels" };
  const g = resolveGround(id);
  const t = g && KIND_TO_TARGET[g.kind];
  return t ? { ...base, ...t } : null;
}
function navRef(id) {
  if (typeof window === "undefined") return;
  // Trace-indexed refs (FR/UC/NFR/POL): open the detail modal IN PLACE — stay on the
  // Event Flow. The modal's own "View in …" button is the explicit way to jump to the
  // defining page. (The modal is lifted above the fullscreen overlay via CSS.)
  if (typeof window.cynTraceHas === "function" && window.cynTraceHas(id)) {
    window.cynTraceOpen?.(id);
    return;
  }
  // Non-indexed refs (aggregates, bounded contexts): navigate to the definition.
  // cynPushUrl writes the URL; __cynApplyProd switches the in-product view state.
  const t = navTargetFor(id);
  if (!t) return;
  window.cynPushUrl?.(t);
  window.__cynApplyProd?.(t);
}

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
  const target = navTargetFor(id);
  return (
    <button type="button" disabled={!target}
      onClick={(e) => { e.stopPropagation(); navRef(id); }}
      title={node ? `${node.kind}: ${node.title}${target ? " — open its definition" : ""}` : id}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${style} ${target ? "cursor-pointer hover:brightness-95" : ""}`}>
      {id}
    </button>
  );
}
const AssumedChip = () => (
  <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-mono font-medium text-red-700">⚠ assumed</span>
);
const CrossesBadge = ({ to }) => (
  <button type="button" className="cyn-crosses cyn-clickable" title={`Open ${to}`}
    onClick={(e) => { e.stopPropagation(); navRef(to); }}>→ {to}</button>
);
const AggChip = ({ on }) => {
  const target = navTargetFor(on);
  return (
    <button type="button" disabled={!target}
      className={`cyn-agg-chip${target ? " cyn-clickable" : ""}`} title={target ? `${on} — open in Domain model` : on}
      onClick={(e) => { e.stopPropagation(); navRef(on); }}>{on}</button>
  );
};

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

/* ── architecture-lens chips ──
   __ARCH__ ids styled by kind; click opens the entity's trace modal in place
   (navRef → cynTraceOpen, same machinery as the grounding chips). */
const ARCH_CHIP_STYLE = [
  [/^C\d/, "bg-indigo-50 text-indigo-700 border-indigo-200"],          // component
  [/^res-/, "bg-slate-100 text-slate-700 border-slate-200"],           // resource
  [/^SCH-/, "bg-teal-50 text-teal-700 border-teal-200"],               // schema
  [/^SCRT-/, "bg-amber-50 text-amber-700 border-amber-200"],           // secret
  [/^API-/, "bg-blue-50 text-blue-700 border-blue-200"],               // api
  [/^INT-/, "bg-purple-50 text-purple-700 border-purple-200"],         // integration
];
function ArchChip({ id }) {
  if (!id) return null;
  const style = (ARCH_CHIP_STYLE.find(([re]) => re.test(id)) || [null, "bg-gray-50 text-gray-500 border-gray-200"])[1];
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); navRef(id); }} title={archLabel(id)}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium cursor-pointer hover:brightness-95 ${style}`}>
      {id}
    </button>
  );
}
const TopicChip = ({ topic }) => (
  <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">{topic}</span>
);
const DerivedBadge = () => (
  <span title="Proposed mechanically from the component join (context + grounds ∩ mapsTo) — not yet confirmed"
    className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-[9.5px] font-medium text-sky-700">derived</span>
);

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

/* ── the architecture-lens columns — same board, structural tense ── */
function ArchColumns({ node }) {
  const a = archFor(node);
  if (!a) {
    return (
      <div className="cyn-board-cols">
        <Column dot="red" title="Not architected">
          <BoardItem title="No realization captured" desc="No arch block is authored, and no component's mapsTo intersects this node's grounds — the derive-first join found nothing." foot={[<AssumedChip key="a" />]} />
        </Column>
      </div>
    );
  }
  const em = a.entry ? ENTRY_META[a.entry.type] || ENTRY_META.sequentialFlowTrigger : null;
  return (
    <div className="cyn-board-cols">
      {em && (
        <Column dot="amber" title="Entry point">
          <BoardItem title={`${em.icon} ${em.label}`}
            desc={[a.entry.topic, a.entry.label, a.entry.auth && `auth: ${a.entry.auth}`].filter(Boolean).join(" · ")}
            foot={[
              a.entry.ref && <ArchChip key="ref" id={a.entry.ref} />,
              a.entry.schema ? <ArchChip key="sch" id={a.entry.schema} /> : (a.entry.type !== "sequentialFlowTrigger" && !a.derived ? <AssumedChip key="as" /> : null),
            ].filter(Boolean)} />
        </Column>
      )}
      <Column dot="blue" title="Operation">
        <BoardItem title="Realizing component" desc={a.codePath ? `code: ${a.codePath}` : undefined}
          foot={[<ArchChip key="c" id={a.component} />]} />
        {(node.commands || []).map((c, i) => <BoardItem key={i} title={c.label} foot={[<ArchChip key="c" id={a.component} />]} />)}
      </Column>
      {((a.reads || []).length > 0 || (a.writes || []).length > 0) && (
        <Column dot="green" title="Data">
          {(a.reads || []).map((r, i) => (
            <BoardItem key={"r" + i} title={r.resource ? `reads ${archLabel(r.resource).split(" · ")[1] || r.resource}` : `reads ${r.label || r.ref}`}
              foot={[r.resource && <ArchChip key="res" id={r.resource} />, r.ref && <ArchChip key="ref" id={r.ref} />, r.schema && <ArchChip key="sch" id={r.schema} />].filter(Boolean)} />
          ))}
          {(a.writes || []).map((w, i) => (
            <BoardItem key={"w" + i} title={`writes ${archLabel(w.resource).split(" · ")[1] || w.resource}`}
              foot={[<ArchChip key="res" id={w.resource} />, w.schema ? <ArchChip key="sch" id={w.schema} /> : null].filter(Boolean)} />
          ))}
        </Column>
      )}
      {(a.emits || (a.reactions || []).length > 0) && (
        <Column dot="purple" title="Publishes & integrations">
          {a.emits && (
            <BoardItem title="Publishes" desc="the event's contract on the bus"
              foot={[<TopicChip key="t" topic={a.emits.topic} />, <ArchChip key="via" id={a.emits.via} />, a.emits.schema ? <ArchChip key="sch" id={a.emits.schema} /> : <AssumedChip key="as" />]} />
          )}
          {(a.reactions || []).map((r, i) => (
            <BoardItem key={i} title={`→ ${archLabel(r.consumer).split(" · ")[1] || r.consumer}`} desc="pub/sub across the seam"
              foot={[<TopicChip key="t" topic={r.topic} />, <ArchChip key="via" id={r.via} />, <ArchChip key="c" id={r.consumer} />]} />
          ))}
        </Column>
      )}
      {((a.secrets || []).length > 0 || (a.slo || []).length > 0) && (
        <Column dot="red" title="Ops concerns">
          {(a.slo || []).length > 0 && <BoardItem title="Budget / SLO" desc="the non-functional this hop spends" foot={(a.slo || []).map((s) => <GroundChip key={s} id={s} />)} />}
          {(a.secrets || []).length > 0 && <BoardItem title="Secrets" desc="credentials this step needs at runtime" foot={(a.secrets || []).map((s) => <ArchChip key={s} id={s} />)} />}
        </Column>
      )}
    </div>
  );
}

/* ── the board ── */
export function NodeBoard() {
  const { selected: node } = useNodeCache();
  const lens = useLens();
  if (!node) return null;

  const risk = riskBadge(node);
  const t = node.trigger;
  const tm = t ? TRIGGER_META[t.kind] || TRIGGER_META.upstream : null;
  const isArch = lens === "arch";
  const a = isArch ? archFor(node) : null;

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
            {isArch && a?.derived && <DerivedBadge />}
            {isArch
              ? <>
                  {a?.component && <ArchChip id={a.component} />}
                  {a?.emits?.schema && <ArchChip id={a.emits.schema} />}
                </>
              : <>
                  {node.aggregate && <AggChip on={node.aggregate} />}
                  {(node.grounds || []).map((g) => <GroundChip key={g} id={g} />)}
                </>}
          </div>
        </div>
        {node.description && <p className="cyn-board-desc">{node.description}</p>}
      </div>

      {/* columns — behavioral tense (spec) or structural tense (architecture) */}
      {isArch ? <ArchColumns node={node} /> : (
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
      )}
    </div>
  );
}

// Single board view replaces the per-section tabs.
export const panelTabComponents = { NodeBoard };
