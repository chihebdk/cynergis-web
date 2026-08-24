"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapStateProvider } from "./providers.jsx";
import { useGlobalCache } from "@flowai/state";
import { flowConfig, contextMapConfig } from "./config";
import { panelTabComponents, SystemMapModal } from "./panelTabs.jsx";
import { registerGroundingDecorator, registerContextKindDecorator, registerTriggerBadgeDecorator, registerHomeContextDecorator } from "./GroundingDecorator.jsx";

// FlowMapSelfWired handles node/edge building, layout, submaps, toolbars and editing.
const FlowMapSelfWired = dynamic(
  () => import("@flowai/canvas").then((m) => m.FlowMapSelfWired),
  { ssr: false }
);

const tabComponents = panelTabComponents;

// The `map` store in @flowai/state is a module-level singleton shared by every canvas
// (cacheKey "map-map"); once initialized for one map it refuses to re-query for a
// different mapId, so navigating between the context map and a bounded context's event
// flow leaves the second canvas mapless — blank until a full refresh. FlowMapSelfWired
// reads `store.initialized` at RENDER time, so clearing the store in a later effect is
// too late. Gate it: reset the store in a layout effect and only mount the canvas once
// it's been cleared for THIS map, so FlowMapSelfWired renders against a fresh store and
// fetches its own map. The clear runs before paint → no flash of the previous map.
function GatedCanvas({ flowId, config, remountKey }) {
  const { clear } = useGlobalCache("map"); // no query → just the store handle for THIS entity
  const [pass, setPass] = useState(0);
  const clearedFor = useRef(null);
  useLayoutEffect(() => {
    clear();
    clearedFor.current = flowId;
    setPass((p) => p + 1);
  }, [flowId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (clearedFor.current !== flowId) return null; // hold the canvas until the store is reset for this map
  return (
    <FlowMapSelfWired key={`${flowId}:${remountKey}:${pass}`} mapId={flowId} config={config} tabComponents={tabComponents} />
  );
}

const IconExpand = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
);
const IconCollapse = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
);

// Self-contained embed: mount anywhere with a flowId (= mapId). Sets up the state
// provider, the self-wired canvas, our Grounding decorator + the unified event-card
// panel (D-036 — the Spec|Architecture lens is retired; the cards subsume both),
// and a top-right expand/collapse control.
// variant="contextmap" renders the context map (bounded contexts as submaps).
export default function FlowEmbed({ flowId = "decisioning", variant = "flow" }) {
  // "systemmap" behaves like "contextmap" (same config, remount-on-collapse) but
  // suppresses the properties panel (CSS) and opens the node modal instead (D-046).
  const isMapVariant = variant === "contextmap" || variant === "systemmap";
  const config = isMapVariant ? contextMapConfig : flowConfig;
  const [expanded, setExpanded] = useState(false);
  const paneWrapRef = useRef(null);
  // Bumping this remounts the canvas, which rebuilds from the seed data. Submap
  // expand/collapse is transient React Flow state (never persisted), so a remount
  // resets every bounded-context submap to collapsed.
  const [remountKey, setRemountKey] = useState(0);

  // Collapsing the context map back to inline should reset it to the clean overview:
  // all bounded-context submaps collapsed again. Remount on collapse to do that.
  const collapse = useCallback(() => {
    if (isMapVariant) setRemountKey((k) => k + 1);
    setExpanded(false);
  }, [isMapVariant]);
  const toggleExpand = () => (expanded ? collapse() : setExpanded(true));

  useEffect(() => { registerGroundingDecorator(); registerContextKindDecorator(); registerTriggerBadgeDecorator(); registerHomeContextDecorator(); }, []);

  // Mirror the canvas's layout mode (org | htree) as a wrapper class. The org
  // layout places children at the Start node's REGISTERED width (165px) + 150px,
  // while htree repositions Start explicitly — so the Start box needs different
  // widths per mode (see flow-canvas.css). The layout store is a lib-level
  // zustand singleton; subscribe after mount (the canvas lib is client-only).
  const [layoutMode, setLayoutMode] = useState("htree");
  useEffect(() => {
    let unsub = null, dead = false;
    import("@flowai/canvas").then((m) => {
      if (dead || !m.useLayoutStore) return;
      setLayoutMode(m.useLayoutStore.getState().mode);
      unsub = m.useLayoutStore.subscribe((st) => setLayoutMode(st.mode));
    });
    return () => { dead = true; if (unsub) unsub(); };
  }, []);

  // The vendored canvas frames the viewport with a single one-shot timer (~450ms
  // after mount) and its ResizeObserver ignores its first fire. When the async node
  // load + layout lands after that window, the fit runs against an empty graph and
  // never retries, so the canvas looks empty until a hard refresh — this hits both
  // the context map and the per-context event flow.
  //
  // When the canvas *looks* empty the nodes are actually already in the DOM, just
  // outside the viewport. Rather than guess when layout finishes, self-heal: poll,
  // and whenever nodes exist but none are framed, nudge the container's height by 1px
  // — that fires the canvas's own ResizeObserver, which re-frames the view. Stop once
  // the view has been framed for a few consecutive checks (layout settled).
  useEffect(() => {
    const wrap = paneWrapRef.current;
    if (!wrap) return;
    const nudge = () => {
      if (!paneWrapRef.current) return;
      paneWrapRef.current.style.height = "calc(100% - 1px)";
      setTimeout(() => { if (paneWrapRef.current) paneWrapRef.current.style.height = ""; }, 60);
    };
    // true = every (visible) node is framed · false = some node is off-screen · null = no nodes yet.
    // Must require ALL nodes, not just one: the un-fitted default viewport leaves a few
    // nodes coincidentally in view, and "any framed" would wrongly treat that as done.
    const allFramed = () => {
      const pane = wrap.querySelector(".react-flow");
      const nodes = [...wrap.querySelectorAll(".react-flow__node")]
        .filter((n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); // skip hidden
      if (!pane || !nodes.length) return null;
      const pr = pane.getBoundingClientRect();
      let inView = 0;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx >= pr.left && cx <= pr.right && cy >= pr.top && cy <= pr.bottom) inView += 1;
      }
      return inView === nodes.length;
    };
    let framedStreak = 0, ticks = 0;
    const iv = setInterval(() => {
      ticks++;
      const state = allFramed();
      if (state === false) { nudge(); framedStreak = 0; }   // some node off-screen → re-fit
      else if (state === true) { framedStreak += 1; }        // fully framed; confirm it's stable
      if (framedStreak >= 3 || ticks > 40) clearInterval(iv);
    }, 300);
    return () => clearInterval(iv);
  }, [flowId, variant, remountKey]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === "Escape") collapse(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, collapse]);

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
    <MapStateProvider>
      <div className={`cyn-flow-embed cyn-layout-${layoutMode} ${expanded ? "cyn-flow-expanded" : "cyn-flow-inline"}${variant === "contextmap" ? " cyn-flow-contextmap" : ""}${variant === "systemmap" ? " cyn-flow-systemmap" : ""}`} style={shell}>
        <button type="button" style={btn} onClick={toggleExpand}
          title={expanded ? "Collapse (Esc)" : "Expand to full page"} aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? <IconCollapse /> : <IconExpand />}
        </button>
        <div ref={paneWrapRef} className="w-full h-full min-h-[500px]">
          <GatedCanvas flowId={flowId} config={config} remountKey={remountKey} />
        </div>
        {variant === "systemmap" && <SystemMapModal mapId={flowId} />}
      </div>
    </MapStateProvider>
  );
}
