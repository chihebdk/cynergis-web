"use client";

import { seedFlows } from "./data";
import { contextMap, contextSubmaps } from "./contextmap-data";
import { systemMap, systemSubmaps } from "./systemmap-data";
import { claimsFlows, ccContextMap, ccContextSubmaps, ccSystemMap, ccSystemSubmaps } from "./claims-flows";
import { domainMaps, domainSubmaps } from "./domain-maps";
import { buildDerivedFlows } from "./derived-flows";
import { claimsWorkflow, claimsWorkflowSubmaps, UC_FLOWS } from "./workflows";
import { BJ_STORMS, claimsCutMap } from "./journeys";

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
getCollection("map").set(claimsWorkflow.id, structuredClone(claimsWorkflow));   // D-148: the end-to-end workflow
for (const m of UC_FLOWS) getCollection("map").set(m.id, structuredClone(m));    // D-149: one flow per use case
for (const m of BJ_STORMS) getCollection("map").set(m.id, structuredClone(m));   // D-151: big-picture storms per journey
getCollection("map").set(claimsCutMap.id, structuredClone(claimsCutMap));        // D-153: the accepted cut's context map
for (const sm of claimsWorkflowSubmaps) getCollection("submap").set(sm.id, structuredClone(sm));
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
