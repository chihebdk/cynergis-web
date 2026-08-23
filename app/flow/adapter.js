"use client";

import { seedFlows } from "./data";
import { contextMap, contextSubmaps } from "./contextmap-data";
import { systemMap, systemSubmaps } from "./systemmap-data";
import { claimsFlows, ccContextMap, ccContextSubmaps, ccSystemMap, ccSystemSubmaps } from "./claims-flows";
import { domainMaps, domainSubmaps } from "./domain-maps";
import { buildDerivedFlows } from "./derived-flows";

// In-memory store (mapper starter pattern), seeded with our flows as `map` docs.
const collections = new Map();
const getCollection = (name) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
};

// seed once
for (const flow of seedFlows) getCollection("map").set(flow.id, structuredClone(flow));
getCollection("map").set(contextMap.id, structuredClone(contextMap));
for (const sm of contextSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));
getCollection("map").set(systemMap.id, structuredClone(systemMap));
for (const sm of systemSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));
for (const flow of claimsFlows) getCollection("map").set(flow.id, structuredClone(flow));
getCollection("map").set(ccContextMap.id, structuredClone(ccContextMap));
for (const sm of ccContextSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));
getCollection("map").set(ccSystemMap.id, structuredClone(ccSystemMap));
for (const sm of ccSystemSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));
for (const flow of buildDerivedFlows()) getCollection("map").set(flow.id, structuredClone(flow));   // D-131: every other wall
/* D-146 pilot: the service CONTAINER — group the FNOL flow's events into their
   handling component as a submap. Collapsed = the component view (architecture);
   expanded = the events inside (behaviour). Derived here from the stamped arch
   blocks (all three resolve to C1), not hand-authored. */
{
  const fnol = getCollection("map").get("cc-fnol");
  if (fnol) {
    const members = fnol.nodes.filter((n) => n.kind === "event" && n.arch && n.arch.component === "C1");
    if (members.length > 1) {
      for (const n of members) n.submapId = "svc-cc-fnol-c1";
      getCollection("submap").set("svc-cc-fnol-c1", {
        id: "svc-cc-fnol-c1", name: "Loss report module · microservice",
        startNodeId: members[0].id, endNodeId: members[members.length - 1].id,
        colorIndex: 4, mapIds: ["cc-fnol"],
      });
    }
  }
}
for (const m of domainMaps) getCollection("map").set(m.id, structuredClone(m));
for (const sm of domainSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));

export function createMemoryAdapter(databaseName) {
  const prefix = databaseName ? `${databaseName}:` : "";
  const col = (entity) => getCollection(`${prefix}${entity}`);
  return {
    find: async (entity, filter) => {
      let items = Array.from(col(entity).values());
      if (filter) items = items.filter((it) => Object.entries(filter).every(([k, v]) => it[k] === v));
      return structuredClone(items);
    },
    save: async (entity, data) => {
      const c = col(entity);
      const existing = c.get(data.id);
      c.set(data.id, existing ? { ...existing, ...structuredClone(data) } : structuredClone(data));
    },
    remove: async (entity, id) => { col(entity).delete(id); },
    pushEmbedded: async (entity, parentId, data) => {
      const p = col(entity).get(parentId); if (!p) return;
      if (!p.nodes) p.nodes = []; p.nodes.push(structuredClone(data));
    },
    updateEmbedded: async (entity, parentId, data) => {
      const p = col(entity).get(parentId); if (!p?.nodes) return;
      const i = p.nodes.findIndex((n) => n.id === data.id);
      if (i >= 0) p.nodes[i] = { ...p.nodes[i], ...structuredClone(data) };
    },
    pullEmbedded: async (entity, parentId, itemId) => {
      const p = col(entity).get(parentId); if (!p?.nodes) return;
      p.nodes = p.nodes.filter((n) => n.id !== itemId);
    },
  };
}
