"use client";

import { StateProvider } from "@flowai/state";
import { useGlobalCache, useDerivedCache, useEphemeralStore, useGlobalStore } from "@flowai/state";
import { CanvasServicesProvider } from "@flowai/canvas";
import { entities, embeddedEntities } from "./data";
import { useMemoryAdapter } from "./adapter";
import { nodeTypes } from "./nodes.jsx";

const registry = { entities, embeddedEntities };
const stateConfig = { registry, crudAdapter: useMemoryAdapter, autosaveInterval: 2000 };

export const AppStateProvider = ({ children }) => (
  <StateProvider config={stateConfig}>{children}</StateProvider>
);

const useNodeCache = (flow) => {
  const raw = flow ? flow.record || flow : null;
  const nodes = raw?.nodes || [];
  return useDerivedCache("flowNode", nodes, { parentId: flow?.id || "" }, flow?.id || "none");
};

export const AppCanvasProvider = ({ children }) => {
  const mapCache = useGlobalCache("flowMap");
  const nodeCache = useNodeCache(mapCache.selected);
  const submapStore = useGlobalStore("submap")();
  const domainStore = useGlobalStore("domain")();
  const adapter = useMemoryAdapter();

  const services = {
    nodeCache, submapCache: submapStore, mapCache, domainCache: domainStore,
    crudAdapter: {
      find: adapter.find, save: adapter.save, remove: adapter.remove,
      pushEmbedded: adapter.pushEmbedded, updateEmbedded: adapter.updateEmbedded, pullEmbedded: adapter.pullEmbedded,
    },
    ephemeralStore: useEphemeralStore,
    nodeTypes,
  };
  return <CanvasServicesProvider value={services}>{children}</CanvasServicesProvider>;
};
