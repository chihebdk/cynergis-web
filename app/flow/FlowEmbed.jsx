"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapStateProvider } from "./providers.jsx";
import { flowConfig } from "./config";
import { panelTabComponents } from "./panelTabs.jsx";
import { registerGroundingDecorator } from "./GroundingDecorator.jsx";
import { LensContext } from "./lens";

// FlowMapSelfWired handles node/edge building, layout, submaps, toolbars and editing.
const FlowMapSelfWired = dynamic(
  () => import("@flowai/canvas").then((m) => m.FlowMapSelfWired),
  { ssr: false }
);

const tabComponents = panelTabComponents;

const IconExpand = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
);
const IconCollapse = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /></svg>
);

// Self-contained embed: mount anywhere with a flowId (= mapId). Sets up the state
// provider, the self-wired canvas, our Grounding decorator + board panel, the
// Spec|Architecture lens toggle (D-034), and a top-right expand/collapse control.
export default function FlowEmbed({ flowId = "decisioning" }) {
  const [expanded, setExpanded] = useState(false);
  const [lens, setLens] = useState("spec");

  useEffect(() => { registerGroundingDecorator(); }, []);
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
    <MapStateProvider>
      <LensContext.Provider value={lens}>
        <div className={`cyn-flow-embed ${expanded ? "cyn-flow-expanded" : "cyn-flow-inline"}`} style={shell}>
          <button type="button" style={btn} onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse (Esc)" : "Expand to full page"} aria-label={expanded ? "Collapse" : "Expand"}>
            {expanded ? <IconCollapse /> : <IconExpand />}
          </button>
          {/* the flow's perspective: business/spec grounding vs architecture realization */}
          <div className="flowai-layout-toggle cyn-lens-toggle" role="group" aria-label="Flow perspective">
            <button type="button" className="flowai-seg-btn" aria-pressed={lens === "spec"} onClick={() => setLens("spec")}>Spec</button>
            <button type="button" className="flowai-seg-btn" aria-pressed={lens === "arch"} onClick={() => setLens("arch")}>Architecture</button>
          </div>
          <div className="w-full h-full min-h-[500px]">
            <FlowMapSelfWired mapId={flowId} config={flowConfig} tabComponents={tabComponents} />
          </div>
        </div>
      </LensContext.Provider>
    </MapStateProvider>
  );
}
